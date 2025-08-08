/**
 * @fileoverview Tests for GameBalance Schema validation
 * Testing Zod schema validation for game balance configuration
 */

import { z } from 'zod';
import { GameBalanceSchema } from '@config/schemas/gameBalance.schema';

describe('GameBalance Schema Validation', () => {
  describe('Valid GameBalance Configuration', () => {
    it('should validate complete game balance configuration', () => {
      const validGameBalance = {
        monster: {
          baseHp: 100,
          baseDamage: 15,
          baseAge: 1,
          levelMultiplier: 1.2,
          damageVariance: 0.1,
          ageIncrement: 1
        },
        player: {
          baseHp: 100,
          baseArmor: 0,
          baseDamage: 1.0,
          levelUp: {
            hpIncrease: 0.2,
            damageIncrease: 1.1,
            armorIncrease: 0.05
          }
        },
        combat: {
          armorReduction: 0.1,
          maxArmorReduction: 0.9,
          criticalHitChance: 0.05,
          criticalHitMultiplier: 2.0,
          defaultOrders: {
            attack: 10,
            defense: 20,
            heal: 30,
            special: 40
          }
        },
        rounds: {
          maxRounds: 50,
          timeoutPerRound: 30000,
          gracePercentage: 0.1
        }
      };

      const result = GameBalanceSchema.safeParse(validGameBalance);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.monster.baseHp).toBe(100);
        expect(result.data.player.baseHp).toBe(100);
        expect(result.data.combat.armorReduction).toBe(0.1);
        expect(result.data.rounds.maxRounds).toBe(50);
      }
    });

    it('should validate with optional fields omitted', () => {
      const minimalGameBalance = {
        monster: {
          baseHp: 50,
          baseDamage: 10,
          baseAge: 1
        },
        player: {
          baseHp: 80,
          levelUp: {
            hpIncrease: 0.15
          }
        },
        combat: {
          defaultOrders: {
            attack: 1
          }
        }
      };

      const result = GameBalanceSchema.safeParse(minimalGameBalance);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.monster.baseHp).toBe(50);
        expect(result.data.player.baseHp).toBe(80);
      }
    });
  });

  describe('Monster Configuration Validation', () => {
    it('should reject negative monster base HP', () => {
      const invalidConfig = {
        monster: {
          baseHp: -10,
          baseDamage: 5,
          baseAge: 1
        },
        player: {
          baseHp: 100,
          levelUp: { hpIncrease: 0.1 }
        },
        combat: {
          defaultOrders: { attack: 1 }
        }
      };

      const result = GameBalanceSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.path.includes('baseHp') && issue.code === 'too_small'
        )).toBe(true);
      }
    });

    it('should reject negative monster base damage', () => {
      const invalidConfig = {
        monster: {
          baseHp: 100,
          baseDamage: -5,
          baseAge: 1
        },
        player: {
          baseHp: 100,
          levelUp: { hpIncrease: 0.1 }
        },
        combat: {
          defaultOrders: { attack: 1 }
        }
      };

      const result = GameBalanceSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.path.includes('baseDamage') && issue.code === 'too_small'
        )).toBe(true);
      }
    });

    it('should validate monster level multiplier bounds', () => {
      const invalidConfig = {
        monster: {
          baseHp: 100,
          baseDamage: 10,
          baseAge: 1,
          levelMultiplier: 0.5 // Should be >= 1.0
        },
        player: {
          baseHp: 100,
          levelUp: { hpIncrease: 0.1 }
        },
        combat: {
          defaultOrders: { attack: 1 }
        }
      };

      const result = GameBalanceSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.path.includes('levelMultiplier') && issue.code === 'too_small'
        )).toBe(true);
      }
    });

    it('should validate damage variance range', () => {
      const invalidConfig = {
        monster: {
          baseHp: 100,
          baseDamage: 10,
          baseAge: 1,
          damageVariance: 1.5 // Should be <= 1.0
        },
        player: {
          baseHp: 100,
          levelUp: { hpIncrease: 0.1 }
        },
        combat: {
          defaultOrders: { attack: 1 }
        }
      };

      const result = GameBalanceSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.path.includes('damageVariance') && issue.code === 'too_big'
        )).toBe(true);
      }
    });
  });

  describe('Player Configuration Validation', () => {
    it('should validate player level up configuration', () => {
      const validConfig = {
        monster: {
          baseHp: 100,
          baseDamage: 10,
          baseAge: 1
        },
        player: {
          baseHp: 100,
          baseArmor: 2,
          baseDamage: 1.2,
          levelUp: {
            hpIncrease: 0.25,
            damageIncrease: 1.15,
            armorIncrease: 0.1
          }
        },
        combat: {
          defaultOrders: { attack: 1 }
        }
      };

      const result = GameBalanceSchema.safeParse(validConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.player.levelUp.hpIncrease).toBe(0.25);
        expect(result.data.player.levelUp.damageIncrease).toBe(1.15);
        expect(result.data.player.levelUp.armorIncrease).toBe(0.1);
      }
    });

    it('should reject negative base armor', () => {
      const invalidConfig = {
        monster: {
          baseHp: 100,
          baseDamage: 10,
          baseAge: 1
        },
        player: {
          baseHp: 100,
          baseArmor: -5,
          levelUp: { hpIncrease: 0.1 }
        },
        combat: {
          defaultOrders: { attack: 1 }
        }
      };

      const result = GameBalanceSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
    });

    it('should validate damage increase must be > 1.0', () => {
      const invalidConfig = {
        monster: {
          baseHp: 100,
          baseDamage: 10,
          baseAge: 1
        },
        player: {
          baseHp: 100,
          levelUp: {
            hpIncrease: 0.1,
            damageIncrease: 0.9 // Should be > 1.0 for multiplicative increase
          }
        },
        combat: {
          defaultOrders: { attack: 1 }
        }
      };

      const result = GameBalanceSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.path.includes('damageIncrease') && issue.code === 'too_small'
        )).toBe(true);
      }
    });
  });

  describe('Combat Configuration Validation', () => {
    it('should validate armor reduction bounds', () => {
      const validConfig = {
        monster: {
          baseHp: 100,
          baseDamage: 10,
          baseAge: 1
        },
        player: {
          baseHp: 100,
          levelUp: { hpIncrease: 0.1 }
        },
        combat: {
          armorReduction: 0.15,
          maxArmorReduction: 0.85,
          criticalHitChance: 0.1,
          criticalHitMultiplier: 1.5,
          defaultOrders: {
            attack: 5,
            defense: 10,
            heal: 15,
            special: 20
          }
        }
      };

      const result = GameBalanceSchema.safeParse(validConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.combat.armorReduction).toBe(0.15);
        expect(result.data.combat.maxArmorReduction).toBe(0.85);
      }
    });

    it('should reject armor reduction > 1.0', () => {
      const invalidConfig = {
        monster: {
          baseHp: 100,
          baseDamage: 10,
          baseAge: 1
        },
        player: {
          baseHp: 100,
          levelUp: { hpIncrease: 0.1 }
        },
        combat: {
          armorReduction: 1.5, // Should be <= 1.0
          defaultOrders: { attack: 1 }
        }
      };

      const result = GameBalanceSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
    });

    it('should validate critical hit multiplier must be > 1.0', () => {
      const invalidConfig = {
        monster: {
          baseHp: 100,
          baseDamage: 10,
          baseAge: 1
        },
        player: {
          baseHp: 100,
          levelUp: { hpIncrease: 0.1 }
        },
        combat: {
          criticalHitMultiplier: 0.8, // Should be > 1.0
          defaultOrders: { attack: 1 }
        }
      };

      const result = GameBalanceSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
    });

    it('should validate default orders are positive integers', () => {
      const invalidConfig = {
        monster: {
          baseHp: 100,
          baseDamage: 10,
          baseAge: 1
        },
        player: {
          baseHp: 100,
          levelUp: { hpIncrease: 0.1 }
        },
        combat: {
          defaultOrders: {
            attack: -5, // Should be positive
            defense: 0, // Should be > 0
            heal: 1.5 // Should be integer
          }
        }
      };

      const result = GameBalanceSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Rounds Configuration Validation', () => {
    it('should validate rounds configuration', () => {
      const validConfig = {
        monster: {
          baseHp: 100,
          baseDamage: 10,
          baseAge: 1
        },
        player: {
          baseHp: 100,
          levelUp: { hpIncrease: 0.1 }
        },
        combat: {
          defaultOrders: { attack: 1 }
        },
        rounds: {
          maxRounds: 30,
          timeoutPerRound: 60000,
          gracePercentage: 0.15
        }
      };

      const result = GameBalanceSchema.safeParse(validConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rounds?.maxRounds).toBe(30);
        expect(result.data.rounds?.timeoutPerRound).toBe(60000);
        expect(result.data.rounds?.gracePercentage).toBe(0.15);
      }
    });

    it('should reject invalid max rounds', () => {
      const invalidConfig = {
        monster: {
          baseHp: 100,
          baseDamage: 10,
          baseAge: 1
        },
        player: {
          baseHp: 100,
          levelUp: { hpIncrease: 0.1 }
        },
        combat: {
          defaultOrders: { attack: 1 }
        },
        rounds: {
          maxRounds: 0, // Should be >= 1
          timeoutPerRound: 30000
        }
      };

      const result = GameBalanceSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
    });

    it('should validate grace percentage bounds', () => {
      const invalidConfig = {
        monster: {
          baseHp: 100,
          baseDamage: 10,
          baseAge: 1
        },
        player: {
          baseHp: 100,
          levelUp: { hpIncrease: 0.1 }
        },
        combat: {
          defaultOrders: { attack: 1 }
        },
        rounds: {
          maxRounds: 20,
          timeoutPerRound: 30000,
          gracePercentage: 1.5 // Should be <= 1.0
        }
      };

      const result = GameBalanceSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
    });
  });

  describe('Type Inference and Integration', () => {
    it('should provide correct TypeScript types', () => {
      type GameBalanceType = z.infer<typeof GameBalanceSchema>;

      const gameBalance: GameBalanceType = {
        monster: {
          baseHp: 100,
          baseDamage: 15,
          baseAge: 1
        },
        player: {
          baseHp: 100,
          levelUp: {
            hpIncrease: 0.2
          }
        },
        combat: {
          defaultOrders: {
            attack: 10
          }
        }
      };

      expect(typeof gameBalance.monster.baseHp).toBe('number');
      expect(typeof gameBalance.player.levelUp.hpIncrease).toBe('number');
      expect(gameBalance.combat.armorReduction).toBeUndefined(); // Optional field
    });

    it('should handle deeply nested validation errors', () => {
      const deeplyInvalidConfig = {
        monster: {
          baseHp: -100,
          baseDamage: 'invalid',
          baseAge: -1
        },
        player: {
          baseHp: -50,
          levelUp: {
            hpIncrease: -0.1,
            damageIncrease: 0.5
          }
        },
        combat: {
          armorReduction: 2.0,
          defaultOrders: {
            attack: -1,
            defense: 'invalid'
          }
        }
      };

      const result = GameBalanceSchema.safeParse(deeplyInvalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(5);

        // Verify we get errors from all nested levels
        const paths = result.error.issues.map(issue => issue.path.join('.'));
        expect(paths.some(path => path.includes('monster'))).toBe(true);
        expect(paths.some(path => path.includes('player'))).toBe(true);
        expect(paths.some(path => path.includes('combat'))).toBe(true);
      }
    });
  });
});
