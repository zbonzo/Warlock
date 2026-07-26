/**
 * Warlock conversion trigger tests.
 *
 * Three mechanics under test:
 *   1. Warlock attacks non-warlock player  → triggerChances.warlockAttackPlayer base chance (scaled)
 *   2. Non-warlock heals a warlock         → triggerChances.playerHealsWarlock base chance (scaled), corrupts the healer
 *   3. Warlock attacks monster, monster attacks player → triggerChances.monsterPassthrough base chance (scaled)
 *
 * Scaling: calibrated for playerScaling.baseline players; scale = playerCount / baseline,
 * clamped to [playerScaling.minScale, playerScaling.maxScale], capped at maxChance.
 * All values come from config — mocked below.
 */

// Mock config values used to derive expected test outcomes
const MOCK_TRIGGER = { warlockAttackPlayer: 0.30, playerHealsWarlock: 0.50, monsterPassthrough: 0.10 };
const MOCK_SCALING = { baseline: 8, minScale: 0.25, maxScale: 1.5 };
const MOCK_MAX_CHANCE = 0.65;

// ── Mocks ─────────────────────────────────────────────────────────────────────

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
    formatMessage: jest.fn((t: string) => t ?? ''),
    getError: jest.fn(() => 'error'),
    getAbilityMessage: jest.fn(() => ''),
  },
}));

jest.mock('../../../server/config/index', () => ({
  __esModule: true,
  default: {
    MONSTER_ID: '__monster__',
    gameBalance: {
      baseHp: 100,
      warlock: {
        winConditions: { allWarlocksGone: 'Good', allPlayersWarlocks: 'Evil' },
        conversion: {
          baseChance: 0.45,
          maxChance: 0.65,
          maxCorruptionsPerRound: 2,
          maxCorruptionsPerPlayer: 1,
          corruptionCooldown: 2,
          scalingFactor: 0.1,
          triggerChances: {
            warlockAttackPlayer: 0.30,
            playerHealsWarlock: 0.50,
            monsterPassthrough: 0.10,
          },
          playerScaling: {
            baseline: 8,
            minScale: 0.25,
            maxScale: 1.5,
          },
        },
        corruption: {
          detectionPenaltyDuration: 2,
          detectionDamagePenalty: 25,
        },
      },
      comebackMechanics: { corruptionResistance: 0 },
    },
    shouldActiveComebackMechanics: jest.fn(() => false),
    getAbility: jest.fn(() => null),
    abilities: {},
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import WarlockSystem from '../../../server/models/systems/WarlockSystem';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePlayer(id: string, name: string, isWarlock = false, isAlive = true): any {
  return { id, name, isWarlock, isAlive, hp: 100, maxHp: 100, status: 'alive' };
}

function makeGameStateUtils(players: Map<string, any>) {
  return {
    getAlivePlayers: () => Array.from(players.values()).filter((p: any) => p.isAlive),
    getAlivePlayersExcept: (ids: string[]) =>
      Array.from(players.values()).filter((p: any) => p.isAlive && !ids.includes(p.id)),
  };
}

// ── WarlockSystem unit tests ──────────────────────────────────────────────────

describe('WarlockSystem.getScaledChance', () => {
  let ws: WarlockSystem;
  const { baseline, minScale, maxScale } = MOCK_SCALING;

  beforeEach(() => {
    const players = new Map<string, any>();
    ws = new WarlockSystem(players, makeGameStateUtils(players));
  });

  it('returns exact base chance at baseline players (scale = 1.0)', () => {
    // baseline/baseline = 1.0; 0.30 × 1.0 = 0.30 < maxChance
    expect(ws.getScaledChance(0.30, baseline)).toBeCloseTo(0.30);
  });

  it('halves chance at baseline/2 players (scale = 0.5)', () => {
    expect(ws.getScaledChance(0.30, baseline / 2)).toBeCloseTo(0.30 * 0.5);
  });

  it('applies minScale for very small player counts', () => {
    // 1 player → scale = max(minScale, 1/baseline) = minScale = 0.25
    expect(ws.getScaledChance(0.30, 1)).toBeCloseTo(0.30 * minScale);
  });

  it('applies maxScale at 1.5× baseline players', () => {
    // 12 players → scale = min(maxScale, 12/8) = maxScale = 1.5
    expect(ws.getScaledChance(0.30, baseline * maxScale)).toBeCloseTo(0.30 * maxScale);
  });

  it('caps at maxChance even when scale would exceed it', () => {
    // 0.50 × maxScale(1.5) = 0.75, but MOCK_MAX_CHANCE = 0.65
    expect(ws.getScaledChance(0.50, baseline * maxScale)).toBeCloseTo(MOCK_MAX_CHANCE);
  });
});

describe('WarlockSystem — monster-attack tracking', () => {
  let ws: WarlockSystem;

  beforeEach(() => {
    const players = new Map([
      ['w1', makePlayer('w1', 'Warlock', true)],
      ['p1', makePlayer('p1', 'Player')],
    ]);
    ws = new WarlockSystem(players, makeGameStateUtils(players));
    ws.assignInitialWarlocks(['w1']);
  });

  it('getWarlockMonsterAttackers starts empty each round', () => {
    expect(ws.getWarlockMonsterAttackers().size).toBe(0);
  });

  it('recordWarlockMonsterAttack adds a warlock to the set', () => {
    ws.recordWarlockMonsterAttack('w1');
    expect(ws.getWarlockMonsterAttackers().has('w1')).toBe(true);
  });

  it('resetRoundTracking clears the monster attackers set', () => {
    ws.recordWarlockMonsterAttack('w1');
    ws.resetRoundTracking();
    expect(ws.getWarlockMonsterAttackers().size).toBe(0);
  });

  it('multiple warlocks can be recorded in a single round', () => {
    ws.recordWarlockMonsterAttack('w1');
    ws.recordWarlockMonsterAttack('w2');
    expect(ws.getWarlockMonsterAttackers().size).toBe(2);
  });
});

// ── Conversion trigger integration tests ─────────────────────────────────────
//
// These tests call the private CombatSystem helpers through `(cs as any)`.
// We wire up a minimal WarlockSystem (spy on attemptCorruption) and check
// that the correct trigger mechanism fires — not the exact chance value,
// since scaling is already unit-tested above.

import { CombatSystem } from '../../../server/models/systems/CombatSystem';

function makeMinimalCombatSystem(
  players: Map<string, any>,
  warlockSystem: WarlockSystem
): any {
  // Build the minimal constructor shape CombatSystem needs
  const monsterController = {
    monster: { id: '__monster__', hp: 200, maxHp: 200, isAlive: true, attackPower: 20 },
    processMonsterAction: jest.fn().mockResolvedValue(null),
  };

  const cs = new CombatSystem({
    players,
    monsterController,
    statusEffectManager: null,
    racialAbilitySystem: null,
    warlockSystem,
    gameStateUtils: null,
  });

  return cs;
}

describe('Conversion Trigger 1 — warlock attacks non-warlock player', () => {
  let warlock: any;
  let victim: any;
  let players: Map<string, any>;
  let ws: WarlockSystem;
  let cs: any;

  beforeEach(() => {
    warlock = makePlayer('w1', 'Warlock', true);
    victim = makePlayer('p1', 'Victim', false);
    players = new Map([['w1', warlock], ['p1', victim]]);
    ws = new WarlockSystem(players, makeGameStateUtils(players));
    ws.assignInitialWarlocks(['w1']);
    cs = makeMinimalCombatSystem(players, ws);
  });

  it('calls attemptCorruption when warlock attacks non-warlock player', () => {
    const spy = jest.spyOn(ws, 'attemptCorruption').mockReturnValue({ success: false, reason: 'resisted' });

    cs.checkWarlockConversionTriggers(
      warlock,
      { actionType: 'attack', targetId: 'p1' },
      victim,
      'Attack',
      []
    );

    expect(spy).toHaveBeenCalledWith('w1', 'p1', expect.any(Number));
    const chance = spy.mock.calls[0]?.[2] as number;
    // 2 players → scale = max(minScale, 2/baseline) = minScale = 0.25
    const { minScale, baseline } = MOCK_SCALING;
    const scale = Math.max(minScale, 2 / baseline);
    expect(chance).toBeCloseTo(MOCK_TRIGGER.warlockAttackPlayer * scale);
  });

  it('does NOT call attemptCorruption when non-warlock attacks player', () => {
    const spy = jest.spyOn(ws, 'attemptCorruption');

    cs.checkWarlockConversionTriggers(
      victim,
      { actionType: 'attack', targetId: 'w1' },
      warlock,
      'Attack',
      []
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it('does NOT call attemptCorruption when warlock attacks a warlock', () => {
    const warlock2 = makePlayer('w2', 'Warlock2', true);
    players.set('w2', warlock2);
    const spy = jest.spyOn(ws, 'attemptCorruption');

    cs.checkWarlockConversionTriggers(
      warlock,
      { actionType: 'attack', targetId: 'w2' },
      warlock2,
      'Attack',
      []
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it('adds a warlock_conversion log entry on successful conversion', () => {
    jest.spyOn(ws, 'attemptCorruption').mockReturnValue({ success: true });

    const log: any[] = [];
    cs.checkWarlockConversionTriggers(
      warlock,
      { actionType: 'attack', targetId: 'p1' },
      victim,
      'Attack',
      log
    );

    expect(log).toHaveLength(1);
    expect(log[0].type).toBe('warlock_conversion');
    expect(log[0].public).toBe(false);
    expect(log[0].details.trigger).toBe('warlock_attack');
  });
});

describe('Conversion Trigger 2 — non-warlock heals a warlock', () => {
  let warlock: any;
  let healer: any;
  let players: Map<string, any>;
  let ws: WarlockSystem;
  let cs: any;

  beforeEach(() => {
    warlock = makePlayer('w1', 'Warlock', true);
    healer = makePlayer('h1', 'Healer', false);
    players = new Map([['w1', warlock], ['h1', healer]]);
    ws = new WarlockSystem(players, makeGameStateUtils(players));
    ws.assignInitialWarlocks(['w1']);
    cs = makeMinimalCombatSystem(players, ws);
  });

  it('calls attemptCorruption with warlock as source and healer as target', () => {
    const spy = jest.spyOn(ws, 'attemptCorruption').mockReturnValue({ success: false, reason: 'resisted' });

    cs.checkWarlockConversionTriggers(
      healer,
      { actionType: 'heal', targetId: 'w1' },
      warlock,
      'Heal',
      []
    );

    // First arg = warlockId (the corruption source), second = healerId (the one being corrupted)
    expect(spy).toHaveBeenCalledWith('w1', 'h1', expect.any(Number));
  });

  it('uses 50% base chance for heal trigger', () => {
    const spy = jest.spyOn(ws, 'attemptCorruption').mockReturnValue({ success: false });

    cs.checkWarlockConversionTriggers(
      healer,
      { actionType: 'heal', targetId: 'w1' },
      warlock,
      'Heal',
      []
    );

    const chance = spy.mock.calls[0]?.[2] as number;
    // 2 players → scale = max(minScale, 2/baseline) = minScale = 0.25
    const { minScale, baseline } = MOCK_SCALING;
    const scale = Math.max(minScale, 2 / baseline);
    expect(chance).toBeCloseTo(MOCK_TRIGGER.playerHealsWarlock * scale);
  });

  it('does NOT fire when a warlock heals a non-warlock', () => {
    const spy = jest.spyOn(ws, 'attemptCorruption');

    cs.checkWarlockConversionTriggers(
      warlock,
      { actionType: 'heal', targetId: 'h1' },
      healer,
      'Heal',
      []
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it('logs conversion as private warlock_conversion entry on success', () => {
    jest.spyOn(ws, 'attemptCorruption').mockReturnValue({ success: true });

    const log: any[] = [];
    cs.checkWarlockConversionTriggers(
      healer,
      { actionType: 'heal', targetId: 'w1' },
      warlock,
      'Heal',
      log
    );

    expect(log).toHaveLength(1);
    expect(log[0].public).toBe(false);
    expect(log[0].details.trigger).toBe('heal_warlock');
    expect(log[0].details.targetId).toBe('h1'); // healer was corrupted
  });
});

describe('Conversion Trigger 3 — warlock attacks monster, monster attacks player', () => {
  let warlock: any;
  let player: any;
  let players: Map<string, any>;
  let ws: WarlockSystem;
  let cs: any;

  beforeEach(() => {
    warlock = makePlayer('w1', 'Warlock', true);
    player = makePlayer('p1', 'Player', false);
    players = new Map([['w1', warlock], ['p1', player]]);
    ws = new WarlockSystem(players, makeGameStateUtils(players));
    ws.assignInitialWarlocks(['w1']);
    cs = makeMinimalCombatSystem(players, ws);
  });

  it('3a: records the warlock when it attacks the monster', () => {
    const monster = { id: '__monster__', hp: 200, isAlive: true };

    cs.checkWarlockConversionTriggers(
      warlock,
      { actionType: 'attack', targetId: '__monster__' },
      monster,
      'Attack',
      []
    );

    expect(ws.getWarlockMonsterAttackers().has('w1')).toBe(true);
  });

  it('3a: does NOT record when non-warlock attacks the monster', () => {
    const monster = { id: '__monster__', hp: 200, isAlive: true };

    cs.checkWarlockConversionTriggers(
      player,
      { actionType: 'attack', targetId: '__monster__' },
      monster,
      'Attack',
      []
    );

    expect(ws.getWarlockMonsterAttackers().size).toBe(0);
  });

  it('3b: attemptCorruption is called when monster attacks a player after warlock attacked monster', () => {
    ws.recordWarlockMonsterAttack('w1');

    const spy = jest.spyOn(ws, 'attemptCorruption').mockReturnValue({ success: false });
    const monsterAction = { type: 'attack', targets: ['p1'], damage: 20 };

    cs.checkMonsterPassthroughConversion(monsterAction, []);

    expect(spy).toHaveBeenCalledWith('w1', 'p1', expect.any(Number));
    const chance = spy.mock.calls[0]?.[2] as number;
    // 2 players → scale = max(minScale, 2/baseline) = minScale = 0.25
    const { minScale, baseline } = MOCK_SCALING;
    const scale = Math.max(minScale, 2 / baseline);
    expect(chance).toBeCloseTo(MOCK_TRIGGER.monsterPassthrough * scale);
  });

  it('3b: does NOT fire when no warlock attacked the monster this round', () => {
    const spy = jest.spyOn(ws, 'attemptCorruption');
    const monsterAction = { type: 'attack', targets: ['p1'], damage: 20 };

    cs.checkMonsterPassthroughConversion(monsterAction, []);

    expect(spy).not.toHaveBeenCalled();
  });

  it('3b: does NOT corrupt a warlock even if monster targets them', () => {
    ws.recordWarlockMonsterAttack('w1');
    const spy = jest.spyOn(ws, 'attemptCorruption');

    // Monster targets the warlock themselves
    const monsterAction = { type: 'attack', targets: ['w1'], damage: 20 };
    cs.checkMonsterPassthroughConversion(monsterAction, []);

    expect(spy).not.toHaveBeenCalled();
  });

  it('3b: adds a warlock_conversion log entry on successful conversion', () => {
    ws.recordWarlockMonsterAttack('w1');
    jest.spyOn(ws, 'attemptCorruption').mockReturnValue({ success: true });

    const log: any[] = [];
    const monsterAction = { type: 'attack', targets: ['p1'], damage: 20 };
    cs.checkMonsterPassthroughConversion(monsterAction, log);

    expect(log).toHaveLength(1);
    expect(log[0].type).toBe('warlock_conversion');
    expect(log[0].public).toBe(false);
    expect(log[0].details.trigger).toBe('monster_passthrough');
  });

  it('3b: only converts each player once per round even with multiple warlocks', () => {
    const warlock2 = makePlayer('w2', 'Warlock2', true);
    players.set('w2', warlock2);
    ws.assignInitialWarlocks(['w1', 'w2']);

    ws.recordWarlockMonsterAttack('w1');
    ws.recordWarlockMonsterAttack('w2');

    // First attempt succeeds — second should be skipped for the same player
    const spy = jest.spyOn(ws, 'attemptCorruption').mockReturnValue({ success: true });

    const monsterAction = { type: 'attack', targets: ['p1'], damage: 20 };
    cs.checkMonsterPassthroughConversion(monsterAction, []);

    // Only one call for 'p1' (breaks after first success)
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
