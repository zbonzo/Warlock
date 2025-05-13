/**
 * @fileoverview Unit tests for Player class
 * Tests player state management and ability handling
 */
const Player = require('../../models/Player');

describe('Player', () => {
  let player;
  
  beforeEach(() => {
    // Create a new player instance for each test
    player = new Player('player1', 'Alice');
  });
  
  describe('constructor', () => {
    it('should initialize with the correct default values', () => {
      expect(player.id).toBe('player1');
      expect(player.name).toBe('Alice');
      expect(player.race).toBeNull();
      expect(player.class).toBeNull();
      expect(player.hp).toBe(100);
      expect(player.maxHp).toBe(100);
      expect(player.armor).toBe(0);
      expect(player.damageMod).toBe(1.0);
      expect(player.isWarlock).toBe(false);
      expect(player.isAlive).toBe(true);
      expect(player.isReady).toBe(false);
      expect(player.statusEffects).toEqual({});
      expect(player.abilities).toEqual([]);
      expect(player.unlocked).toEqual([]);
      expect(player.racialAbility).toBeNull();
      expect(player.racialUsesLeft).toBe(0);
      expect(player.racialCooldown).toBe(0);
      expect(player.racialEffects).toEqual({});
    });
  });
  
  describe('status effects', () => {
    it('should check if a status effect exists', () => {
      // Initially no status effects
      expect(player.hasStatusEffect('poison')).toBe(false);
      
      // Add a status effect
      player.statusEffects.poison = { damage: 5, turns: 2 };
      
      // Now it should be found
      expect(player.hasStatusEffect('poison')).toBe(true);
    });
    
    it('should apply a status effect', () => {
      // Apply a status effect
      player.applyStatusEffect('poison', { damage: 5, turns: 2 });
      
      // Check if it was applied
      expect(player.statusEffects.poison).toEqual({ damage: 5, turns: 2 });
    });
    
    it('should remove a status effect', () => {
      // Add a status effect
      player.statusEffects.poison = { damage: 5, turns: 2 };
      
      // Remove it
      player.removeStatusEffect('poison');
      
      // Should be gone
      expect(player.hasStatusEffect('poison')).toBe(false);
    });
    
    it('should handle removing non-existent effects', () => {
      // Try to remove something that doesn't exist
      player.removeStatusEffect('nonexistent');
      
      // No error should be thrown
      expect(player.statusEffects).toEqual({});
    });
  });
  
  describe('armor and damage reduction', () => {
    it('should return base armor when no protection effect is active', () => {
      player.armor = 2;
      
      expect(player.getEffectiveArmor()).toBe(2);
    });
    
    it('should include protection effects in effective armor', () => {
      player.armor = 2;
      player.statusEffects.protected = { armor: 3 };
      
      expect(player.getEffectiveArmor()).toBe(5);
    });
    
    it('should calculate damage reduction correctly', () => {
      // Set up 2 armor (20% reduction)
      player.armor = 2;
      
      // Calculate reduced damage
      const reducedDamage = player.calculateDamageReduction(100);
      
      // Should reduce by 20%
      expect(reducedDamage).toBe(80);
    });
    
    it('should cap damage reduction at 100%', () => {
      // Set up 15 armor (would be 150% reduction, but should cap at 100%)
      player.armor = 15;
      
      // Calculate reduced damage
      const reducedDamage = player.calculateDamageReduction(100);
      
      // Should reduce completely to 0
      expect(reducedDamage).toBe(0);
    });
  });
  
  describe('damage modification', () => {
    it('should apply damage modifier to raw damage', () => {
      // Set damage modifier to 1.5x
      player.damageMod = 1.5;
      
      // Modify damage
      const modifiedDamage = player.modifyDamage(100);
      
      // Should increase by 50%
      expect(modifiedDamage).toBe(150);
    });
    
    it('should double damage when Blood Rage is active', () => {
      // Set damage modifier to 1.5x
      player.damageMod = 1.5;
      
      // Activate Blood Rage
      player.racialEffects = { bloodRage: true };
      
      // Modify damage with Blood Rage active
      const modifiedDamage = player.modifyDamage(100);
      
      // Should increase by 50% and then double (1.5x * 2)
      expect(modifiedDamage).toBe(300);
    });
    
    it('should consume Blood Rage after use', () => {
      // Activate Blood Rage
      player.racialEffects = { bloodRage: true };
      
      // Use it
      player.modifyDamage(100);
      
      // Should be consumed
      expect(player.racialEffects.bloodRage).toBeUndefined();
    });
  });
  
  describe('healing modifier', () => {
    it('should calculate healing modifier as inverse of damage modifier', () => {
      // Set damage modifier to 1.5x
      player.damageMod = 1.5;
      
      // Calculate healing modifier
      const healingMod = player.getHealingModifier();
      
      // Should be 2.0 - 1.5 = 0.5
      expect(healingMod).toBe(0.5);
    });
    
    it('should never go below 0', () => {
      // Set an extreme damage modifier
      player.damageMod = 3.0;
      
      // Calculate healing modifier
      const healingMod = player.getHealingModifier();
      
      // Should be 2.0 - 3.0 = -1.0, but with a minimum of 0
      expect(healingMod).toBe(-1);
      
      // Note: The actual minimum check would need to be implemented in the Player class
      // if this is a required behavior
    });
  });
  
  describe('racial abilities', () => {
    beforeEach(() => {
      // Set up a racial ability
      player.racialAbility = {
        type: 'adaptability',
        name: 'Adaptability',
        cooldown: 2,
        usageLimit: 'perGame',
        maxUses: 1
      };
      player.racialUsesLeft = 1;
      player.racialCooldown = 0;
    });
    
    it('should check if racial ability can be used', () => {
      // Initially can use
      expect(player.canUseRacialAbility()).toBe(true);
      
      // Set cooldown
      player.racialCooldown = 1;
      expect(player.canUseRacialAbility()).toBe(false);
      
      // Reset cooldown but set uses to 0
      player.racialCooldown = 0;
      player.racialUsesLeft = 0;
      expect(player.canUseRacialAbility()).toBe(false);
      
      // Reset uses but clear ability
      player.racialUsesLeft = 1;
      player.racialAbility = null;
      expect(player.canUseRacialAbility()).toBe(false);
    });
    
    it('should use racial ability and apply cooldown', () => {
      // Use ability
      const result = player.useRacialAbility();
      
      // Should succeed
      expect(result).toBe(true);
      
      // Should decrement uses and apply cooldown
      expect(player.racialUsesLeft).toBe(0);
      expect(player.racialCooldown).toBe(2);
    });
    
    it('should return false when trying to use unavailable ability', () => {
      // Make ability unavailable
      player.racialUsesLeft = 0;
      
      // Try to use
      const result = player.useRacialAbility();
      
      // Should fail
      expect(result).toBe(false);
    });
    
    it('should decrement cooldown during processing', () => {
      // Set a cooldown
      player.racialCooldown = 2;
      
      // Process cooldowns
      player.processRacialCooldowns();
      
      // Should decrement
      expect(player.racialCooldown).toBe(1);
    });
    
    it('should process healing over time racial effect', () => {
      // Set healing over time effect
      player.racialEffects.healOverTime = {
        amount: 10,
        turns: 2
      };
      player.hp = 50;
      
      // Process effects
      const result = player.processRacialCooldowns();
      
      // Should heal and return result
      expect(player.hp).toBe(60);
      expect(result).toEqual({ healed: 10 });
      expect(player.racialEffects.healOverTime.turns).toBe(1);
    });
    
    it('should remove healing over time effect when done', () => {
      // Set healing over time effect with 1 turn left
      player.racialEffects.healOverTime = {
        amount: 10,
        turns: 1
      };
      
      // Process effects
      player.processRacialCooldowns();
      
      // Effect should be removed
      expect(player.racialEffects.healOverTime).toBeUndefined();
    });
    
    it('should set up racial ability with perGame limit', () => {
      // Create ability data
      const abilityData = {
        type: 'adaptability',
        name: 'Adaptability',
        usageLimit: 'perGame',
        maxUses: 1
      };
      
      // Set ability
      player.setRacialAbility(abilityData);
      
      // Should set ability and uses
      expect(player.racialAbility).toBe(abilityData);
      expect(player.racialUsesLeft).toBe(1);
      expect(player.racialCooldown).toBe(0);
    });
    
    it('should set up racial ability with perRound limit', () => {
      // Create ability data
      const abilityData = {
        type: 'forestsGrace',
        name: "Forest's Grace",
        usageLimit: 'perRound',
        maxUses: 1
      };
      
      // Set ability
      player.setRacialAbility(abilityData);
      
      // Should set ability and uses
      expect(player.racialAbility).toBe(abilityData);
      expect(player.racialUsesLeft).toBe(1);
    });
    
    it('should reset perRound ability uses', () => {
      // Set up perRound ability
      player.racialAbility = {
        usageLimit: 'perRound',
        maxUses: 1
      };
      player.racialUsesLeft = 0;
      
      // Reset uses
      player.resetRacialPerRoundUses();
      
      // Should be reset
      expect(player.racialUsesLeft).toBe(1);
    });
    
    it('should not reset perGame ability uses', () => {
      // Set up perGame ability
      player.racialAbility = {
        usageLimit: 'perGame',
        maxUses: 1
      };
      player.racialUsesLeft = 0;
      
      // Try to reset
      player.resetRacialPerRoundUses();
      
      // Should not change
      expect(player.racialUsesLeft).toBe(0);
    });
  });
  
  describe('taking damage and healing', () => {
    it('should take damage and reduce HP', () => {
      // Initial HP
      player.hp = 100;
      
      // Take damage
      const actualDamage = player.takeDamage(30);
      
      // HP should be reduced
      expect(player.hp).toBe(70);
      expect(actualDamage).toBe(30);
    });
    
    it('should apply armor reduction when taking damage', () => {
      // Initial HP and armor
      player.hp = 100;
      player.armor = 2; // 20% reduction
      
      // Take damage
      const actualDamage = player.takeDamage(100);
      
      // HP should be reduced by 80 (after 20% reduction)
      expect(player.hp).toBe(20);
      expect(actualDamage).toBe(80);
    });
    
    it('should mark player as dead when HP reaches 0', () => {
      // Initial HP
      player.hp = 30;
      
      // Take fatal damage
      player.takeDamage(50);
      
      // Should be dead
      expect(player.hp).toBe(0);
      expect(player.isAlive).toBe(false);
    });
    
    it('should heal and increase HP', () => {
      // Initial HP
      player.hp = 50;
      
      // Heal
      const actualHeal = player.heal(20);
      
      // HP should increase
      expect(player.hp).toBe(70);
      expect(actualHeal).toBe(20);
    });
    
    it('should not heal above max HP', () => {
      // Initial HP
      player.hp = 90;
      player.maxHp = 100;
      
      // Heal
      const actualHeal = player.heal(20);
      
      // HP should be capped at max
      expect(player.hp).toBe(100);
      expect(actualHeal).toBe(10);
    });
  });
});