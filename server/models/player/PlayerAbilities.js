/**
 * @fileoverview PlayerAbilities domain model
 * Handles all player ability management, cooldowns, and availability
 */
const logger = require('@utils/logger');
const messages = require('@messages');
const config = require('@config');

/**
 * PlayerAbilities class manages all ability-related functionality for a player
 * Separated from Player class for better organization and testability
 */
class PlayerAbilities {
  /**
   * Create new player abilities manager
   * @param {string} playerId - Player ID for logging
   * @param {string} playerName - Player name for logging
   */
  constructor(playerId, playerName) {
    this.playerId = playerId;
    this.playerName = playerName;
    
    // Class abilities
    this.abilities = []; // full list of class abilities
    this.unlocked = []; // slice of abilities by level
    this.abilityCooldowns = {}; // { abilityType: turnsRemaining }
    
    // Racial ability tracking
    this.racialAbility = null; // The racial ability object
    this.racialUsesLeft = 0; // Number of uses left in the current game
    this.racialCooldown = 0; // Rounds until ability can be used again
    this.racialEffects = {}; // Active racial ability effects
    
    // Action submission tracking
    this.hasSubmittedAction = false;
    this.submittedAction = null;
    this.actionSubmissionTime = null;
    this.lastValidAction = null;
    this.actionValidationState = 'none'; // 'none', 'valid', 'invalid'
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

    // Check if already submitted an action this round
    if (this.hasSubmittedAction) {
      result.reason = messages.getError('playerActionAlreadySubmittedThisRound');
      logger.debug(
        messages.formatMessage(
          messages.serverLogMessages.debug.MultipleActionsAttempt,
          { playerName: this.playerName }
        )
      );
      return result;
    }

    // Validate action type exists in unlocked abilities
    const selectedAbility = this.unlocked.find(
      (ability) => ability.type === actionType
    );
    if (!selectedAbility) {
      result.reason = messages.formatMessage(
        messages.getError('playerAbilityNotAvailable'),
        { abilityName: actionType }
      );
      logger.debug(
        messages.formatMessage(
          messages.serverLogMessages.debug.UnavailableAbilityAttempt,
          { playerName: this.playerName, abilityType: actionType }
        )
      );
      return result;
    }

    // Check if ability is on cooldown
    const cooldown = this.getAbilityCooldown(actionType);
    if (cooldown > 0) {
      result.reason = messages.formatMessage(
        messages.getError('playerAbilityOnCooldownDetailed'),
        { abilityName: selectedAbility.name, turns: cooldown }
      );
      logger.debug(
        messages.formatMessage(
          messages.serverLogMessages.debug.AbilityOnCooldownAttempt,
          { playerName: this.playerName, actionType, cooldown }
        )
      );
      return result;
    }

    // Validate target (basic validation - more detailed validation happens during processing)
    if (!targetId) {
      result.reason = messages.getError('playerNoTargetSpecified');
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
      messages.formatMessage(
        messages.serverLogMessages.debug.PlayerActionSubmittedSuccessfully,
        { playerName: this.playerName, actionType, targetId }
      )
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
      result.reason = messages.getError('playerNoActionSubmittedForValidation');
      this.actionValidationState = 'none';
      return result;
    }

    const { actionType, targetId } = this.submittedAction;

    // Re-check ability availability (in case abilities changed)
    const selectedAbility = this.unlocked.find(
      (ability) => ability.type === actionType
    );
    if (!selectedAbility) {
      result.reason = messages.formatMessage(
        messages.getError('playerAbilityNoLongerAvailable'),
        { abilityName: actionType }
      );
      this.invalidateAction(result.reason);
      return result;
    }

    // Re-check cooldown status
    const cooldown = this.getAbilityCooldown(actionType);
    if (cooldown > 0) {
      result.reason = messages.formatMessage(
        messages.getError('playerAbilityNowOnCooldown'),
        { abilityName: selectedAbility.name, turns: cooldown }
      );
      this.invalidateAction(result.reason);
      return result;
    }

    // Validate target still exists and is valid
    if (targetId === config.MONSTER_ID) {
      if (!monster || monster.hp <= 0) {
        result.reason = messages.getError('playerMonsterInvalidTarget');
        this.invalidateAction(result.reason);
        return result;
      }
    } else {
      const targetPlayer = alivePlayers.find((p) => p.id === targetId);
      if (!targetPlayer || !targetPlayer.isAlive) {
        result.reason = messages.getError('playerTargetInvalidOrDead');
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
    logger.debug(
      messages.formatMessage(
        messages.serverLogMessages.debug.PlayerActionInvalidated,
        { playerName: this.playerName, reason }
      )
    );

    if (this.submittedAction) {
      this.submittedAction.isValid = false;
      this.submittedAction.invalidationReason = reason;
      this.submittedAction.invalidationTime = Date.now();
    }

    this.hasSubmittedAction = false;
    this.actionValidationState = 'invalid';
  }

  /**
   * Clear action submission (typically at start of new round)
   */
  clearActionSubmission() {
    this.hasSubmittedAction = false;
    this.submittedAction = null;
    this.actionSubmissionTime = null;
    this.actionValidationState = 'none';

    logger.debug(
      messages.formatMessage(
        messages.serverLogMessages.debug.PlayerActionSubmissionCleared,
        { playerName: this.playerName }
      )
    );
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
   * Put an ability on cooldown
   * @param {string} abilityType - Type of ability
   * @param {number} cooldownTurns - Number of turns for cooldown
   */
  putAbilityOnCooldown(abilityType, cooldownTurns) {
    if (cooldownTurns > 0) {
      // Add 1 to the cooldown to account for the immediate countdown at end of turn
      this.abilityCooldowns[abilityType] = cooldownTurns + 1;

      logger.debug(
        messages.formatMessage(
          messages.serverLogMessages.debug.PlayerAbilityOnCooldown,
          {
            playerName: this.playerName,
            abilityType,
            turnsRemaining: this.abilityCooldowns[abilityType],
          }
        )
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
        messages.formatMessage(
          messages.serverLogMessages.debug.PlayerCooldownsExpired,
          { playerName: this.playerName, abilityNames: expiredCooldowns.join(', ') }
        )
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

    // Initialize racial effects
    this.racialEffects = {};
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
   * Set player name (for logging after reconnection)
   * @param {string} newName - New player name
   */
  setPlayerName(newName) {
    this.playerName = newName;
  }

  /**
   * Get ability damage display for UI
   * @param {Object} ability - Ability object
   * @param {number} damageMod - Player damage modifier
   * @returns {Object} Damage display information
   */
  getAbilityDamageDisplay(ability, damageMod) {
    if (!ability.params?.damage) return null;

    const baseDamage = ability.params.damage;
    const modifiedDamage = Math.floor(baseDamage * (damageMod || 1.0));

    return {
      base: baseDamage,
      modified: modifiedDamage,
      modifier: damageMod,
      showModified: baseDamage !== modifiedDamage,
      displayText:
        baseDamage === modifiedDamage
          ? messages.formatMessage(messages.ui.abilityDamageSimple, {
              damage: baseDamage,
            })
          : messages.formatMessage(messages.ui.abilityDamageModified, {
              modifiedDamage,
              baseDamage,
              modifier: damageMod?.toFixed(1) || 1.0,
            }),
    };
  }
}

module.exports = PlayerAbilities;