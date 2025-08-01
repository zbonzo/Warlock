/**
 * @fileoverview Tests for StatusEffect class
 */

import StatusEffect from '../../../../server/models/systems/StatusEffect';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid')
}));

jest.mock('../../config/index.js', () => ({
  statusEffects: {
    getEffectDefaults: jest.fn(() => ({})),
    getEffectMessage: jest.fn(() => 'Effect expired'),
    formatEffectMessage: jest.fn(() => 'Formatted message')
  }
}));

jest.mock('../../config/messages/index.js', () => ({
  getEvent: jest.fn(() => ({ message: 'Test event' })),
  getAbilityMessage: jest.fn(() => 'Test ability message'),
  formatMessage: jest.fn(() => 'Formatted message')
}));

describe('StatusEffect', () => {
  let mockTarget: any;
  let statusEffect: StatusEffect;

  beforeEach(() => {
    mockTarget = {
      id: 'target-1',
      name: 'Test Target',
      hp: 100,
      maxHp: 100,
      isAlive: true
    };
  });

  describe('constructor', () => {
    it('should create status effect with default values', () => {
      statusEffect = new StatusEffect('poison', { turns: 3, damage: 5 });
      
      expect(statusEffect.id).toBe('test-uuid');
      expect(statusEffect.type).toBe('poison');
      expect(statusEffect.turnsRemaining).toBe(3);
      expect(statusEffect.isActive).toBe(true);
    });
  });

  describe('processTurn', () => {
    it('should process poison damage', () => {
      statusEffect = new StatusEffect('poison', { turns: 2, damage: 10 });
      const log: any[] = [];
      
      const result = statusEffect.processTurn(mockTarget, log);
      
      expect(mockTarget.hp).toBe(90);
      expect(statusEffect.turnsRemaining).toBe(1);
      expect(result.shouldRemove).toBe(false);
    });

    it('should remove expired effect', () => {
      statusEffect = new StatusEffect('poison', { turns: 1, damage: 5 });
      const log: any[] = [];
      
      const result = statusEffect.processTurn(mockTarget, log);
      
      expect(result.shouldRemove).toBe(true);
      expect(statusEffect.isActive).toBe(false);
    });
  });

  describe('getCalculationContribution', () => {
    it('should return vulnerability contribution', () => {
      statusEffect = new StatusEffect('vulnerable', { damageIncrease: 0.3 });
      
      const contribution = statusEffect.getCalculationContribution('damageTaken');
      
      expect(contribution.percentage).toBe(30);
    });
  });

  describe('refresh', () => {
    it('should extend duration and stack damage', () => {
      statusEffect = new StatusEffect('poison', { turns: 2, damage: 5 });
      
      statusEffect.refresh({ turns: 4, damage: 3 }, true);
      
      expect(statusEffect.turnsRemaining).toBe(4);
      expect(statusEffect.params.damage).toBe(8);
    });
  });
});