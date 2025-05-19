/**
 * @fileoverview Player model with ability cooldown support
 * Manages player state, abilities, status effects, and cooldowns
 */

/**
 * Player class representing a single player in the game
 * Handles player state, abilities, effects, and cooldowns
 */
class Player {
  /**
   * Create a new player
   * @param {string} id - Player's socket ID
   * @param {string} name - Player's display name
   */
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.race = null;
    this.class = null;
    this.hp = 100;
    this.maxHp = 100;
    this.armor = 0;
    this.damageMod = 1.0;    // Damage modifier from race and class
    this.isWarlock = false;
    this.isAlive = true;
    this.isReady = false;
    this.statusEffects = {};      // { poison: {...}, protected: {...}, invisible: {...}, stunned: {...} }
    this.abilities = [];      // full list of class abilities
    this.unlocked = [];      // slice of abilities by level
    
    // Racial ability tracking
    this.racialAbility = null;     // The racial ability object
    this.racialUsesLeft = 0;       // Number of uses left in the current game
    this.racialCooldown = 0;       // Rounds until ability can be used again
    this.racialEffects = {};       // Active racial ability effects
    
    // Ability cooldown tracking
    this.abilityCooldowns = {};    // { abilityType: turnsRemaining }
  }
  
  /**
   * Check if player has a status effect
   * @param {string} effectName - Name of the effect to check
   * @returns {boolean} Whether the player has the effect
   */
  hasStatusEffect(effectName) {
    return this.statusEffects && this.statusEffects[effectName] !== undefined;
  }
  
  /**
   * Apply a status effect to the player
   * @param {string} effectName - Effect to apply
   * @param {Object} data - Effect data
   */
  applyStatusEffect(effectName, data) {
    this.statusEffects[effectName] = data;
  }
  
  /**
   * Remove a status effect from the player
   * @param {string} effectName - Effect to remove
   */
  removeStatusEffect(effectName) {
    if (this.hasStatusEffect(effectName)) {
      delete this.statusEffects[effectName];
    }
  }
  
  /**
   * Check if an ability is on cooldown
   * @param {string} abilityType - Type of ability to check
   * @returns {boolean} Whether the ability is on cooldown
   */
  isAbilityOnCooldown(abilityType) {
    return this.abilityCooldowns[abilityType] && this.abilityCooldowns[abilityType] > 0;
  }
  
  /**
   * Get remaining cooldown for an ability
   * @param {string} abilityType - Type of ability to check
   * @returns {number} Turns remaining on cooldown (0 if not on cooldown)
   */
  getAbilityCooldown(abilityType) {
    return this.abilityCooldowns[abilityType] || 0;
  }
  
  /**
   * Put an ability on cooldown
   * @param {string} abilityType - Type of ability
   * @param {number} cooldownTurns - Number of turns for cooldown
   */
  putAbilityOnCooldown(abilityType, cooldownTurns) {
    if (cooldownTurns > 0) {
      this.abilityCooldowns[abilityType] = cooldownTurns;
    }
  }
  
  /**
   * Check if an ability can be used (not on cooldown and unlocked)
   * @param {string} abilityType - Type of ability to check
   * @returns {boolean} Whether the ability can be used
   */
  canUseAbility(abilityType) {
    // Check if ability is unlocked
    const hasAbility = this.unlocked.some(a => a.type === abilityType);
    if (!hasAbility) return false;
    
    // Check if ability is on cooldown
    if (this.isAbilityOnCooldown(abilityType)) return false;
    
    return true;
  }
  
  /**
   * Process ability cooldowns at the end of a round
   * Decrements all active cooldowns by 1
   */
  processAbilityCooldowns() {
    for (const abilityType in this.abilityCooldowns) {
      if (this.abilityCooldowns[abilityType] > 0) {
        this.abilityCooldowns[abilityType]--;
        
        // Remove cooldown if it reaches 0
        if (this.abilityCooldowns[abilityType] <= 0) {
          delete this.abilityCooldowns[abilityType];
        }
      }
    }
  }
  
  /**
   * Get list of abilities that are ready to use (not on cooldown)
   * @returns {Array} Array of available ability objects
   */
  getAvailableAbilities() {
    return this.unlocked.filter(ability => this.canUseAbility(ability.type));
  }
  
  /**
   * Calculate effective armor including protection buffs
   * @returns {number} Total armor value
   */
  getEffectiveArmor() {
    const baseArmor = this.armor || 0;
    if (this.hasStatusEffect('protected')) {
      return baseArmor + (this.statusEffects.protected.armor || 0);
    }
    return baseArmor;
  }
  
  /**
   * Calculate damage reduction from armor
   * @param {number} damage - Incoming damage
   * @returns {number} Reduced damage after armor
   */
  calculateDamageReduction(damage) {
    const totalArmor = this.getEffectiveArmor();
    if (totalArmor <= 0) return damage;
    
    const reductionPercent = Math.min(1, totalArmor * 0.1); // Cap at 100% reduction
    return Math.floor(damage * (1 - reductionPercent));
  }
  
  /**
   * Apply damage modifiers from player stats and effects
   * @param {number} rawDamage - Base damage value
   * @returns {number} Modified damage
   */
  modifyDamage(rawDamage) {
    // First apply the normal damage modifier
    let modifiedDamage = Math.floor(rawDamage * (this.damageMod || 1.0));
    
    // Apply blood rage effect if active (Orc racial)
    if (this.racialEffects && this.racialEffects.bloodRage) {
      modifiedDamage = modifiedDamage * 2; // Double the already-modified damage
      
      // One-time use - clear the effect
      delete this.racialEffects.bloodRage;
    }
    
    return modifiedDamage;
  }

  /**
   * Calculate healing modifier (inverse of damage modifier)
   * @returns {number} Healing modifier value
   */
  getHealingModifier() {
    return 2.0 - (this.damageMod || 1.0);
  }
  
  /**
   * Check if racial ability can be used
   * @returns {boolean} Whether the racial ability is available
   */
  canUseRacialAbility() {
    if (!this.racialAbility) return false;
    if (this.racialUsesLeft <= 0) return false;
    if (this.racialCooldown > 0) return false;
    return true;
  }
  
  /**
   * Use racial ability
   * @returns {boolean} Whether the ability was successfully used
   */
  useRacialAbility() {
    if (!this.canUseRacialAbility()) return false;
    
    // Decrement uses left
    this.racialUsesLeft--;
    
    // Apply cooldown if present
    if (this.racialAbility.cooldown > 0) {
      this.racialCooldown = this.racialAbility.cooldown;
    }
    
    return true;
  }
  
  /**
   * Process racial ability cooldowns at end of round
   * @returns {Object|null} Effect results if any
   */
  processRacialCooldowns() {
    if (this.racialCooldown > 0) {
      this.racialCooldown--;
    }
    
    // Process healing over time effect (Satyr racial)
    if (this.racialEffects && this.racialEffects.healOverTime) {
      const effect = this.racialEffects.healOverTime;
      this.hp = Math.min(this.maxHp, this.hp + effect.amount);
      effect.turns--;
      
      if (effect.turns <= 0) {
        delete this.racialEffects.healOverTime;
      }
      
      return { healed: effect.amount };
    }
    
    return null;
  }
  
  /**
   * Set racial ability for player
   * @param {Object} abilityData - Racial ability definition
   */
  setRacialAbility(abilityData) {
    this.racialAbility = abilityData;
    
    // Set initial usage limits
    if (abilityData.usageLimit === 'perGame') {
      this.racialUsesLeft = abilityData.maxUses || 1;
    } else if (abilityData.usageLimit === 'perRound') {
      // For perRound, we'll reset this each round in GameRoom
      this.racialUsesLeft = abilityData.maxUses || 1;
    }
    
    this.racialCooldown = 0;
    if (abilityData.type === 'undying') {
      this.racialEffects = this.racialEffects || {};
      this.racialEffects.resurrect = {
        resurrectedHp: abilityData.params.resurrectedHp || 1
       };
    } else {
      this.racialEffects = {};
    }
  }
  
  /**
   * Reset per-round racial ability uses
   */
  resetRacialPerRoundUses() {
    if (this.racialAbility && this.racialAbility.usageLimit === 'perRound') {
      this.racialUsesLeft = this.racialAbility.maxUses || 1;
    }
  }
  
  /**
   * Take damage, applying armor and other effects
   * @param {number} amount - Amount of damage
   * @param {Object} source - Source of the damage
   * @returns {number} Actual damage taken
   */
  takeDamage(amount, source) {
    // Apply armor reduction
    const reducedDamage = this.calculateDamageReduction(amount);
    
    // Apply damage
    this.hp = Math.max(0, this.hp - reducedDamage);
    
    // Check if died
    if (this.hp <= 0) {
      this.isAlive = false;
    }
    
    return reducedDamage;
  }
  
  /**
   * Heal the player
   * @param {number} amount - Amount to heal
   * @returns {number} Actual amount healed
   */
  heal(amount) {
    const beforeHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - beforeHp;
  }
}

module.exports = Player;