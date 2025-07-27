/**
 * @fileoverview Tests for PlayerEffects domain model
 */
const PlayerEffects = require('../../../../server/models/player/PlayerEffects');

// Mock config and messages
jest.mock('@config', () => ({
  gameBalance: {
    stoneArmor: {
      degradationPerHit: 1,
      minimumValue: 0,
      initialValue: 10
    }
  }
}));

jest.mock('@messages', () => ({
  formatMessage: jest.fn((template, params) => `${template} ${JSON.stringify(params)}`),
  getEvent: jest.fn((key) => `Event: ${key}`),
  serverLogMessages: {
    debug: {
      StoneArmorDegradation: 'Stone armor degraded',
      UndyingSetup: 'Undying setup'
    }
  }
}));

describe('PlayerEffects', () => {
  let playerEffects;

  beforeEach(() => {
    playerEffects = new PlayerEffects('player1', 'TestPlayer');
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct default values', () => {
      expect(playerEffects.statusEffects).toEqual({});
      expect(playerEffects.isVulnerable).toBe(false);
      expect(playerEffects.vulnerabilityIncrease).toBe(0);
      expect(playerEffects.stoneArmorIntact).toBe(false);
      expect(playerEffects.stoneArmorValue).toBe(0);
      expect(playerEffects.classEffects).toEqual({});
      expect(playerEffects.racialEffects).toEqual({});
    });
  });

  describe('Status Effects', () => {
    test('should apply status effects correctly', () => {
      playerEffects.applyStatusEffect('poison', { damage: 5, turns: 3 });
      
      expect(playerEffects.hasStatusEffect('poison')).toBe(true);
      expect(playerEffects.statusEffects.poison).toEqual({ damage: 5, turns: 3 });
    });

    test('should remove status effects correctly', () => {
      playerEffects.applyStatusEffect('stunned', { turns: 1 });
      
      expect(playerEffects.hasStatusEffect('stunned')).toBe(true);
      
      playerEffects.removeStatusEffect('stunned');
      
      expect(playerEffects.hasStatusEffect('stunned')).toBe(false);
    });

    test('should handle removing non-existent effects gracefully', () => {
      expect(() => {
        playerEffects.removeStatusEffect('nonexistent');
      }).not.toThrow();
    });
  });

  describe('Vulnerability', () => {
    test('should apply vulnerability correctly', () => {
      playerEffects.applyVulnerability(25, 2);
      
      expect(playerEffects.isVulnerable).toBe(true);
      expect(playerEffects.vulnerabilityIncrease).toBe(25);
      expect(playerEffects.statusEffects.vulnerable.damageIncrease).toBe(25);
      expect(playerEffects.statusEffects.vulnerable.turns).toBe(2);
    });

    test('should process vulnerability correctly', () => {
      playerEffects.applyVulnerability(25, 2);
      
      // First process - should reduce turns
      let expired = playerEffects.processVulnerability();
      expect(expired).toBe(false);
      expect(playerEffects.statusEffects.vulnerable.turns).toBe(1);
      
      // Second process - should expire
      expired = playerEffects.processVulnerability();
      expect(expired).toBe(true);
      expect(playerEffects.isVulnerable).toBe(false);
      expect(playerEffects.vulnerabilityIncrease).toBe(0);
      expect(playerEffects.statusEffects.vulnerable).toBeUndefined();
    });

    test('should not process vulnerability if not vulnerable', () => {
      const expired = playerEffects.processVulnerability();
      expect(expired).toBe(false);
    });
  });

  describe('Armor Calculations', () => {
    test('should calculate effective armor correctly', () => {
      const baseArmor = 5;
      expect(playerEffects.getEffectiveArmor(baseArmor)).toBe(5);
    });

    test('should include stone armor in effective armor', () => {
      const baseArmor = 3;
      playerEffects.initializeStoneArmor(7);
      
      expect(playerEffects.getEffectiveArmor(baseArmor)).toBe(10);
    });

    test('should include shielded effect in effective armor', () => {
      const baseArmor = 2;
      playerEffects.applyStatusEffect('shielded', { armor: 5 });
      
      expect(playerEffects.getEffectiveArmor(baseArmor)).toBe(7);
    });

    test('should handle null base armor', () => {
      playerEffects.initializeStoneArmor(5);
      expect(playerEffects.getEffectiveArmor(null)).toBe(5);
    });
  });

  describe('Stone Armor', () => {
    test('should initialize stone armor correctly', () => {
      playerEffects.initializeStoneArmor(8);
      
      expect(playerEffects.stoneArmorIntact).toBe(true);
      expect(playerEffects.stoneArmorValue).toBe(8);
    });

    test('should use default value when not provided', () => {
      playerEffects.initializeStoneArmor();
      
      expect(playerEffects.stoneArmorIntact).toBe(true);
      expect(playerEffects.stoneArmorValue).toBe(10); // From mock config
    });

    test('should process stone armor degradation correctly', () => {
      playerEffects.initializeStoneArmor(5);
      
      const result = playerEffects.processStoneArmorDegradation(10);
      
      expect(result.degraded).toBe(true);
      expect(result.oldValue).toBe(5);
      expect(result.newArmorValue).toBe(4);
      expect(playerEffects.stoneArmorValue).toBe(4);
    });

    test('should not degrade stone armor if not intact', () => {
      const result = playerEffects.processStoneArmorDegradation(10);
      
      expect(result.degraded).toBe(false);
      expect(result.newArmorValue).toBe(0);
    });

    test('should not degrade stone armor for zero damage', () => {
      playerEffects.initializeStoneArmor(5);
      
      const result = playerEffects.processStoneArmorDegradation(0);
      
      expect(result.degraded).toBe(false);
      expect(playerEffects.stoneArmorValue).toBe(5);
    });

    test('should handle stone armor reaching minimum value', () => {
      playerEffects.initializeStoneArmor(1);
      
      const result = playerEffects.processStoneArmorDegradation(10);
      
      expect(result.newArmorValue).toBe(0);
      expect(result.destroyed).toBe(true);
    });
  });

  describe('Damage Modifiers', () => {
    test('should apply blood rage effects correctly', () => {
      playerEffects.racialEffects = { bloodRage: true };
      
      const modifiedDamage = playerEffects.applyDamageModifiers(20, 'Barbarian', 1, 100, 100);
      
      expect(modifiedDamage).toBe(40); // 20 * 2
      expect(playerEffects.racialEffects.bloodRage).toBeUndefined(); // Should be consumed
    });

    test('should apply blood rage multiplier correctly', () => {
      playerEffects.racialEffects = { bloodRageMultiplier: 1.5 };
      
      const modifiedDamage = playerEffects.applyDamageModifiers(20, 'Barbarian', 1, 100, 100);
      
      expect(modifiedDamage).toBe(30); // 20 * 1.5
      expect(playerEffects.racialEffects.bloodRageMultiplier).toBeUndefined();
    });

    test('should apply relentless fury correctly', () => {
      playerEffects.classEffects = {
        relentlessFury: {
          active: true,
          currentLevel: 2,
          damagePerLevel: 0.1
        }
      };
      
      const modifiedDamage = playerEffects.applyDamageModifiers(100, 'Barbarian', 2, 100, 100);
      
      expect(modifiedDamage).toBe(120); // 100 * (1 + 2 * 0.1)
    });

    test('should apply blood frenzy correctly', () => {
      playerEffects.classEffects = {
        bloodFrenzy: {
          active: true,
          damageIncreasePerHpMissing: 0.02
        }
      };
      
      const modifiedDamage = playerEffects.applyDamageModifiers(100, 'Barbarian', 1, 50, 100);
      // 50% HP missing = 0.5, damage increase = 0.5 * 0.02 = 0.01
      // Final: 100 * 1.01 = 101
      expect(modifiedDamage).toBe(101);
    });

    test('should apply unstoppable rage damage boost', () => {
      playerEffects.classEffects = {
        unstoppableRage: {
          turnsLeft: 2,
          damageBoost: 1.5
        }
      };
      
      const modifiedDamage = playerEffects.applyDamageModifiers(100, 'Barbarian', 1, 100, 100);
      
      expect(modifiedDamage).toBe(150); // 100 * 1.5
    });

    test('should apply weakened effect reduction', () => {
      playerEffects.statusEffects = {
        weakened: { damageReduction: 0.3 }
      };
      
      const modifiedDamage = playerEffects.applyDamageModifiers(100, 'Warrior', 1, 100, 100);
      
      expect(modifiedDamage).toBe(70); // 100 * (1 - 0.3)
    });
  });

  describe('Damage Resistance', () => {
    test('should apply vulnerability to incoming damage', () => {
      playerEffects.applyVulnerability(50, 2);
      
      const modifiedDamage = playerEffects.applyDamageResistance(20, 'Warrior');
      
      expect(modifiedDamage).toBe(30); // 20 * 1.5
    });

    test('should apply unstoppable rage damage resistance', () => {
      playerEffects.classEffects = {
        unstoppableRage: {
          turnsLeft: 1,
          damageResistance: 0.3
        }
      };
      
      const modifiedDamage = playerEffects.applyDamageResistance(100, 'Barbarian');
      
      expect(modifiedDamage).toBe(70); // 100 * (1 - 0.3)
    });
  });

  describe('Special Abilities', () => {
    test('should calculate relentless fury vulnerability correctly', () => {
      playerEffects.classEffects = {
        relentlessFury: {
          active: true,
          currentLevel: 3,
          vulnerabilityPerLevel: 0.05
        }
      };
      
      const extraDamage = playerEffects.getRelentlessFuryVulnerability(100, 'Barbarian');
      
      expect(extraDamage).toBe(15); // 100 * (3 * 0.05)
    });

    test('should return zero vulnerability for non-barbarians', () => {
      const extraDamage = playerEffects.getRelentlessFuryVulnerability(100, 'Warrior');
      expect(extraDamage).toBe(0);
    });

    test('should process thirsty blade life steal correctly', () => {
      playerEffects.classEffects = {
        thirstyBlade: {
          active: true,
          turnsLeft: 2,
          lifeSteal: 0.2
        }
      };
      
      const result = playerEffects.processThirstyBladeLifeSteal(50, 'Barbarian', 80, 100);
      
      expect(result.healed).toBe(10); // 50 * 0.2 = 10
      expect(result.newHp).toBe(90); // 80 + 10
    });

    test('should cap thirsty blade healing at max HP', () => {
      playerEffects.classEffects = {
        thirstyBlade: {
          active: true,
          turnsLeft: 2,
          lifeSteal: 0.5
        }
      };
      
      const result = playerEffects.processThirstyBladeLifeSteal(100, 'Barbarian', 90, 100);
      
      expect(result.healed).toBe(10); // Capped at max HP
      expect(result.newHp).toBe(100);
    });

    test('should refresh thirsty blade on kill', () => {
      playerEffects.classEffects = {
        thirstyBlade: {
          active: false,
          turnsLeft: 0,
          maxDuration: 3
        }
      };
      
      const refreshed = playerEffects.refreshThirstyBladeOnKill('Barbarian');
      
      expect(refreshed).toBe(true);
      expect(playerEffects.classEffects.thirstyBlade.active).toBe(true);
      expect(playerEffects.classEffects.thirstyBlade.turnsLeft).toBe(3);
    });

    test('should get sweeping strike parameters correctly', () => {
      playerEffects.classEffects = {
        sweepingStrike: {
          active: true,
          bonusTargets: 2,
          stunChance: 0.3,
          stunDuration: 2
        }
      };
      
      const params = playerEffects.getSweepingStrikeParams('Barbarian');
      
      expect(params.bonusTargets).toBe(2);
      expect(params.stunChance).toBe(0.3);
      expect(params.stunDuration).toBe(2);
    });

    test('should return null for inactive sweeping strike', () => {
      const params = playerEffects.getSweepingStrikeParams('Barbarian');
      expect(params).toBeNull();
    });
  });

  describe('Class Effects Processing', () => {
    test('should process thirsty blade expiration correctly', () => {
      playerEffects.classEffects = {
        thirstyBlade: {
          active: true,
          turnsLeft: 1
        }
      };
      
      const result = playerEffects.processClassEffects(100);
      
      expect(result.type).toBe('thirsty_blade_ended');
      expect(playerEffects.classEffects.thirstyBlade.active).toBe(false);
    });

    test('should process unstoppable rage ending correctly', () => {
      playerEffects.classEffects = {
        unstoppableRage: {
          turnsLeft: 1,
          selfDamagePercent: 0.2
        }
      };
      
      const result = playerEffects.processClassEffects(100);
      
      expect(result.type).toBe('rage_ended');
      expect(result.damage).toBe(20); // 100 * 0.2
      expect(playerEffects.classEffects.unstoppableRage).toBeUndefined();
    });
  });

  describe('Utility Methods', () => {
    test('should update relentless fury level correctly', () => {
      playerEffects.classEffects = {
        relentlessFury: { active: true, currentLevel: 1 }
      };
      
      playerEffects.updateRelentlessFuryLevel(5, 'Barbarian');
      
      expect(playerEffects.classEffects.relentlessFury.currentLevel).toBe(5);
    });

    test('should initialize undying effect correctly', () => {
      playerEffects.initializeUndying(15);
      
      expect(playerEffects.racialEffects.resurrect).toEqual({
        resurrectedHp: 15,
        active: true
      });
    });

    test('should calculate damage with vulnerability correctly', () => {
      playerEffects.statusEffects = {
        vulnerable: { damageIncrease: 25 }
      };
      
      const modifiedDamage = playerEffects.calculateDamageWithVulnerability(40);
      
      expect(modifiedDamage).toBe(50); // 40 * 1.25
    });

    test('should handle damage calculation without vulnerability', () => {
      const modifiedDamage = playerEffects.calculateDamageWithVulnerability(40);
      expect(modifiedDamage).toBe(40);
    });

    test('should update player name correctly', () => {
      playerEffects.setPlayerName('NewName');
      expect(playerEffects.playerName).toBe('NewName');
    });
  });

  describe('Property Setters/Getters', () => {
    test('should handle isVulnerable property assignment', () => {
      playerEffects.isVulnerable = true;
      expect(playerEffects.isVulnerable).toBe(true);
      
      playerEffects.isVulnerable = false;
      expect(playerEffects.isVulnerable).toBe(false);
    });

    test('should handle vulnerabilityIncrease property assignment', () => {
      playerEffects.vulnerabilityIncrease = 25;
      expect(playerEffects.vulnerabilityIncrease).toBe(25);
      
      playerEffects.vulnerabilityIncrease = 0;
      expect(playerEffects.vulnerabilityIncrease).toBe(0);
    });
  });
});