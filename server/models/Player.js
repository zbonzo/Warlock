/**
 * @fileoverview Updated Player model with fixed armor calculation and damage display
 * Manages player state, abilities, status effects, cooldowns, and action validation
 */
const config = require('@config');
const logger = require('@utils/logger');
const messages = require('@messages');

/**
 * Player class representing a single player in the game
 * Handles player state, abilities, effects, cooldowns, and action submissions
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
    this.statusEffects = {}; // { poison: {...}, shielded: {...}, invisible: {...}, stunned: {...} }
    this.abilities = []; // full list of class abilities
    this.unlocked = []; // slice of abilities by level

    // Racial ability tracking
    this.racialAbility = null; // The racial ability object
    this.racialUsesLeft = 0; // Number of uses left in the current game
    this.racialCooldown = 0; // Rounds until ability can be used again
    this.racialEffects = {}; // Active racial ability effects

    // Ability cooldown tracking
    this.abilityCooldowns = {}; // { abilityType: turnsRemaining }

    // Enhanced action submission tracking
    this.hasSubmittedAction = false;
    this.submittedAction = null;
    this.actionSubmissionTime = null;
    this.lastValidAction = null;
    this.actionValidationState = 'none'; // 'none', 'valid', 'invalid'

    this.isVulnerable = false; // Direct flag for vulnerability
    this.vulnerabilityIncrease = 0; // Amount of damage increase

    // Stone Armor tracking
    this.stoneArmorIntact = false; // Whether the Rockhewn has stone armor
    this.stoneArmorValue = 0; // Current stone armor value
  }

  /**
   * Submit an action for this player with comprehensive validation
   * @param {string} actionType - Type of action being submitted
   * @param {string} targetId - Target of the action
   * @param {Object} additionalData - Additional action data
   * @returns {Object} Submission result with success status and details
   */
  submitAction(actionType, targetId, additionalData = {}) {
    const result = {
      success: false,
      reason: null,
      action: null,
    };

    // Check if player is alive
    if (!this.isAlive) {
      result.reason = 'Dead players cannot perform actions';
      logger.debug(`Player ${this.name} tried to submit action while dead`);
      return result;
    }

    // Check if already submitted an action this round
    if (this.hasSubmittedAction) {
      result.reason = 'Action already submitted this round';
      logger.debug(`Player ${this.name} tried to submit multiple actions`);
      return result;
    }

    // Validate action type exists in unlocked abilities
    const selectedAbility = this.unlocked.find(
      (ability) => ability.type === actionType
    );
    if (!selectedAbility) {
      result.reason = `Ability '${actionType}' is not available`;
      logger.debug(
        `Player ${this.name} tried to use unavailable ability: ${actionType}`
      );
      return result;
    }

    // Check if ability is on cooldown
    const cooldown = this.getAbilityCooldown(actionType);
    if (cooldown > 0) {
      result.reason = `Ability '${selectedAbility.name}' is on cooldown for ${cooldown} more turns`;
      logger.debug(
        `Player ${this.name} tried to use ${actionType} but it's on cooldown (${cooldown} turns)`
      );
      return result;
    }

    // Validate target (basic validation - more detailed validation happens during processing)
    if (!targetId) {
      result.reason = 'No target specified';
      return result;
    }

    // Store the submitted action
    const action = {
      actionType,
      targetId,
      ...additionalData,
      isValid: true,
      submissionTime: Date.now(),
    };

    this.submittedAction = action;
    this.hasSubmittedAction = true;
    this.actionSubmissionTime = Date.now();
    this.lastValidAction = { ...action };
    this.actionValidationState = 'valid';

    result.success = true;
    result.action = action;

    logger.debug(
      `Player ${this.name} successfully submitted action: ${actionType} -> ${targetId}`
    );
    return result;
  }

  /**
   * Validate current submitted action against current game state
   * @param {Array} alivePlayers - List of currently alive players
   * @param {Object} monster - Monster object
   * @returns {Object} Validation result with success status and reason
   */
  validateSubmittedAction(alivePlayers, monster) {
    const result = {
      isValid: false,
      reason: null,
    };

    if (!this.hasSubmittedAction || !this.submittedAction) {
      result.reason = 'No action submitted';
      this.actionValidationState = 'none';
      return result;
    }

    const { actionType, targetId } = this.submittedAction;

    // Re-check ability availability (in case abilities changed)
    const selectedAbility = this.unlocked.find(
      (ability) => ability.type === actionType
    );
    if (!selectedAbility) {
      result.reason = `Ability '${actionType}' is no longer available`;
      this.invalidateAction(result.reason);
      return result;
    }

    // Re-check cooldown status
    const cooldown = this.getAbilityCooldown(actionType);
    if (cooldown > 0) {
      result.reason = `Ability '${selectedAbility.name}' is now on cooldown (${cooldown} turns)`;
      this.invalidateAction(result.reason);
      return result;
    }

    // Validate target still exists and is valid
    if (targetId === config.MONSTER_ID) {
      if (!monster || monster.hp <= 0) {
        result.reason = 'Monster is no longer a valid target';
        this.invalidateAction(result.reason);
        return result;
      }
    } else {
      const targetPlayer = alivePlayers.find((p) => p.id === targetId);
      if (!targetPlayer || !targetPlayer.isAlive) {
        result.reason = 'Player target is no longer alive or valid';
        this.invalidateAction(result.reason);
        return result;
      }
    }

    result.isValid = true;
    this.actionValidationState = 'valid';
    return result;
  }

  /**
   * Invalidate the current action submission
   * @param {string} reason - Reason for invalidation
   */
  invalidateAction(reason) {
    logger.debug(`Invalidating action for ${this.name}: ${reason}`);

    if (this.submittedAction) {
      this.submittedAction.isValid = false;
      this.submittedAction.invalidationReason = reason;
      this.submittedAction.invalidationTime = Date.now();
    }

    this.hasSubmittedAction = false;
    this.actionValidationState = 'invalid';
    // Keep submittedAction for debugging/history but mark as invalid
  }

  /**
   * Clear action submission (typically at start of new round)
   */
  clearActionSubmission() {
    this.hasSubmittedAction = false;
    this.submittedAction = null;
    this.actionSubmissionTime = null;
    this.actionValidationState = 'none';
    this.isReady = false;

    logger.debug(`Cleared action submission for ${this.name}`);
  }

  /**
   * Get submission status for client transmission
   * @returns {Object} Submission status object
   */
  getSubmissionStatus() {
    return {
      hasSubmitted: this.hasSubmittedAction,
      isValid: this.hasSubmittedAction && this.submittedAction?.isValid,
      validationState: this.actionValidationState,
      submissionTime: this.actionSubmissionTime,
      action: this.hasSubmittedAction
        ? {
            type: this.submittedAction.actionType,
            target: this.submittedAction.targetId,
            isValid: this.submittedAction.isValid,
            invalidationReason: this.submittedAction.invalidationReason,
          }
        : null,
    };
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

      logger.debug(
        `${this.name}: ${abilityType} on cooldown for ${this.abilityCooldowns[abilityType]} turns`
      );
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
    const expiredCooldowns = [];

    for (const abilityType in this.abilityCooldowns) {
      if (this.abilityCooldowns[abilityType] > 0) {
        this.abilityCooldowns[abilityType]--;

        // Remove cooldown if it reaches 0
        if (this.abilityCooldowns[abilityType] <= 0) {
          expiredCooldowns.push(abilityType);
          delete this.abilityCooldowns[abilityType];
        }
      }
    }

    if (expiredCooldowns.length > 0) {
      logger.debug(
        `${this.name}: Cooldowns expired for ${expiredCooldowns.join(', ')}`
      );
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
   * FIXED: Calculate damage reduction from armor
   * @param {number} damage - Raw damage amount
   * @returns {number} Final damage after armor reduction
   */
  calculateDamageReduction(damage) {
    const totalArmor = this.getEffectiveArmor();
    const reductionRate = config.gameBalance.armor.reductionRate || 0.1;
    const maxReduction = config.gameBalance.armor.maxReduction || 0.9;

    let reductionPercent;
    if (totalArmor <= 0) {
      // Negative armor increases damage taken
      reductionPercent = Math.max(-2.0, totalArmor * reductionRate);
    } else {
      // Positive armor reduces damage
      reductionPercent = Math.min(maxReduction, totalArmor * reductionRate);
    }

    // Apply the reduction and return final damage
    const finalDamage = Math.floor(damage * (1 - reductionPercent));
    return Math.max(1, finalDamage); // Always deal at least 1 damage
  }

  /**
   * @param {number} rawDamage - Base damage value
   * @returns {number} Modified damage
   */
  modifyDamage(rawDamage) {
    // First apply the normal damage modifier (level progression)
    let modifiedDamage = Math.floor(rawDamage * (this.damageMod || 1.0));

    // FIXED: Apply blood rage effect if active (Orc racial) - check both old and new properties
    if (this.racialEffects && this.racialEffects.bloodRage) {
      modifiedDamage = modifiedDamage * 2; // Double the already-modified damage

      // One-time use - clear the effect
      delete this.racialEffects.bloodRage;
    }
    // ALSO check for the newer bloodRageMultiplier property
    else if (this.racialEffects && this.racialEffects.bloodRageMultiplier) {
      modifiedDamage = Math.floor(
        modifiedDamage * this.racialEffects.bloodRageMultiplier
      );

      // One-time use - clear the effect
      delete this.racialEffects.bloodRageMultiplier;
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
        logger.debug(
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
   * Get ability damage display for UI
   * @param {Object} ability - Ability object
   * @returns {Object} Damage display information
   */
  getAbilityDamageDisplay(ability) {
    if (!ability.params?.damage) return null;

    const baseDamage = ability.params.damage;
    const modifiedDamage = this.modifyDamage(baseDamage);

    return {
      base: baseDamage,
      modified: modifiedDamage,
      modifier: this.damageMod,
      showModified: baseDamage !== modifiedDamage,
      displayText:
        baseDamage === modifiedDamage
          ? `${baseDamage} damage`
          : `${modifiedDamage} damage (${baseDamage} base × ${this.damageMod?.toFixed(1) || 1.0})`,
    };
  }

  /**
   * Calculate healing modifier (inverse of damage modifier)
   * @returns {number} Healing modifier value
   */
  getHealingModifier() {
    const config = require('@config');

    // Get class base damage modifier
    const classDamageModifier =
      this.class && config.classAttributes && config.classAttributes[this.class]
        ? config.classAttributes[this.class].damageModifier || 1.0
        : 1.0;

    // Calculate pure level scaling (removing class modifier influence)
    const levelMultiplier = (this.damageMod || 1.0) / classDamageModifier;

    // Healing scales directly with level progression
    return levelMultiplier;
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
   * Process racial ability cooldowns at end of round - FIXED timing
   * @returns {Object|null} Effect results if any
   */
  processRacialCooldowns() {
    if (this.racialCooldown > 0) {
      this.racialCooldown--;
    }

    // NOTE: Healing over time is now handled by StatusEffectManager
    // This method is kept for compatibility but healing over time
    // should use the healingOverTime status effect instead

    return null;
  }

  /**
   * Set racial ability for player - FIXED for Undying
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
      // FIXED: Properly initialize Undying effect
      this.racialEffects = this.racialEffects || {};
      this.racialEffects.resurrect = {
        resurrectedHp: abilityData.params?.resurrectedHp || 1,
        active: true, // Mark as active and ready
      };

      logger.debug(
        `UNDYING SETUP: ${this.name} now has Undying effect:`,
        this.racialEffects.resurrect
      );
    } else if (abilityData.type === 'stoneArmor') {
      // Initialize Stone Armor
      this.stoneArmorIntact = true;
      this.stoneArmorValue =
        abilityData.params.initialArmor ||
        config.gameBalance.stoneArmor.initialValue;
    } else {
      this.racialEffects = {};
    }
  }

  /**
   * Check if Crestfallen moonbeam is active (wounded condition)
   * @returns {boolean} Whether moonbeam detection is active
   */
  isMoonbeamActive() {
    if (this.race !== 'Crestfallen' || !this.isAlive) return false;
    return this.hp <= this.maxHp * 0.5;
  }

  /**
   * Process Kinfolk life bond healing
   * @param {number} monsterHp - Current monster HP
   * @param {Array} log - Event log to append messages to
   * @returns {number} Amount healed
   */
  processLifeBondHealing(monsterHp, log = []) {
    if (this.race !== 'Kinfolk' || !this.isAlive || monsterHp <= 0) return 0;

    const healAmount = Math.floor(
      monsterHp * this.racialAbility?.params?.healingPercent
    );
    const actualHeal = Math.min(healAmount, this.maxHp - this.hp);

    if (actualHeal > 0) {
      this.hp += actualHeal;

      const healLog = {
        type: 'life_bond_healing',
        public: true,
        targetId: this.id,
        message: `${this.name}'s Life Bond with the monster heals them for ${actualHeal} HP.`,
        privateMessage: `Your Life Bond with the monster heals you for ${actualHeal} HP.`,
        attackerMessage: '',
      };
      log.push(healLog);
    }

    return actualHeal;
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
   * FIXED: Take damage with proper armor calculation
   * @param {number} amount - Base damage amount
   * @param {string} source - Source of damage
   * @returns {number} Actual damage taken
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

    // Apply armor reduction using the FIXED calculation
    const finalDamage = this.calculateDamageReduction(modifiedDamage);

    // Apply the damage
    this.hp = Math.max(0, this.hp - finalDamage);

    // Check if died
    if (this.hp <= 0) {
      this.isAlive = false;
    }

    return finalDamage;
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
   * @returns {Object|null} Effect results if any
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

  /**
   * Prepare player data for client transmission
   * @param {boolean} includePrivate - Whether to include private/sensitive data
   * @param {string} requestingPlayerId - ID of player requesting the data
   * @returns {Object} Player data object for client
   */
  toClientData(includePrivate = false, requestingPlayerId = null) {
    const data = {
      id: this.id,
      name: this.name,
      race: this.race,
      class: this.class,
      hp: this.hp,
      maxHp: this.maxHp,
      armor: this.armor,
      effectiveArmor: this.getEffectiveArmor(), // Add effective armor for UI
      isAlive: this.isAlive,
      isReady: this.isReady,
      hasSubmittedAction: this.hasSubmittedAction,
      statusEffects: this.statusEffects,
    };

    // Include private data for the player themselves or when specifically requested
    if (includePrivate || requestingPlayerId === this.id) {
      data.isWarlock = this.isWarlock;
      data.unlocked = this.unlocked;
      data.abilityCooldowns = this.abilityCooldowns;
      data.racialAbility = this.racialAbility;
      data.racialUsesLeft = this.racialUsesLeft;
      data.racialCooldown = this.racialCooldown;
      data.submissionStatus = this.getSubmissionStatus();
      data.damageMod = this.damageMod;

      // Add damage display info for abilities
      data.abilitiesWithDamage = this.unlocked.map((ability) => ({
        ...ability,
        damageDisplay: this.getAbilityDamageDisplay(ability),
      }));
    }

    return data;
  }
}

module.exports = Player;
