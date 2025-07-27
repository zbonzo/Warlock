/**
 * @fileoverview PlayerEffects domain model
 * Handles all player status effects, class effects, and temporary modifiers
 */
const logger = require('@utils/logger');
const messages = require('@messages');
const config = require('@config');

/**
 * PlayerEffects class manages all status effects and temporary modifiers for a player
 * Separated from Player class for better organization and testability
 */
class PlayerEffects {
  /**
   * Create new player effects manager
   * @param {string} playerId - Player ID for logging
   * @param {string} playerName - Player name for logging
   */
  constructor(playerId, playerName) {
    this.playerId = playerId;
    this.playerName = playerName;
    
    // Status effects
    this.statusEffects = {}; // { poison: {...}, shielded: {...}, invisible: {...}, stunned: {...} }
    this._isVulnerable = false; // Direct flag for vulnerability
    this._vulnerabilityIncrease = 0; // Amount of damage increase
    
    // Stone Armor tracking (Rockhewn racial)
    this.stoneArmorIntact = false; // Whether the Rockhewn has stone armor
    this.stoneArmorValue = 0; // Current stone armor value
    
    // Class effects tracking
    this.classEffects = {};
    
    // Racial effects
    this.racialEffects = {};
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
   * Process vulnerability at end of turn
   * @returns {boolean} Whether vulnerability expired
   */
  processVulnerability() {
    if (!this._isVulnerable) return false;

    let expired = false;

    // Reduce duration
    if (this.statusEffects.vulnerable.turns > 0) {
      this.statusEffects.vulnerable.turns--;

      // Check if expired
      if (this.statusEffects.vulnerable.turns <= 0) {
        this._isVulnerable = false;
        this._vulnerabilityIncrease = 0;
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
    this._isVulnerable = true;
    this._vulnerabilityIncrease = damageIncrease;

    // Also store in status effects for consistent API
    this.statusEffects.vulnerable = {
      damageIncrease,
      turns,
    };
  }

  /**
   * Calculate effective armor including protection buffs and vulnerability debuffs
   * @param {number} baseArmor - Base armor value
   * @returns {number} Total armor value
   */
  getEffectiveArmor(baseArmor) {
    let totalArmor = baseArmor || 0;

    // Add stone armor for Rockhewn
    if (this.stoneArmorIntact) {
      totalArmor += this.stoneArmorValue;
    }

    // Add protection effect armor
    if (this.hasStatusEffect('shielded')) {
      totalArmor += this.statusEffects.shielded.armor || 0;
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
      messages.formatMessage(
        messages.serverLogMessages.debug.StoneArmorDegradation,
        { playerName: this.playerName, oldValue, newValue: this.stoneArmorValue }
      )
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
   * Initialize stone armor (Rockhewn racial)
   * @param {number} initialValue - Initial stone armor value
   */
  initializeStoneArmor(initialValue) {
    this.stoneArmorIntact = true;
    this.stoneArmorValue = initialValue || config.gameBalance.stoneArmor.initialValue;
  }

  /**
   * Calculate additional damage taken from Relentless Fury
   * @param {number} baseDamage - Base incoming damage
   * @param {string} playerClass - Player's class
   * @returns {number} Additional damage from vulnerability
   */
  getRelentlessFuryVulnerability(baseDamage, playerClass) {
    if (
      playerClass === 'Barbarian' &&
      this.classEffects &&
      this.classEffects.relentlessFury &&
      this.classEffects.relentlessFury.active
    ) {
      const level = this.classEffects.relentlessFury.currentLevel || 1;
      const vulnerabilityPerLevel =
        this.classEffects.relentlessFury.vulnerabilityPerLevel || 0.03;
      const vulnerabilityBonus = level * vulnerabilityPerLevel;
      return Math.floor(baseDamage * vulnerabilityBonus);
    }
    return 0;
  }

  /**
   * Process Thirsty Blade life steal
   * @param {number} damageDealt - Damage dealt to trigger life steal
   * @param {string} playerClass - Player's class
   * @param {number} currentHp - Current player HP
   * @param {number} maxHp - Max player HP
   * @returns {Object} Life steal result
   */
  processThirstyBladeLifeSteal(damageDealt, playerClass, currentHp, maxHp) {
    if (
      playerClass === 'Barbarian' &&
      this.classEffects &&
      this.classEffects.thirstyBlade &&
      this.classEffects.thirstyBlade.active &&
      this.classEffects.thirstyBlade.turnsLeft > 0
    ) {
      const lifeSteal = this.classEffects.thirstyBlade.lifeSteal || 0.15;
      const healAmount = Math.floor(damageDealt * lifeSteal);

      if (healAmount > 0) {
        const actualHeal = Math.min(healAmount, maxHp - currentHp);
        return { healed: actualHeal, newHp: currentHp + actualHeal };
      }
    }
    return { healed: 0, newHp: currentHp };
  }

  /**
   * Refresh Thirsty Blade on any death (not just kills by this barbarian)
   * @param {string} playerClass - Player's class
   * @returns {boolean} Whether Thirsty Blade was refreshed
   */
  refreshThirstyBladeOnKill(playerClass) {
    if (
      playerClass === 'Barbarian' &&
      this.classEffects &&
      this.classEffects.thirstyBlade
    ) {
      this.classEffects.thirstyBlade.turnsLeft =
        this.classEffects.thirstyBlade.maxDuration;
      this.classEffects.thirstyBlade.active = true;
      return true;
    }
    return false;
  }

  /**
   * Get Sweeping Strike parameters for combat system
   * @param {string} playerClass - Player's class
   * @returns {Object|null} Sweeping strike parameters or null if not active
   */
  getSweepingStrikeParams(playerClass) {
    const result =
      playerClass === 'Barbarian' &&
      this.classEffects &&
      this.classEffects.sweepingStrike &&
      this.classEffects.sweepingStrike.active
        ? {
            bonusTargets: this.classEffects.sweepingStrike.bonusTargets || 1,
            stunChance: this.classEffects.sweepingStrike.stunChance || 0.25,
            stunDuration: this.classEffects.sweepingStrike.stunDuration || 1,
          }
        : null;

    console.log(`${this.playerName} getSweepingStrikeParams:`, result);
    return result;
  }

  /**
   * Apply damage modifier from effects
   * @param {number} rawDamage - Base damage value
   * @param {string} playerClass - Player's class
   * @param {number} level - Player level
   * @param {number} currentHp - Current HP
   * @param {number} maxHp - Max HP
   * @returns {number} Modified damage
   */
  applyDamageModifiers(rawDamage, playerClass, level, currentHp, maxHp) {
    let modifiedDamage = rawDamage;

    // Apply Blood Rage effect if active (Orc racial)
    if (this.racialEffects && this.racialEffects.bloodRage) {
      modifiedDamage = modifiedDamage * 2;
      delete this.racialEffects.bloodRage;
    } else if (this.racialEffects && this.racialEffects.bloodRageMultiplier) {
      modifiedDamage = Math.floor(
        modifiedDamage * this.racialEffects.bloodRageMultiplier
      );
      delete this.racialEffects.bloodRageMultiplier;
    }

    // Apply Relentless Fury (Barbarian passive)
    if (
      playerClass === 'Barbarian' &&
      this.classEffects &&
      this.classEffects.relentlessFury &&
      this.classEffects.relentlessFury.active
    ) {
      const currentLevel = this.classEffects.relentlessFury.currentLevel || level;
      const damagePerLevel =
        this.classEffects.relentlessFury.damagePerLevel || 0.03;
      const damageBonus = currentLevel * damagePerLevel;
      modifiedDamage = Math.floor(modifiedDamage * (1 + damageBonus));
    }

    // Apply Blood Frenzy passive effect
    if (
      this.classEffects &&
      this.classEffects.bloodFrenzy &&
      this.classEffects.bloodFrenzy.active
    ) {
      const hpPercent = currentHp / maxHp;
      const missingHpPercent = 1 - hpPercent;
      const damageIncreaseRate =
        this.classEffects.bloodFrenzy.damageIncreasePerHpMissing || 0.01;
      const damageIncrease = missingHpPercent * damageIncreaseRate;
      modifiedDamage = Math.floor(modifiedDamage * (1 + damageIncrease));
    }

    // Apply Unstoppable Rage effect if active
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
   * Apply damage resistance from effects
   * @param {number} incomingDamage - Incoming damage amount
   * @param {string} playerClass - Player's class
   * @returns {number} Modified damage after resistance
   */
  applyDamageResistance(incomingDamage, playerClass) {
    let modifiedDamage = incomingDamage;

    // Apply vulnerability if present - BEFORE armor calculation
    if (this._isVulnerable && this._vulnerabilityIncrease > 0) {
      const vulnerabilityMultiplier = 1 + this._vulnerabilityIncrease / 100;
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

    return modifiedDamage;
  }

  /**
   * Process class effects at end of round
   * @param {number} maxHp - Player's max HP
   * @returns {Object|null} Effect results if any
   */
  processClassEffects(maxHp) {
    if (!this.classEffects) return null;

    // Process Thirsty Blade
    if (
      this.classEffects.thirstyBlade &&
      this.classEffects.thirstyBlade.active
    ) {
      console.log(
        `${this.playerName} Thirsty Blade: ${this.classEffects.thirstyBlade.turnsLeft} turns left`
      );

      this.classEffects.thirstyBlade.turnsLeft--;

      if (this.classEffects.thirstyBlade.turnsLeft <= 0) {
        console.log(`${this.playerName} Thirsty Blade expiring`);
        this.classEffects.thirstyBlade.active = false;
        return {
          type: 'thirsty_blade_ended',
          message: messages.formatMessage(
            messages.getEvent('thirstyBladeFaded'),
            { playerName: this.playerName }
          ),
        };
      }
    }

    // Process Unstoppable Rage
    if (this.classEffects.unstoppableRage) {
      this.classEffects.unstoppableRage.turnsLeft--;

      if (this.classEffects.unstoppableRage.turnsLeft <= 0) {
        const selfDamagePercent =
          this.classEffects.unstoppableRage.selfDamagePercent || 0.25;
        const selfDamage = Math.floor(maxHp * selfDamagePercent);

        delete this.classEffects.unstoppableRage;

        return {
          type: 'rage_ended',
          damage: selfDamage,
          message: messages.formatMessage(
            messages.getEvent('unstoppableRageEnded'),
            { playerName: this.playerName, actualDamage: selfDamage }
          ),
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
          message: messages.formatMessage(
            messages.getEvent('spiritGuardFaded'),
            { playerName: this.playerName }
          ),
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
          message: messages.formatMessage(messages.getEvent('sanctuaryFaded'), {
            playerName: this.playerName,
          }),
        };
      }
    }

    return null;
  }

  /**
   * Update Relentless Fury scaling when player levels up
   * @param {number} newLevel - New player level
   * @param {string} playerClass - Player's class
   */
  updateRelentlessFuryLevel(newLevel, playerClass) {
    if (
      playerClass === 'Barbarian' &&
      this.classEffects &&
      this.classEffects.relentlessFury &&
      this.classEffects.relentlessFury.active
    ) {
      this.classEffects.relentlessFury.currentLevel = newLevel;
      console.log(`${this.playerName} Relentless Fury updated to level ${newLevel}`);
    }
  }

  /**
   * Set player name (for logging after reconnection)
   * @param {string} newName - New player name
   */
  setPlayerName(newName) {
    this.playerName = newName;
  }

  /**
   * Handle direct assignment to isVulnerable (for compatibility)
   * @param {boolean} value - Vulnerability state
   */
  set isVulnerable(value) {
    this._isVulnerable = value;
  }

  get isVulnerable() {
    return this._isVulnerable || false;
  }

  /**
   * Handle direct assignment to vulnerabilityIncrease (for compatibility)
   * @param {number} value - Vulnerability increase amount
   */
  set vulnerabilityIncrease(value) {
    this._vulnerabilityIncrease = value;
  }

  get vulnerabilityIncrease() {
    return this._vulnerabilityIncrease || 0;
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
   * Initialize Undying effect (Lich racial)
   * @param {number} resurrectedHp - HP to resurrect with
   */
  initializeUndying(resurrectedHp) {
    this.racialEffects = this.racialEffects || {};
    this.racialEffects.resurrect = {
      resurrectedHp: resurrectedHp || 1,
      active: true,
    };

    logger.debug(
      messages.formatMessage(messages.serverLogMessages.debug.UndyingSetup, {
        playerName: this.playerName,
      }),
      this.racialEffects.resurrect
    );
  }
}

module.exports = PlayerEffects;