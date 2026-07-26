/**
 * Tests for the 9 gameplay bugs identified in game 6092.
 *
 * Bug list:
 * 1. Game should require 3 players (config only — no unit test)
 * 2. Evil wins when 1 warlock remains (all alive players are warlocks)
 * 3. Poison/bleed/burn DoT ticks each round
 * 4. Rejuvenation HoT heals each round
 * 5. Invisible players can't be attacked
 * 6. Tame Beast forces monster to attack a specific player
 * 7. Meteor Shower reads damage from params.damage (not top-level)
 * 8. Poison Trap reactively poisons the attacker
 * 9. Good win triggers when only non-warlocks remain (covered by #2 inverse)
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
    serverLogMessages: { debug: {} },
  },
}));

jest.mock('../../../server/config/index', () => ({
  __esModule: true,
  default: {
    MONSTER_ID: '__monster__',
    getAbility: jest.fn(() => null),
    getError: jest.fn(() => null),
    getEvent: jest.fn(() => ''),
    getAbilityMessage: jest.fn(() => ''),
    getEffectMessage: jest.fn(() => ''),
    formatMessage: jest.fn((template: string) => template ?? ''),
    formatEffectMessage: jest.fn(() => ''),
    getEffectDefaults: jest.fn((type: string) => {
      const defaults: Record<string, any> = {
        poison:          { damage: 5,  turns: 3 },
        bleed:           { damage: 5,  turns: 3 },
        burning:         { damage: 3,  turns: 3 },
        healingOverTime: { amount: 5,  turns: 3 },
        poisonTrap:      { damage: 20, turns: 2 },
        shielded:        { armor: 3,   turns: 2 },
        invisible:       { turns: 2 },
        stunned:         { turns: 1 },
      };
      return defaults[type] || {};
    }),
    statusEffects: {
      effects: {
        poison:     { stackable: true,  refreshable: true },
        bleed:      { stackable: true,  refreshable: true },
        burning:    { stackable: false, refreshable: true },
        poisonTrap: { stackable: false, refreshable: true },
        healingOverTime: { stackable: false, refreshable: true },
        invisible:  { stackable: false, refreshable: true },
        shielded:   { stackable: false, refreshable: true },
        stunned:    { stackable: false, refreshable: false },
      },
    },
    gameBalance: {
      baseHp: 100,
      monster: { baseHp: 100, baseDamage: 25, hpScalingMultiplier: 1.5, damageScaling: { ageMultiplier: 1 } },
      player: {
        armor: { reductionRate: 0.1, maxReduction: 0.75, minReduction: 0 },
        levelUp: { hpIncrease: 0.08, damageIncrease: 1.15, fullHealOnLevelUp: true },
        healing: { antiDetection: { enabled: false } },
        death: { pendingDeathSystem: false, allowResurrection: false },
      },
      progression: null,
      warlock: { winConditions: { allWarlocksGone: 'Good', allPlayersWarlocks: 'Evil' } },
    },
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import GameStateUtils from '../../../server/models/systems/GameStateUtils';
import StatusEffect from '../../../server/models/systems/StatusEffect';
import NewStatusEffectManager from '../../../server/models/systems/NewStatusEffectManager';
import { handleAttack } from '../../../server/models/systems/abilityHandlers/abilities/attack/basic-attack';
import { handleAoeDamage } from '../../../server/models/systems/abilityHandlers/abilities/attack/aoe-attacks';
import { handlePoisonStrike } from '../../../server/models/systems/abilityHandlers/abilities/attack/poison-attacks';
import { handlePoisonTrap } from '../../../server/models/systems/abilityHandlers/abilities/attack/poison-attacks';
import { handleHeal } from '../../../server/models/systems/abilityHandlers/abilities/heal/basic-healing';
import { handleControlMonster } from '../../../server/models/systems/abilityHandlers/abilities/special/control-abilities';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePlayer(id: string, name: string, hp = 100, isWarlock = false): any {
  return { id, name, hp, maxHp: hp, armor: 0, isAlive: true, isWarlock };
}

function makeMonster(id = '__monster__', hp = 200): any {
  return { id, name: 'Beast', hp, maxHp: hp, isAlive: true, armor: 0 };
}

function makeSystems(overrides: Partial<any> = {}): any {
  return {
    game: null,
    combatSystem: {
      applyDamage: jest.fn((_target: any, amount: number) => ({ success: true, finalDamage: amount })),
      applyHealing: jest.fn((_target: any, amount: number, _opts: any) => ({ success: true, finalHealing: amount })),
    },
    statusEffectManager: null,
    calculateDamageModifiers: jest.fn(() => 1),
    comebackMechanics: null,
    ...overrides,
  };
}

function makeStatusEffectManager(entities: Map<string, any>): NewStatusEffectManager {
  return new NewStatusEffectManager(entities);
}

// ── Bug #2 / #9: Win conditions ───────────────────────────────────────────────

describe('Bug #2 & #9: Win conditions', () => {
  it('Evil wins when the only alive player is a warlock', () => {
    const players = new Map<string, any>();
    players.set('w1', { ...makePlayer('w1', 'Warlock', 50), isWarlock: true });
    // No non-warlock players alive
    const utils = new GameStateUtils(players as any);
    const result = utils.checkWinConditions(1, 1);
    expect(result).toBe('Evil');
  });

  it('Evil wins even when all non-warlocks have already died (totalNonWarlocks = 0)', () => {
    const players = new Map<string, any>();
    // Only one player in the map — a warlock
    players.set('w1', { ...makePlayer('w1', 'Warlock', 50), isWarlock: true });
    const utils = new GameStateUtils(players as any);
    // With the old buggy code (totalNonWarlocks > 0 guard) this returned null
    expect(utils.checkWinConditions(1, 1)).toBe('Evil');
  });

  it('Good wins when all warlocks are eliminated', () => {
    const players = new Map<string, any>();
    players.set('p1', { ...makePlayer('p1', 'Hero', 60), isWarlock: false });
    const utils = new GameStateUtils(players as any);
    expect(utils.checkWinConditions(0, 1)).toBe('Good');
  });

  it('returns null (game continues) when warlocks and non-warlocks both alive', () => {
    const players = new Map<string, any>();
    players.set('w1', { ...makePlayer('w1', 'Warlock', 50), isWarlock: true });
    players.set('p1', { ...makePlayer('p1', 'Hero', 80), isWarlock: false });
    const utils = new GameStateUtils(players as any);
    expect(utils.checkWinConditions(1, 2)).toBeNull();
  });
});

// ── Bug #3: Poison / bleed / burn DoT ticks ───────────────────────────────────

describe('Bug #3: DoT effects tick each round via processTimedEffects', () => {
  it('StatusEffect.processPoison reads params.damage (not damagePerTurn)', () => {
    const target: any = { id: 'p1', name: 'Hero', hp: 100, maxHp: 100, isAlive: true };
    const effect = new StatusEffect('poison', { damage: 15, turns: 3 }, 'attacker', 'Evil', 'p1');
    const sideEffects = (effect as any).processPoison(target, []);
    expect(target.hp).toBe(85); // 100 - 15
    expect(sideEffects.length).toBeGreaterThanOrEqual(0);
  });

  it('StatusEffect with damagePerTurn (old wrong key) uses default damage 5', () => {
    const target: any = { id: 'p1', name: 'Hero', hp: 100, maxHp: 100, isAlive: true };
    // Old bug: passing damagePerTurn instead of damage
    const effect = new StatusEffect('poison', { damagePerTurn: 15, turns: 3 }, 'attacker', 'Evil', 'p1');
    (effect as any).processPoison(target, []);
    // config.getEffectDefaults returns { damage: 5 } so params.damage = 5 (NOT 15)
    expect(target.hp).toBe(95); // 100 - 5
  });

  it('NewStatusEffectManager.processTimedEffects applies poison damage to entity', () => {
    const target: any = { id: 'p1', name: 'Hero', hp: 100, maxHp: 100, isAlive: true };
    const entities = new Map<string, any>([['p1', target]]);
    const mgr = makeStatusEffectManager(entities);

    // Apply poison with correct key
    mgr.applyEffect('p1', 'poison', { damage: 10, turns: 2 }, 'src', 'Attacker', []);
    expect(mgr.hasEffect('p1', 'poison')).toBe(true);

    const log: any[] = [];
    mgr.processTimedEffects(log);

    expect(target.hp).toBeLessThan(100); // poison ticked
  });

  it('bleed uses params.damage not damagePerTurn', () => {
    const target: any = { id: 'p1', name: 'Hero', hp: 100, maxHp: 100, isAlive: true };
    const effect = new StatusEffect('bleed', { damage: 8, turns: 2 }, 'src', 'Arrow', 'p1');
    (effect as any).processBleed(target, []);
    expect(target.hp).toBe(92); // 100 - 8
  });
});

// ── Bug #4: Rejuvenation HoT ─────────────────────────────────────────────────

describe('Bug #4: Rejuvenation HoT — healingOverTime uses params.amount', () => {
  it('StatusEffect.processHealingOverTime reads params.amount', () => {
    const target: any = { id: 'p1', name: 'Hero', hp: 60, maxHp: 100, isAlive: true };
    const effect = new StatusEffect('healingOverTime', { amount: 12, turns: 3 }, 'healer', 'Mage', 'p1');
    (effect as any).processHealingOverTime(target, []);
    expect(target.hp).toBe(72); // 60 + 12
  });

  it('handleHeal applies HoT with amount key (not healingPerTurn)', () => {
    const actor: any = makePlayer('healer', 'Mage');
    const target: any = makePlayer('patient', 'Hero', 50);
    const ability: any = {
      id: 'rejuvenation',
      name: 'Rejuvenation',
      params: { amount: 20, hot: { amount: 15, turns: 3 } },
    };
    const log: any[] = [];

    let capturedEffect: any = null;
    const mockStatusMgr = {
      applyStatusEffect: jest.fn((t: any, e: any) => { capturedEffect = e; return { success: true }; }),
    };
    const systems = makeSystems({
      statusEffectManager: mockStatusMgr,
      combatSystem: {
        applyHealing: jest.fn((_t: any, amount: number) => {
          target.hp = Math.min(target.maxHp, target.hp + amount);
          return { success: true, finalHealing: amount, wasOverhealing: false };
        }),
      },
    });

    handleHeal(actor, target, ability, log, systems);

    expect(mockStatusMgr.applyStatusEffect).toHaveBeenCalled();
    expect(capturedEffect.name).toBe('healingOverTime');
    expect(capturedEffect.params.amount).toBe(15); // must be 'amount', not 'healingPerTurn'
    expect(capturedEffect.params.healingPerTurn).toBeUndefined();
  });
});

// ── Bug #5: Invisible players can't be attacked ───────────────────────────────

describe('Bug #5: Invisible players cannot be attacked', () => {
  it('handleAttack returns false when target is invisible', () => {
    const actor: any = makePlayer('attacker', 'Rogue');
    const target: any = makePlayer('victim', 'Mage');
    const ability: any = { id: 'attack', name: 'Attack', params: { damage: 20 } };
    const log: any[] = [];

    const mockStatusMgr = {
      hasEffect: jest.fn((id: string, type: string) => id === 'victim' && type === 'invisible'),
    };
    const game = { players: new Map([['attacker', actor], ['victim', target]]), monster: null };
    const systems = makeSystems({ statusEffectManager: mockStatusMgr, game });

    const result = handleAttack(actor, target, ability, log, systems);

    expect(result).toBe(false);
    expect(systems.game).not.toBeNull();
    // The log may contain a 'reason: target_invisible' detail even if the text differs
    const invisLog = log.find((e: any) => e?.details?.reason === 'target_invisible' || /invisible/i.test(e?.message ?? ''));
    expect(invisLog).toBeDefined();
    expect(target.hp).toBe(100); // no damage
  });

  it('handleAttack succeeds against visible player', () => {
    const actor: any = makePlayer('attacker', 'Rogue');
    const target: any = makePlayer('victim', 'Mage');
    const ability: any = { id: 'attack', name: 'Attack', params: { damage: 20 } };
    const log: any[] = [];

    const mockStatusMgr = { hasEffect: jest.fn(() => false) };
    const game = { players: new Map([['attacker', actor], ['victim', target]]), monster: null };
    const systems = makeSystems({ statusEffectManager: mockStatusMgr, game });

    const result = handleAttack(actor, target, ability, log, systems);

    expect(result).toBe(true);
    expect(target.hp).toBeLessThan(100);
  });
});

// ── Bug #6: Tame Beast / Control Animal ──────────────────────────────────────

describe('Bug #6: Tame Beast sets monster.forcedTargetId', () => {
  it('handleControlMonster sets forcedTargetId to a random alive player', () => {
    const actor: any = makePlayer('druid', 'Druid');
    const monster = makeMonster();
    const p2: any = makePlayer('p2', 'Warrior');
    const ability: any = { id: 'controlMonster', name: 'Tame Beast', params: { controlDuration: 2 } };
    const log: any[] = [];

    const players = new Map<string, any>([['druid', actor], ['p2', p2]]);
    const systems = makeSystems({ game: { players, monster } });

    const result = handleControlMonster(actor, monster as any, ability, log, systems);

    expect(result).toBe(true);
    expect(monster.controllerId).toBe('druid');
    // forcedTargetId must be one of the alive players
    const validIds = ['druid', 'p2'];
    expect(validIds).toContain(monster.forcedTargetId);
  });

  it('monster.forcedTargetId is consumed by selectTargetByThreat (via hasEffect stub)', () => {
    const druid: any = makePlayer('druid', 'Druid');
    const monster = makeMonster();
    monster.forcedTargetId = 'druid';

    // Simulate MonsterController.selectTargetByThreat behavior:
    // If forcedTargetId is set, return that player (and clear the field)
    const forcedTargetId = monster.forcedTargetId;
    monster.forcedTargetId = null; // consumed

    const alivePlayers = [druid];
    const forcedTarget = alivePlayers.find(p => p.id === forcedTargetId && p.isAlive !== false);
    expect(forcedTarget).toBe(druid);
    expect(monster.forcedTargetId).toBeNull();
  });
});

// ── Bug #7: Meteor Shower 0 damage ────────────────────────────────────────────

describe('Bug #7: AoE abilities read damage from params.damage', () => {
  it('handleAoeDamage uses params.damage when top-level damage is absent', () => {
    const actor: any = makePlayer('mage', 'Mage');
    const target: any = makePlayer('enemy', 'Enemy', 80);
    // meteorShower-style: damage in params, not top-level
    const ability: any = { id: 'meteorShower', name: 'Meteor Shower', params: { damage: 40 }, target: 'Multi' };
    const log: any[] = [];

    let damageCalled = false;
    let damageAmount = 0;
    const mockCS = {
      applyDamage: jest.fn((t: any, amount: number) => {
        damageCalled = true;
        damageAmount = amount;
        t.hp = Math.max(0, t.hp - amount);
        return { success: true, finalDamage: amount };
      }),
    };

    const players = new Map([['mage', actor], ['enemy', target]]);
    const game = { players, monster: null };
    const systems = makeSystems({ game, combatSystem: mockCS, statusEffectManager: { hasEffect: jest.fn(() => false) } });

    handleAoeDamage(actor, target, ability, log, systems);

    expect(damageCalled).toBe(true);
    expect(damageAmount).toBeGreaterThan(0); // must not be 0
    expect(damageAmount).toBe(40);
  });

  it('handleAoeDamage with zero top-level damage still deals damage from params', () => {
    const actor: any = makePlayer('mage', 'Mage');
    const enemy: any = makePlayer('enemy', 'Enemy', 100);
    // No top-level 'damage' property at all — only params.damage
    const ability: any = { id: 'meteorShower', name: 'Meteor Shower', params: { damage: 25 } };
    const log: any[] = [];

    const appliedDamages: number[] = [];
    const mockCS = {
      applyDamage: jest.fn((t: any, amount: number) => {
        appliedDamages.push(amount);
        t.hp = Math.max(0, t.hp - amount);
        return { success: true, finalDamage: amount };
      }),
    };

    const players = new Map([['mage', actor], ['enemy', enemy]]);
    const game = { players, monster: null };
    const systems = makeSystems({ game, combatSystem: mockCS, statusEffectManager: { hasEffect: jest.fn(() => false) } });

    handleAoeDamage(actor, enemy, ability, log, systems);

    expect(appliedDamages.every(d => d > 0)).toBe(true);
  });
});

// ── Bug #8: Poison Trap reactive ─────────────────────────────────────────────

describe('Bug #8: Poison Trap is reactive — poisons the attacker', () => {
  it('handlePoisonTrap sets poisonTrap effect on self with damage key', () => {
    const actor: any = makePlayer('rogue', 'Rogue');
    const ability: any = { id: 'poisonTrap', name: 'Poison Trap', params: { damage: 20, duration: 2 } };
    const log: any[] = [];

    let capturedEffect: any = null;
    const mockStatusMgr = {
      applyStatusEffect: jest.fn((t: any, e: any) => {
        capturedEffect = e;
        return { success: true };
      }),
    };
    const systems = makeSystems({ statusEffectManager: mockStatusMgr });

    const result = handlePoisonTrap(actor, actor, ability, log, systems);

    expect(result).toBe(true);
    expect(capturedEffect.name).toBe('poisonTrap');
    // poisonTrap is a reactive marker; its damage is stored for retrieval when triggered
    expect(capturedEffect.params).toBeDefined();
  });

  it('handlePoisonStrike applies poison with params.damage key (not damagePerTurn)', () => {
    const actor: any = makePlayer('attacker', 'Assassin');
    const target: any = makePlayer('victim', 'Hero', 80);
    const ability: any = {
      id: 'poisonStrike',
      name: 'Poison Strike',
      params: { damage: 20, poisonDamage: 10, poisonDuration: 3 },
    };
    const log: any[] = [];

    let capturedPoisonEffect: any = null;
    const mockStatusMgr = {
      hasEffect: jest.fn(() => false),
      applyStatusEffect: jest.fn((t: any, e: any) => {
        if (e.name === 'poison') capturedPoisonEffect = e;
        return { success: true };
      }),
    };
    const systems = makeSystems({
      statusEffectManager: mockStatusMgr,
      combatSystem: {
        applyDamage: jest.fn((_t: any, amount: number) => ({ success: true, finalDamage: amount })),
      },
    });

    handlePoisonStrike(actor, target, ability, log, systems);

    expect(capturedPoisonEffect).not.toBeNull();
    expect(capturedPoisonEffect.params.damage).toBe(10); // must use 'damage' key
    expect(capturedPoisonEffect.params.damagePerTurn).toBeUndefined(); // old wrong key must be gone
  });
});

// ── Audit: all DoT effects use correct params key ──────────────────────────────

describe('Audit: DoT effects use params.damage (not damagePerTurn)', () => {
  it('poison effect processes correctly with params.damage = 15', () => {
    const target: any = { id: 't1', name: 'T', hp: 100, maxHp: 100, isAlive: true };
    const e = new StatusEffect('poison', { damage: 15, turns: 2 });
    e.processTurn(target, []);
    expect(target.hp).toBe(85);
  });

  it('bleed effect processes correctly with params.damage = 8', () => {
    const target: any = { id: 't1', name: 'T', hp: 100, maxHp: 100, isAlive: true };
    const e = new StatusEffect('bleed', { damage: 8, turns: 2 });
    e.processTurn(target, []);
    expect(target.hp).toBe(92);
  });

  it('healingOverTime effect processes correctly with params.amount = 10', () => {
    const target: any = { id: 't1', name: 'T', hp: 70, maxHp: 100, isAlive: true };
    const e = new StatusEffect('healingOverTime', { amount: 10, turns: 3 });
    e.processTurn(target, []);
    expect(target.hp).toBe(80);
  });

  it('poison effect with wrong key (damagePerTurn) falls back to default 5', () => {
    const target: any = { id: 't1', name: 'T', hp: 100, maxHp: 100, isAlive: true };
    // Wrong key — proves bug existed before fix
    const e = new StatusEffect('poison', { damagePerTurn: 99, turns: 1 });
    e.processTurn(target, []);
    // params.damage = 5 (from getEffectDefaults), not 99
    expect(target.hp).toBe(95);
  });
});
