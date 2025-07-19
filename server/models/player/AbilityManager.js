/**
 * @fileoverview Ability management for Player class
 * Handles ability unlocking, cooldowns, and usage tracking
 */
const config = require('@config');
const logger = require('@utils/logger');

/**
 * AbilityManager handles all ability-related operations for a player
 */
class AbilityManager {
  constructor(player) {
    this.player = player;
    this.abilities = [];
    this.unlockedAbilities = [];
    this.abilityCooldowns = new Map();
    this.racialAbility = null;
    this.racialAbilityUsed = false;
  }

  /**
   * Initialize abilities based on class
   * @param {string} className - Player's class name
   */
  initializeAbilities(className) {
    const classStats = config.classStats[className];
    if (classStats && classStats.abilities) {
      this.abilities = [...classStats.abilities];
      this.unlockedAbilities = classStats.abilities.filter(
        ability => ability.unlockAt <= 1
      );
    }
  }

  /**
   * Set racial ability
   * @param {Object} racialAbility - Racial ability configuration
   */
  setRacialAbility(racialAbility) {
    this.racialAbility = racialAbility;
    this.racialAbilityUsed = false;
  }

  /**
   * Get an ability by type
   * @param {string} abilityType - Type of ability to find
   * @returns {Object|null} Ability object or null
   */
  getAbility(abilityType) {
    return this.abilities.find(a => a.type === abilityType) || null;
  }

  /**
   * Check if an ability is unlocked
   * @param {string} abilityType - Type of ability to check
   * @returns {boolean} True if unlocked
   */
  isAbilityUnlocked(abilityType) {
    return this.unlockedAbilities.some(a => a.type === abilityType);
  }

  /**
   * Check if an ability is on cooldown
   * @param {string} abilityType - Type of ability to check
   * @returns {boolean} True if on cooldown
   */
  isAbilityOnCooldown(abilityType) {
    return this.abilityCooldowns.has(abilityType) && 
           this.abilityCooldowns.get(abilityType) > 0;
  }

  /**
   * Get remaining cooldown for an ability
   * @param {string} abilityType - Type of ability
   * @returns {number} Remaining cooldown rounds
   */
  getAbilityCooldown(abilityType) {
    return this.abilityCooldowns.get(abilityType) || 0;
  }

  /**
   * Apply cooldown to an ability
   * @param {string} abilityType - Type of ability
   * @param {number} rounds - Number of rounds for cooldown
   */
  applyCooldown(abilityType, rounds) {
    if (rounds > 0) {
      this.abilityCooldowns.set(abilityType, rounds);
      logger.debug(`Applied ${rounds} round cooldown to ${abilityType} for player ${this.player.id}`);
    }
  }

  /**
   * Reduce cooldowns by one round
   */
  reduceCooldowns() {
    for (const [ability, cooldown] of this.abilityCooldowns.entries()) {
      if (cooldown > 0) {
        this.abilityCooldowns.set(ability, cooldown - 1);
        if (cooldown - 1 === 0) {
          logger.debug(`${ability} cooldown expired for player ${this.player.id}`);
        }
      }
    }
  }

  /**
   * Reset all cooldowns
   */
  resetCooldowns() {
    this.abilityCooldowns.clear();
  }

  /**
   * Get list of available abilities (unlocked and not on cooldown)
   * @returns {Array} Array of available abilities
   */
  getAvailableAbilities() {
    return this.unlockedAbilities.filter(ability => 
      !this.isAbilityOnCooldown(ability.type)
    );
  }

  /**
   * Unlock abilities up to a certain level
   * @param {number} level - Current game level
   * @returns {Array} Array of newly unlocked abilities
   */
  unlockAbilitiesForLevel(level) {
    const newlyUnlocked = [];
    
    for (const ability of this.abilities) {
      const alreadyUnlocked = this.unlockedAbilities.some(
        a => a.type === ability.type
      );
      
      if (ability.unlockAt <= level && !alreadyUnlocked) {
        this.unlockedAbilities.push(ability);
        newlyUnlocked.push(ability);
      }
    }
    
    return newlyUnlocked;
  }

  /**
   * Check if player can use racial ability
   * @returns {boolean} True if can use
   */
  canUseRacialAbility() {
    return this.racialAbility && 
           !this.racialAbilityUsed && 
           this.player.isAlive;
  }

  /**
   * Mark racial ability as used
   */
  markRacialAbilityUsed() {
    this.racialAbilityUsed = true;
  }

  /**
   * Reset racial ability usage for new round
   */
  resetRacialAbility() {
    this.racialAbilityUsed = false;
  }

  /**
   * Get ability summary for client
   * @returns {Object} Ability summary
   */
  getAbilitySummary() {
    return {
      abilities: this.abilities.map(a => ({
        type: a.type,
        name: a.name,
        unlocked: this.isAbilityUnlocked(a.type),
        cooldown: this.getAbilityCooldown(a.type),
        description: a.description
      })),
      racialAbility: this.racialAbility ? {
        name: this.racialAbility.name,
        used: this.racialAbilityUsed,
        canUse: this.canUseRacialAbility()
      } : null
    };
  }

  /**
   * Serialize ability state
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      abilities: this.abilities,
      unlockedAbilities: this.unlockedAbilities,
      cooldowns: Object.fromEntries(this.abilityCooldowns),
      racialAbility: this.racialAbility,
      racialAbilityUsed: this.racialAbilityUsed
    };
  }

  /**
   * Deserialize ability state
   * @param {Object} data - Serialized data
   */
  deserialize(data) {
    if (data.abilities) this.abilities = data.abilities;
    if (data.unlockedAbilities) this.unlockedAbilities = data.unlockedAbilities;
    if (data.cooldowns) {
      this.abilityCooldowns = new Map(Object.entries(data.cooldowns));
    }
    if (data.racialAbility) this.racialAbility = data.racialAbility;
    if (data.racialAbilityUsed !== undefined) {
      this.racialAbilityUsed = data.racialAbilityUsed;
    }
  }
}

module.exports = AbilityManager;