/**
 * Behavior mismatch tests.
 *
 * Each test asserts the EXPECTED behavior per the ability JSON definition.
 * A failing test means the handler doesn't match what the JSON specifies.
 * Fix the handler, re-run — the test should turn green.
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
    formatMessage: jest.fn((t: string) => t ?? ''),
    getError: jest.fn(() => 'error'),
    getAbilityMessage: jest.fn(() => ''),
    abilities: {
      special: {
        eyeOfFateWarlockFound: 'warlock found',
        eyeOfFateWarlockNotFound: 'not warlock',
      },
    },
  },
}));

jest.mock('../../../server/config/index', () => ({
  __esModule: true,
  default: {
    MONSTER_ID: '__monster__',
    gameBalance: { baseHp: 100 },
    getAbility: jest.fn(() => null),
    abilities: {},
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import {
  handlePyroblast,
  handleBarbedArrow,
} from '../../../server/models/systems/abilityHandlers/abilities/attack/special-attacks';

import { handleHeal } from '../../../server/models/systems/abilityHandlers/abilities/heal/basic-healing';
import { handlePoisonStrike } from '../../../server/models/systems/abilityHandlers/abilities/attack/poison-attacks';
import { handleSweepingStrike } from '../../../server/models/systems/abilityHandlers/abilities/special/barbarian-abilities';

// ── Shared helpers ────────────────────────────────────────────────────────────

function makePlayer(id: string, name: string, hp = 100): any {
  return { id, name, hp, maxHp: hp, isAlive: true, armor: 0 };
}

function makeApplyDamage() {
  return jest.fn((t: any, d: number) => {
    t.hp = Math.max(0, t.hp - d);
    return { success: true, finalDamage: d };
  });
}

function makeApplyHealing() {
  return jest.fn((t: any, amount: number) => {
    const actual = Math.min(amount, t.maxHp - t.hp);
    t.hp = Math.min(t.maxHp, t.hp + amount);
    return { success: true, finalHealing: actual, wasOverhealing: actual < amount };
  });
}

function makeStatusManager() {
  return { applyStatusEffect: jest.fn(() => ({ success: true })) };
}

// ── 1. Pyroblast — damage inflated by 1.8× ───────────────────────────────────
//
// JSON: params.damage = 50, cooldown = 3
// Handler: multiplies by 1.8 → delivers 90 damage
// Expected: damage should equal params.damage (50)

describe('pyroblast — damage should equal params.damage', () => {
  it('MISMATCH: deals 90 damage (1.8× of 50) instead of 50', () => {
    const actor = makePlayer('mage', 'Mage');
    const target = makePlayer('enemy', 'Enemy', 200);
    const ability: any = { id: 'pyroblast', name: 'Pyroblast', params: { damage: 50 } };
    const log: any[] = [];

    const applyDamage = makeApplyDamage();
    const systems: any = {
      combatSystem: { applyDamage },
      statusEffectManager: makeStatusManager(),
    };

    handlePyroblast(actor, target, ability, log, systems);

    const damageDealt = 200 - target.hp;
    // Expected per JSON: 50. Actual: 90. This assertion FAILS until handler is fixed.
    expect(damageDealt).toBe(50);
  });
});

// ── 2. Shiv — bleed status effect ────────────────────────────────────────────
//
// JSON: effect = 'bleed', params.bleed = { damage: 15, turns: 2 }
// FIXED: handleBarbedArrow now applies 'bleed' (correct name per statusEffects.json)
//        and reads damage from params.bleed.damage

describe('shiv — should apply bleed, not vulnerability', () => {
  it('applies "bleed" status via handleBarbedArrow (correct effect name)', () => {
    const actor = makePlayer('assassin', 'Assassin');
    const target = makePlayer('enemy', 'Enemy', 200);
    const ability: any = {
      id: 'shiv',
      name: 'Shiv',
      params: { damage: 30, bleed: { damage: 15, turns: 2 } },
    };
    const log: any[] = [];

    const applyStatusEffect = jest.fn(() => ({ success: true }));
    const systems: any = {
      combatSystem: { applyDamage: makeApplyDamage() },
      statusEffectManager: { applyStatusEffect },
    };

    handleBarbedArrow(actor, target, ability, log, systems);

    expect(applyStatusEffect).toHaveBeenCalledWith(
      target,
      expect.objectContaining({ name: 'bleed' }) // 'bleed' is the correct status effect name
    );
  });

  it('bleed damage reads from params.bleed.damage (15) using correct "damage" key', () => {
    const actor = makePlayer('assassin', 'Assassin');
    const target = makePlayer('enemy', 'Enemy', 200);
    const ability: any = {
      id: 'shiv',
      name: 'Shiv',
      params: { damage: 30, bleed: { damage: 15, turns: 2 } },
    };
    const log: any[] = [];

    const applyStatusEffect = jest.fn(() => ({ success: true }));
    const systems: any = {
      combatSystem: { applyDamage: makeApplyDamage() },
      statusEffectManager: { applyStatusEffect },
    };

    handleBarbedArrow(actor, target, ability, log, systems);

    expect(applyStatusEffect).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        name: 'bleed',
        params: expect.objectContaining({ damage: 15 }), // StatusEffect.processBleed reads params.damage
      })
    );
  });
});

// ── 3. AncestralHeal — missing healing-over-time ──────────────────────────────
//
// JSON: params = { amount: 30, hot: { amount: 20, turns: 2 } }
// Handler (handleHeal): applies immediate heal only, never calls applyStatusEffect
// Expected: should also apply a HoT status effect

describe('ancestralHeal — should apply healing over time', () => {
  it('handleHeal applies HoT via applyStatusEffect with params.amount key', () => {
    const actor = makePlayer('shaman', 'Shaman');
    const target = makePlayer('ally', 'Ally', 100);
    target.hp = 50;
    const ability: any = {
      id: 'ancestralHeal',
      name: 'Ancestral Heal',
      params: { amount: 30, hot: { amount: 20, turns: 2 } },
    };
    const log: any[] = [];

    const applyStatusEffect = jest.fn(() => ({ success: true }));
    const systems: any = {
      combatSystem: { applyHealing: makeApplyHealing() },
      statusEffectManager: { applyStatusEffect },
      calculateDamageModifiers: () => 1,
    };

    handleHeal(actor, target, ability, log, systems);

    // FIXED: handleHeal now applies HoT. StatusEffect.processHealingOverTime reads params.amount.
    expect(applyStatusEffect).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        name: 'healingOverTime',
        params: expect.objectContaining({ amount: 20 }), // 'amount' is the correct key
      })
    );
  });
});

// ── 4. Rejuvenation — missing HoT (same root issue as ancestralHeal) ──────────
//
// JSON: params = { amount: 25, hot: { amount: 15, turns: 3 } }
// Routed via Heal category catch-all → handleHeal, which ignores the hot field

describe('rejuvenation — should apply healing over time', () => {
  it('handleHeal applies HoT for rejuvenation with params.amount key', () => {
    const actor = makePlayer('druid', 'Druid');
    const target = makePlayer('ally', 'Ally', 100);
    target.hp = 50;
    const ability: any = {
      id: 'rejuvenation',
      name: 'Rejuvenation',
      params: { amount: 25, hot: { amount: 15, turns: 3 } },
    };
    const log: any[] = [];

    const applyStatusEffect = jest.fn(() => ({ success: true }));
    const systems: any = {
      combatSystem: { applyHealing: makeApplyHealing() },
      statusEffectManager: { applyStatusEffect },
      calculateDamageModifiers: () => 1,
    };

    handleHeal(actor, target, ability, log, systems);

    // FIXED: handleHeal now applies HoT. StatusEffect.processHealingOverTime reads params.amount.
    expect(applyStatusEffect).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        name: 'healingOverTime',
        params: expect.objectContaining({ amount: 15 }), // 'amount' is the correct key
      })
    );
  });
});

// ── 5. SweepingStrike — stun never applied ────────────────────────────────────
//
// JSON: params = { damage: 35, bonusTargets: 1, stunChance: 0.25, stunDuration: 1 }
// Handler: attacks all targets but never calls applyStatusEffect
// Expected: should apply 'stunned' to hit targets based on stunChance

describe('sweepingStrike — should apply stun on hit', () => {
  it('MISMATCH: applyStatusEffect is never called despite stunChance = 1.0 in params', () => {
    const actor = makePlayer('barbarian', 'Barbarian');
    const enemy = makePlayer('enemy', 'Enemy', 100);
    const log: any[] = [];

    const applyStatusEffect = jest.fn(() => ({ success: true }));
    const systems: any = {
      game: {
        players: new Map([
          ['barbarian', actor],
          ['enemy', enemy],
        ]),
        monster: null,
      },
      combatSystem: { applyDamage: makeApplyDamage() },
      statusEffectManager: { applyStatusEffect },
    };

    const ability: any = {
      id: 'sweepingStrike',
      name: 'Sweeping Strike',
      params: { damage: 35, stunChance: 1.0, stunDuration: 1 },
    };

    handleSweepingStrike(actor, enemy, ability, log, systems);

    // Expected: stun applied to enemy. FAILS — handler never calls applyStatusEffect.
    expect(applyStatusEffect).toHaveBeenCalledWith(
      enemy,
      expect.objectContaining({ name: 'stunned' })
    );
  });
});

// ── 6. BarbedArrow — bleed damage from params.bleed.damage ───────────────────
//
// JSON: params = { damage: 25, bleed: { damage: 18, turns: 3 } }
// FIXED: handleBarbedArrow reads bleedDamage from params.bleed.damage (18)
//        and uses 'damage' key (not 'damagePerTurn') per StatusEffect.processBleed

describe('barbedArrow — bleed damage should use params.bleed.damage', () => {
  it('reads bleed damage from params.bleed.damage (18) with correct "damage" key', () => {
    const actor = makePlayer('tracker', 'Tracker');
    const target = makePlayer('enemy', 'Enemy', 200);
    const ability: any = {
      id: 'barbedArrow',
      name: 'Barbed Arrow',
      params: { damage: 25, bleed: { damage: 18, turns: 3 } },
    };
    const log: any[] = [];

    const applyStatusEffect = jest.fn(() => ({ success: true }));
    const systems: any = {
      combatSystem: { applyDamage: makeApplyDamage() },
      statusEffectManager: { applyStatusEffect },
    };

    handleBarbedArrow(actor, target, ability, log, systems);

    // FIXED: bleed uses params.bleed.damage (18) with 'damage' key
    // StatusEffect.processBleed reads this.params.damage, not damagePerTurn
    expect(applyStatusEffect).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        params: expect.objectContaining({ damage: 18 }),
      })
    );
  });
});

// ── 7. Fireball — poison DoT silently dropped ─────────────────────────────────
//
// JSON: effect = 'poison', params = { damage: 22, poison: { damage: 22, turns: 1 } }
// Routed via Attack category catch-all → handleAttack, which never applies status effects
// Expected: should apply a poison DoT after dealing damage

describe('fireball — should apply poison DoT via handlePoisonStrike', () => {
  it('applies poison status via handlePoisonStrike', () => {
    const actor = makePlayer('pyromancer', 'Pyromancer');
    const target = makePlayer('enemy', 'Enemy', 200);
    const ability: any = {
      id: 'fireball',
      name: 'Fireball',
      effect: 'poison',
      params: { damage: 22, poison: { damage: 22, turns: 1 } },
    };
    const log: any[] = [];

    const applyStatusEffect = jest.fn(() => ({ success: true }));
    const systems: any = {
      game: { players: new Map([['pyromancer', actor]]) },
      combatSystem: { applyDamage: makeApplyDamage() },
      statusEffectManager: { applyStatusEffect },
    };

    handlePoisonStrike(actor, target, ability, log, systems);

    expect(applyStatusEffect).toHaveBeenCalledWith(
      target,
      expect.objectContaining({ name: 'poison' })
    );
  });
});
