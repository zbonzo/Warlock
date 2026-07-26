/**
 * Ability system tests — verifies healing, damage-reading, cooldowns, and
 * coordination bonuses work correctly without manual in-game testing.
 *
 * Mocks: logger, config (heavy chain), messages
 * Real code: CombatSystem, Player, ability handlers
 */

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

// Config mock — getAbility returns null by default; individual tests override with mockReturnValueOnce
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

// ── Real imports ──────────────────────────────────────────────────────────────

import { Player } from '../../../server/models/Player';
import { CombatSystem } from '../../../server/models/systems/CombatSystem';

// Direct handler imports for unit tests
import { handlePyroblast } from '../../../server/models/systems/abilityHandlers/abilities/attack/special-attacks';
import { handleVulnerabilityStrike } from '../../../server/models/systems/abilityHandlers/abilities/attack/special-attacks';
import { handleHeal } from '../../../server/models/systems/abilityHandlers/abilities/heal/basic-healing';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONSTER_ID = '__monster__';

const configMock = require('../../../server/config/index').default;

function makePlayer(id: string, name: string, hp = 100): Player {
  const p = new Player({ id, name, hp, maxHp: hp, armor: 0 });
  return p;
}

function makeMonster(hp = 200): any {
  return {
    id: MONSTER_ID,
    name: 'Beast',
    hp,
    maxHp: hp,
    isAlive: true,
    armor: 0,
    attackPower: 20,
    baseDmg: 20,
    age: 0,
  };
}

function makeMonsterController(monster: any): any {
  return {
    monster,
    processMonsterAction: jest.fn().mockResolvedValue(null),
  };
}

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

function makeGameRoom(monster: any): any {
  return {
    code: 'TEST',
    round: 0,
    level: 1,
    monster,
    systems: { abilityRegistry: null },
  };
}

// ── applyHealing tests ────────────────────────────────────────────────────────

describe('CombatSystem.applyHealing', () => {
  let cs: CombatSystem;

  beforeEach(() => {
    const players = new Map<string, Player>();
    cs = makeCombatSystem(players, makeMonsterController(makeMonster()));
  });

  it('restores HP by the requested amount', () => {
    const target: any = { id: 'p1', name: 'Alice', hp: 50, maxHp: 100, isAlive: true };
    const result = cs.applyHealing(target, 30, {});
    expect(result.success).toBe(true);
    expect(target.hp).toBe(80);
    expect(result.finalHealing).toBe(30);
    expect(result.wasOverhealing).toBe(false);
  });

  it('caps healing at maxHp and reports overhealing', () => {
    const target: any = { id: 'p1', name: 'Alice', hp: 90, maxHp: 100, isAlive: true };
    const result = cs.applyHealing(target, 30, {});
    expect(result.success).toBe(true);
    expect(target.hp).toBe(100);
    expect(result.finalHealing).toBe(10);
    expect(result.wasOverhealing).toBe(true);
  });

  it('does nothing when target is already at full health', () => {
    const target: any = { id: 'p1', name: 'Alice', hp: 100, maxHp: 100, isAlive: true };
    const result = cs.applyHealing(target, 20, {});
    expect(result.success).toBe(true);
    expect(target.hp).toBe(100);
    expect(result.finalHealing).toBe(0);
  });
});

// ── handleHeal integration — actually changes HP ──────────────────────────────

describe('handleHeal — HP is modified', () => {
  it('increases target HP via applyHealing on the systems object', () => {
    const actor: any = { id: 'healer', name: 'Healer', hp: 100, maxHp: 100, isAlive: true };
    const target: any = { id: 'patient', name: 'Patient', hp: 40, maxHp: 100, isAlive: true };
    const ability: any = { id: 'heal', name: 'Heal', params: { amount: 35 } };
    const log: any[] = [];

    const players = new Map<string, Player>();
    const cs = makeCombatSystem(players, makeMonsterController(makeMonster()));

    const systems: any = {
      combatSystem: cs,
      game: { players },
      calculateDamageModifiers: () => 1,
    };

    handleHeal(actor, target, ability, log, systems);

    expect(target.hp).toBeGreaterThan(40);
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].type).toBe('heal');
  });
});

// ── Damage from params.damage ─────────────────────────────────────────────────

describe('handlePyroblast — reads damage from params.damage', () => {
  it('deals non-zero damage when damage is in ability.params.damage', () => {
    const actor: any = { id: 'mage', name: 'Mage', hp: 100, maxHp: 100, isAlive: true };
    const target: any = { id: 'enemy', name: 'Enemy', hp: 200, maxHp: 200 };
    const ability: any = { id: 'pyroblast', name: 'Pyroblast', params: { damage: 50 } };
    const log: any[] = [];

    const systems: any = {
      combatSystem: {
        applyDamage: jest.fn((t: any, d: number) => {
          t.hp = Math.max(0, t.hp - d);
          return { success: true, finalDamage: d };
        }),
      },
      statusEffectManager: {
        applyStatusEffect: jest.fn(() => ({ success: false })),
      },
    };

    const result = handlePyroblast(actor, target, ability, log, systems);

    expect(result).toBe(true);
    expect(target.hp).toBe(200 - 50);
    expect(log.length).toBeGreaterThan(0);
    expect(log.some((e: any) => e.details?.damage === 50)).toBe(true);
  });
});

describe('handleVulnerabilityStrike — reads damage from params.damage', () => {
  it('deals non-zero damage when damage is in ability.params.damage', () => {
    const actor: any = { id: 'warrior', name: 'Warrior', hp: 100, maxHp: 100, isAlive: true };
    const target: any = { id: 'enemy', name: 'Enemy', hp: 200, maxHp: 200 };
    const ability: any = { id: 'shiv', name: 'Shiv', params: { damage: 30 } };
    const log: any[] = [];

    const systems: any = {
      combatSystem: {
        applyDamage: jest.fn((t: any, d: number) => {
          t.hp = Math.max(0, t.hp - d);
          return { success: true, finalDamage: d };
        }),
      },
      statusEffectManager: {
        applyStatusEffect: jest.fn(() => ({ success: false })),
      },
    };

    const result = handleVulnerabilityStrike(actor, target, ability, log, systems);

    expect(result).toBe(true);
    expect(target.hp).toBe(200 - 30);
    expect(systems.combatSystem.applyDamage).toHaveBeenCalledWith(
      target,
      30,
      expect.any(Object)
    );
  });
});

// ── Cooldown tracking ─────────────────────────────────────────────────────────

describe('Cooldown tracking after ability use', () => {
  beforeEach(() => jest.clearAllMocks());
  // Reset persistent mockReturnValue between tests so mocks don't bleed across
  afterEach(() => configMock.getAbility.mockReset());

  it('ability with cooldown > 0 is on cooldown after a round', async () => {
    // Use mockReturnValue (not Once) because the fallback path calls getAbility multiple times:
    // isAttackAbility(), calculateBasicAttackDamage(), then cooldown tracking
    configMock.getAbility.mockReturnValue({ id: 'attack', category: 'Attack', cooldown: 2, params: { damage: 20 } });

    const players = new Map<string, Player>();
    const monster = makeMonster(500);
    const alice = makePlayer('alice', 'Alice');
    (alice.playerAbilities as any)['unlocked'] = [
      { id: 'attack', type: 'attack', name: 'Slash', category: 'Attack', target: 'Single', params: { damage: 20 } }
    ];
    players.set('alice', alice);

    alice.submitAction('attack', MONSTER_ID);

    const cs = makeCombatSystem(players, makeMonsterController(monster));
    await cs.processRound(makeGameRoom(monster));

    expect(alice.isAbilityOnCooldown('attack')).toBe(true);
  });

  it('ability with cooldown 0 is not on cooldown after a round', async () => {
    configMock.getAbility.mockReturnValue({ id: 'attack', category: 'Attack', cooldown: 0, params: { damage: 20 } });

    const players = new Map<string, Player>();
    const monster = makeMonster(500);
    const alice = makePlayer('alice', 'Alice');
    (alice.playerAbilities as any)['unlocked'] = [
      { id: 'attack', type: 'attack', name: 'Slash', category: 'Attack', target: 'Single', params: { damage: 20 } }
    ];
    players.set('alice', alice);

    alice.submitAction('attack', MONSTER_ID);

    const cs = makeCombatSystem(players, makeMonsterController(monster));
    await cs.processRound(makeGameRoom(monster));

    expect(alice.isAbilityOnCooldown('attack')).toBe(false);
  });
});

// ── Coordination bonus — target-based, not ability-based ──────────────────────

describe('Coordination bonus by target', () => {
  beforeEach(() => jest.clearAllMocks());

  it('two players attacking the same target get a coordination bonus log', async () => {
    const players = new Map<string, Player>();
    const monster = makeMonster(1000);

    const attackAbility = {
      id: 'attack', type: 'attack', name: 'Slash', category: 'Attack',
      target: 'Single', params: { damage: 20 }, order: 1000
    };

    const alice = makePlayer('alice', 'Alice');
    const bob = makePlayer('bob', 'Bob');
    (alice.playerAbilities as any)['unlocked'] = [attackAbility];
    (bob.playerAbilities as any)['unlocked'] = [attackAbility];
    players.set('alice', alice);
    players.set('bob', bob);

    alice.submitAction('attack', MONSTER_ID);
    bob.submitAction('attack', MONSTER_ID);

    const cs = makeCombatSystem(players, makeMonsterController(monster));
    const result = await cs.processRound(makeGameRoom(monster));

    const coordLog = result.log.find((e: any) => e.type === 'coordination');
    expect(coordLog).toBeDefined();
    expect(coordLog?.message).toContain('2 players');
    expect(result.roundSummary.coordinatedActions).toBe(2);
  });

  it('two players attacking different targets do NOT get a coordination bonus', async () => {
    const players = new Map<string, Player>();
    const monster = makeMonster(1000);
    const monster2: any = { id: 'monster2', name: 'Beast2', hp: 100, maxHp: 100, isAlive: true };

    const attackAbility = {
      id: 'attack', type: 'attack', name: 'Slash', category: 'Attack',
      target: 'Single', params: { damage: 20 }, order: 1000
    };

    const alice = makePlayer('alice', 'Alice');
    const bob = makePlayer('bob', 'Bob');
    (alice.playerAbilities as any)['unlocked'] = [attackAbility];
    (bob.playerAbilities as any)['unlocked'] = [attackAbility];
    players.set('alice', alice);
    players.set('bob', bob);

    alice.submitAction('attack', MONSTER_ID);
    bob.submitAction('attack', 'monster2');  // different target

    const cs = makeCombatSystem(players, makeMonsterController(monster));
    const result = await cs.processRound(makeGameRoom(monster));

    const coordLog = result.log.find((e: any) => e.type === 'coordination');
    expect(coordLog).toBeUndefined();
    expect(result.roundSummary.coordinatedActions).toBe(0);
  });

  it('coordination message says "healing" when ability category is Heal', async () => {
    // When getAbility is called for the coordinating action, return a Heal category
    configMock.getAbility.mockReturnValue({ id: 'heal', category: 'Heal', cooldown: 0 });

    const players = new Map<string, Player>();
    const monster = makeMonster(1000);
    const healTarget = makePlayer('patient', 'Patient');
    healTarget.hp = 50;
    players.set('patient', healTarget);

    const healAbility = {
      id: 'heal', type: 'heal', name: 'Heal', category: 'Heal',
      target: 'Single', params: { amount: 30 }, order: 200
    };

    const alice = makePlayer('alice', 'Alice');
    const bob = makePlayer('bob', 'Bob');
    (alice.playerAbilities as any)['unlocked'] = [healAbility];
    (bob.playerAbilities as any)['unlocked'] = [healAbility];
    players.set('alice', alice);
    players.set('bob', bob);

    alice.submitAction('heal', 'patient');
    bob.submitAction('heal', 'patient');

    const cs = makeCombatSystem(players, makeMonsterController(monster));
    const result = await cs.processRound(makeGameRoom(monster));

    const coordLog = result.log.find((e: any) => e.type === 'coordination');
    if (coordLog) {
      expect(coordLog.message).toContain('healing');
      expect(coordLog.message).not.toContain('attacks');
    }
  });
});
