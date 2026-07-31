/**
 * Regression test for the config.abilities collision bug: config/index.ts merges
 * abilityFunctions and messageFunctions into one object, and both defined a
 * same-named `get abilities()` getter — the message-templates one (spread later)
 * silently won, so every generic registerAbilitiesBy* catch-all in
 * abilityRegistryUtils.ts saw {attacks, defense, healing, special, racial}
 * (message-category keys) instead of the real ability map. In practice this meant
 * class-specific basic attacks (backstab, preciseShot, holyBolt, ...) never
 * resolved through the "Attack" category catch-all and silently fell back to
 * CombatSystem's generic fallback calculation instead of handleAttack.
 */

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

jest.mock('../../../server/config/index', () => ({
  __esModule: true,
  default: {
    MONSTER_ID: '__monster__',
    getError: jest.fn(() => null),
    getAbility: jest.fn(() => null),
    // The fix under test: abilityRegistryUtils.ts must read the real ability map
    // through this accessor, not the collided `abilities` getter.
    getAbilitiesMap: jest.fn(() => ({
      attack: { id: 'attack', category: 'Attack', effect: null, target: 'Single' },
      backstab: { id: 'backstab', category: 'Attack', effect: null, target: 'Single' },
      poisonStrike: { id: 'poisonStrike', category: 'Attack', effect: 'poison', target: 'Single' },
    })),
  },
}));

import { registerAbilitiesByCategory } from '../../../server/models/systems/abilityHandlers/abilityRegistryUtils';
import AbilityRegistry from '../../../server/models/AbilityRegistry';
import * as attackAbilities from '../../../server/models/systems/abilityHandlers/attackAbilities';

describe('registerAbilitiesByCategory reads the real ability map', () => {
  it('registers an ability by category even though it has no explicit handler', () => {
    const registry = new AbilityRegistry();
    registry.registerClassAbility('poisonStrike', jest.fn(() => true));

    const registered = registerAbilitiesByCategory(registry, 'Attack', jest.fn(() => true));

    // 'backstab' has no bespoke handler and must be swept up by the category catch-all.
    expect(registered).toContain('backstab');
    // Already-registered abilities are left alone.
    expect(registered).not.toContain('poisonStrike');
    expect(registry.hasClassAbility('backstab')).toBe(true);
  });
});

describe('attackAbilities.register wires class-specific basic attacks to handleAttack', () => {
  it('registers "backstab" via the Attack category catch-all', () => {
    const registry = new AbilityRegistry();
    attackAbilities.register(registry);

    expect(registry.hasClassAbility('backstab')).toBe(true);
  });
});
