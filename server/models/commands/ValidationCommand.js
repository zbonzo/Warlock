/**
 * @fileoverview Validation command for centralized action validation
 * Provides reusable validation logic for various game actions
 * Part of Phase 2 refactoring - Event-Driven Architecture
 */
const PlayerActionCommand = require('./PlayerActionCommand');
const { EventTypes } = require('../events/EventTypes');
const logger = require('@utils/logger');

/**
 * Command for performing validation checks
 * Used for validating actions before they're executed
 */
class ValidationCommand extends PlayerActionCommand {
  /**
   * Create a new validation command
   * @param {string} playerId - ID of the player whose action is being validated
   * @param {string} validationType - Type of validation to perform
   * @param {Object} options - Validation options
   * @param {Object} options.actionData - Data for the action being validated
   * @param {string[]} options.validationRules - Specific validation rules to apply
   * @param {boolean} options.strict - Whether to fail on warnings
   */
  constructor(playerId, validationType, options = {}) {
    super(playerId, 'validation', {
      ...options,
      canUndo: false,
      priority: 100 // High priority for validation
    });
    
    this.validationType = validationType;
    this.actionData = options.actionData || {};
    this.validationRules = options.validationRules || [];
    this.strict = options.strict || false;
    this.validationResults = {
      passed: [],
      failed: [],
      warnings: [],
      score: 0 // Validation score (0-100)
    };
  }

  /**
   * Validate the validation request itself
   * @param {Object} gameContext - Current game context
   * @returns {Promise<boolean>} True if validation request is valid
   * @protected
   */
  async _validateAction(gameContext) {
    if (!this.validationType) {
      this.validationErrors.push('Validation type is required');
      return;
    }

    if (!this._isValidValidationType(this.validationType)) {
      this.validationErrors.push(`Unknown validation type: ${this.validationType}`);
      return;
    }

    const player = gameContext.game.getPlayerById(this.playerId);
    if (!player) {
      this.validationErrors.push(`Player ${this.playerId} not found`);
      return;
    }
  }

  /**
   * Execute the validation
   * @param {Object} gameContext - Current game context
   * @returns {Promise<Object>} Validation results
   * @protected
   */
  async _executeAction(gameContext) {
    const { game } = gameContext;
    
    try {
      switch (this.validationType) {
        case 'action_submission':
          await this._validateActionSubmission(gameContext);
          break;
        case 'game_state':
          await this._validateGameState(gameContext);
          break;
        case 'player_readiness':
          await this._validatePlayerReadiness(gameContext);
          break;
        case 'phase_transition':
          await this._validatePhaseTransition(gameContext);
          break;
        case 'ability_usage':
          await this._validateAbilityUsage(gameContext);
          break;
        case 'target_selection':
          await this._validateTargetSelection(gameContext);
          break;
        default:
          throw new Error(`Unhandled validation type: ${this.validationType}`);
      }

      // Calculate validation score
      this._calculateValidationScore();

      // Emit validation completed event
      await game.emitEvent(EventTypes.ACTION.VALIDATED, {
        playerId: this.playerId,
        validationType: this.validationType,
        results: this.validationResults,
        timestamp: new Date().toISOString()
      });

      return {
        validationType: this.validationType,
        results: this.validationResults,
        isValid: this._isValidationSuccessful(),
        score: this.validationResults.score
      };

    } catch (error) {
      this.validationResults.failed.push({
        rule: 'validation_execution',
        message: `Validation execution failed: ${error.message}`,
        severity: 'error'
      });

      throw error;
    }
  }

  /**
   * Validate action submission
   * @param {Object} gameContext - Game context
   * @private
   */
  async _validateActionSubmission(gameContext) {
    const { game } = gameContext;
    const player = game.getPlayerById(this.playerId);
    const { actionType, targetId, abilityId } = this.actionData;

    // Check if player can submit actions
    this._checkRule('player_alive', player.isAlive, 'Dead players cannot submit actions');
    this._checkRule('game_started', game.started, 'Game must be started to submit actions');
    this._checkRule('action_phase', game.phase === 'action', 'Actions can only be submitted during action phase');
    
    // Check if player already submitted an action
    if (game.gamePhase) {
      const hasSubmitted = game.gamePhase.hasPlayerSubmittedAction(this.playerId);
      this._checkRule('no_duplicate_actions', !hasSubmitted, 'Player has already submitted an action this turn');
    }

    // Validate action type
    this._checkRule('valid_action_type', this._isValidActionType(actionType), `Invalid action type: ${actionType}`);

    // Validate target if specified
    if (targetId) {
      await this._validateTarget(gameContext, targetId);
    }

    // Validate ability if specified
    if (abilityId) {
      await this._validatePlayerAbility(gameContext, abilityId);
    }
  }

  /**
   * Validate game state consistency
   * @param {Object} gameContext - Game context
   * @private
   */
  async _validateGameState(gameContext) {
    const { game } = gameContext;

    // Validate player count
    const playerCount = game.players.size;
    this._checkRule('min_players', playerCount >= 3, `Need at least 3 players (have ${playerCount})`);
    this._checkRule('max_players', playerCount <= 10, `Too many players (max 10, have ${playerCount})`);

    // Validate alive player count
    const aliveCount = Array.from(game.players.values()).filter(p => p.isAlive).length;
    this._checkRule('alive_players_exist', aliveCount > 0, 'No alive players remaining');

    // Validate monster state
    if (game.monster) {
      this._checkRule('monster_health_valid', game.monster.hp >= 0, 'Monster health cannot be negative');
      this._checkRule('monster_health_max', game.monster.hp <= game.monster.maxHp, 'Monster health exceeds maximum');
    }

    // Validate game phase
    const validPhases = ['waiting', 'preparation', 'action', 'resolution', 'ended'];
    this._checkRule('valid_phase', validPhases.includes(game.phase), `Invalid game phase: ${game.phase}`);

    // Validate round and level
    this._checkRule('valid_round', game.round >= 1, `Invalid round number: ${game.round}`);
    this._checkRule('valid_level', game.level >= 1, `Invalid level: ${game.level}`);
  }

  /**
   * Validate player readiness for game start
   * @param {Object} gameContext - Game context
   * @private
   */
  async _validatePlayerReadiness(gameContext) {
    const { game } = gameContext;
    const player = game.getPlayerById(this.playerId);

    // Check if player can be ready
    this._checkRule('player_exists', !!player, 'Player not found');
    this._checkRule('game_not_started', !game.started, 'Cannot change readiness after game starts');

    if (player) {
      // Check if player has selected race and class
      this._checkRule('race_selected', !!player.race, 'Player must select a race');
      this._checkRule('class_selected', !!player.class, 'Player must select a class');
      
      // Validate race/class combination
      if (player.race && player.class) {
        const isValidCombo = this._isValidRaceClassCombo(player.race, player.class);
        this._checkRule('valid_race_class_combo', isValidCombo, `Invalid race/class combination: ${player.race}/${player.class}`);
      }

      // Check if player has abilities assigned
      this._checkRule('abilities_assigned', player.abilities && player.abilities.length > 0, 'Player must have abilities assigned');
    }
  }

  /**
   * Validate phase transition
   * @param {Object} gameContext - Game context
   * @private
   */
  async _validatePhaseTransition(gameContext) {
    const { game } = gameContext;
    const { fromPhase, toPhase } = this.actionData;

    // Validate current phase matches expected from phase
    this._checkRule('current_phase_match', game.phase === fromPhase, `Expected phase ${fromPhase}, but game is in ${game.phase}`);

    // Validate transition is allowed
    const validTransitions = {
      'waiting': ['preparation'],
      'preparation': ['action'],
      'action': ['resolution'],
      'resolution': ['action', 'ended'],
      'ended': []
    };

    const allowedNext = validTransitions[fromPhase] || [];
    this._checkRule('valid_transition', allowedNext.includes(toPhase), `Cannot transition from ${fromPhase} to ${toPhase}`);

    // Check specific transition requirements
    if (fromPhase === 'preparation' && toPhase === 'action') {
      const allReady = Array.from(game.players.values()).every(p => p.isReady);
      this._checkRule('all_players_ready', allReady, 'All players must be ready to start action phase');
    }

    if (fromPhase === 'action' && toPhase === 'resolution') {
      if (game.gamePhase) {
        const allSubmitted = game.gamePhase.haveAllPlayersSubmitted();
        this._checkRule('all_actions_submitted', allSubmitted, 'All alive players must submit actions before resolution');
      }
    }
  }

  /**
   * Validate ability usage
   * @param {Object} gameContext - Game context
   * @private
   */
  async _validateAbilityUsage(gameContext) {
    const { abilityId } = this.actionData;
    await this._validatePlayerAbility(gameContext, abilityId);
  }

  /**
   * Validate target selection
   * @param {Object} gameContext - Game context
   * @private
   */
  async _validateTargetSelection(gameContext) {
    const { targetId } = this.actionData;
    await this._validateTarget(gameContext, targetId);
  }

  /**
   * Validate a target
   * @param {Object} gameContext - Game context
   * @param {string} targetId - Target ID to validate
   * @private
   */
  async _validateTarget(gameContext, targetId) {
    const { game } = gameContext;

    if (targetId === 'monster') {
      this._checkRule('monster_exists', !!game.monster, 'Monster does not exist');
      if (game.monster) {
        this._checkRule('monster_alive', game.monster.isAlive, 'Cannot target dead monster');
      }
    } else {
      const target = game.getPlayerById(targetId);
      this._checkRule('target_exists', !!target, `Target player ${targetId} not found`);
      if (target) {
        this._checkRule('target_in_game', game.players.has(targetId), 'Target is not in this game');
        // Note: Some abilities can target dead players, so we don't always check if target is alive
      }
    }
  }

  /**
   * Validate player ability
   * @param {Object} gameContext - Game context
   * @param {string} abilityId - Ability ID to validate
   * @private
   */
  async _validatePlayerAbility(gameContext, abilityId) {
    const { game } = gameContext;
    const player = game.getPlayerById(this.playerId);

    if (!player) return;

    // Check if player has the ability
    const hasAbility = player.abilities && player.abilities.some(a => a.id === abilityId);
    this._checkRule('player_has_ability', hasAbility, `Player does not have ability: ${abilityId}`);

    // Check if ability is unlocked
    const isUnlocked = player.unlocked && player.unlocked.some(a => a.id === abilityId);
    this._checkRule('ability_unlocked', isUnlocked, `Ability ${abilityId} is not unlocked`);

    // Check cooldown
    if (player.playerAbilities) {
      const onCooldown = player.playerAbilities.isAbilityOnCooldown(abilityId);
      this._checkRule('ability_not_on_cooldown', !onCooldown, `Ability ${abilityId} is on cooldown`);
    }
  }

  /**
   * Check a validation rule
   * @param {string} ruleName - Name of the rule
   * @param {boolean} condition - Whether the rule passes
   * @param {string} message - Error message if rule fails
   * @param {string} severity - Severity level (error, warning, info)
   * @private
   */
  _checkRule(ruleName, condition, message, severity = 'error') {
    if (this.validationRules.length > 0 && !this.validationRules.includes(ruleName)) {
      return; // Skip rules not in the specified list
    }

    const result = {
      rule: ruleName,
      message,
      severity
    };

    if (condition) {
      this.validationResults.passed.push(result);
    } else {
      if (severity === 'warning') {
        this.validationResults.warnings.push(result);
      } else {
        this.validationResults.failed.push(result);
      }
    }
  }

  /**
   * Calculate validation score based on results
   * @private
   */
  _calculateValidationScore() {
    const totalRules = this.validationResults.passed.length + 
                      this.validationResults.failed.length + 
                      this.validationResults.warnings.length;
    
    if (totalRules === 0) {
      this.validationResults.score = 100;
      return;
    }

    const passedWeight = 1;
    const warningWeight = 0.5;
    const failedWeight = 0;

    const score = (
      (this.validationResults.passed.length * passedWeight) +
      (this.validationResults.warnings.length * warningWeight) +
      (this.validationResults.failed.length * failedWeight)
    ) / totalRules * 100;

    this.validationResults.score = Math.round(score);
  }

  /**
   * Check if validation was successful
   * @returns {boolean} True if validation passed
   * @private
   */
  _isValidationSuccessful() {
    const hasCriticalFailures = this.validationResults.failed.length > 0;
    const hasWarnings = this.validationResults.warnings.length > 0;
    
    return !hasCriticalFailures && (!this.strict || !hasWarnings);
  }

  /**
   * Check if validation type is valid
   * @param {string} type - Validation type
   * @returns {boolean} True if valid
   * @private
   */
  _isValidValidationType(type) {
    const validTypes = [
      'action_submission',
      'game_state',
      'player_readiness',
      'phase_transition',
      'ability_usage',
      'target_selection'
    ];
    return validTypes.includes(type);
  }

  /**
   * Check if action type is valid
   * @param {string} actionType - Action type
   * @returns {boolean} True if valid
   * @private
   */
  _isValidActionType(actionType) {
    const validTypes = ['ability', 'defend', 'spectate', 'ready', 'not_ready'];
    return validTypes.includes(actionType);
  }

  /**
   * Check if race/class combination is valid
   * @param {string} race - Player race
   * @param {string} cls - Player class
   * @returns {boolean} True if valid combination
   * @private
   */
  _isValidRaceClassCombo(race, cls) {
    // This would typically check against game configuration
    // For now, assume all combinations are valid unless specifically prohibited
    const prohibitedCombos = [
      // Add any prohibited combinations here
    ];
    
    return !prohibitedCombos.some(combo => combo.race === race && combo.class === cls);
  }

  /**
   * Create validation command from validation request
   * @param {string} playerId - Player ID
   * @param {string} validationType - Type of validation
   * @param {Object} actionData - Data to validate
   * @param {Object} options - Validation options
   * @returns {ValidationCommand} Validation command instance
   */
  static create(playerId, validationType, actionData, options = {}) {
    return new ValidationCommand(playerId, validationType, {
      actionData,
      ...options
    });
  }
}

module.exports = ValidationCommand;