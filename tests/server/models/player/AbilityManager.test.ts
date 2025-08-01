/**
 * @fileoverview Tests for AbilityManager class
 * Tests ability management, cooldowns, and usage tracking
 */

import AbilityManager from '../../../../server/models/player/AbilityManager';
import type { Ability, PlayerClass } from '../../../../server/types/generated';

// Mock dependencies
jest.mock('@config', () => ({
  classStats: {
    'Warrior': {
      abilities: [
        { type: 'slash', name: 'Slash', unlockAt: 1, description: 'Basic attack' },
        { type: 'charge', name: 'Charge', unlockAt: 3, description: 'Powerful charge' },
        { type: 'block', name: 'Block', unlockAt: 2, description: 'Defensive stance' }
      ]
    },
    'Mage': {
      abilities: [
        { type: 'fireball', name: 'Fireball', unlockAt: 1, description: 'Fire projectile' },
        { type: 'heal', name: 'Heal', unlockAt: 2, description: 'Restore health' }
      ]
    }
  }
}));

jest.mock('@utils/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('AbilityManager', () => {
  let player: any;
  let abilityManager: AbilityManager;

  beforeEach(() => {
    player = {
      id: 'test-player-1',
      isAlive: true
    };
    abilityManager = new AbilityManager(player);
  });

  describe('constructor', () => {
    it('should initialize with empty state', () => {
      expect(abilityManager.getAvailableAbilities()).toEqual([]);
      expect(abilityManager.getAbilityCooldown('any')).toBe(0);
      expect(abilityManager.canUseRacialAbility()).toBe(false);
    });
  });

  describe('initializeAbilities', () => {
    it('should initialize abilities for Warrior class', () => {
      abilityManager.initializeAbilities('Warrior' as PlayerClass);
      
      const ability = abilityManager.getAbility('slash');
      expect(ability).toBeDefined();
      expect(ability?.name).toBe('Slash');
      expect(abilityManager.isAbilityUnlocked('slash')).toBe(true);
      expect(abilityManager.isAbilityUnlocked('charge')).toBe(false); // unlocks at level 3
    });

    it('should initialize abilities for Mage class', () => {
      abilityManager.initializeAbilities('Mage' as PlayerClass);
      
      const ability = abilityManager.getAbility('fireball');
      expect(ability).toBeDefined();
      expect(ability?.name).toBe('Fireball');
      expect(abilityManager.isAbilityUnlocked('fireball')).toBe(true);
    });

    it('should handle invalid class gracefully', () => {
      abilityManager.initializeAbilities('InvalidClass' as PlayerClass);
      
      expect(abilityManager.getAbility('slash')).toBeNull();
      expect(abilityManager.getAvailableAbilities()).toEqual([]);
    });
  });

  describe('ability management', () => {
    beforeEach(() => {
      abilityManager.initializeAbilities('Warrior' as PlayerClass);
    });

    it('should get ability by type', () => {
      const slash = abilityManager.getAbility('slash');
      expect(slash).toBeDefined();
      expect(slash?.type).toBe('slash');
      
      const invalid = abilityManager.getAbility('invalid');
      expect(invalid).toBeNull();
    });

    it('should check if ability is unlocked', () => {
      expect(abilityManager.isAbilityUnlocked('slash')).toBe(true);
      expect(abilityManager.isAbilityUnlocked('charge')).toBe(false);
      expect(abilityManager.isAbilityUnlocked('invalid')).toBe(false);
    });

    it('should get available abilities (unlocked and not on cooldown)', () => {
      const available = abilityManager.getAvailableAbilities();
      expect(available).toHaveLength(1);
      expect(available[0].type).toBe('slash');
      
      // Put slash on cooldown
      abilityManager.applyCooldown('slash', 2);
      const availableAfterCooldown = abilityManager.getAvailableAbilities();
      expect(availableAfterCooldown).toHaveLength(0);
    });
  });

  describe('cooldown management', () => {
    beforeEach(() => {
      abilityManager.initializeAbilities('Warrior' as PlayerClass);
    });

    it('should apply cooldown to ability', () => {
      abilityManager.applyCooldown('slash', 3);
      
      expect(abilityManager.isAbilityOnCooldown('slash')).toBe(true);
      expect(abilityManager.getAbilityCooldown('slash')).toBe(3);
    });

    it('should not apply zero or negative cooldown', () => {
      abilityManager.applyCooldown('slash', 0);
      expect(abilityManager.isAbilityOnCooldown('slash')).toBe(false);
      
      abilityManager.applyCooldown('slash', -1);
      expect(abilityManager.isAbilityOnCooldown('slash')).toBe(false);
    });

    it('should reduce cooldowns by one round', () => {
      abilityManager.applyCooldown('slash', 3);
      abilityManager.applyCooldown('charge', 2);
      
      abilityManager.reduceCooldowns();
      
      expect(abilityManager.getAbilityCooldown('slash')).toBe(2);
      expect(abilityManager.getAbilityCooldown('charge')).toBe(1);
      
      abilityManager.reduceCooldowns();
      abilityManager.reduceCooldowns();
      
      expect(abilityManager.getAbilityCooldown('slash')).toBe(0);
      expect(abilityManager.getAbilityCooldown('charge')).toBe(0);
      expect(abilityManager.isAbilityOnCooldown('slash')).toBe(false);
    });

    it('should reset all cooldowns', () => {
      abilityManager.applyCooldown('slash', 3);
      abilityManager.applyCooldown('charge', 2);
      
      abilityManager.resetCooldowns();
      
      expect(abilityManager.getAbilityCooldown('slash')).toBe(0);
      expect(abilityManager.getAbilityCooldown('charge')).toBe(0);
      expect(abilityManager.isAbilityOnCooldown('slash')).toBe(false);
      expect(abilityManager.isAbilityOnCooldown('charge')).toBe(false);
    });
  });

  describe('ability unlocking', () => {
    beforeEach(() => {
      abilityManager.initializeAbilities('Warrior' as PlayerClass);
    });

    it('should unlock abilities for level', () => {
      const newlyUnlocked = abilityManager.unlockAbilitiesForLevel(3);
      
      expect(newlyUnlocked).toHaveLength(2); // block (level 2) and charge (level 3)
      expect(newlyUnlocked.some(a => a.type === 'block')).toBe(true);
      expect(newlyUnlocked.some(a => a.type === 'charge')).toBe(true);
      
      expect(abilityManager.isAbilityUnlocked('block')).toBe(true);
      expect(abilityManager.isAbilityUnlocked('charge')).toBe(true);
    });

    it('should not unlock already unlocked abilities', () => {
      abilityManager.unlockAbilitiesForLevel(2);
      const secondUnlock = abilityManager.unlockAbilitiesForLevel(2);
      
      expect(secondUnlock).toHaveLength(0); // Nothing new
    });

    it('should return empty array for low levels', () => {
      const newlyUnlocked = abilityManager.unlockAbilitiesForLevel(0);
      expect(newlyUnlocked).toHaveLength(0);
    });
  });

  describe('racial ability management', () => {
    const racialAbility: Ability = {
      type: 'stone_skin',
      name: 'Stone Skin',
      unlockAt: 1,
      description: 'Hardens skin like stone'
    };

    beforeEach(() => {
      abilityManager.setRacialAbility(racialAbility);
    });

    it('should set racial ability', () => {
      expect(abilityManager.canUseRacialAbility()).toBe(true);
    });

    it('should prevent racial ability use when player is dead', () => {
      player.isAlive = false;
      expect(abilityManager.canUseRacialAbility()).toBe(false);
    });

    it('should prevent racial ability use when already used', () => {
      abilityManager.markRacialAbilityUsed();
      expect(abilityManager.canUseRacialAbility()).toBe(false);
    });

    it('should reset racial ability usage', () => {
      abilityManager.markRacialAbilityUsed();
      expect(abilityManager.canUseRacialAbility()).toBe(false);
      
      abilityManager.resetRacialAbility();
      expect(abilityManager.canUseRacialAbility()).toBe(true);
    });

    it('should return false for racial ability when no racial ability set', () => {
      const newManager = new AbilityManager(player);
      expect(newManager.canUseRacialAbility()).toBe(false);
    });
  });

  describe('ability summary', () => {
    beforeEach(() => {
      abilityManager.initializeAbilities('Warrior' as PlayerClass);
      const racialAbility: Ability = {
        type: 'stone_skin',
        name: 'Stone Skin',
        unlockAt: 1,
        description: 'Hardens skin'
      };
      abilityManager.setRacialAbility(racialAbility);
      abilityManager.applyCooldown('slash', 2);
    });

    it('should return comprehensive ability summary', () => {
      const summary = abilityManager.getAbilitySummary();
      
      expect(summary.abilities).toHaveLength(3);
      
      const slashSummary = summary.abilities.find(a => a.type === 'slash');
      expect(slashSummary).toBeDefined();
      expect(slashSummary?.unlocked).toBe(true);
      expect(slashSummary?.cooldown).toBe(2);
      
      const chargeSummary = summary.abilities.find(a => a.type === 'charge');
      expect(chargeSummary).toBeDefined();
      expect(chargeSummary?.unlocked).toBe(false);
      expect(chargeSummary?.cooldown).toBe(0);
      
      expect(summary.racialAbility).toBeDefined();
      expect(summary.racialAbility?.name).toBe('Stone Skin');
      expect(summary.racialAbility?.used).toBe(false);
      expect(summary.racialAbility?.canUse).toBe(true);
    });

    it('should return null racial ability when none set', () => {
      const newManager = new AbilityManager(player);
      newManager.initializeAbilities('Warrior' as PlayerClass);
      
      const summary = newManager.getAbilitySummary();
      expect(summary.racialAbility).toBeNull();
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      abilityManager.initializeAbilities('Warrior' as PlayerClass);
      const racialAbility: Ability = {
        type: 'stone_skin',
        name: 'Stone Skin',
        unlockAt: 1,
        description: 'Hardens skin'
      };
      abilityManager.setRacialAbility(racialAbility);
      abilityManager.applyCooldown('slash', 2);
      abilityManager.markRacialAbilityUsed();
      abilityManager.unlockAbilitiesForLevel(2);
    });

    it('should serialize state correctly', () => {
      const serialized = abilityManager.serialize();
      
      expect(serialized.abilities).toHaveLength(3);
      expect(serialized.unlockedAbilities).toHaveLength(2); // slash and block
      expect(serialized.cooldowns).toEqual({ slash: 2 });
      expect(serialized.racialAbility?.type).toBe('stone_skin');
      expect(serialized.racialAbilityUsed).toBe(true);
    });

    it('should deserialize state correctly', () => {
      const serialized = abilityManager.serialize();
      
      const newManager = new AbilityManager(player);
      newManager.deserialize(serialized);
      
      expect(newManager.getAbility('slash')).toBeDefined();
      expect(newManager.isAbilityUnlocked('slash')).toBe(true);
      expect(newManager.isAbilityUnlocked('block')).toBe(true);
      expect(newManager.getAbilityCooldown('slash')).toBe(2);
      expect(newManager.canUseRacialAbility()).toBe(false); // was used
    });

    it('should handle partial deserialization', () => {
      const partialData = {
        cooldowns: { slash: 5 },
        racialAbilityUsed: true
      };
      
      abilityManager.deserialize(partialData);
      
      expect(abilityManager.getAbilityCooldown('slash')).toBe(5);
      expect(abilityManager.canUseRacialAbility()).toBe(false);
    });
  });
});