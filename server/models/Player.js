/**
 * @fileoverview Player model with ability cooldown support
 * Manages player state, abilities, status effects, and cooldowns
 */
const config = require('@config');
const logger = require('@utils/logger');

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
    this.hp = config.gameBalance.player.baseHp || 100;
    this.maxHp = config.gameBalance.player.baseHp || 100;
    this.armor = 0;
    this.damageMod = 1.0; // Damage modifier from race and class
    this.isWarlock = false;
    this.isAlive = true;
    this.isReady = false;
    this.statusEffects = {}; // { poison: {...}, protected: {...}, invisible: {...}, stunned: {...} }
    this.abilities = []; // full list of class abilities
    this.unlocked = []; // slice of abilities by level

    // Racial ability tracking
    this.racialAbility = null; // The racial ability object
    this.racialUsesLeft = 0; // Number of uses left in the current game
    this.racialCooldown = 0; // Rounds until ability can be used again
    this.racialEffects = {}; // Active racial ability effects

    // Ability cooldown tracking
    this.abilityCooldowns = {}; // { abilityType: turnsRemaining }

    this.isVulnerable = false; // Direct flag for vulnerability
    this.vulnerabilityIncrease = 0; // Amount of damage increase

    // Stone Armor tracking
    this.stoneArmorIntact = false; // Whether the dwarf has stone armor
    this.stoneArmorValue = 0; // Current stone armor value
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
   * Process vulnerability at end of turn
   * @returns {boolean} Whether vulnerability expired
   */
  processVulnerability() {
    if (!this.isVulnerable) return false;

    let expired = false;

    // Reduce duration
    if (this.statusEffects.vulnerable.turns > 0) {
      this.statusEffects.vulnerable.turns--;

      // Check if expired
      if (this.statusEffects.vulnerable.turns <= 0) {
        this.isVulnerable = false;
        this.vulnerabilityIncrease = 0;
        delete this.statusEffects.vulnerable;
        expired = true;
      }
    }

    return expired;
  }

  /**
   * Apply vulnerability status
   * @param {number} damageIncrease - Percentage to increase damage by
   * @param {number} turns - Duration in turns
   */
  applyVulnerability(damageIncrease, turns) {
    // Set direct vulnerability state
    this.isVulnerable = true;
    this.vulnerabilityIncrease = damageIncrease;

    // Also store in status effects for consistent API
    // Note: turns already has +1 added by applyEffect, so use as-is
    this.statusEffects.vulnerable = {
      damageIncrease,
      turns,
    };
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
    return (
      this.abilityCooldowns[abilityType] &&
      this.abilityCooldowns[abilityType] > 0
    );
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
   * Put an ability on cooldown - FIXED timing
   * @param {string} abilityType - Type of ability
   * @param {number} cooldownTurns - Number of turns for cooldown
   */
  putAbilityOnCooldown(abilityType, cooldownTurns) {
    if (cooldownTurns > 0) {
      // Add 1 to the cooldown to account for the immediate countdown at end of turn
      this.abilityCooldowns[abilityType] = cooldownTurns + 1;
    }
  }

  /**
   * Check if an ability can be used (not on cooldown and unlocked)
   * @param {string} abilityType - Type of ability to check
   * @returns {boolean} Whether the ability can be used
   */
  canUseAbility(abilityType) {
    // Check if ability is unlocked
    const hasAbility = this.unlocked.some((a) => a.type === abilityType);
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
    return this.unlocked.filter((ability) => this.canUseAbility(ability.type));
  }

  /**
   * Calculate effective armor including protection buffs and vulnerability debuffs
   * @returns {number} Total armor value
   */
  getEffectiveArmor() {
    let totalArmor = this.armor || 0;

    // Add stone armor for Dwarves
    if (this.stoneArmorIntact) {
      totalArmor += this.stoneArmorValue;
    }

    // Add protection effect armor
    if (this.hasStatusEffect('protected')) {
      totalArmor += this.statusEffects.protected.armor || 0;
    }

    return totalArmor;
  }

  /**
   * Process Stone Armor degradation when taking any damage
   * @param {number} damage - Amount of damage being taken (before armor calculation)
   * @returns {Object} Information about armor degradation
   */
  processStoneArmorDegradation(damage) {
    if (!this.stoneArmorIntact || damage <= 0) {
      return { degraded: false, newArmorValue: this.stoneArmorValue };
    }

    // Degrade stone armor by 1 for each hit
    const oldValue = this.stoneArmorValue;
    this.stoneArmorValue -=
      config.gameBalance.stoneArmor.degradationPerHit || 1;

    logger.debug(
      `${this.name}'s Stone Armor degrades from ${oldValue} to ${this.stoneArmorValue}`
    );

    // Check if stone armor is completely destroyed
    if (this.stoneArmorValue <= config.gameBalance.stoneArmor.minimumValue) {
      // Cap negative armor at minimum
      this.stoneArmorValue = config.gameBalance.stoneArmor.minimumValue;
    }

    return {
      degraded: true,
      oldValue,
      newArmorValue: this.stoneArmorValue,
      destroyed: this.stoneArmorValue <= 0,
    };
  }

  /**
   * Calculate damage reduction from armor
   * @param {number} damage - Incoming damage (after vulnerability)
   * @returns {number} Reduced damage after armor
   */
  calculateDamageReduction(damage) {
    const totalArmor = this.getEffectiveArmor();

    // Use gameBalance config for calculations
    return config.gameBalance.calculateDamageReduction
      ? Math.floor(
          damage * (1 - config.gameBalance.calculateDamageReduction(totalArmor))
        )
      : damage; // Fallback if config function not available
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

    // Apply Blood Frenzy passive effect (Barbarian class ability)
    if (
      this.classEffects &&
      this.classEffects.bloodFrenzy &&
      this.classEffects.bloodFrenzy.active
    ) {
      const hpPercent = this.hp / this.maxHp;
      const missingHpPercent = 1 - hpPercent;
      const damageIncreaseRate =
        this.classEffects.bloodFrenzy.damageIncreasePerHpMissing || 0.01;
      const damageIncrease = missingHpPercent * damageIncreaseRate;
      modifiedDamage = Math.floor(modifiedDamage * (1 + damageIncrease));

      // Debug log for testing
      if (missingHpPercent > 0) {
        console.log(
          `Blood Frenzy: ${this.name} missing ${Math.round(missingHpPercent * 100)}% HP, damage increased by ${Math.round(damageIncrease * 100)}%`
        );
      }
    }

    // Apply Unstoppable Rage effect if active (Barbarian class ability)
    if (
      this.classEffects &&
      this.classEffects.unstoppableRage &&
      this.classEffects.unstoppableRage.turnsLeft > 0
    ) {
      const damageBoost = this.classEffects.unstoppableRage.damageBoost || 1.5;
      modifiedDamage = Math.floor(modifiedDamage * damageBoost);
    }

    // Apply weakened effect if active (reduces outgoing damage)
    if (this.statusEffects && this.statusEffects.weakened) {
      const damageReduction =
        this.statusEffects.weakened.damageReduction || 0.25;
      modifiedDamage = Math.floor(modifiedDamage * (1 - damageReduction));
    }

    return modifiedDamage;
  }

  /**
   * Calculate healing modifier (inverse of damage modifier)
   * @returns {number} Healing modifier value
   */
  getHealingModifier() {
    const baseHealingMod =
      config.gameBalance.player.healing.modifierBase || 2.0;
    return baseHealingMod - (this.damageMod || 1.0);
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

    // Apply cooldown if present - ADD 1 to account for immediate countdown
    if (this.racialAbility.cooldown > 0) {
      this.racialCooldown = this.racialAbility.cooldown + 1;
    }

    return true;
  }

  /**
   * Process racial ability cooldowns at end of round - FIXED timing
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
      this.racialUsesLeft = abilityData.maxUses || 1;
    } else if (abilityData.usageLimit === 'passive') {
      this.racialUsesLeft = 0; // Passive abilities don't have uses
    }

    this.racialCooldown = 0; // Start with no cooldown

    // Special handling for different racial abilities
    if (abilityData.type === 'undying') {
      this.racialEffects = this.racialEffects || {};
      this.racialEffects.resurrect = {
        resurrectedHp: abilityData.params.resurrectedHp,
      };
    } else if (abilityData.type === 'stoneArmor') {
      // Initialize Stone Armor
      this.stoneArmorIntact = true;
      this.stoneArmorValue =
        abilityData.params.initialArmor ||
        config.gameBalance.stoneArmor.initialValue;
      logger.debug(
        `${this.name} gains Stone Armor with ${this.stoneArmorValue} armor`
      );
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
   * Updated takeDamage method to handle Unstoppable Rage damage resistance
   * Add this to replace the existing takeDamage method in Player.js
   */
  takeDamage(amount, source) {
    // Start with the original damage
    let modifiedDamage = amount;

    // Apply vulnerability if present - BEFORE armor calculation
    if (this.isVulnerable && this.vulnerabilityIncrease > 0) {
      const vulnerabilityMultiplier = 1 + this.vulnerabilityIncrease / 100;
      modifiedDamage = Math.floor(modifiedDamage * vulnerabilityMultiplier);
    }

    // Apply Unstoppable Rage damage resistance if active
    if (
      this.classEffects &&
      this.classEffects.unstoppableRage &&
      this.classEffects.unstoppableRage.turnsLeft > 0
    ) {
      const damageResistance =
        this.classEffects.unstoppableRage.damageResistance || 0.3;
      modifiedDamage = Math.floor(modifiedDamage * (1 - damageResistance));
    }

    // Apply armor reduction
    const reducedDamage = this.calculateDamageReduction(modifiedDamage);

    // Apply the damage
    this.hp = Math.max(0, this.hp - reducedDamage);

    // Check if died
    if (this.hp <= 0) {
      this.isAlive = false;
    }

    return reducedDamage;
  }

  /**
   * Calculate damage with vulnerability effects applied
   * @param {number} baseDamage - Base damage amount
   * @returns {number} Modified damage amount
   */
  calculateDamageWithVulnerability(baseDamage) {
    // Start with the base damage
    let modifiedDamage = baseDamage;

    // Check for vulnerability by direct property examination
    if (this.statusEffects && this.statusEffects.vulnerable) {
      const vulnEffect = this.statusEffects.vulnerable;
      const damageIncrease = vulnEffect.damageIncrease;

      // Apply vulnerability multiplier
      modifiedDamage = Math.floor(baseDamage * (1 + damageIncrease / 100));
    }

    return modifiedDamage;
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

  /**
   * Process class effects at end of round
   * Add this new method to Player.js
   */
  processClassEffects() {
    if (!this.classEffects) return;

    // Process Unstoppable Rage
    if (this.classEffects.unstoppableRage) {
      this.classEffects.unstoppableRage.turnsLeft--;

      if (this.classEffects.unstoppableRage.turnsLeft <= 0) {
        // Rage is ending, apply self-damage
        const selfDamagePercent =
          this.classEffects.unstoppableRage.selfDamagePercent || 0.25;
        const selfDamage = Math.floor(this.maxHp * selfDamagePercent);
        const oldHp = this.hp;
        this.hp = Math.max(1, this.hp - selfDamage);
        const actualDamage = oldHp - this.hp;

        // Clear the effect
        delete this.classEffects.unstoppableRage;

        return {
          type: 'rage_ended',
          damage: actualDamage,
          message: `${this.name}'s Unstoppable Rage ends, causing ${actualDamage} exhaustion damage!`,
        };
      }
    }

    // Process Spirit Guard
    if (this.classEffects.spiritGuard) {
      this.classEffects.spiritGuard.turnsLeft--;

      if (this.classEffects.spiritGuard.turnsLeft <= 0) {
        delete this.classEffects.spiritGuard;
        return {
          type: 'spirit_guard_ended',
          message: `${this.name}'s Spirit Guard fades away.`,
        };
      }
    }

    // Process Sanctuary of Truth
    if (this.classEffects.sanctuaryOfTruth) {
      this.classEffects.sanctuaryOfTruth.turnsLeft--;

      if (this.classEffects.sanctuaryOfTruth.turnsLeft <= 0) {
        delete this.classEffects.sanctuaryOfTruth;
        return {
          type: 'sanctuary_ended',
          message: `${this.name}'s Sanctuary of Truth fades away.`,
        };
      }
    }

    return null;
  }
}

module.exports = Player;
