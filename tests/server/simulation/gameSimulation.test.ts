/**
 * Game simulation tests — wire up real Player and CombatSystem objects,
 * submit abilities, and assert that combat resolves correctly end-to-end.
 *
 * We mock only the two modules that cannot run in CommonJS/Jest:
 *   - logger     (uses import.meta.url)
 *   - config     (heavy loader chain)
 *   - messages   (imported by PlayerAbilities / PlayerEffects)
 *
 * Everything else (Player, CombatSystem, DamageCalculator, EffectManager,
 * TurnResolver, PlayerAbilities, PlayerStats, PlayerEffects) runs real code.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────
// All mock content is inlined directly inside each factory to avoid
// the jest.mock hoisting / const-TDZ reference problem.

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
    getError: jest.fn((_key: string) => 'validation-error'),
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
    gameBalance: {
      baseHp: 100,
      monster: {
        baseHp: 100,
        baseDamage: 25,
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
  },
}));

// ── Real imports (after mocks are registered) ─────────────────────────────────

import { Player } from '../../../server/models/Player';
import { CombatSystem } from '../../../server/models/systems/CombatSystem';

// ── Constants & helpers ───────────────────────────────────────────────────────

const MONSTER_ID = '__monster__';

/** Basic attack ability — the minimum an unlocked ability needs */
const ATTACK_ABILITY = {
  id: 'attack',
  name: 'Slash',
  category: 'Attack',
  target: 'Single',
  params: { damage: 20 },
};

/** Create a player with the basic attack ability unlocked */
function makePlayer(id: string, name: string, hp = 100): Player {
  const p = new Player({ id, name, hp, maxHp: hp, armor: 0 });
  // Bypass the loader — directly set the unlocked list on the domain model
  (p.playerAbilities as any)['unlocked'] = [ATTACK_ABILITY];
  return p;
}

/** Create a plain monster object (no class, just data) */
function makeMonster(hp = 150): any {
  return {
    id: MONSTER_ID,
    name: 'Dread Beast',
    hp,
    maxHp: hp,
    isAlive: true,
    armor: 0,
    attackPower: 25,
    baseDmg: 25,
    age: 0,
  };
}

/**
 * Create a stub MonsterController whose processMonsterAction attacks the
 * first alive player for a fixed amount.
 */
function makeMonsterController(monster: any, monsterDmg = 25): any {
  return {
    monster,
    processMonsterAction: jest.fn().mockImplementation(
      async (alivePlayers: any[], log: any[]) => {
        const target = alivePlayers[0];
        if (!target) return null;
        target.hp = Math.max(0, target.hp - monsterDmg);
        if (target.hp <= 0) target.isAlive = false;
        log.push({
          type: 'monster-attack',
          message: `${monster.name} strikes ${target.name} for ${monsterDmg} damage!`,
          public: true,
        });
        return { type: 'attack', damage: monsterDmg, targets: [target.id] };
      }
    ),
  };
}

/** Wire together a CombatSystem with stub subsystems */
function makeCombatSystem(players: Map<string, Player>, mc: any): CombatSystem {
  return new CombatSystem({
    players,
    monsterController: mc,
    statusEffectManager: null,
    racialAbilitySystem: null,
    warlockSystem: null,
    gameStateUtils: null,
  });
}

/** Minimal game room object */
function makeGameRoom(monster: any, round = 0): any {
  return {
    code: 'SIM01',
    round,
    level: 1,
    monster,
    systems: { abilityRegistry: null }, // triggers fallback combat path
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Game Simulation', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Single-player rounds ─────────────────────────────────────────────────

  describe('single player attacks the monster', () => {
    it('round succeeds and the monster loses HP', async () => {
      const players = new Map<string, Player>();
      const monster = makeMonster(150);
      const alice = makePlayer('alice', 'Alice');
      players.set('alice', alice);
      alice.submitAction('attack', MONSTER_ID);

      const result = await makeCombatSystem(players, makeMonsterController(monster))
        .processRound(makeGameRoom(monster));

      expect(result.success).toBe(true);
      expect(result.roundSummary.abilitiesUsed).toBe(1);
      expect(monster.hp).toBeLessThan(150);
    });

    it('a log entry is produced for the attack', async () => {
      const players = new Map<string, Player>();
      const monster = makeMonster(150);
      const alice = makePlayer('alice', 'Alice');
      players.set('alice', alice);
      alice.submitAction('attack', MONSTER_ID);

      const result = await makeCombatSystem(players, makeMonsterController(monster))
        .processRound(makeGameRoom(monster));

      expect(result.log.length).toBeGreaterThan(0);
    });

    it('the monster counterattacks after surviving player actions', async () => {
      const players = new Map<string, Player>();
      const monster = makeMonster(150); // survives one hit
      const alice = makePlayer('alice', 'Alice');
      players.set('alice', alice);
      const mc = makeMonsterController(monster, 25);
      alice.submitAction('attack', MONSTER_ID);

      await makeCombatSystem(players, mc).processRound(makeGameRoom(monster));

      expect(mc.processMonsterAction).toHaveBeenCalledTimes(1);
      expect(alice.hp).toBe(75); // 100 − 25
    });

    it('the round counter increments after each round', async () => {
      const players = new Map<string, Player>();
      const monster = makeMonster(150);
      players.set('alice', makePlayer('alice', 'Alice'));
      players.get('alice')!.submitAction('attack', MONSTER_ID);

      const room = makeGameRoom(monster, 0);
      await makeCombatSystem(players, makeMonsterController(monster)).processRound(room);

      expect(room.round).toBe(1);
    });
  });

  // ── Multi-player rounds ──────────────────────────────────────────────────

  describe('multiple players attack together', () => {
    it('each submitted action is executed', async () => {
      const players = new Map<string, Player>();
      const monster = makeMonster(1000);
      ['Alice', 'Bob', 'Carol'].forEach(name => {
        const p = makePlayer(name.toLowerCase(), name);
        players.set(name.toLowerCase(), p);
        p.submitAction('attack', MONSTER_ID);
      });

      const result = await makeCombatSystem(players, makeMonsterController(monster))
        .processRound(makeGameRoom(monster));

      expect(result.success).toBe(true);
      expect(result.roundSummary.abilitiesUsed).toBe(3);
      // Three hits of 20 each → 1000 − 60 = 940
      expect(monster.hp).toBe(940);
    });

    it('two players using the same ability counts as coordinated', async () => {
      const players = new Map<string, Player>();
      const monster = makeMonster(500);
      ['alice', 'bob'].forEach(id => {
        const p = makePlayer(id, id.charAt(0).toUpperCase() + id.slice(1));
        players.set(id, p);
        p.submitAction('attack', MONSTER_ID);
      });

      const result = await makeCombatSystem(players, makeMonsterController(monster))
        .processRound(makeGameRoom(monster));

      expect(result.roundSummary.coordinatedActions).toBeGreaterThan(0);
    });

    it('players who skip their turn contribute zero damage', async () => {
      const players = new Map<string, Player>();
      const monster = makeMonster(500);
      players.set('alice', makePlayer('alice', 'Alice'));
      players.set('bob', makePlayer('bob', 'Bob'));
      players.set('carol', makePlayer('carol', 'Carol'));
      // Only Alice submits
      players.get('alice')!.submitAction('attack', MONSTER_ID);

      const result = await makeCombatSystem(players, makeMonsterController(monster))
        .processRound(makeGameRoom(monster));

      expect(result.roundSummary.abilitiesUsed).toBe(1);
    });

    it('no one submitting an action produces an empty ability count', async () => {
      const players = new Map<string, Player>();
      const monster = makeMonster(500);
      players.set('alice', makePlayer('alice', 'Alice'));
      players.set('bob', makePlayer('bob', 'Bob'));
      // Neither submits

      const result = await makeCombatSystem(players, makeMonsterController(monster))
        .processRound(makeGameRoom(monster));

      expect(result.roundSummary.abilitiesUsed).toBe(0);
    });
  });

  // ── Multi-round simulation ───────────────────────────────────────────────

  describe('across multiple rounds', () => {
    it('damage accumulates each round', async () => {
      const players = new Map<string, Player>();
      const monster = makeMonster(500);
      const alice = makePlayer('alice', 'Alice');
      players.set('alice', alice);
      const mc = makeMonsterController(monster);
      const cs = makeCombatSystem(players, mc);
      const room = makeGameRoom(monster);

      alice.submitAction('attack', MONSTER_ID);
      await cs.processRound(room);
      const hpAfterR1 = monster.hp;

      alice.clearActionSubmission(); // required between rounds
      alice.submitAction('attack', MONSTER_ID);
      await cs.processRound(room);
      const hpAfterR2 = monster.hp;

      expect(hpAfterR1).toBeLessThan(500);
      expect(hpAfterR2).toBeLessThan(hpAfterR1);
    });

    it('the round number increments correctly over three rounds', async () => {
      const players = new Map<string, Player>();
      const monster = makeMonster(500);
      const alice = makePlayer('alice', 'Alice');
      players.set('alice', alice);
      const cs = makeCombatSystem(players, makeMonsterController(monster));
      const room = makeGameRoom(monster, 0);

      for (let r = 1; r <= 3; r++) {
        alice.clearActionSubmission();
        alice.submitAction('attack', MONSTER_ID);
        await cs.processRound(room);
        expect(room.round).toBe(r);
      }
    });
  });

  // ── Monster defeat ───────────────────────────────────────────────────────

  describe('monster defeat and level-up', () => {
    it('levels the party up when the monster dies', async () => {
      const players = new Map<string, Player>();
      const monster = makeMonster(5); // dies in one hit
      players.set('alice', makePlayer('alice', 'Alice'));
      players.get('alice')!.submitAction('attack', MONSTER_ID);

      const room = makeGameRoom(monster);
      const result = await makeCombatSystem(players, makeMonsterController(monster))
        .processRound(room);

      expect(result.success).toBe(true);
      expect(room.level).toBe(2);
      expect(result.roundSummary.levelUp).toBe(2);
    });

    it('monster is respawned with more HP after being killed', async () => {
      const players = new Map<string, Player>();
      const monster = makeMonster(1); // guaranteed to die from any hit
      players.set('alice', makePlayer('alice', 'Alice'));
      players.get('alice')!.submitAction('attack', MONSTER_ID);

      await makeCombatSystem(players, makeMonsterController(monster))
        .processRound(makeGameRoom(monster));

      // Respawned monster should have more than 1 HP
      expect(monster.isAlive).toBe(true);
      expect(monster.hp).toBeGreaterThan(1);
    });

    it('monster does NOT counterattack the round it dies', async () => {
      const players = new Map<string, Player>();
      const monster = makeMonster(5);
      const alice = makePlayer('alice', 'Alice');
      players.set('alice', alice);
      const mc = makeMonsterController(monster, 999); // lethal if it fires
      alice.submitAction('attack', MONSTER_ID);

      await makeCombatSystem(players, mc).processRound(makeGameRoom(monster));

      // Alice should be alive and undamaged — monster never got to act.
      // Level-up on monster death may heal alice above base HP, so assert ≥ base.
      expect(alice.isAlive).toBe(true);
      expect(alice.hp).toBeGreaterThanOrEqual(100);
      expect(mc.processMonsterAction).not.toHaveBeenCalled();
    });
  });

  // ── Validation edge cases ────────────────────────────────────────────────

  describe('action validation', () => {
    it('rejects an ability the player has not unlocked', () => {
      const player = new Player({ id: 'alice', name: 'Alice', hp: 100, maxHp: 100 });
      // No abilities in unlocked list

      const result = player.submitAction('fireball', MONSTER_ID);

      expect(result.success).toBe(false);
    });

    it('rejects an action from a dead player', () => {
      const player = makePlayer('alice', 'Alice');
      player.hp = 0;
      player.isAlive = false;

      const result = player.submitAction('attack', MONSTER_ID);

      expect(result.success).toBe(false);
    });

    it('rejects a second action submission in the same round', () => {
      const player = makePlayer('alice', 'Alice');

      const first = player.submitAction('attack', MONSTER_ID);
      const second = player.submitAction('attack', MONSTER_ID); // duplicate

      expect(first.success).toBe(true);
      expect(second.success).toBe(false);
    });
  });
});
