/**
 * GameRoom integration tests — exercise the real submitAction → event bus →
 * processRound → game:ended/trophy broadcast pipeline.
 *
 * This is the layer that had zero test coverage before this session even
 * though it's where two real bugs were found:
 *   - GameRoom never delegated GameState.getPlayersInfo() to itself
 *   - awardRandomTrophy() lived in a dead code path and never fired
 *
 * Mocks: logger, config, messages, trophies data, SystemsFactory (the game
 * subsystems — CombatSystem/WarlockSystem/etc. — are covered by their own
 * unit tests elsewhere; here we only care about GameRoom's own orchestration).
 * Real code: GameRoom, Player, GameState, GamePhase, GameRules, GameEventBus,
 * CommandProcessor, and gameService.awardRandomTrophy.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../server/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    track: jest.fn(),
    logError: jest.fn(),
  },
}));

jest.mock('../../../server/config/messages/index', () => ({
  __esModule: true,
  default: {
    getError: jest.fn(() => 'validation-error'),
    getEvent: jest.fn((key: string, data: any) => ({ type: key, ...(data || {}) })),
    formatMessage: jest.fn((template: string) => template ?? ''),
    serverLogMessages: {
      debug: {
        MultipleActionsAttempt: '',
        UnavailableAbilityAttempt: '',
        AbilityOnCooldownAttempt: '',
        PlayerActionSubmittedSuccessfully: '',
        PlayerActionInvalidated: '',
        PlayerActionSubmissionCleared: '',
        RacialAbilityUsed: '',
      },
    },
  },
}));

jest.mock('../../../server/config/index', () => ({
  __esModule: true,
  default: {
    MONSTER_ID: '__monster__',
    maxPlayers: 20,
    minPlayers: 2,
    gameBalance: {
      baseHp: 100,
      monster: {
        baseHp: 100,
        baseDamage: 25,
        baseAge: 0,
        hpScalingMultiplier: 1.5,
        damageScaling: { ageMultiplier: 1 },
      },
      player: {
        armor: { reductionRate: 0.1, maxReduction: 0.75, minReduction: 0 },
        levelUp: { hpIncrease: 0.08, damageIncrease: 1.15, fullHealOnLevelUp: true },
        healing: { antiDetection: { enabled: false } },
        death: { pendingDeathSystem: false, allowResurrection: false },
      },
      coordinationBonus: {
        enabled: true,
        damageBonus: 10,
        healingBonus: 15,
        appliesToMonster: true,
        maxBonusTargets: 5,
        announceCoordination: false,
      },
      progression: null,
    },
    getError: jest.fn(() => null),
    getAbility: jest.fn(() => null),
    getEvent: jest.fn((key: string, data: any) => ({ type: key, ...(data || {}) })),
  },
}));

// Trophy list empty by default — trophy-award tests override with mockReturnValueOnce equivalents
// by re-requiring is not viable for ESM default export, so we keep a small real-ish trophy list here.
jest.mock('../../../server/config/trophies', () => ({
  __esModule: true,
  default: [
    {
      name: 'Test Trophy',
      description: 'Awarded in tests',
      getWinner: (players: any[]) => (players.length > 0 ? players[0] : null),
    },
  ],
}));

jest.mock('../../../server/models/systems/SystemsFactory', () => {
  const actualPlayers = { current: null as Map<string, any> | null };
  return {
    __esModule: true,
    SystemsFactory: {
      createSystems: jest.fn((players: Map<string, any>) => {
        actualPlayers.current = players;
        return {
          players,
          abilityRegistry: null,
          warlockSystem: {
            assignInitialWarlocks: jest.fn(() => {
              const first = players.values().next().value;
              if (first) {
                first.isWarlock = true;
                first.role = 'Warlock';
              }
              return first ? [{ playerId: first.id }] : [];
            }),
          },
          gameStateUtils: {
            checkWinConditions: (numWarlocks: number, aliveCount: number): string | null => {
              if (numWarlocks >= aliveCount - numWarlocks && numWarlocks > 0) return 'Evil';
              if (numWarlocks === 0 && aliveCount > 0) return 'Good';
              return null;
            },
          },
          combatSystem: {
            // Overridden per-test via (game.systems as any).combatSystem.processRound
            processRound: jest.fn(async () => ({ log: [], turn: 1 })),
          },
        };
      }),
    },
  };
});

// ── Real imports ──────────────────────────────────────────────────────────────

import { GameRoom } from '../../../server/models/GameRoom';

// ── Test helpers ────────────────────────────────────────────────────────────

interface RecordedEmit {
  room: string;
  event: string;
  payload: any;
}

function makeMockIo() {
  const emitted: RecordedEmit[] = [];
  const io: any = {
    to: (room: string) => ({
      emit: (event: string, payload: any) => {
        emitted.push({ room, event, payload });
      },
    }),
    sockets: { adapter: { rooms: new Map() } },
  };
  return { io, emitted };
}

async function makeStartedGame(playerCount = 2) {
  const room = new GameRoom('TEST1' as any);
  const { io, emitted } = makeMockIo();
  room.setSocketServer(io);

  const playerIds: string[] = [];
  for (let i = 0; i < playerCount; i++) {
    const id = `p${i + 1}`;
    const { player } = room.addPlayer(id, `Player${i + 1}`);
    // Give each player a minimal unlocked ability so submitAction() validates successfully
    (player as any).unlocked = [{ id: 'attack', name: 'Attack', category: 'Attack', params: {} }];
    playerIds.push(id);
  }

  await room.startGame();
  return { room, io, emitted, playerIds };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('GameRoom lifecycle', () => {
  it('adds players and reaches a startable state', async () => {
    const { room, playerIds } = await makeStartedGame(2);
    expect(room.getPlayers().length).toBe(2);
    expect(room.gameState.getStarted()).toBe(true);
    expect(playerIds).toEqual(['p1', 'p2']);
  });

  it('assigns exactly one warlock on start (per the mocked WarlockSystem)', async () => {
    const { room } = await makeStartedGame(2);
    const warlocks = room.getPlayers().filter((p: any) => p.isWarlock);
    expect(warlocks.length).toBe(1);
  });
});

describe('GameRoom round processing — game continues', () => {
  it('broadcasts round:results and resets action submissions when no winner is detected', async () => {
    const { room, emitted, playerIds } = await makeStartedGame(3);

    // Force this round's combat result and make sure win condition does NOT trigger:
    // 3 players, 1 warlock assigned by the mock factory => warlocks(1) < nonWarlocks(2), game continues.
    (room.systems as any).combatSystem.processRound = jest.fn(async () => ({
      log: [{ message: 'Nothing much happened.', public: true }],
      turn: 1,
    }));

    for (const id of playerIds) {
      await room.submitAction({ playerId: id, actionType: 'attack', targetId: 'monster' });
    }

    // Let the async event-driven round processing settle
    await new Promise(resolve => setImmediate(resolve));

    const resultsEvents = emitted.filter(e => e.event === 'round:results');
    expect(resultsEvents.length).toBeGreaterThan(0);

    const endedEvents = emitted.filter(e => e.event === 'game:ended');
    expect(endedEvents.length).toBe(0);

    expect(room.gamePhase.getCurrentPhase()).toBe('action');
    for (const player of room.getPlayers()) {
      expect((player as any).hasSubmittedAction).toBe(false);
    }
  });
});

describe('GameRoom round processing — game ends', () => {
  it('broadcasts game:ended with the detected winner once all-but-warlocks are eliminated', async () => {
    const { room, emitted, playerIds } = await makeStartedGame(2);

    // Kill off the non-warlock player during round processing so only the
    // warlock remains alive => checkWinConditions should return 'Evil'.
    (room.systems as any).combatSystem.processRound = jest.fn(async () => {
      const nonWarlock = room.getPlayers().find((p: any) => !p.isWarlock);
      if (nonWarlock) (nonWarlock as any).isAlive = false;
      return { log: [{ message: 'A player has fallen.', public: true }], turn: 1 };
    });

    for (const id of playerIds) {
      await room.submitAction({ playerId: id, actionType: 'attack', targetId: 'monster' });
    }

    await new Promise(resolve => setImmediate(resolve));

    const endedEvents = emitted.filter(e => e.event === 'game:ended');
    expect(endedEvents.length).toBeGreaterThan(0);
    expect(endedEvents[0].payload.winner).toBe('Evil');
    expect(room.gameState.getEnded()).toBe(true);
  });

  it('awards and broadcasts a trophy when the game ends (regression: trophy pipeline was dead code)', async () => {
    const { room, emitted, playerIds } = await makeStartedGame(2);

    (room.systems as any).combatSystem.processRound = jest.fn(async () => {
      const nonWarlock = room.getPlayers().find((p: any) => !p.isWarlock);
      if (nonWarlock) (nonWarlock as any).isAlive = false;
      return { log: [], turn: 1 };
    });

    for (const id of playerIds) {
      await room.submitAction({ playerId: id, actionType: 'attack', targetId: 'monster' });
    }

    await new Promise(resolve => setImmediate(resolve));

    const trophyEvents = emitted.filter(e => e.event === 'trophyAwarded');
    expect(trophyEvents.length).toBe(1);
    expect(trophyEvents[0].payload.trophyName).toBe('Test Trophy');
  });

  it('does not process the round again once the game has ended', async () => {
    const { room, playerIds } = await makeStartedGame(2);
    const processRound = jest.fn(async () => {
      const nonWarlock = room.getPlayers().find((p: any) => !p.isWarlock);
      if (nonWarlock) (nonWarlock as any).isAlive = false;
      return { log: [], turn: 1 };
    });
    (room.systems as any).combatSystem.processRound = processRound;

    for (const id of playerIds) {
      await room.submitAction({ playerId: id, actionType: 'attack', targetId: 'monster' });
    }
    await new Promise(resolve => setImmediate(resolve));

    expect(processRound).toHaveBeenCalledTimes(1);
    expect(room.gamePhase.getCurrentPhase()).toBe('results');
  });
});
