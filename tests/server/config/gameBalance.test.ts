/**
 * @fileoverview Tests for game balance configuration
 * Tests balance settings, calculations, and game mechanics
 */

import {
  gameBalance,
  MonsterConfig,
  PlayerArmorConfig,
  PlayerLevelUpConfig,
  WarlockConfig,
  CoordinationConfig,
  ComebackConfig,
  GameBalanceConfig
} from '../../../server/config/gameBalance';

describe('Game Balance Configuration', () => {
  describe('Game Balance Object', () => {
    it('should export game balance object', () => {
      expect(gameBalance).toBeDefined();
      expect(typeof gameBalance).toBe('object');
    });

    it('should have all major configuration sections', () => {
      expect(gameBalance).toHaveProperty('monster');
      expect(gameBalance).toHaveProperty('player');
      expect(gameBalance).toHaveProperty('warlock');
      expect(gameBalance).toHaveProperty('coordination');
      expect(gameBalance).toHaveProperty('comeback');
      expect(gameBalance).toHaveProperty('gameCode');
    });
  });

  describe('Monster Configuration', () => {
    it('should have valid monster config structure', () => {
      const monster = gameBalance.monster;
      expect(monster).toBeDefined();
      expect(typeof monster).toBe('object');

      expect(monster).toHaveProperty('baseHp');
      expect(monster).toHaveProperty('baseDamage');
      expect(monster).toHaveProperty('baseAge');
      expect(monster).toHaveProperty('hpPerLevel');
      expect(monster).toHaveProperty('useExponentialScaling');
      expect(monster).toHaveProperty('hpScalingMultiplier');
      expect(monster).toHaveProperty('damageScaling');
      expect(monster).toHaveProperty('targeting');
      expect(monster).toHaveProperty('threat');
    });

    it('should have reasonable monster base values', () => {
      const monster = gameBalance.monster;
      expect(monster.baseHp).toBeGreaterThan(0);
      expect(monster.baseDamage).toBeGreaterThan(0);
      expect(monster.baseAge).toBeGreaterThanOrEqual(0);
      expect(monster.hpPerLevel).toBeGreaterThan(0);
      expect(monster.hpScalingMultiplier).toBeGreaterThan(1);
    });

    it('should have valid damage scaling configuration', () => {
      const damageScaling = gameBalance.monster.damageScaling;
      expect(damageScaling).toHaveProperty('ageMultiplier');
      expect(damageScaling).toHaveProperty('maxAge');

      expect(damageScaling.ageMultiplier).toBeGreaterThan(0);
      if (damageScaling.maxAge !== null) {
        expect(damageScaling.maxAge).toBeGreaterThan(0);
      }
    });

    it('should have valid targeting configuration', () => {
      const targeting = gameBalance.monster.targeting;
      expect(targeting).toHaveProperty('preferLowestHp');
      expect(targeting).toHaveProperty('useThreatSystem');
      expect(targeting).toHaveProperty('canAttackInvisible');
      expect(targeting).toHaveProperty('fallbackToHighestHp');
      expect(targeting).toHaveProperty('canAttackWarlock');

      expect(typeof targeting.preferLowestHp).toBe('boolean');
      expect(typeof targeting.useThreatSystem).toBe('boolean');
      expect(typeof targeting.canAttackInvisible).toBe('boolean');
      expect(typeof targeting.fallbackToHighestHp).toBe('boolean');
      expect(typeof targeting.canAttackWarlock).toBe('boolean');
    });

    it('should have valid threat system configuration', () => {
      const threat = gameBalance.monster.threat;
      expect(threat).toHaveProperty('enabled');
      expect(threat).toHaveProperty('armorMultiplier');
      expect(threat).toHaveProperty('damageMultiplier');
      expect(threat).toHaveProperty('healingMultiplier');
      expect(threat).toHaveProperty('decayRate');

      expect(typeof threat.enabled).toBe('boolean');
      expect(threat.armorMultiplier).toBeGreaterThanOrEqual(0);
      expect(threat.damageMultiplier).toBeGreaterThanOrEqual(0);
      expect(threat.healingMultiplier).toBeGreaterThanOrEqual(0);
      expect(threat.decayRate).toBeGreaterThanOrEqual(0);
      expect(threat.decayRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Player Configuration', () => {
    it('should have valid player config structure', () => {
      const player = gameBalance.player;
      expect(player).toBeDefined();
      expect(player).toHaveProperty('armor');
      expect(player).toHaveProperty('levelUp');
    });

    it('should have valid armor configuration', () => {
      const armor = gameBalance.player.armor;
      expect(armor).toHaveProperty('reductionRate');
      expect(armor).toHaveProperty('maxReduction');
      expect(armor).toHaveProperty('minReduction');

      expect(armor.reductionRate).toBeGreaterThan(0);
      expect(armor.maxReduction).toBeGreaterThanOrEqual(0);
      expect(armor.maxReduction).toBeLessThanOrEqual(1);
      expect(armor.minReduction).toBeGreaterThanOrEqual(0);
      expect(armor.minReduction).toBeLessThanOrEqual(armor.maxReduction);
    });

    it('should have valid level up configuration', () => {
      const levelUp = gameBalance.player.levelUp;
      expect(levelUp).toHaveProperty('hpIncrease');
      expect(levelUp).toHaveProperty('damageIncrease');
      expect(levelUp).toHaveProperty('fullHealOnLevelUp');

      expect(levelUp.hpIncrease).toBeGreaterThanOrEqual(0);
      expect(levelUp.damageIncrease).toBeGreaterThanOrEqual(0);
      expect(typeof levelUp.fullHealOnLevelUp).toBe('boolean');
    });
  });

  describe('Warlock Configuration', () => {
    it('should have valid warlock config structure', () => {
      const warlock = gameBalance.warlock;
      expect(warlock).toBeDefined();
      expect(warlock).toHaveProperty('conversionChance');
      expect(warlock).toHaveProperty('countCalculation');
    });

    it('should have valid conversion chance configuration', () => {
      const conversion = gameBalance.warlock.conversionChance;
      expect(conversion).toHaveProperty('base');
      expect(conversion).toHaveProperty('playerCountModifier');
      expect(conversion).toHaveProperty('min');
      expect(conversion).toHaveProperty('max');

      expect(conversion.base).toBeGreaterThanOrEqual(0);
      expect(conversion.base).toBeLessThanOrEqual(1);
      expect(conversion.min).toBeGreaterThanOrEqual(0);
      expect(conversion.max).toBeLessThanOrEqual(1);
      expect(conversion.min).toBeLessThanOrEqual(conversion.max);
    });

    it('should have valid count calculation configuration', () => {
      const countCalc = gameBalance.warlock.countCalculation;
      expect(countCalc).toHaveProperty('method');
      expect(countCalc).toHaveProperty('baseRatio');
      expect(countCalc).toHaveProperty('minWarlocks');
      expect(countCalc).toHaveProperty('maxWarlocks');

      expect(typeof countCalc.method).toBe('string');
      expect(countCalc.baseRatio).toBeGreaterThan(0);
      expect(countCalc.baseRatio).toBeLessThanOrEqual(1);
      expect(countCalc.minWarlocks).toBeGreaterThanOrEqual(0);
      expect(countCalc.maxWarlocks).toBeGreaterThan(countCalc.minWarlocks);
    });
  });

  describe('Coordination Configuration', () => {
    it('should have valid coordination config structure', () => {
      const coordination = gameBalance.coordination;
      expect(coordination).toBeDefined();
      expect(coordination).toHaveProperty('enabled');
      expect(coordination).toHaveProperty('bonusCalculation');
      expect(coordination).toHaveProperty('requirements');
    });

    it('should have valid bonus calculation configuration', () => {
      const bonusCalc = gameBalance.coordination.bonusCalculation;
      expect(bonusCalc).toHaveProperty('damageBonus');
      expect(bonusCalc).toHaveProperty('healingBonus');
      expect(bonusCalc).toHaveProperty('maxBonus');

      expect(bonusCalc.damageBonus).toBeGreaterThanOrEqual(0);
      expect(bonusCalc.healingBonus).toBeGreaterThanOrEqual(0);
      expect(bonusCalc.maxBonus).toBeGreaterThanOrEqual(0);
    });

    it('should have valid requirements configuration', () => {
      const requirements = gameBalance.coordination.requirements;
      expect(requirements).toHaveProperty('minPlayers');
      expect(requirements).toHaveProperty('maxTurnDelay');
      expect(requirements).toHaveProperty('sameAbilityRequired');

      expect(requirements.minPlayers).toBeGreaterThan(1);
      expect(requirements.maxTurnDelay).toBeGreaterThanOrEqual(0);
      expect(typeof requirements.sameAbilityRequired).toBe('boolean');
    });
  });

  describe('Comeback Configuration', () => {
    it('should have valid comeback config structure', () => {
      const comeback = gameBalance.comeback;
      expect(comeback).toBeDefined();
      expect(comeback).toHaveProperty('enabled');
      expect(comeback).toHaveProperty('triggers');
      expect(comeback).toHaveProperty('effects');
    });

    it('should have valid trigger configuration', () => {
      const triggers = gameBalance.comeback.triggers;
      expect(triggers).toHaveProperty('playerCountThreshold');
      expect(triggers).toHaveProperty('hpThreshold');
      expect(triggers).toHaveProperty('roundThreshold');

      expect(triggers.playerCountThreshold).toBeGreaterThan(0);
      expect(triggers.hpThreshold).toBeGreaterThanOrEqual(0);
      expect(triggers.hpThreshold).toBeLessThanOrEqual(1);
      expect(triggers.roundThreshold).toBeGreaterThanOrEqual(0);
    });

    it('should have valid effects configuration', () => {
      const effects = gameBalance.comeback.effects;
      expect(effects).toHaveProperty('damageBonus');
      expect(effects).toHaveProperty('healingBonus');
      expect(effects).toHaveProperty('armorBonus');
      expect(effects).toHaveProperty('duration');

      expect(effects.damageBonus).toBeGreaterThanOrEqual(0);
      expect(effects.healingBonus).toBeGreaterThanOrEqual(0);
      expect(effects.armorBonus).toBeGreaterThanOrEqual(0);
      expect(effects.duration).toBeGreaterThan(0);
    });
  });

  describe('Game Code Configuration', () => {
    it('should have valid game code configuration', () => {
      const gameCode = gameBalance.gameCode;
      expect(gameCode).toBeDefined();
      expect(gameCode).toHaveProperty('minValue');
      expect(gameCode).toHaveProperty('maxValue');

      expect(gameCode.minValue).toBeGreaterThan(0);
      expect(gameCode.maxValue).toBeGreaterThan(gameCode.minValue);
      expect(gameCode.minValue).toBeGreaterThanOrEqual(1000);
      expect(gameCode.maxValue).toBeLessThanOrEqual(9999);
    });
  });

  describe('Balance Validation', () => {
    it('should have reasonable monster scaling', () => {
      const monster = gameBalance.monster;

      // Monster should get stronger but not too quickly
      expect(monster.hpScalingMultiplier).toBeGreaterThan(1);
      expect(monster.hpScalingMultiplier).toBeLessThanOrEqual(2);

      // Base values should be reasonable
      expect(monster.baseHp).toBeGreaterThanOrEqual(50);
      expect(monster.baseHp).toBeLessThanOrEqual(1000);
      expect(monster.baseDamage).toBeGreaterThanOrEqual(10);
      expect(monster.baseDamage).toBeLessThanOrEqual(100);
    });

    it('should have balanced player progression', () => {
      const player = gameBalance.player;

      // Player growth should be meaningful but not excessive
      expect(player.levelUp.hpIncrease).toBeGreaterThan(0);
      expect(player.levelUp.hpIncrease).toBeLessThanOrEqual(1);
      expect(player.levelUp.damageIncrease).toBeGreaterThan(0);
      expect(player.levelUp.damageIncrease).toBeLessThanOrEqual(1);
    });

    it('should have reasonable warlock ratios', () => {
      const warlock = gameBalance.warlock;

      // Warlock count should be reasonable portion of players
      expect(warlock.countCalculation.baseRatio).toBeGreaterThan(0.1);
      expect(warlock.countCalculation.baseRatio).toBeLessThanOrEqual(0.5);

      // Conversion chance should be balanced
      expect(warlock.conversionChance.base).toBeGreaterThan(0);
      expect(warlock.conversionChance.base).toBeLessThanOrEqual(0.3);
    });

    it('should have reasonable coordination bonuses', () => {
      const coordination = gameBalance.coordination;

      if (coordination.enabled) {
        expect(coordination.bonusCalculation.damageBonus).toBeLessThanOrEqual(1);
        expect(coordination.bonusCalculation.healingBonus).toBeLessThanOrEqual(1);
        expect(coordination.bonusCalculation.maxBonus).toBeLessThanOrEqual(2);
      }
    });

    it('should have reasonable comeback mechanics', () => {
      const comeback = gameBalance.comeback;

      if (comeback.enabled) {
        expect(comeback.effects.damageBonus).toBeLessThanOrEqual(1);
        expect(comeback.effects.healingBonus).toBeLessThanOrEqual(1);
        expect(comeback.effects.armorBonus).toBeLessThanOrEqual(1);
        expect(comeback.effects.duration).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('Configuration Consistency', () => {
    it('should have consistent threat system settings', () => {
      const threat = gameBalance.monster.threat;
      const targeting = gameBalance.monster.targeting;

      if (threat.enabled) {
        expect(targeting.useThreatSystem).toBe(true);
      }
    });

    it('should have consistent armor calculations', () => {
      const armor = gameBalance.player.armor;

      expect(armor.minReduction).toBeLessThanOrEqual(armor.maxReduction);
      expect(armor.reductionRate).toBeGreaterThan(0);
    });

    it('should have consistent warlock settings', () => {
      const warlock = gameBalance.warlock;

      expect(warlock.conversionChance.min).toBeLessThanOrEqual(warlock.conversionChance.max);
      expect(warlock.countCalculation.minWarlocks).toBeLessThan(warlock.countCalculation.maxWarlocks);
    });
  });

  describe('Type Safety', () => {
    it('should match MonsterConfig interface', () => {
      const monster: MonsterConfig = gameBalance.monster;
      expect(monster).toBeDefined();
    });

    it('should match PlayerArmorConfig interface', () => {
      const armor: PlayerArmorConfig = gameBalance.player.armor;
      expect(armor).toBeDefined();
    });

    it('should match PlayerLevelUpConfig interface', () => {
      const levelUp: PlayerLevelUpConfig = gameBalance.player.levelUp;
      expect(levelUp).toBeDefined();
    });

    it('should match complete GameBalanceConfig interface', () => {
      const config: GameBalanceConfig = gameBalance;
      expect(config).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    it('should not have null or undefined critical values', () => {
      expect(gameBalance.monster.baseHp).toBeTruthy();
      expect(gameBalance.monster.baseDamage).toBeTruthy();
      expect(gameBalance.player.armor.reductionRate).toBeTruthy();
      expect(gameBalance.warlock.countCalculation.baseRatio).toBeTruthy();
    });

    it('should have valid boolean values', () => {
      const monster = gameBalance.monster;
      expect(typeof monster.useExponentialScaling).toBe('boolean');
      expect(typeof monster.targeting.preferLowestHp).toBe('boolean');
      expect(typeof monster.threat.enabled).toBe('boolean');
      expect(typeof gameBalance.player.levelUp.fullHealOnLevelUp).toBe('boolean');
    });

    it('should have consistent numeric ranges', () => {
      // All percentage values should be between 0 and 1
      const percentageFields = [
        gameBalance.warlock.conversionChance.base,
        gameBalance.warlock.conversionChance.min,
        gameBalance.warlock.conversionChance.max,
        gameBalance.warlock.countCalculation.baseRatio,
        gameBalance.player.armor.maxReduction,
        gameBalance.player.armor.minReduction
      ];

      percentageFields.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Module Exports', () => {
    it('should export gameBalance as default', () => {
      const defaultExport = require('../../../server/config/gameBalance').default;
      expect(defaultExport).toBe(gameBalance);
    });

    it('should export all type interfaces', () => {
      const module = require('../../../server/config/gameBalance');
      expect(module.gameBalance).toBeDefined();
    });

    it('should be importable as TypeScript module', () => {
      expect(() => {
        const imported = require('../../../server/config/gameBalance');
        expect(imported).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Advanced Balance Mechanics', () => {
    it('should support threat decay mechanics', () => {
      const threat = gameBalance.monster.threat;

      if (threat.enabled) {
        expect(threat.decayRate).toBeGreaterThanOrEqual(0);
        expect(threat.decayRate).toBeLessThanOrEqual(1);
        expect(threat.monsterDeathReduction).toBeGreaterThanOrEqual(0);
      }
    });

    it('should support comeback trigger conditions', () => {
      const comeback = gameBalance.comeback;

      if (comeback.enabled) {
        expect(comeback.triggers.playerCountThreshold).toBeGreaterThan(0);
        expect(comeback.triggers.hpThreshold).toBeGreaterThanOrEqual(0);
        expect(comeback.triggers.roundThreshold).toBeGreaterThanOrEqual(0);
      }
    });

    it('should support coordination requirements', () => {
      const coordination = gameBalance.coordination;

      if (coordination.enabled) {
        expect(coordination.requirements.minPlayers).toBeGreaterThan(1);
        expect(coordination.requirements.maxTurnDelay).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
