/**
 * @fileoverview Tests for Player model
 */

const Player = require('@models/Player');

describe('Player Model', () => {
  let player;

  beforeEach(() => {
    player = new Player('test-id', 'TestPlayer');
  });

  describe('Constructor', () => {
    test('should create player with correct initial values', () => {
      expect(player.id).toBe('test-id');
      expect(player.name).toBe('TestPlayer');
      expect(player.isAlive).toBe(true);
      expect(player.isWarlock).toBe(false);
      expect(player.hp).toBe(100);
      expect(player.maxHp).toBe(100);
      expect(player.armor).toBe(0);
      expect(player.damageMod).toBe(1.0);
      expect(player.statusEffects).toEqual({});
      expect(player.abilityCooldowns).toEqual({});
    });
  });

  describe('Status Effects', () => {
    test('should apply status effects correctly', () => {
      player.applyStatusEffect('poison', { damage: 5, turns: 3 });

      expect(player.hasStatusEffect('poison')).toBe(true);
      expect(player.statusEffects.poison).toEqual({ damage: 5, turns: 3 });
    });

    test('should remove status effects correctly', () => {
      player.applyStatusEffect('stunned', { turns: 1 });
      expect(player.hasStatusEffect('stunned')).toBe(true);

      player.removeStatusEffect('stunned');
      expect(player.hasStatusEffect('stunned')).toBe(false);
    });

    test('should handle vulnerability status', () => {
      player.applyVulnerability(25, 2);

      expect(player.isVulnerable).toBe(true);
      expect(player.vulnerabilityIncrease).toBe(25);
      expect(player.statusEffects.vulnerable.turns).toBe(2);
    });

    test('should process vulnerability expiration', () => {
      player.applyVulnerability(25, 1);

      const expired = player.processVulnerability();
      expect(expired).toBe(true);
      expect(player.isVulnerable).toBe(false);
      expect(player.vulnerabilityIncrease).toBe(0);
    });
  });

  describe('Ability Cooldowns', () => {
    test('should put abilities on cooldown correctly', () => {
      player.putAbilityOnCooldown('fireball', 2);

      expect(player.isAbilityOnCooldown('fireball')).toBe(true);
      expect(player.getAbilityCooldown('fireball')).toBe(3); // +1 for immediate countdown
    });

    test('should process cooldowns correctly', () => {
      player.putAbilityOnCooldown('fireball', 2);

      player.processAbilityCooldowns();
      expect(player.getAbilityCooldown('fireball')).toBe(2);

      player.processAbilityCooldowns();
      expect(player.getAbilityCooldown('fireball')).toBe(1);

      player.processAbilityCooldowns();
      expect(player.isAbilityOnCooldown('fireball')).toBe(false);
    });

    test('should check ability availability correctly', () => {
      player.unlocked = [{ type: 'fireball', name: 'Fireball' }];

      expect(player.canUseAbility('fireball')).toBe(true);

      player.putAbilityOnCooldown('fireball', 1);
      expect(player.canUseAbility('fireball')).toBe(false);

      expect(player.canUseAbility('nonexistent')).toBe(false);
    });
  });

  describe('Damage and Healing', () => {
    test('should calculate damage reduction correctly', () => {
      player.armor = 5; // 50% reduction
      const damage = player.calculateDamageReduction(20);
      expect(damage).toBe(10); // 20 * (1 - 0.5) = 10
    });

    test('should handle negative armor correctly', () => {
      player.armor = -2; // Should increase damage
      const damage = player.calculateDamageReduction(20);
      expect(damage).toBeGreaterThan(20);
    });

    test('should modify damage based on damage modifier', () => {
      player.damageMod = 1.5;
      const modifiedDamage = player.modifyDamage(20);
      expect(modifiedDamage).toBe(30);
    });

    test('should heal correctly', () => {
      player.hp = 50;
      const healed = player.heal(30);

      expect(player.hp).toBe(80);
      expect(healed).toBe(30);
    });

    test('should not heal above max HP', () => {
      player.hp = 90;
      const healed = player.heal(30);

      expect(player.hp).toBe(100);
      expect(healed).toBe(10);
    });

    test('should calculate damage with vulnerability', () => {
      player.applyVulnerability(50, 2); // 50% more damage
      const damage = player.calculateDamageWithVulnerability(20);
      expect(damage).toBe(30); // 20 * 1.5 = 30
    });
  });

  describe('Racial Abilities', () => {
    test('should set racial ability correctly', () => {
      const racialAbility = {
        type: 'bloodRage',
        name: 'Blood Rage',
        usageLimit: 'perGame',
        maxUses: 1,
        params: { selfDamage: 10 },
      };

      player.setRacialAbility(racialAbility);

      expect(player.racialAbility).toEqual(racialAbility);
      expect(player.racialUsesLeft).toBe(1);
      expect(player.canUseRacialAbility()).toBe(true);
    });

    test('should handle Stone Armor racial ability', () => {
      const stoneArmorAbility = {
        type: 'stoneArmor',
        name: 'Stone Armor',
        usageLimit: 'passive',
        maxUses: 0,
        params: { initialArmor: 10 },
      };

      player.setRacialAbility(stoneArmorAbility);

      expect(player.stoneArmorIntact).toBe(true);
      expect(player.stoneArmorValue).toBe(10);
    });

    test('should use racial ability correctly', () => {
      const racialAbility = {
        type: 'keenSenses',
        usageLimit: 'perGame',
        maxUses: 1,
        cooldown: 3,
      };

      player.setRacialAbility(racialAbility);

      expect(player.useRacialAbility()).toBe(true);
      expect(player.racialUsesLeft).toBe(0);
      expect(player.racialCooldown).toBe(3);
      expect(player.canUseRacialAbility()).toBe(false);
    });

    test('should reset per-round racial abilities', () => {
      const racialAbility = {
        type: 'forestsGrace',
        usageLimit: 'perRound',
        maxUses: 1,
      };

      player.setRacialAbility(racialAbility);
      player.useRacialAbility();

      expect(player.racialUsesLeft).toBe(0);

      player.resetRacialPerRoundUses();
      expect(player.racialUsesLeft).toBe(1);
    });
  });

  describe('Armor Calculations', () => {
    test('should calculate effective armor with stone armor', () => {
      player.armor = 2;
      player.stoneArmorIntact = true;
      player.stoneArmorValue = 5;

      expect(player.getEffectiveArmor()).toBe(7);
    });

    test('should include shielded status in armor calculation', () => {
      player.armor = 2;
      player.applyStatusEffect('shielded', { armor: 3, turns: 1 });

      expect(player.getEffectiveArmor()).toBe(5);
    });

    test('should process stone armor degradation', () => {
      player.stoneArmorIntact = true;
      player.stoneArmorValue = 5;

      const result = player.processStoneArmorDegradation(10);

      expect(result.degraded).toBe(true);
      expect(result.oldValue).toBe(5);
      expect(result.newArmorValue).toBe(4);
      expect(player.stoneArmorValue).toBe(4);
    });
  });

  describe('Class Effects', () => {
    test('should process unstoppable rage correctly', () => {
      player.classEffects = {
        unstoppableRage: {
          damageBoost: 1.5,
          damageResistance: 0.3,
          turnsLeft: 1,
          selfDamagePercent: 0.25,
        },
      };
      player.maxHp = 100;
      player.hp = 100;

      const result = player.processClassEffects();

      expect(result).toBeTruthy();
      expect(result.type).toBe('rage_ended');
      expect(player.hp).toBe(75); // 100 - 25% = 75
      expect(player.classEffects.unstoppableRage).toBeUndefined();
    });

    test('should modify damage with blood frenzy', () => {
      player.classEffects = {
        bloodFrenzy: {
          damageIncreasePerHpMissing: 0.01,
          active: true,
        },
      };
      player.maxHp = 100;
      player.hp = 50; // 50% missing HP

      const modifiedDamage = player.modifyDamage(20);
      // 20 * (1 + 0.5 * 0.01) = 20 * 1.005 = 20.1, floored to 20
      expect(modifiedDamage).toBe(20);
    });
  });
});
