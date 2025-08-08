/**
 * @fileoverview Tests for EffectManager class
 * Tests centralized status effect management with Zod validation
 */

import { EffectManager, EffectData, EffectApplicationResult } from '../../../../server/models/systems/EffectManager';

// Mock dependencies
jest.mock('@utils/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('@messages', () => ({
  getEvent: jest.fn().mockReturnValue({ message: 'Test event', public: true }),
  formatMessage: jest.fn().mockReturnValue('Formatted message')
}));

describe('EffectManager', () => {
  let effectManager: EffectManager;

  beforeEach(() => {
    effectManager = new EffectManager();
  });

  describe('constructor', () => {
    it('should initialize with empty active effects', () => {
      const player1Effects = effectManager.getPlayerEffects('player1');
      expect(player1Effects).toEqual([]);
    });
  });

  describe('effect application', () => {
    const validEffect: EffectData = {
      id: 'poison',
      name: 'Poisoned',
      type: 'debuff',
      duration: 3,
      stacks: 0,
      metadata: { damage: 5 }
    };

    it('should apply new effect successfully', () => {
      const result = effectManager.applyEffect('player1', validEffect);

      expect(result.success).toBe(true);
      expect(result.effect).toBeDefined();
      expect(result.message).toBe('Poisoned applied');
      expect(result.replaced).toBe(false);
      expect(result.stacked).toBe(false);
    });

    it('should validate effect data with Zod schema', () => {
      const invalidEffect = {
        id: 'test',
        name: 'Test Effect',
        type: 'invalid_type', // Invalid enum value
        duration: -2 // Invalid duration
      } as any;

      expect(() => {
        effectManager.applyEffect('player1', invalidEffect);
      }).toThrow();
    });

    it('should apply effect with default values', () => {
      const minimalEffect: EffectData = {
        id: 'shield',
        name: 'Shield',
        type: 'buff',
        duration: 2,
        stacks: 0,
        metadata: {}
      };

      const result = effectManager.applyEffect('player1', minimalEffect);

      expect(result.success).toBe(true);
      expect(result.effect?.stacks).toBe(0);
      expect(result.effect?.metadata).toEqual({});
    });

    it('should track effects per player', () => {
      effectManager.applyEffect('player1', validEffect);
      effectManager.applyEffect('player2', { ...validEffect, id: 'shield' });

      expect(effectManager.getPlayerEffects('player1')).toHaveLength(1);
      expect(effectManager.getPlayerEffects('player2')).toHaveLength(1);
      expect(effectManager.hasEffect('player1', 'poison')).toBe(true);
      expect(effectManager.hasEffect('player2', 'poison')).toBe(false);
      expect(effectManager.hasEffect('player2', 'shield')).toBe(true);
    });
  });

  describe('effect stacking', () => {
    const stackableEffect: EffectData = {
      id: 'poison',
      name: 'Poisoned',
      type: 'debuff',
      duration: 2,
      stacks: 1,
      metadata: { damage: 3 }
    };

    it('should stack effects when allowed', () => {
      effectManager.applyEffect('player1', stackableEffect);
      const result = effectManager.applyEffect('player1', { ...stackableEffect, duration: 4 });

      expect(result.success).toBe(true);
      expect(result.stacked).toBe(true);
      expect(result.effect?.stacks).toBe(2);
      expect(result.effect?.duration).toBe(4); // Takes max duration
      expect(result.message).toBe('Poisoned stacked (2)');
    });

    it('should cap stacks at maximum', () => {
      effectManager.applyEffect('player1', { ...stackableEffect, stacks: 5 });
      const result = effectManager.applyEffect('player1', { ...stackableEffect, stacks: 3 });

      expect(result.effect?.stacks).toBe(5); // Capped at 5
    });

    it('should replace non-stackable effects', () => {
      const nonStackableEffect: EffectData = {
        id: 'shield',
        name: 'Shield',
        type: 'buff',
        duration: 2,
        stacks: 0,
        metadata: { armor: 5 }
      };

      effectManager.applyEffect('player1', nonStackableEffect);
      const result = effectManager.applyEffect('player1', {
        ...nonStackableEffect,
        duration: 4,
        metadata: { armor: 8 }
      });

      expect(result.success).toBe(true);
      expect(result.replaced).toBe(true);
      expect(result.effect?.duration).toBe(4);
      expect(result.effect?.metadata.armor).toBe(8);
      expect(result.message).toBe('Shield refreshed');
    });
  });

  describe('effect removal', () => {
    beforeEach(() => {
      const effect: EffectData = {
        id: 'poison',
        name: 'Poisoned',
        type: 'debuff',
        duration: 3,
        stacks: 0,
        metadata: { damage: 5 }
      };
      effectManager.applyEffect('player1', effect);
      effectManager.applyEffect('player1', { ...effect, id: 'shield' });
    });

    it('should remove specific effect', () => {
      const removed = effectManager.removeEffect('player1', 'poison');

      expect(removed).toBe(true);
      expect(effectManager.hasEffect('player1', 'poison')).toBe(false);
      expect(effectManager.hasEffect('player1', 'shield')).toBe(true);
    });

    it('should return false when removing non-existent effect', () => {
      const removed = effectManager.removeEffect('player1', 'nonexistent');

      expect(removed).toBe(false);
    });

    it('should return false when removing from non-existent player', () => {
      const removed = effectManager.removeEffect('nonexistent', 'poison');

      expect(removed).toBe(false);
    });

    it('should clear all player effects', () => {
      effectManager.clearPlayerEffects('player1');

      expect(effectManager.getPlayerEffects('player1')).toEqual([]);
      expect(effectManager.hasEffect('player1', 'poison')).toBe(false);
      expect(effectManager.hasEffect('player1', 'shield')).toBe(false);
    });
  });

  describe('effect queries', () => {
    beforeEach(() => {
      const poison: EffectData = {
        id: 'poison',
        name: 'Poisoned',
        type: 'debuff',
        duration: 3,
        stacks: 2,
        metadata: { damage: 5 }
      };
      const shield: EffectData = {
        id: 'shield',
        name: 'Shield',
        type: 'buff',
        duration: 5,
        stacks: 0,
        metadata: { armor: 3 }
      };
      effectManager.applyEffect('player1', poison);
      effectManager.applyEffect('player1', shield);
    });

    it('should check if player has specific effect', () => {
      expect(effectManager.hasEffect('player1', 'poison')).toBe(true);
      expect(effectManager.hasEffect('player1', 'shield')).toBe(true);
      expect(effectManager.hasEffect('player1', 'nonexistent')).toBe(false);
      expect(effectManager.hasEffect('nonexistent', 'poison')).toBe(false);
    });

    it('should get specific effect data', () => {
      const poison = effectManager.getEffect('player1', 'poison');

      expect(poison).toBeDefined();
      expect(poison?.name).toBe('Poisoned');
      expect(poison?.stacks).toBe(2);
      expect(poison?.metadata.damage).toBe(5);

      const nonexistent = effectManager.getEffect('player1', 'nonexistent');
      expect(nonexistent).toBeNull();
    });

    it('should get all player effects', () => {
      const effects = effectManager.getPlayerEffects('player1');

      expect(effects).toHaveLength(2);
      expect(effects.some(e => e.id === 'poison')).toBe(true);
      expect(effects.some(e => e.id === 'shield')).toBe(true);
    });

    it('should return empty array for non-existent player', () => {
      const effects = effectManager.getPlayerEffects('nonexistent');
      expect(effects).toEqual([]);
    });
  });

  describe('duration processing', () => {
    beforeEach(() => {
      const effects: EffectData[] = [
        {
          id: 'poison',
          name: 'Poisoned',
          type: 'debuff',
          duration: 1, // Will expire
          stacks: 0,
          metadata: { damage: 5 }
        },
        {
          id: 'shield',
          name: 'Shield',
          type: 'buff',
          duration: 3, // Will remain
          stacks: 0,
          metadata: { armor: 3 }
        },
        {
          id: 'permanent',
          name: 'Permanent Effect',
          type: 'status',
          duration: -1, // Permanent
          stacks: 0,
          metadata: {}
        }
      ];

      effects.forEach(effect => {
        effectManager.applyEffect('player1', effect);
      });
    });

    it('should process effect durations and remove expired effects', () => {
      const expired = effectManager.processEffectDurations('player1');

      expect(expired).toHaveLength(1);
      expect(expired[0].id).toBe('poison');

      expect(effectManager.hasEffect('player1', 'poison')).toBe(false);
      expect(effectManager.hasEffect('player1', 'shield')).toBe(true);
      expect(effectManager.hasEffect('player1', 'permanent')).toBe(true);

      const shield = effectManager.getEffect('player1', 'shield');
      expect(shield?.duration).toBe(2); // Decremented
    });

    it('should not process permanent effects', () => {
      effectManager.processEffectDurations('player1');

      const permanent = effectManager.getEffect('player1', 'permanent');
      expect(permanent?.duration).toBe(-1); // Unchanged
    });

    it('should return empty array for non-existent player', () => {
      const expired = effectManager.processEffectDurations('nonexistent');
      expect(expired).toEqual([]);
    });
  });

  describe('modifier calculations', () => {
    beforeEach(() => {
      const effects: EffectData[] = [
        {
          id: 'strength',
          name: 'Strength Boost',
          type: 'buff',
          duration: 3,
          stacks: 2,
          metadata: { damageModifier: 0.2, armorBonus: 1 }
        },
        {
          id: 'healing_aura',
          name: 'Healing Aura',
          type: 'buff',
          duration: 5,
          stacks: 0,
          metadata: { healingModifier: 0.5 }
        },
        {
          id: 'vulnerability',
          name: 'Vulnerable',
          type: 'debuff',
          duration: 2,
          stacks: 1,
          metadata: { vulnerability: 0.25, resistance: 0.1 }
        }
      ];

      effects.forEach(effect => {
        effectManager.applyEffect('player1', effect);
      });
    });

    it('should calculate combined modifiers from all effects', () => {
      const modifiers = effectManager.calculateModifiers('player1');

      // Damage: 1 * (1 + 0.2 * 2) = 1.4
      expect(modifiers.damage).toBeCloseTo(1.4);

      // Healing: 1 * (1 + 0.5 * 1) = 1.5
      expect(modifiers.healing).toBeCloseTo(1.5);

      // Armor: 0 + 1 * 2 = 2
      expect(modifiers.armor).toBe(2);

      // Resistance: min(0 + 0.1 * 1, 0.8) = 0.1
      expect(modifiers.resistance).toBe(0.1);

      // Vulnerability: 0 + 0.25 * 1 = 0.25
      expect(modifiers.vulnerability).toBe(0.25);
    });

    it('should cap resistance at 80%', () => {
      effectManager.applyEffect('player1', {
        id: 'high_resistance',
        name: 'High Resistance',
        type: 'buff',
        duration: 1,
        stacks: 10,
        metadata: { resistance: 0.2 }
      });

      const modifiers = effectManager.calculateModifiers('player1');
      expect(modifiers.resistance).toBe(0.8); // Capped
    });

    it('should return empty modifiers for non-existent player', () => {
      const modifiers = effectManager.calculateModifiers('nonexistent');

      expect(modifiers.damage).toBeUndefined();
      expect(modifiers.healing).toBeUndefined();
      expect(modifiers.armor).toBeUndefined();
      expect(modifiers.resistance).toBeUndefined();
      expect(modifiers.vulnerability).toBeUndefined();
    });
  });

  describe('static effect factories', () => {
    it('should create poison effect', () => {
      const poison = EffectManager.createPoisonEffect(3, 5);

      expect(poison.id).toBe('poison');
      expect(poison.name).toBe('Poisoned');
      expect(poison.type).toBe('debuff');
      expect(poison.duration).toBe(3);
      expect(poison.metadata.damage).toBe(5);
    });

    it('should create blessed effect', () => {
      const blessed = EffectManager.createBlessedEffect(4);

      expect(blessed.id).toBe('blessed');
      expect(blessed.name).toBe('Blessed');
      expect(blessed.type).toBe('buff');
      expect(blessed.duration).toBe(4);
      expect(blessed.metadata.healingModifier).toBe(0.5);
      expect(blessed.metadata.damageModifier).toBe(0.2);
    });

    it('should create shielded effect', () => {
      const shielded = EffectManager.createShieldedEffect(2, 8);

      expect(shielded.id).toBe('shielded');
      expect(shielded.name).toBe('Shielded');
      expect(shielded.type).toBe('buff');
      expect(shielded.duration).toBe(2);
      expect(shielded.metadata.armorBonus).toBe(8);
    });

    it('should create vulnerable effect', () => {
      const vulnerable = EffectManager.createVulnerableEffect(1, 0.3);

      expect(vulnerable.id).toBe('vulnerable');
      expect(vulnerable.name).toBe('Vulnerable');
      expect(vulnerable.type).toBe('debuff');
      expect(vulnerable.duration).toBe(1);
      expect(vulnerable.metadata.vulnerability).toBe(0.3);
    });
  });

  describe('serialization', () => {
    beforeEach(() => {
      const effects: EffectData[] = [
        {
          id: 'poison',
          name: 'Poisoned',
          type: 'debuff',
          duration: 3,
          stacks: 2,
          metadata: { damage: 5 }
        },
        {
          id: 'shield',
          name: 'Shield',
          type: 'buff',
          duration: 5,
          stacks: 0,
          metadata: { armor: 3 }
        }
      ];

      effectManager.applyEffect('player1', effects[0]);
      effectManager.applyEffect('player1', effects[1]);
      effectManager.applyEffect('player2', effects[0]);
    });

    it('should serialize to JSON correctly', () => {
      const json = effectManager.toJSON();

      expect(json.activeEffects).toBeDefined();
      expect(json.activeEffects.player1).toHaveLength(2);
      expect(json.activeEffects.player2).toHaveLength(1);
    });

    it('should create EffectManager from JSON', () => {
      const json = effectManager.toJSON();
      const newManager = EffectManager.fromJSON(json);

      expect(newManager.hasEffect('player1', 'poison')).toBe(true);
      expect(newManager.hasEffect('player1', 'shield')).toBe(true);
      expect(newManager.hasEffect('player2', 'poison')).toBe(true);

      const poison = newManager.getEffect('player1', 'poison');
      expect(poison?.stacks).toBe(2);
      expect(poison?.metadata.damage).toBe(5);
    });

    it('should handle empty JSON data', () => {
      const newManager = EffectManager.fromJSON({});

      expect(newManager.getPlayerEffects('player1')).toEqual([]);
    });

    it('should validate data during deserialization', () => {
      const invalidJson = {
        activeEffects: {
          player1: [['poison', { id: 'poison', type: 'invalid_type' }]]
        }
      };

      expect(() => {
        EffectManager.fromJSON(invalidJson);
      }).toThrow();
    });
  });
});
