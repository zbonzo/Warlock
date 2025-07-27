/**
 * @fileoverview Tests for refactored Player class with domain models
 */
const Player = require('../../../server/models/Player_refactored');

describe('Player Refactored', () => {
  let player;

  beforeEach(() => {
    player = new Player('test-id', 'TestPlayer');
  });

  describe('Basic Properties', () => {
    test('should initialize with correct basic properties', () => {
      expect(player.id).toBe('test-id');
      expect(player.name).toBe('TestPlayer');
      expect(player.isAlive).toBe(true);
      expect(player.hp).toBe(100);
      expect(player.level).toBe(1);
    });

    test('should have domain model instances', () => {
      expect(player.playerStats).toBeDefined();
      expect(player.playerAbilities).toBeDefined();
      expect(player.playerEffects).toBeDefined();
    });
  });

  describe('Stats Integration', () => {
    test('should delegate stats operations to PlayerStats', () => {
      // Test adding damage
      player.addDamageDealt(50);
      const stats = player.getStats();
      expect(stats.totalDamageDealt).toBe(50);
      expect(stats.highestSingleHit).toBe(50);

      // Test adding more damage
      player.addDamageDealt(75);
      const updatedStats = player.getStats();
      expect(updatedStats.totalDamageDealt).toBe(125);
      expect(updatedStats.highestSingleHit).toBe(75);
    });

    test('should track various stats correctly', () => {
      player.addDamageTaken(30);
      player.addHealingDone(20);
      player.addCorruption();
      player.addAbilityUse();
      player.addDeath();
      player.addMonsterKill();
      player.addSelfHeal(15);

      const stats = player.getStats();
      expect(stats.damageTaken).toBe(30);
      expect(stats.totalHealingDone).toBe(20);
      expect(stats.corruptionsPerformed).toBe(1);
      expect(stats.abilitiesUsed).toBe(1);
      expect(stats.timesDied).toBe(1);
      expect(stats.monsterKills).toBe(1);
      expect(stats.selfHeals).toBe(15);
    });

    test('should provide backward compatibility for stats property', () => {
      player.addDamageDealt(100);
      // Test that the stats property works as before
      expect(player.stats.totalDamageDealt).toBe(100);
      expect(typeof player.stats).toBe('object');
    });
  });

  describe('Abilities Integration', () => {
    beforeEach(() => {
      // Setup some test abilities
      player.unlocked = [
        { type: 'attack', name: 'Slash', cooldown: 0 },
        { type: 'fireball', name: 'Fireball', cooldown: 2 }
      ];
    });

    test('should delegate ability operations to PlayerAbilities', () => {
      // Test cooldown management
      expect(player.isAbilityOnCooldown('attack')).toBe(false);
      
      player.putAbilityOnCooldown('attack', 2);
      expect(player.isAbilityOnCooldown('attack')).toBe(true);
      expect(player.getAbilityCooldown('attack')).toBe(3); // +1 for timing fix
      
      // Test ability availability
      expect(player.canUseAbility('fireball')).toBe(true);
      expect(player.canUseAbility('attack')).toBe(false); // on cooldown
    });

    test('should handle action submission', () => {
      const result = player.submitAction('fireball', 'target-id');
      expect(result.success).toBe(true);
      expect(result.action.actionType).toBe('fireball');
      expect(result.action.targetId).toBe('target-id');
      
      // Should not allow double submission
      const result2 = player.submitAction('attack', 'target-id-2');
      expect(result2.success).toBe(false);
    });

    test('should provide backward compatibility for abilities properties', () => {
      expect(player.abilities).toEqual(player.playerAbilities.abilities);
      expect(player.unlocked).toEqual(player.playerAbilities.unlocked);
      expect(player.hasSubmittedAction).toBe(player.playerAbilities.hasSubmittedAction);
    });
  });

  describe('Effects Integration', () => {
    test('should delegate effects operations to PlayerEffects', () => {
      // Test status effects
      expect(player.hasStatusEffect('poison')).toBe(false);
      
      player.applyStatusEffect('poison', { damage: 10, turns: 3 });
      expect(player.hasStatusEffect('poison')).toBe(true);
      
      player.removeStatusEffect('poison');
      expect(player.hasStatusEffect('poison')).toBe(false);
    });

    test('should handle vulnerability correctly', () => {
      expect(player.isVulnerable).toBe(false);
      
      player.applyVulnerability(25, 2);
      expect(player.isVulnerable).toBe(true);
      expect(player.vulnerabilityIncrease).toBe(25);
    });

    test('should calculate effective armor with effects', () => {
      player.armor = 10;
      expect(player.getEffectiveArmor()).toBe(10);
      
      // Add shielded effect
      player.applyStatusEffect('shielded', { armor: 5 });
      expect(player.getEffectiveArmor()).toBe(15);
    });

    test('should provide backward compatibility for effects properties', () => {
      player.applyStatusEffect('test', { value: 1 });
      expect(player.statusEffects).toEqual(player.playerEffects.statusEffects);
      expect(player.isVulnerable).toBe(player.playerEffects.isVulnerable);
    });
  });

  describe('Core Game Mechanics', () => {
    test('should handle damage and healing correctly', () => {
      expect(player.hp).toBe(100);
      
      // Take damage
      const damageTaken = player.takeDamage(30, 'test');
      expect(player.hp).toBe(100 - damageTaken);
      expect(player.isAlive).toBe(true);
      
      // Heal
      const currentHp = player.hp;
      const healed = player.heal(20);
      expect(player.hp).toBe(currentHp + healed);
    });

    test('should handle death correctly', () => {
      const damageTaken = player.takeDamage(150, 'test');
      expect(player.hp).toBe(0);
      expect(player.isAlive).toBe(false);
    });

    test('should handle damage modification', () => {
      player.damageMod = 1.5;
      const modifiedDamage = player.modifyDamage(100);
      expect(modifiedDamage).toBe(150);
    });
  });

  describe('Utility Methods', () => {
    test('should handle socket ID management', () => {
      expect(player.hasUsedSocketId('test-id')).toBe(true);
      expect(player.hasUsedSocketId('other-id')).toBe(false);
      
      player.addSocketId('new-id');
      expect(player.hasUsedSocketId('new-id')).toBe(true);
      expect(player.id).toBe('new-id');
    });

    test('should handle name updates', () => {
      player.setName('NewName');
      expect(player.name).toBe('NewName');
      expect(player.playerStats.playerName).toBe('NewName');
      expect(player.playerAbilities.playerName).toBe('NewName');
      expect(player.playerEffects.playerName).toBe('NewName');
    });

    test('should generate client data correctly', () => {
      const publicData = player.toClientData(false);
      expect(publicData.id).toBe('test-id');
      expect(publicData.name).toBe('TestPlayer');
      expect(publicData.isWarlock).toBeUndefined();
      
      const privateData = player.toClientData(true);
      expect(privateData.isWarlock).toBe(false);
      expect(privateData.unlocked).toBeDefined();
    });
  });

  describe('Racial Abilities', () => {
    test('should handle racial ability setup', () => {
      const racialAbility = {
        type: 'stoneArmor',
        params: { initialArmor: 5 },
        usageLimit: 'passive'
      };
      
      player.setRacialAbility(racialAbility);
      expect(player.racialAbility).toEqual(racialAbility);
      expect(player.stoneArmorIntact).toBe(true);
      expect(player.stoneArmorValue).toBe(5);
    });
  });
});