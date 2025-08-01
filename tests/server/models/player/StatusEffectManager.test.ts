/**
 * @fileoverview Tests for StatusEffectManager class
 * Tests status effects, buffs, debuffs, and their durations
 */

import StatusEffectManager from '../../../../server/models/player/StatusEffectManager';
import type { PlayerRace, PlayerClass } from '../../../../server/types/generated';

// Mock dependencies
jest.mock('@config', () => ({
  statusEffects: {
    getEffectDefaults: jest.fn().mockReturnValue({}),
    getEffectMessage: jest.fn().mockReturnValue('Effect message'),
    formatEffectMessage: jest.fn().mockReturnValue('Formatted message')
  }
}));

jest.mock('@utils/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('@messages', () => ({
  getMessage: jest.fn().mockReturnValue('Test message'),
  getEvent: jest.fn().mockReturnValue({ message: 'Test event', public: true })
}));

describe('StatusEffectManager', () => {
  let player: any;
  let statusEffectManager: StatusEffectManager;

  beforeEach(() => {
    player = {
      id: 'test-player-1',
      name: 'Test Player',
      baseArmor: 5,
      takeDamage: jest.fn(),
      heal: jest.fn()
    };
    statusEffectManager = new StatusEffectManager(player);
  });

  describe('constructor', () => {
    it('should initialize with empty state', () => {
      expect(statusEffectManager.hasStatusEffect('poison')).toBe(false);
      expect(statusEffectManager.getTotalArmor()).toBe(5); // base armor only
      expect(statusEffectManager.getDamageModifier()).toBe(1.0);
    });
  });

  describe('class effects initialization', () => {
    it('should initialize class effects', () => {
      const classEffects = {
        immunities: ['poison'],
        armorBonus: 2,
        damageMod: 1.1
      };
      
      statusEffectManager.initializeClassEffects('Warrior' as PlayerClass, classEffects);
      
      expect(statusEffectManager.isImmuneToEffect('poison')).toBe(true);
      expect(statusEffectManager.getTotalArmor()).toBe(7); // 5 + 2
      expect(statusEffectManager.getDamageModifier()).toBe(1.1);
    });
  });

  describe('racial effects initialization', () => {
    it('should initialize Rockhewn racial effects', () => {
      statusEffectManager.initializeRacialEffects('Rockhewn' as PlayerRace);
      
      expect(statusEffectManager.getTotalArmor()).toBe(8); // 5 + 3 stone armor
    });

    it('should initialize Lich racial effects', () => {
      statusEffectManager.initializeRacialEffects('Lich' as PlayerRace);
      
      expect(statusEffectManager.isImmuneToEffect('poison')).toBe(true);
      expect(statusEffectManager.isImmuneToEffect('charm')).toBe(true);
    });

    it('should initialize Kinfolk racial effects', () => {
      statusEffectManager.initializeRacialEffects('Kinfolk' as PlayerRace);
      
      // Kinfolk effects are handled elsewhere, but should not throw
      expect(statusEffectManager.getTotalArmor()).toBe(5); // base armor only
    });

    it('should handle unknown race gracefully', () => {
      statusEffectManager.initializeRacialEffects('Unknown' as PlayerRace);
      
      expect(statusEffectManager.getTotalArmor()).toBe(5); // base armor only
    });
  });

  describe('status effect application', () => {
    it('should apply new status effect', () => {
      const effectData = { duration: 3, damage: 5 };
      const result = statusEffectManager.applyStatusEffect('poison', effectData);
      
      expect(result).toBe(true);
      expect(statusEffectManager.hasStatusEffect('poison')).toBe(true);
      
      const effect = statusEffectManager.getStatusEffect('poison');
      expect(effect?.duration).toBe(3);
      expect(effect?.damage).toBe(5);
    });

    it('should reject effect if player is immune', () => {
      statusEffectManager.initializeRacialEffects('Lich' as PlayerRace);
      
      const result = statusEffectManager.applyStatusEffect('poison', { duration: 3 });
      
      expect(result).toBe(false);
      expect(statusEffectManager.hasStatusEffect('poison')).toBe(false);
    });

    it('should update existing effect with stacking', () => {
      statusEffectManager.applyStatusEffect('poison', { duration: 2, stacks: 1, maxStacks: 3 });
      statusEffectManager.applyStatusEffect('poison', { duration: 3, stacks: 2, maxStacks: 3 });
      
      const effect = statusEffectManager.getStatusEffect('poison');
      expect(effect?.duration).toBe(3); // Max duration
      expect(effect?.stacks).toBe(3); // 1 + 2 = 3
    });

    it('should respect max stacks', () => {
      statusEffectManager.applyStatusEffect('poison', { duration: 2, stacks: 3, maxStacks: 3 });
      statusEffectManager.applyStatusEffect('poison', { duration: 3, stacks: 5, maxStacks: 3 });
      
      const effect = statusEffectManager.getStatusEffect('poison');
      expect(effect?.stacks).toBe(3); // Capped at maxStacks
    });
  });

  describe('status effect removal', () => {
    beforeEach(() => {
      statusEffectManager.applyStatusEffect('poison', { duration: 3, damage: 5 });
      statusEffectManager.applyStatusEffect('vulnerable', { duration: 2 });
    });

    it('should remove specific status effect', () => {
      const result = statusEffectManager.removeStatusEffect('poison');
      
      expect(result).toBe(true);
      expect(statusEffectManager.hasStatusEffect('poison')).toBe(false);
      expect(statusEffectManager.hasStatusEffect('vulnerable')).toBe(true);
    });

    it('should return false when removing non-existent effect', () => {
      const result = statusEffectManager.removeStatusEffect('nonexistent');
      
      expect(result).toBe(false);
    });

    it('should clear all status effects', () => {
      statusEffectManager.clearAllStatusEffects();
      
      expect(statusEffectManager.hasStatusEffect('poison')).toBe(false);
      expect(statusEffectManager.hasStatusEffect('vulnerable')).toBe(false);
    });

    it('should clear specific effect types', () => {
      statusEffectManager.clearEffectTypes(['poison']);
      
      expect(statusEffectManager.hasStatusEffect('poison')).toBe(false);
      expect(statusEffectManager.hasStatusEffect('vulnerable')).toBe(true);
    });
  });

  describe('immunity checking', () => {
    it('should check class immunities', () => {
      statusEffectManager.initializeClassEffects('Warrior' as PlayerClass, {
        immunities: ['poison', 'charm']
      });
      
      expect(statusEffectManager.isImmuneToEffect('poison')).toBe(true);
      expect(statusEffectManager.isImmuneToEffect('charm')).toBe(true);
      expect(statusEffectManager.isImmuneToEffect('vulnerable')).toBe(false);
    });

    it('should check racial immunities', () => {
      statusEffectManager.initializeRacialEffects('Lich' as PlayerRace);
      
      expect(statusEffectManager.isImmuneToEffect('poison')).toBe(true);
      expect(statusEffectManager.isImmuneToEffect('charm')).toBe(true);
    });

    it('should check temporary immunities', () => {
      statusEffectManager.applyStatusEffect('immune', {
        effectTypes: ['poison', 'vulnerable']
      });
      
      expect(statusEffectManager.isImmuneToEffect('poison')).toBe(true);
      expect(statusEffectManager.isImmuneToEffect('vulnerable')).toBe(true);
      expect(statusEffectManager.isImmuneToEffect('charm')).toBe(false);
    });
  });

  describe('status effect processing', () => {
    beforeEach(() => {
      statusEffectManager.applyStatusEffect('poison', { 
        duration: 3, 
        damage: 5, 
        timing: 'start' 
      });
      statusEffectManager.applyStatusEffect('regeneration', { 
        duration: 2, 
        healing: 3, 
        timing: 'end' 
      });
      statusEffectManager.applyStatusEffect('vulnerable', { duration: 1 });
    });

    it('should process start-of-turn effects', () => {
      const log = statusEffectManager.processStatusEffects('start');
      
      expect(player.takeDamage).toHaveBeenCalledWith(5, 'poison');
      expect(log.length).toBeGreaterThan(0);
    });

    it('should process end-of-turn effects', () => {
      const log = statusEffectManager.processStatusEffects('end');
      
      expect(player.heal).toHaveBeenCalledWith(3);
      expect(log.length).toBeGreaterThan(0);
    });

    it('should reduce effect durations and remove expired effects', () => {
      statusEffectManager.processStatusEffects('end');
      
      expect(statusEffectManager.getStatusEffect('poison')?.duration).toBe(2);
      expect(statusEffectManager.getStatusEffect('regeneration')?.duration).toBe(1);
      expect(statusEffectManager.hasStatusEffect('vulnerable')).toBe(false); // Duration 1, expired
    });

    it('should handle stacked poison damage', () => {
      statusEffectManager.applyStatusEffect('poison', { 
        duration: 2, 
        damage: 3, 
        stacks: 2,
        timing: 'start' 
      });
      
      statusEffectManager.processStatusEffects('start');
      
      expect(player.takeDamage).toHaveBeenCalledWith(6, 'poison'); // 3 * 2 stacks
    });
  });

  describe('armor calculation', () => {
    it('should calculate total armor with base armor', () => {
      expect(statusEffectManager.getTotalArmor()).toBe(5); // base armor
    });

    it('should include racial stone armor', () => {
      statusEffectManager.initializeRacialEffects('Rockhewn' as PlayerRace);
      
      expect(statusEffectManager.getTotalArmor()).toBe(8); // 5 + 3
    });

    it('should include shielded effect armor', () => {
      statusEffectManager.applyStatusEffect('shielded', { armor: 4 });
      
      expect(statusEffectManager.getTotalArmor()).toBe(9); // 5 + 4
    });

    it('should include class armor bonuses', () => {
      statusEffectManager.initializeClassEffects('Warrior' as PlayerClass, {
        armorBonus: 2
      });
      
      expect(statusEffectManager.getTotalArmor()).toBe(7); // 5 + 2
    });

    it('should combine all armor sources', () => {
      statusEffectManager.initializeRacialEffects('Rockhewn' as PlayerRace);
      statusEffectManager.initializeClassEffects('Warrior' as PlayerClass, {
        armorBonus: 2
      });
      statusEffectManager.applyStatusEffect('shielded', { armor: 3 });
      
      expect(statusEffectManager.getTotalArmor()).toBe(13); // 5 + 3 + 2 + 3
    });
  });

  describe('damage modifier calculation', () => {
    it('should return base modifier 1.0', () => {
      expect(statusEffectManager.getDamageModifier()).toBe(1.0);
    });

    it('should apply vulnerability modifier', () => {
      statusEffectManager.applyStatusEffect('vulnerable', { damageIncrease: 0.5 });
      
      expect(statusEffectManager.getDamageModifier()).toBe(1.5); // 1 + 0.5
    });

    it('should apply weakness modifier', () => {
      statusEffectManager.applyStatusEffect('weakened', { damageReduction: 0.3 });
      
      expect(statusEffectManager.getDamageModifier()).toBe(0.7); // 1 - 0.3
    });

    it('should apply empowered modifier', () => {
      statusEffectManager.applyStatusEffect('empowered', { damageBonus: 0.25 });
      
      expect(statusEffectManager.getDamageModifier()).toBe(1.25); // 1 + 0.25
    });

    it('should apply class damage modifier', () => {
      statusEffectManager.initializeClassEffects('Warrior' as PlayerClass, {
        damageMod: 1.1
      });
      
      expect(statusEffectManager.getDamageModifier()).toBe(1.1);
    });

    it('should combine all damage modifiers', () => {
      statusEffectManager.initializeClassEffects('Warrior' as PlayerClass, {
        damageMod: 1.1
      });
      statusEffectManager.applyStatusEffect('vulnerable', { damageIncrease: 0.2 });
      statusEffectManager.applyStatusEffect('weakened', { damageReduction: 0.1 });
      
      // (1 + 0.2) * (1 - 0.1) * 1.1 = 1.2 * 0.9 * 1.1 = 1.188
      expect(statusEffectManager.getDamageModifier()).toBeCloseTo(1.188);
    });
  });

  describe('status effects summary', () => {
    beforeEach(() => {
      statusEffectManager.applyStatusEffect('poison', { 
        duration: 3, 
        stacks: 2, 
        description: 'Taking poison damage' 
      });
      statusEffectManager.applyStatusEffect('shielded', { 
        duration: 5,
        description: 'Protected by magical shield' 
      });
    });

    it('should return status effects summary', () => {
      const summary = statusEffectManager.getStatusEffectsSummary();
      
      expect(summary.poison).toBeDefined();
      expect(summary.poison.duration).toBe(3);
      expect(summary.poison.stacks).toBe(2);
      expect(summary.poison.description).toBe('Taking poison damage');
      
      expect(summary.shielded).toBeDefined();
      expect(summary.shielded.duration).toBe(5);
      expect(summary.shielded.description).toBe('Protected by magical shield');
    });

    it('should use effect type as description fallback', () => {
      statusEffectManager.applyStatusEffect('vulnerable', { duration: 2 });
      
      const summary = statusEffectManager.getStatusEffectsSummary();
      expect(summary.vulnerable.description).toBe('vulnerable');
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      statusEffectManager.initializeRacialEffects('Rockhewn' as PlayerRace);
      statusEffectManager.initializeClassEffects('Warrior' as PlayerClass, {
        immunities: ['poison'],
        armorBonus: 2
      });
      statusEffectManager.applyStatusEffect('vulnerable', { duration: 3 });
      statusEffectManager.applyStatusEffect('shielded', { duration: 2, armor: 3 });
    });

    it('should serialize all state correctly', () => {
      const serialized = statusEffectManager.serialize();
      
      expect(serialized.statusEffects.vulnerable).toBeDefined();
      expect(serialized.statusEffects.shielded).toBeDefined();
      expect(serialized.racialEffects.stoneArmor).toBeDefined();
      expect(serialized.classEffects.className).toBe('Warrior');
      expect(serialized.classEffects.immunities).toContain('poison');
      expect(serialized.classEffects.armorBonus).toBe(2);
    });

    it('should deserialize state correctly', () => {
      const serialized = statusEffectManager.serialize();
      
      const newManager = new StatusEffectManager(player);
      newManager.deserialize(serialized);
      
      expect(newManager.hasStatusEffect('vulnerable')).toBe(true);
      expect(newManager.hasStatusEffect('shielded')).toBe(true);
      expect(newManager.isImmuneToEffect('poison')).toBe(true);
      expect(newManager.getTotalArmor()).toBe(13); // 5 + 3 + 2 + 3
    });

    it('should handle partial deserialization', () => {
      const partialData = {
        statusEffects: { poison: { duration: 5, damage: 10 } }
      };
      
      statusEffectManager.deserialize(partialData);
      
      expect(statusEffectManager.hasStatusEffect('poison')).toBe(true);
      expect(statusEffectManager.getStatusEffect('poison')?.damage).toBe(10);
      // Other effects should remain unchanged
      expect(statusEffectManager.hasStatusEffect('vulnerable')).toBe(true);
    });
  });
});