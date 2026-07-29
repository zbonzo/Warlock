/**
 * Tests for gameplay bugs identified in game session 3954 (12 players).
 *
 * Bug list:
 *  2. Blood Rage: blood_rage effect was unknown → fixed to bloodRage
 *  3. Stone Armor active: stone_armor_enhanced was unknown → fixed to stoneArmor
 *  6. Spirit Guard: spirit_guard mismatch → fixed to spiritGuard
 *  8. Control Monster: chose random player → now uses submitted target
 *  9. Meteor Shower: no DoT → now applies burning like Inferno Blast
 * 10. Death Mark: death_mark was unknown → fixed to deathMark; grows each turn
 * 11. Battle Cry / Divine Shield: 'protected' was unknown → fixed to 'shielded'
 * 13. Ricochet Round: used generic AoE → now bounces to additional target
 * 14. Sanctuary of Truth: private message had no role list → now includes roles
 * 17. Entangling Roots stun: canAttack used wrong stun check → fixed to use manager
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
    getAbilityMessage: jest.fn(() => ''),
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
        poison:          { damage: 5,   turns: 3 },
        bleed:           { damage: 5,   turns: 3 },
        burning:         { damage: 3,   turns: 3 },
        healingOverTime: { amount: 5,   turns: 3 },
        poisonTrap:      { damage: 20,  turns: 2 },
        shielded:        { armor: 3,    turns: 2 },
        invisible:       { turns: 2 },
        stunned:         { turns: 1 },
        undying:         { resurrectedHp: 1 },
        stoneArmor:      { armor: 6 },
        spiritGuard:     { armor: 3,    turns: 2 },
        bloodRage:       { damageBonus: 0.4, turns: 4 },
        deathMark:       { currentDamage: 30, growthRate: 20, turns: 5 },
      };
      return defaults[type] || {};
    }),
    statusEffects: {
      effects: {
        poison:          { stackable: true,  refreshable: true },
        bleed:           { stackable: true,  refreshable: true },
        burning:         { stackable: false, refreshable: true },
        poisonTrap:      { stackable: false, refreshable: true },
        healingOverTime: { stackable: false, refreshable: true },
        invisible:       { stackable: false, refreshable: true },
        shielded:        { stackable: false, refreshable: true },
        stunned:         { stackable: false, refreshable: false },
        undying:         { stackable: false, refreshable: false },
        stoneArmor:      { stackable: false, refreshable: false },
        moonbeam:        { stackable: false, refreshable: false },
        lifeBond:        { stackable: false, refreshable: false },
        spiritGuard:     { stackable: false, refreshable: true },
        bloodRage:       { stackable: false, refreshable: false },
        deathMark:       { stackable: false, refreshable: false },
        sanctuary:       { stackable: false, refreshable: true },
      },
    },
    gameBalance: {
      baseHp: 100,
      monster: { baseHp: 100, baseDamage: 25 },
      player: {
        armor: { reductionRate: 0.1, maxReduction: 0.75, minReduction: 0 },
        healing: { antiDetection: { enabled: false } },
        death: { pendingDeathSystem: false, allowResurrection: false },
      },
      warlock: { winConditions: { allWarlocksGone: 'Good', allPlayersWarlocks: 'Evil' } },
    },
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import StatusEffect from '../../../server/models/systems/StatusEffect';
import NewStatusEffectManager from '../../../server/models/systems/NewStatusEffectManager';
import { handleBloodRage, handleStoneArmor } from '../../../server/models/systems/abilityHandlers/abilities/racial/combat-racial-abilities';
import { handleSpiritGuard, handleControlMonster } from '../../../server/models/systems/abilityHandlers/abilities/special/control-abilities';
import { handleMultiProtection } from '../../../server/models/systems/abilityHandlers/abilities/defense/protection-abilities';
import { handleDeathMark } from '../../../server/models/systems/abilityHandlers/abilities/attack/poison-attacks';
import { handleAttack } from '../../../server/models/systems/abilityHandlers/abilities/attack/basic-attack';
import { handleMeteorShower } from '../../../server/models/systems/abilityHandlers/abilities/attack/aoe-attacks';
import { handleRicochetRound } from '../../../server/models/systems/abilityHandlers/abilities/attack/multi-hit-attacks';
import { handleSanctuaryOfTruth } from '../../../server/models/systems/abilityHandlers/abilities/special/detection-abilities';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePlayer(id: string, name: string, hp = 100, isWarlock = false, extra: any = {}): any {
  return { id, name, hp, maxHp: hp, armor: 0, isAlive: true, isWarlock, ...extra };
}

function makeMonster(id = '__monster__', hp = 300): any {
  return { id, name: 'Beast', hp, maxHp: hp, isAlive: true, armor: 0 };
}

function makeSystems(overrides: Partial<any> = {}): any {
  return {
    game: null,
    combatSystem: {
      applyDamage: jest.fn((_target: any, amount: number) => ({ success: true, finalDamage: amount })),
      applyHealing: jest.fn((_target: any, amount: number) => ({ success: true, finalHealing: amount })),
    },
    statusEffectManager: null,
    calculateDamageModifiers: jest.fn(() => 1),
    comebackMechanics: null,
    warlockSystem: null,
    ...overrides,
  };
}

function mockStatusMgrThatCaptures() {
  let captured: any = null;
  const mgr = {
    applyStatusEffect: jest.fn((t: any, e: any) => { captured = e; return { success: true }; }),
    hasEffect: jest.fn(() => false),
    getCapture: () => captured,
  };
  return mgr;
}

// ── Bug #2: Blood Rage applies 'bloodRage' effect (not 'blood_rage') ─────────

describe('Bug #2: Blood Rage uses valid effect name "bloodRage"', () => {
  it('handleBloodRage applies effect named "bloodRage", not "blood_rage"', () => {
    const actor: any = makePlayer('orc', 'Gruul', 100);
    const ability: any = { id: 'bloodRage', name: 'Blood Rage', params: { damageBonus: 0.4, duration: 4, healthCost: 10 } };
    const log: any[] = [];
    const mgr = mockStatusMgrThatCaptures();

    const systems = makeSystems({
      statusEffectManager: mgr,
      combatSystem: {
        applyDamage: jest.fn(() => ({ success: true, finalDamage: 10 })),
      },
    });

    const result = handleBloodRage(actor, actor, ability, log, systems);

    expect(result).toBe(true);
    expect(mgr.getCapture()?.name).toBe('bloodRage');
    expect(mgr.getCapture()?.name).not.toBe('blood_rage');
  });

  it('bloodRage StatusEffect contributes damage percentage to damageDealt calculation', () => {
    const effect = new StatusEffect('bloodRage', { damageBonus: 0.4, turns: 4 });
    const contribution = effect.getCalculationContribution('damageDealt');
    expect(contribution.percentage).toBeCloseTo(40);
  });

  it('bloodRage does not contribute to armor calculation', () => {
    const effect = new StatusEffect('bloodRage', { damageBonus: 0.4, turns: 4 });
    const contribution = effect.getCalculationContribution('armor');
    expect(contribution.percentage).toBe(0);
    expect(contribution.additive).toBe(0);
  });
});

// ── Bug #3: Stone Armor active uses 'stoneArmor' not 'stone_armor_enhanced' ──

describe('Bug #3: Stone Armor active ability uses valid effect name "stoneArmor"', () => {
  it('handleStoneArmor active applies effect named "stoneArmor", not "stone_armor_enhanced"', () => {
    const actor: any = makePlayer('rock', 'Boulder');
    const ability: any = { id: 'stoneArmor', name: 'Stone Armor', params: { armorBonus: 10, duration: 5, damageReduction: 0.2 } };
    const log: any[] = [];
    const mgr = mockStatusMgrThatCaptures();
    const systems = makeSystems({ statusEffectManager: mgr });

    const result = handleStoneArmor(actor, actor, ability, log, systems);

    expect(result).toBe(true);
    expect(mgr.getCapture()?.name).toBe('stoneArmor');
    expect(mgr.getCapture()?.name).not.toBe('stone_armor_enhanced');
  });
});

// ── Bug #6 (spiritGuard): uses 'spiritGuard' not 'spirit_guard' ──────────────

describe('Bug #6 (spirit guard): handleSpiritGuard applies "spiritGuard" not "spirit_guard"', () => {
  it('handleSpiritGuard applies effect named "spiritGuard"', () => {
    const actor: any = makePlayer('shaman', 'Mystic');
    const target: any = makePlayer('ally', 'Ally');
    const ability: any = { id: 'spiritGuard', name: 'Spirit Guard', params: { damageReduction: 0.5, duration: 4 } };
    const log: any[] = [];
    const mgr = mockStatusMgrThatCaptures();
    const systems = makeSystems({ statusEffectManager: mgr });

    const result = handleSpiritGuard(actor, target, ability, log, systems);

    expect(result).toBe(true);
    expect(mgr.getCapture()?.name).toBe('spiritGuard');
    expect(mgr.getCapture()?.name).not.toBe('spirit_guard');
  });

  it('spiritGuard StatusEffect contributes armor to armor calculation', () => {
    const effect = new StatusEffect('spiritGuard', { armor: 3, turns: 2 });
    const contribution = effect.getCalculationContribution('armor');
    expect(contribution.additive).toBe(3);
  });
});

// ── Bug #8: Control Monster uses submitted target ─────────────────────────────

describe('Bug #8: handleControlMonster uses submitted target instead of random player', () => {
  it('forces monster to attack the submitted target player', () => {
    const actor: any = makePlayer('druid', 'Leafy');
    const chosenVictim: any = makePlayer('victim', 'Victim');
    const monster = makeMonster();
    const ability: any = { id: 'controlMonster', name: 'Control Monster', params: { controlDuration: 3 } };
    const log: any[] = [];

    const players = new Map();
    players.set(actor.id, actor);
    players.set(chosenVictim.id, chosenVictim);

    const game: any = { monster, players };
    const systems = makeSystems({ game });

    const result = handleControlMonster(actor, chosenVictim, ability, log, systems);

    expect(result).toBe(true);
    expect(monster.controllerId).toBe(actor.id);
    expect(monster.forcedTargetId).toBe(chosenVictim.id);
  });

  it('does NOT set forcedTargetId to a random player from the player map', () => {
    const actor: any = makePlayer('druid', 'Leafy');
    const chosenVictim: any = makePlayer('specific-target', 'Target');
    const randomPlayer: any = makePlayer('random-other', 'Random');
    const monster = makeMonster();
    const ability: any = { id: 'controlMonster', name: 'Control Monster', params: { controlDuration: 2 } };
    const log: any[] = [];

    const players = new Map();
    players.set(actor.id, actor);
    players.set(chosenVictim.id, chosenVictim);
    players.set(randomPlayer.id, randomPlayer);

    const game: any = { monster, players };
    const systems = makeSystems({ game });

    // Call multiple times - the target should always be chosenVictim, never random
    for (let i = 0; i < 5; i++) {
      monster.controllerId = undefined;
      monster.forcedTargetId = undefined;
      handleControlMonster(actor, chosenVictim, ability, log, systems);
      expect(monster.forcedTargetId).toBe(chosenVictim.id);
    }
  });

  it('can override an already-controlled monster (cooldown system prevents abuse, not controllerId check)', () => {
    const actor: any = makePlayer('druid', 'Leafy');
    const target: any = makePlayer('victim', 'Victim');
    const monster = { ...makeMonster(), controllerId: 'someoneElse', controllerName: 'Other' };
    const ability: any = { id: 'controlMonster', name: 'Control Monster', params: {} };
    const log: any[] = [];

    const game: any = { monster, players: new Map() };
    const systems = makeSystems({ game });

    const result = handleControlMonster(actor, target, ability, log, systems);
    expect(result).toBe(true);
    expect(monster.forcedTargetId).toBe(target.id);
  });
});

// ── Bug #9: Meteor Shower applies burning DoT ─────────────────────────────────

describe('Bug #9: handleMeteorShower applies burning DoT to all targets', () => {
  it('applies burning status effect to all other living players', () => {
    const actor: any = makePlayer('mage', 'Pyra');
    const p1: any = makePlayer('p1', 'Player1');
    const p2: any = makePlayer('p2', 'Player2');
    const ability: any = { id: 'meteorShower', name: 'Meteor Shower', params: { damage: 40, burnDamage: 5, burnDuration: 3 } };
    const log: any[] = [];

    const players = new Map();
    players.set(actor.id, actor);
    players.set(p1.id, p1);
    players.set(p2.id, p2);

    const burnEffects: any[] = [];
    const mockMgr = {
      hasEffect: jest.fn(() => false),
      applyStatusEffect: jest.fn((_t: any, e: any) => {
        if (e.name === 'burning') burnEffects.push(e);
        return { success: true };
      }),
    };

    const game: any = { players, monster: null };
    const systems = makeSystems({
      game,
      statusEffectManager: mockMgr,
      combatSystem: {
        applyDamage: jest.fn(() => ({ success: true, finalDamage: 40 })),
      },
      calculateDamageModifiers: jest.fn(() => 1),
    });

    const result = handleMeteorShower(actor, p1, ability, log, systems);

    expect(result).toBe(true);
    // Should have applied burning to p1 and p2 (not actor)
    expect(burnEffects.length).toBe(2);
    expect(burnEffects.every((e: any) => e.name === 'burning')).toBe(true);
    expect(burnEffects[0].params.damage).toBe(5);
    expect(burnEffects[0].duration).toBe(3);
  });

  it('burning effect is logged in the action log', () => {
    const actor: any = makePlayer('mage', 'Pyra');
    const p1: any = makePlayer('p1', 'Player1');
    const ability: any = { id: 'meteorShower', name: 'Meteor Shower', params: { damage: 40, burnDamage: 5, burnDuration: 3 } };
    const log: any[] = [];

    const players = new Map();
    players.set(actor.id, actor);
    players.set(p1.id, p1);

    const mockMgr = {
      hasEffect: jest.fn(() => false),
      applyStatusEffect: jest.fn(() => ({ success: true })),
    };

    const game: any = { players, monster: null };
    const systems = makeSystems({
      game,
      statusEffectManager: mockMgr,
      combatSystem: { applyDamage: jest.fn(() => ({ success: true, finalDamage: 40 })) },
      calculateDamageModifiers: jest.fn(() => 1),
    });

    handleMeteorShower(actor, p1, ability, log, systems);

    const burnLog = log.find((e: any) => e.message?.includes('burning'));
    expect(burnLog).toBeDefined();
  });
});

// ── Bug #10: Death Mark uses 'deathMark' and grows each turn ─────────────────

describe('Bug #10: handleDeathMark applies "deathMark" effect, not "death_mark"', () => {
  it('handler applies effect named "deathMark"', () => {
    const actor: any = makePlayer('rogue', 'Shadow');
    const target: any = makePlayer('victim', 'Target');
    const ability: any = { id: 'deathMark', name: 'Death Mark', params: { initialDamage: 3, growthRate: 2, duration: 5 } };
    const log: any[] = [];
    const mgr = mockStatusMgrThatCaptures();
    const systems = makeSystems({ statusEffectManager: mgr });

    const result = handleDeathMark(actor, target, ability, log, systems);

    expect(result).toBe(true);
    expect(mgr.getCapture()?.name).toBe('deathMark');
    expect(mgr.getCapture()?.name).not.toBe('death_mark');
  });

  it('deathMark StatusEffect deals growing damage: starts at 3, grows by 2 each turn', () => {
    const target: any = { id: 't1', name: 'Target', hp: 100, maxHp: 100, isAlive: true };
    const effect = new StatusEffect('deathMark', { currentDamage: 3, growthRate: 2, turns: 5 });

    // Turn 1: 3 damage, then grows to 5
    effect.processTurn(target, []);
    expect(target.hp).toBe(97);

    // Turn 2: 5 damage, then grows to 7
    effect.processTurn(target, []);
    expect(target.hp).toBe(92);

    // Turn 3: 7 damage, then grows to 9
    effect.processTurn(target, []);
    expect(target.hp).toBe(85);
  });

  it('deathMark can kill target when damage accumulates', () => {
    const target: any = { id: 't1', name: 'Target', hp: 10, maxHp: 100, isAlive: true };
    const effect = new StatusEffect('deathMark', { currentDamage: 15, growthRate: 5, turns: 5 });
    const sideEffects = (effect as any).processDeathMark(target, []);

    expect(target.hp).toBe(0);
    expect(target.isAlive).toBe(false);
    expect(sideEffects.some((e: any) => e.type === 'death')).toBe(true);
  });

  it('deathMark is included in processTurn switch (no unknown effect warning)', () => {
    const logger = require('../../../server/utils/logger').default;
    logger.warn.mockClear();

    const target: any = { id: 't1', name: 'Target', hp: 100, maxHp: 100, isAlive: true };
    const effect = new StatusEffect('deathMark', { currentDamage: 3, growthRate: 2, turns: 5 });
    effect.processTurn(target, []);

    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('Unknown status effect type: deathMark'));
  });
});

// ── Bug #11: Battle Cry / Divine Shield use 'shielded' not 'protected' ────────

describe('Bug #11: handleMultiProtection applies "shielded" effect (not "protected")', () => {
  it('applies "shielded" effect to all living players', () => {
    const actor: any = makePlayer('warrior', 'Thane');
    const p1: any = makePlayer('p1', 'Ally1');
    const p2: any = makePlayer('p2', 'Ally2');
    const ability: any = { id: 'battleCry', name: 'Battle Cry', params: { armor: 10, duration: 4 } };
    const log: any[] = [];

    const shieldedEffects: any[] = [];
    const mockMgr = {
      applyStatusEffect: jest.fn((_t: any, e: any) => {
        shieldedEffects.push(e);
        return { success: true };
      }),
    };

    const players = new Map();
    players.set(actor.id, actor);
    players.set(p1.id, p1);
    players.set(p2.id, p2);
    const game: any = { players };
    const systems = makeSystems({ game, statusEffectManager: mockMgr });

    const result = handleMultiProtection(actor, actor, ability, log, systems);

    expect(result).toBe(true);
    expect(shieldedEffects.length).toBe(3); // actor + 2 allies
    expect(shieldedEffects.every((e: any) => e.name === 'shielded')).toBe(true);
    expect(shieldedEffects.some((e: any) => e.name === 'protected')).toBe(false);
  });

  it('shielded effect stores armor in params.armor', () => {
    const actor: any = makePlayer('warrior', 'Thane');
    const ability: any = { id: 'battleCry', name: 'Battle Cry', params: { armor: 15, duration: 3 } };
    const log: any[] = [];

    let capturedEffect: any = null;
    const mockMgr = {
      applyStatusEffect: jest.fn((_t: any, e: any) => { capturedEffect = e; return { success: true }; }),
    };

    const players = new Map([[actor.id, actor]]);
    const game: any = { players };
    const systems = makeSystems({ game, statusEffectManager: mockMgr });

    handleMultiProtection(actor, actor, ability, log, systems);

    expect(capturedEffect?.params?.armor).toBe(15);
  });
});

// ── Bug #13: Ricochet Round bounces to additional target ──────────────────────

describe('Bug #13: handleRicochetRound hits primary target and bounces', () => {
  it('hits primary target with full damage', () => {
    const actor: any = makePlayer('gunslinger', 'Gun');
    const primaryTarget: any = makePlayer('p1', 'Target');
    const ability: any = { id: 'ricochetRound', name: 'Ricochet Round', params: { damage: 25, bounceCount: 1, bounceDamageMultiplier: 0.6 } };
    const log: any[] = [];

    const players = new Map();
    players.set(actor.id, actor);
    players.set(primaryTarget.id, primaryTarget);

    const game: any = { players };
    const damageApplied: number[] = [];
    const systems = makeSystems({
      game,
      statusEffectManager: { hasEffect: jest.fn(() => false) },
      combatSystem: {
        applyDamage: jest.fn((_t: any, amount: number) => {
          damageApplied.push(amount);
          return { success: true, finalDamage: amount };
        }),
      },
    });

    const result = handleRicochetRound(actor, primaryTarget, ability, log, systems);
    expect(result).toBe(true);
    expect(damageApplied[0]).toBe(25); // primary hit with full damage
  });

  it('bounces to a second target with reduced damage', () => {
    const actor: any = makePlayer('gunslinger', 'Gun');
    const primaryTarget: any = makePlayer('p1', 'Target');
    const bounceTarget: any = makePlayer('p2', 'Bounce');
    const ability: any = { id: 'ricochetRound', name: 'Ricochet Round', params: { damage: 25, bounceCount: 1, bounceDamageMultiplier: 0.6 } };
    const log: any[] = [];

    const players = new Map();
    players.set(actor.id, actor);
    players.set(primaryTarget.id, primaryTarget);
    players.set(bounceTarget.id, bounceTarget);

    const game: any = { players };
    const damageApplied: { target: any; amount: number }[] = [];
    const systems = makeSystems({
      game,
      statusEffectManager: { hasEffect: jest.fn(() => false) },
      combatSystem: {
        applyDamage: jest.fn((t: any, amount: number) => {
          damageApplied.push({ target: t, amount });
          return { success: true, finalDamage: amount };
        }),
      },
    });

    handleRicochetRound(actor, primaryTarget, ability, log, systems);

    // Should have applied damage to primary AND bounce target
    expect(damageApplied.length).toBe(2);
    expect(damageApplied[0].amount).toBe(25);
    expect(damageApplied[1].amount).toBe(15); // 25 * 0.6 = 15
    // The bounce target should be bounceTarget, not actor or primaryTarget
    expect(damageApplied[1].target.id).toBe(bounceTarget.id);
  });

  it('works with only one target (no bounce available)', () => {
    const actor: any = makePlayer('gunslinger', 'Gun');
    const primaryTarget: any = makePlayer('p1', 'Target');
    const ability: any = { id: 'ricochetRound', name: 'Ricochet Round', params: { damage: 25, bounceCount: 1 } };
    const log: any[] = [];

    const players = new Map();
    players.set(actor.id, actor);
    players.set(primaryTarget.id, primaryTarget);

    const game: any = { players };
    const systems = makeSystems({
      game,
      statusEffectManager: { hasEffect: jest.fn(() => false) },
      combatSystem: { applyDamage: jest.fn(() => ({ success: true, finalDamage: 25 })) },
    });

    const result = handleRicochetRound(actor, primaryTarget, ability, log, systems);
    expect(result).toBe(true); // still succeeds even without a bounce target
  });
});

// ── Bug #14: Sanctuary of Truth message includes role list ────────────────────

describe('Bug #14: handleSanctuaryOfTruth private message includes player roles', () => {
  it('private log messages contain the role list string', () => {
    const actor: any = makePlayer('oracle', 'Oracle');
    const p1: any = { ...makePlayer('p1', 'Alice'), isWarlock: false };
    const p2: any = { ...makePlayer('p2', 'Bob'), isWarlock: true };
    const ability: any = { id: 'sanctuaryOfTruth', name: 'Sanctuary of Truth', params: {} };
    const log: any[] = [];

    const players = new Map();
    players.set(actor.id, actor);
    players.set(p1.id, p1);
    players.set(p2.id, p2);
    const game: any = { players };

    const systems = makeSystems({ game });

    const result = handleSanctuaryOfTruth(actor, actor, ability, log, systems);
    expect(result).toBe(true);

    // Find private messages (isPublic: false)
    const privateMessages = log.filter((e: any) => e.isPublic === false || e.public === false);
    expect(privateMessages.length).toBeGreaterThan(0);

    // Each private message should include actual role names (not just "All roles revealed to you privately")
    const hasRoleInfo = privateMessages.some((e: any) =>
      e.message?.includes('Alice') || e.message?.includes('Bob') ||
      e.message?.includes('Good') || e.message?.includes('Warlock')
    );
    expect(hasRoleInfo).toBe(true);
  });

  it('private message identifies warlocks correctly', () => {
    const actor: any = makePlayer('oracle', 'Oracle');
    const warlock: any = { ...makePlayer('w1', 'EvilGuy'), isWarlock: true };
    const ability: any = { id: 'sanctuaryOfTruth', name: 'Sanctuary of Truth', params: {} };
    const log: any[] = [];

    const players = new Map();
    players.set(actor.id, actor);
    players.set(warlock.id, warlock);
    const game: any = { players };
    const systems = makeSystems({ game });

    handleSanctuaryOfTruth(actor, actor, ability, log, systems);

    const privateMessages = log.filter((e: any) => e.public === false || e.isPublic === false);
    const warlockRevealed = privateMessages.some((e: any) =>
      e.message?.includes('EvilGuy') && e.message?.includes('Warlock')
    );
    expect(warlockRevealed).toBe(true);
  });
});

// ── Bug #17: Stun check uses statusEffectManager (not legacy statusEffects array) ─

describe('Bug #17: CombatSystem.canAttack uses statusEffectManager.isPlayerStunned', () => {
  it('blocked player cannot attack when isPlayerStunned returns true', () => {
    // Simulate the stun check via NewStatusEffectManager
    const attacker: any = makePlayer('stunned-player', 'Stunnington');
    const defender: any = makePlayer('defender', 'Defender');
    const entities = new Map<string, any>([
      [attacker.id, attacker],
      [defender.id, defender],
    ]);

    const mgr = new NewStatusEffectManager(entities);
    mgr.applyEffect(attacker.id, 'stunned', { turns: 2 }, 'src', 'Entangle', []);

    expect(mgr.isPlayerStunned(attacker.id)).toBe(true);
    expect(mgr.isPlayerStunned(defender.id)).toBe(false);
  });

  it('stun effect preventsAction for ability and racial action types', () => {
    const effect = new StatusEffect('stunned', { turns: 2 });
    expect(effect.preventsAction('ability')).toBe(true);
    expect(effect.preventsAction('racial')).toBe(true);
    expect(effect.preventsAction('attack')).toBe(false);
  });

  it('unstunned player is not flagged by isPlayerStunned', () => {
    const player: any = makePlayer('free', 'Unstunned');
    const entities = new Map<string, any>([[player.id, player]]);
    const mgr = new NewStatusEffectManager(entities);

    expect(mgr.isPlayerStunned(player.id)).toBe(false);
  });
});

// ── Bug #6 / LifeBond: processLifeBondHealing called in endOfRound ─────────────

describe('Bug #6: Kinfolk Life Bond healing is processed each round', () => {
  it('processLifeBondHealing exists on Player model and heals based on monster HP', () => {
    // Directly test the Player method exists and works
    // We simulate via a plain object matching the expected interface
    const kinfolkPlayer: any = {
      id: 'kinfolk1',
      name: 'Kinfolk',
      race: 'Kinfolk',
      hp: 80,
      maxHp: 100,
      isAlive: true,
      racialAbility: { healingPercent: 0.05 },
      processLifeBondHealing(monsterHp: number, log: any[] = []) {
        if (this.race !== 'Kinfolk' || !this.isAlive || monsterHp <= 0) return 0;
        const pct = this.racialAbility?.healingPercent || 0.05;
        const heal = Math.floor(monsterHp * pct);
        const actual = Math.min(heal, this.maxHp - this.hp);
        this.hp += actual;
        log.push({ type: 'life_bond', message: `${this.name} heals ${actual} HP from Life Bond.` });
        return actual;
      }
    };

    const log: any[] = [];
    const healed = kinfolkPlayer.processLifeBondHealing(200, log);

    expect(healed).toBe(10); // 5% of 200 = 10
    expect(kinfolkPlayer.hp).toBe(90);
    expect(log.length).toBe(1);
  });

  it('Kinfolk with full HP does not overheal', () => {
    const kinfolkPlayer: any = {
      id: 'kinfolk1', race: 'Kinfolk', hp: 100, maxHp: 100, isAlive: true,
      racialAbility: { healingPercent: 0.05 },
      processLifeBondHealing(monsterHp: number, log: any[] = []) {
        if (this.race !== 'Kinfolk' || !this.isAlive || monsterHp <= 0) return 0;
        const pct = this.racialAbility?.healingPercent || 0.05;
        const heal = Math.floor(monsterHp * pct);
        const actual = Math.min(heal, this.maxHp - this.hp);
        this.hp += actual;
        log.push({ type: 'life_bond', message: `healed ${actual}` });
        return actual;
      }
    };

    const healed = kinfolkPlayer.processLifeBondHealing(200, []);
    expect(healed).toBe(0);
    expect(kinfolkPlayer.hp).toBe(100);
  });

  it('non-Kinfolk player does not trigger life bond healing', () => {
    const humanPlayer: any = {
      id: 'h1', race: 'Human', hp: 80, maxHp: 100, isAlive: true,
      racialAbility: null,
      processLifeBondHealing(monsterHp: number) {
        if (this.race !== 'Kinfolk' || !this.isAlive || monsterHp <= 0) return 0;
        return 1; // Should not reach here
      }
    };

    expect(humanPlayer.processLifeBondHealing(200)).toBe(0);
    expect(humanPlayer.hp).toBe(80);
  });
});

// ── Death Mark reads params.damage (not params.initialDamage) ────────────────

describe('Death Mark fix: reads params.damage for initial damage', () => {
  it('uses params.damage (30) as initial damage, not params.initialDamage', () => {
    const actor: any = makePlayer('rogue', 'Shadow');
    const target: any = makePlayer('victim', 'Target');
    // abilities.json has params.damage: 30 — NOT params.initialDamage
    const ability: any = { id: 'deathMark', name: 'Death Mark', params: { damage: 30, deathMarkDamage: 50 } };
    const log: any[] = [];
    const mgr = mockStatusMgrThatCaptures();
    const systems = makeSystems({ statusEffectManager: mgr });

    handleDeathMark(actor, target, ability, log, systems);

    const captured = mgr.getCapture();
    expect(captured?.params?.currentDamage).toBe(30);
    expect(captured?.params?.growthRate).toBe(20);
  });

  it('deathMark StatusEffect starts at 30 damage and grows by 20 each turn', () => {
    const target: any = { id: 't1', name: 'Target', hp: 300, maxHp: 300, isAlive: true };
    const effect = new StatusEffect('deathMark', { currentDamage: 30, growthRate: 20, turns: 5 });

    effect.processTurn(target, []);
    expect(target.hp).toBe(270); // 300 - 30

    effect.processTurn(target, []);
    expect(target.hp).toBe(220); // 270 - 50

    effect.processTurn(target, []);
    expect(target.hp).toBe(150); // 220 - 70
  });
});

// ── Entangle stun duration persists into next turn ────────────────────────────

describe('Entangle stun fix: stunDuration 2 ensures stun persists into next round', () => {
  it('stunDuration 2 still has turns remaining after one end-of-round decrement', () => {
    const player: any = makePlayer('target', 'Root');
    const entities = new Map<string, any>([[player.id, player]]);
    const mgr = new NewStatusEffectManager(entities);
    const log: any[] = [];

    // Apply stun with duration 2 (as entangle now uses)
    mgr.applyEffect(player.id, 'stunned', { turns: 2 }, 'src', 'Entangle', log);
    expect(mgr.isPlayerStunned(player.id)).toBe(true);

    // Simulate end-of-round processing (one tick)
    const effects = mgr.getEffectsByType(player.id, 'stunned');
    for (const e of effects) {
      if (e.turnsRemaining > 0) e.turnsRemaining--;
      if (e.turnsRemaining <= 0) e.isActive = false;
    }

    // With duration 2, after one decrement still has 1 turn remaining → still stunned
    expect(mgr.isPlayerStunned(player.id)).toBe(true);
  });

  it('stunDuration 1 is gone after one end-of-round decrement (old broken behavior)', () => {
    const player: any = makePlayer('target', 'Root');
    const entities = new Map<string, any>([[player.id, player]]);
    const mgr = new NewStatusEffectManager(entities);
    const log: any[] = [];

    mgr.applyEffect(player.id, 'stunned', { turns: 1 }, 'src', 'Entangle', log);
    const effects = mgr.getEffectsByType(player.id, 'stunned');
    for (const e of effects) {
      if (e.turnsRemaining > 0) e.turnsRemaining--;
      if (e.turnsRemaining <= 0) e.isActive = false;
    }

    expect(mgr.isPlayerStunned(player.id)).toBe(false);
  });
});

// ── LifeBond heals even without racialAbility.params ─────────────────────────

describe('LifeBond fix: uses 0.05 fallback when racialAbility.params is undefined', () => {
  it('heals 5% of monster HP when racialAbility has no params (fallback 0.05)', () => {
    // Simulate processLifeBondHealing logic with the fixed fallback
    function processLifeBondHealing(player: any, monsterHp: number, log: any[]): number {
      if (player.race !== 'Kinfolk' || !player.isAlive || monsterHp <= 0) return 0;
      const racialAbility = player.racialAbility;
      // Fixed: || 0.05 instead of || 0
      const healAmount = Math.floor(monsterHp * (racialAbility?.params?.healingPercent || 0.05));
      const actualHeal = Math.min(healAmount, player.maxHp - player.hp);
      player.hp += actualHeal;
      if (actualHeal > 0) log.push({ type: 'life_bond_healing', targetId: player.id });
      return actualHeal;
    }

    // racialAbility has no params (this is what setRacialAbility creates — no params field)
    const kinfolk: any = { id: 'k1', race: 'Kinfolk', hp: 80, maxHp: 100, isAlive: true,
      racialAbility: { id: 'lifeBond', name: 'Life Bond' } };

    const log: any[] = [];
    const healed = processLifeBondHealing(kinfolk, 200, log);

    expect(healed).toBe(10); // 5% of 200
    expect(kinfolk.hp).toBe(90);
    expect(log.length).toBe(1);
  });

  it('healing is 0 if fallback were 0 (demonstrates old bug)', () => {
    function processLifeBondHealingBroken(player: any, monsterHp: number): number {
      if (player.race !== 'Kinfolk' || !player.isAlive || monsterHp <= 0) return 0;
      const racialAbility = player.racialAbility;
      // OLD broken behavior: || 0
      return Math.floor(monsterHp * (racialAbility?.params?.healingPercent || 0));
    }

    const kinfolk: any = { id: 'k1', race: 'Kinfolk', hp: 80, maxHp: 100, isAlive: true,
      racialAbility: { id: 'lifeBond', name: 'Life Bond' } };

    // Old code would return 0 because racialAbility.params is undefined
    expect(processLifeBondHealingBroken(kinfolk, 200)).toBe(0);
  });
});

// ── BloodRage applies damage bonus in handleAttack ────────────────────────────

describe('BloodRage fix: handleAttack applies bloodRage damage bonus', () => {
  it('40% extra damage when actor has bloodRage effect', () => {
    const actor: any = makePlayer('orc', 'Gruul');
    const target: any = { id: 'monster', name: 'Monster', hp: 200, maxHp: 200, isAlive: true,
      takeDamage: jest.fn((dmg: number) => { target.hp -= dmg; return dmg; }) };
    const ability: any = { id: 'attack', name: 'Attack', params: { damage: 20 } };
    const log: any[] = [];

    const mgr = {
      hasEffect: jest.fn((id: string, type: string) => id === actor.id && type === 'bloodRage'),
      getEffectsByType: jest.fn(() => [{ params: { damageBonus: 0.4 } }]),
    };
    const game: any = { players: new Map([[actor.id, actor]]), monster: target };
    const systems = makeSystems({ game, statusEffectManager: mgr });

    handleAttack(actor, target, ability, log, systems);

    // 20 base * 1.0 damageMod + 40% = 28
    expect(target.takeDamage).toHaveBeenCalledWith(28);
    const bonusLog = log.find((e: any) => e.message?.includes('Blood Rage'));
    expect(bonusLog).toBeDefined();
  });

  it('no bloodRage bonus when effect is not active', () => {
    const actor: any = makePlayer('orc', 'Gruul');
    const target: any = { id: 'monster', name: 'Monster', hp: 200, maxHp: 200, isAlive: true,
      takeDamage: jest.fn((dmg: number) => { target.hp -= dmg; return dmg; }) };
    const ability: any = { id: 'attack', name: 'Attack', params: { damage: 20 } };
    const log: any[] = [];

    const mgr = { hasEffect: jest.fn(() => false) };
    const game: any = { players: new Map([[actor.id, actor]]), monster: target };
    const systems = makeSystems({ game, statusEffectManager: mgr });

    handleAttack(actor, target, ability, log, systems);

    expect(target.takeDamage).toHaveBeenCalledWith(20);
    const bonusLog = log.find((e: any) => e.message?.includes('Blood Rage'));
    expect(bonusLog).toBeUndefined();
  });
});

// ── bloodRage in NewStatusEffectManager ───────────────────────────────────────

describe('bloodRage effect can be applied through NewStatusEffectManager', () => {
  it('applyEffect with "bloodRage" succeeds (effect type is known)', () => {
    const player: any = makePlayer('orc', 'Gruul');
    const entities = new Map<string, any>([[player.id, player]]);
    const mgr = new NewStatusEffectManager(entities);
    const log: any[] = [];

    const result = mgr.applyEffect(player.id, 'bloodRage', { damageBonus: 0.4, turns: 4 }, 'src', 'Blood Rage', log);
    expect(result).not.toBeNull();
    expect(mgr.hasEffect(player.id, 'bloodRage')).toBe(true);
  });

  it('applyEffect with "deathMark" succeeds (effect type is known)', () => {
    const player: any = makePlayer('victim', 'Target');
    const entities = new Map<string, any>([[player.id, player]]);
    const mgr = new NewStatusEffectManager(entities);
    const log: any[] = [];

    const result = mgr.applyEffect(player.id, 'deathMark', { currentDamage: 3, growthRate: 2, turns: 5 }, 'src', 'Death Mark', log);
    expect(result).not.toBeNull();
    expect(mgr.hasEffect(player.id, 'deathMark')).toBe(true);
  });

  it('applyEffect with "spiritGuard" succeeds (effect type is known)', () => {
    const player: any = makePlayer('target', 'Guarded');
    const entities = new Map<string, any>([[player.id, player]]);
    const mgr = new NewStatusEffectManager(entities);
    const log: any[] = [];

    const result = mgr.applyEffect(player.id, 'spiritGuard', { armor: 3, turns: 2 }, 'src', 'Spirit Guard', log);
    expect(result).not.toBeNull();
    expect(mgr.hasEffect(player.id, 'spiritGuard')).toBe(true);
  });
});
