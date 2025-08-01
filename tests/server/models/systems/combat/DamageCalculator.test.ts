/**
 * @fileoverview Tests for DamageCalculator class
 */

import DamageCalculator from '../../../../../server/models/systems/combat/DamageCalculator';

describe('DamageCalculator', () => {
  let damageCalculator: DamageCalculator;

  beforeEach(() => {
    damageCalculator = new DamageCalculator();
  });

  describe('calculateArmorReduction', () => {
    it('should reduce damage by armor amount', () => {
      const result = damageCalculator.calculateArmorReduction(10, 3);
      expect(result.finalDamage).toBe(7);
      expect(result.armorReduction).toBe(3);
    });

    it('should leave minimum 1 damage', () => {
      const result = damageCalculator.calculateArmorReduction(5, 10);
      expect(result.finalDamage).toBe(1);
      expect(result.armorReduction).toBe(4);
    });
  });

  describe('calculateDamage', () => {
    it('should calculate basic damage', () => {
      const attacker = { damageMod: 1.2 };
      const target = { armor: 2 };
      
      const result = damageCalculator.calculateDamage(attacker, target, 10);
      
      expect(result.finalDamage).toBe(10); // (10 * 1.2) - 2 = 10
    });

    it('should apply vulnerability modifier', () => {
      const target = { 
        statusEffects: { 
          vulnerable: { damageIncrease: 0.5 } 
        } 
      };
      
      const result = damageCalculator.calculateDamage(null, target, 10);
      
      expect(result.finalDamage).toBe(15);
    });
  });

  describe('shouldApplyArmor', () => {
    it('should apply armor for physical damage', () => {
      expect(damageCalculator.shouldApplyArmor('physical')).toBe(true);
    });

    it('should bypass armor for poison damage', () => {
      expect(damageCalculator.shouldApplyArmor('poison')).toBe(false);
    });
  });
});