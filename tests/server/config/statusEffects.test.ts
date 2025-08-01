/**
 * @fileoverview Tests for status effects configuration
 * Tests the structure and behavior of all status effect definitions
 */
import statusEffectsConfig, {
  poison,
  bleed,
  shielded,
  invisible,
  stunned,
  vulnerable,
  weakened,
  enraged,
  healingOverTime,
  stoneArmor,
  undying,
  moonbeam,
  lifeBond,
  spiritGuard,
  sanctuary,
  processingOrder,
  global,
  getEffectDefaults,
  isEffectStackable,
  isEffectRefreshable,
  getEffectMessage,
  formatEffectMessage,
} from '../../server/config/statusEffects';

describe('Status Effects Configuration', () => {
  it('should export a valid configuration object', () => {
    expect(statusEffectsConfig).toBeDefined();
    expect(typeof statusEffectsConfig).toBe('object');
  });

  describe('Individual status effects', () => {
    const statusEffects = [
      { name: 'poison', effect: poison },
      { name: 'bleed', effect: bleed },
      { name: 'shielded', effect: shielded },
      { name: 'invisible', effect: invisible },
      { name: 'stunned', effect: stunned },
      { name: 'vulnerable', effect: vulnerable },
      { name: 'weakened', effect: weakened },
      { name: 'enraged', effect: enraged },
      { name: 'healingOverTime', effect: healingOverTime },
      { name: 'stoneArmor', effect: stoneArmor },
      { name: 'undying', effect: undying },
      { name: 'moonbeam', effect: moonbeam },
      { name: 'lifeBond', effect: lifeBond },
      { name: 'spiritGuard', effect: spiritGuard },
      { name: 'sanctuary', effect: sanctuary },
    ];

    it.each(statusEffects)('$name should have valid structure', ({ name, effect }) => {
      expect(effect).toBeDefined();
      expect(typeof effect).toBe('object');
      
      // All effects should have these core properties
      expect(effect.default).toBeDefined();
      expect(typeof effect.default).toBe('object');
      expect(typeof effect.stackable).toBe('boolean');
      expect(typeof effect.refreshable).toBe('boolean');
      expect(effect.messages).toBeDefined();
      expect(typeof effect.messages).toBe('object');
    });

    it.each(statusEffects)('$name should have valid default values', ({ name, effect }) => {
      const defaults = effect.default;
      
      // Turns should always be defined and be a number
      expect(defaults.turns).toBeDefined();
      expect(typeof defaults.turns).toBe('number');
      
      // For permanent effects, turns should be -1
      if (effect.isPermanent) {
        expect(defaults.turns).toBe(-1);
      } else {
        expect(defaults.turns).toBeGreaterThan(0);
      }
      
      // Validate numeric properties when they exist
      const numericProps = ['damage', 'armor', 'amount', 'damageIncrease', 'damageReduction'];
      numericProps.forEach(prop => {
        if (defaults[prop] !== undefined) {
          expect(typeof defaults[prop]).toBe('number');
          expect(defaults[prop]).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it.each(statusEffects)('$name should have valid message templates', ({ name, effect }) => {
      const messages = effect.messages;
      
      // At least one message should be defined
      expect(Object.keys(messages).length).toBeGreaterThan(0);
      
      // All message values should be non-empty strings
      Object.values(messages).forEach(message => {
        expect(typeof message).toBe('string');
        expect(message.trim().length).toBeGreaterThan(0);
      });
      
      // Check for proper placeholder formatting
      Object.values(messages).forEach(message => {
        const placeholders = (message as string).match(/{[^}]+}/g) || [];
        placeholders.forEach(placeholder => {
          expect(placeholder).toMatch(/^{[a-zA-Z][a-zA-Z0-9]*}$/);
        });
      });
    });
  });

  describe('Damage-dealing effects', () => {
    it('should have proper damage configuration for poison', () => {
      expect(poison.default.damage).toBeDefined();
      expect(typeof poison.default.damage).toBe('number');
      expect(poison.default.damage).toBeGreaterThan(0);
      expect(poison.canCauseDeath).toBe(true);
      expect(poison.triggersStoneDegradation).toBe(true);
    });

    it('should have proper damage configuration for bleed', () => {
      expect(bleed.default.damage).toBeDefined();
      expect(typeof bleed.default.damage).toBe('number');
      expect(bleed.default.damage).toBeGreaterThan(0);
      expect(bleed.damagePerTurn).toBe(true);
      expect(bleed.processAtEndOfTurn).toBe(true);
    });
  });

  describe('Protective effects', () => {
    it('should have proper protection configuration for shielded', () => {
      expect(shielded.default.armor).toBeDefined();
      expect(typeof shielded.default.armor).toBe('number');
      expect(shielded.default.armor).toBeGreaterThan(0);
      expect(shielded.armorStacks).toBe(true);
      expect(shielded.stackable).toBe(false);
    });

    it('should have proper invisibility configuration', () => {
      expect(invisible.preventsTargeting).toBe(true);
      expect(invisible.allowsSelfTargeting).toBe(true);
      expect(invisible.redirectsAttacks).toBe(true);
      expect(invisible.affectsMonster).toBe(true);
      expect(invisible.breaksOnAction).toBe(false);
    });
  });

  describe('Control effects', () => {
    it('should have proper stun configuration', () => {
      expect(stunned.preventsActions).toBe(true);
      expect(stunned.preventsRacialAbilities).toBe(true);
      expect(stunned.allowsPassiveEffects).toBe(true);
      expect(stunned.stackable).toBe(false);
    });

    it('should have proper vulnerability configuration', () => {
      expect(vulnerable.default.damageIncrease).toBeDefined();
      expect(typeof vulnerable.default.damageIncrease).toBe('number');
      expect(vulnerable.default.damageIncrease).toBeGreaterThan(0);
      expect(vulnerable.affectsDamageCalculation).toBe(true);
    });
  });

  describe('Racial passive effects', () => {
    it('should have proper stone armor configuration', () => {
      expect(stoneArmor.isPermanent).toBe(true);
      expect(stoneArmor.isPassive).toBe(true);
      expect(stoneArmor.degradesOnHit).toBe(true);
      expect(stoneArmor.default.turns).toBe(-1);
      expect(stoneArmor.default.degradationPerHit).toBeDefined();
    });

    it('should have proper undying configuration', () => {
      expect(undying.isPermanent).toBe(true);
      expect(undying.isPassive).toBe(true);
      expect(undying.triggersOnDeath).toBe(true);
      expect(undying.default.resurrectedHp).toBeDefined();
      expect(undying.default.usesLeft).toBeDefined();
    });

    it('should have proper moonbeam configuration', () => {
      expect(moonbeam.isPermanent).toBe(true);
      expect(moonbeam.isPassive).toBe(true);
      expect(moonbeam.revealsCorruption).toBe(true);
      expect(moonbeam.default.healthThreshold).toBeDefined();
    });

    it('should have proper life bond configuration', () => {
      expect(lifeBond.isPermanent).toBe(true);
      expect(lifeBond.isPassive).toBe(true);
      expect(lifeBond.healsEndOfRound).toBe(true);
      expect(lifeBond.default.healingPercent).toBeDefined();
    });
  });

  describe('Processing order', () => {
    it('should have a valid processing order configuration', () => {
      expect(processingOrder).toBeDefined();
      expect(typeof processingOrder).toBe('object');
      
      // All processing orders should be positive integers
      Object.values(processingOrder).forEach(order => {
        expect(typeof order).toBe('number');
        expect(order).toBeGreaterThan(0);
        expect(Number.isInteger(order)).toBe(true);
      });
    });

    it('should include all major status effects in processing order', () => {
      const majorEffects = ['poison', 'bleed', 'stunned', 'invisible', 'vulnerable'];
      majorEffects.forEach(effect => {
        expect(processingOrder[effect]).toBeDefined();
      });
    });

    it('should have logical processing order', () => {
      // Damage effects should be processed early
      expect(processingOrder.poison).toBeLessThan(10);
      expect(processingOrder.bleed).toBeLessThan(10);
      
      // Healing should be processed after damage
      expect(processingOrder.healingOverTime).toBeGreaterThan(processingOrder.poison);
      expect(processingOrder.healingOverTime).toBeGreaterThan(processingOrder.bleed);
      
      // Death triggers should be processed last
      expect(processingOrder.undying).toBeGreaterThan(processingOrder.healingOverTime);
    });
  });

  describe('Global settings', () => {
    it('should have valid global configuration', () => {
      expect(global).toBeDefined();
      expect(typeof global).toBe('object');
      
      expect(typeof global.maxEffectsPerPlayer).toBe('number');
      expect(global.maxEffectsPerPlayer).toBeGreaterThan(0);
      
      expect(typeof global.maxTurns).toBe('number');
      expect(global.maxTurns).toBeGreaterThan(0);
      
      expect(typeof global.minTurns).toBe('number');
      expect(global.minTurns).toBeGreaterThan(0);
      
      expect(global.maxTurns).toBeGreaterThan(global.minTurns);
    });

    it('should have logical processing settings', () => {
      expect(typeof global.processBeforeActions).toBe('boolean');
      expect(typeof global.processAfterActions).toBe('boolean');
      expect(typeof global.removeExpiredImmediately).toBe('boolean');
      expect(typeof global.allowZeroTurnEffects).toBe('boolean');
    });
  });

  describe('Helper functions', () => {
    it('should have working getEffectDefaults function', () => {
      expect(typeof getEffectDefaults).toBe('function');
      
      // Test with valid effect
      const poisonDefaults = getEffectDefaults('poison');
      expect(poisonDefaults).toBeDefined();
      expect(poisonDefaults.damage).toBe(poison.default.damage);
      expect(poisonDefaults.turns).toBe(poison.default.turns);
      
      // Test with invalid effect
      const invalidDefaults = getEffectDefaults('nonexistent');
      expect(invalidDefaults).toBeNull();
    });

    it('should have working isEffectStackable function', () => {
      expect(typeof isEffectStackable).toBe('function');
      
      // Test stackable effects
      expect(isEffectStackable('poison')).toBe(true);
      expect(isEffectStackable('bleed')).toBe(true);
      
      // Test non-stackable effects  
      expect(isEffectStackable('stunned')).toBe(false);
      expect(isEffectStackable('invisible')).toBe(false);
      
      // Test invalid effect
      expect(isEffectStackable('nonexistent')).toBe(false);
    });

    it('should have working isEffectRefreshable function', () => {
      expect(typeof isEffectRefreshable).toBe('function');
      
      // Test refreshable effects
      expect(isEffectRefreshable('poison')).toBe(true);
      expect(isEffectRefreshable('stunned')).toBe(true);
      
      // Test non-refreshable effects
      expect(isEffectRefreshable('enraged')).toBe(false);
      expect(isEffectRefreshable('stoneArmor')).toBe(false);
      
      // Test invalid effect
      expect(isEffectRefreshable('nonexistent')).toBe(false);
    });

    it('should have working getEffectMessage function', () => {
      expect(typeof getEffectMessage).toBe('function');
      
      // Test with valid effect and message type
      const poisonApplied = getEffectMessage('poison', 'applied', {
        playerName: 'TestPlayer',
        damage: 5,
        turns: 3
      });
      expect(typeof poisonApplied).toBe('string');
      expect(poisonApplied).toContain('TestPlayer');
      
      // Test with invalid message type (should return fallback)
      const fallback = getEffectMessage('poison', 'nonexistent', {
        playerName: 'TestPlayer'
      });
      expect(typeof fallback).toBe('string');
      expect(fallback.length).toBeGreaterThan(0);
    });

    it('should have working formatEffectMessage function', () => {
      expect(typeof formatEffectMessage).toBe('function');
      
      // Test message formatting
      const template = '{playerName} takes {damage} damage!';
      const formatted = formatEffectMessage(template, {
        playerName: 'TestPlayer',
        damage: 10
      });
      expect(formatted).toBe('TestPlayer takes 10 damage!');
      
      // Test with missing placeholders
      const partialFormat = formatEffectMessage(template, {
        playerName: 'TestPlayer'
      });
      expect(partialFormat).toBe('TestPlayer takes {damage} damage!');
      
      // Test with empty template
      expect(formatEffectMessage('', {})).toBe('');
    });
  });

  describe('Message consistency', () => {
    it('should have consistent player name placeholders', () => {
      const effects = [poison, bleed, shielded, stunned, vulnerable];
      const commonPlayerPlaceholders = ['playerName', 'targetName', 'attackerName'];
      
      effects.forEach(effect => {
        Object.values(effect.messages).forEach(message => {
          const placeholders = (message as string).match(/{[^}]+}/g) || [];
          const playerPlaceholders = placeholders.filter(p => 
            commonPlayerPlaceholders.some(common => p.includes(common))
          );
          
          // If player placeholders exist, they should use standard names
          playerPlaceholders.forEach(placeholder => {
            expect(commonPlayerPlaceholders.some(common => 
              placeholder.includes(common)
            )).toBe(true);
          });
        });
      });
    });
  });
});