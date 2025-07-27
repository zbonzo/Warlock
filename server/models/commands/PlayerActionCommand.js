/**
 * @fileoverview Base class for player action commands
 * Implements command pattern for encapsulating player actions
 * Part of Phase 2 refactoring - Event-Driven Architecture
 */
const { EventTypes } = require('../events/EventTypes');
const logger = require('@utils/logger');

/**
 * Base class for all player action commands
 * Encapsulates player actions with validation, execution, and rollback capabilities
 */
class PlayerActionCommand {
  /**
   * Create a new player action command
   * @param {string} playerId - ID of the player executing the action
   * @param {string} actionType - Type of action (attack, heal, defend, etc.)
   * @param {Object} options - Command options
   * @param {string} options.targetId - ID of the target (if applicable)
   * @param {string} options.abilityId - ID of the ability being used (if applicable)
   * @param {Object} options.metadata - Additional action metadata
   * @param {number} options.priority - Command execution priority (higher = earlier)
   * @param {boolean} options.canUndo - Whether this command can be undone
   */
  constructor(playerId, actionType, options = {}) {
    this.playerId = playerId;
    this.actionType = actionType;
    this.targetId = options.targetId || null;
    this.abilityId = options.abilityId || null;
    this.metadata = options.metadata || {};
    this.priority = options.priority || 0;
    this.canUndo = options.canUndo || false;
    
    // Command state tracking
    this.id = this._generateCommandId();
    this.status = 'pending'; // pending, executing, completed, failed, cancelled
    this.timestamp = new Date().toISOString();
    this.executionTime = null;
    this.result = null;
    this.error = null;
    this.undoData = null; // Data needed to undo the command
    
    // Validation state
    this.validationErrors = [];
    this.validationWarnings = [];
    this.isValidated = false;
  }

  /**
   * Validate the command before execution
   * @param {Object} gameContext - Current game context (game room, systems, etc.)
   * @returns {Promise<boolean>} True if command is valid
   */
  async validate(gameContext) {
    this.validationErrors = [];
    this.validationWarnings = [];
    
    try {
      // Basic validation
      if (!this.playerId) {
        this.validationErrors.push('Player ID is required');
      }
      
      if (!this.actionType) {
        this.validationErrors.push('Action type is required');
      }

      // Get player from game context
      const player = gameContext.game.getPlayerById(this.playerId);
      if (!player) {
        this.validationErrors.push(`Player ${this.playerId} not found`);
        return false;
      }

      // Check if player is alive (for most actions)
      if (!player.isAlive && this.actionType !== 'spectate') {
        this.validationErrors.push('Dead players cannot perform actions');
      }

      // Check game phase (most actions require action phase)
      if (gameContext.game.phase !== 'action' && !this._isPhaseIndependentAction()) {
        this.validationErrors.push(`Cannot perform ${this.actionType} during ${gameContext.game.phase} phase`);
      }

      // Validate target if specified
      if (this.targetId && this.targetId !== 'monster') {
        const target = gameContext.game.getPlayerById(this.targetId);
        if (!target) {
          this.validationErrors.push(`Target ${this.targetId} not found`);
        }
      }

      // Call subclass validation
      await this._validateAction(gameContext);

      this.isValidated = this.validationErrors.length === 0;
      return this.isValidated;
    } catch (error) {
      this.validationErrors.push(`Validation error: ${error.message}`);
      logger.error('Command validation error:', {
        commandId: this.id,
        playerId: this.playerId,
        actionType: this.actionType,
        error: error.message,
        validationErrors: this.validationErrors
      });
      return false;
    }
  }

  /**
   * Execute the command
   * @param {Object} gameContext - Current game context
   * @returns {Promise<Object>} Execution result
   */
  async execute(gameContext) {
    if (!this.isValidated) {
      throw new Error('Command must be validated before execution');
    }

    if (this.validationErrors.length > 0) {
      throw new Error(`Cannot execute invalid command: ${this.validationErrors.join(', ')}`);
    }

    this.status = 'executing';
    const startTime = Date.now();

    try {
      // Emit action submitted event
      await gameContext.game.emitEvent(EventTypes.ACTION.SUBMITTED, {
        playerId: this.playerId,
        actionType: this.actionType,
        targetId: this.targetId,
        abilityId: this.abilityId,
        metadata: this.metadata,
        timestamp: this.timestamp
      });

      // Execute the actual command logic
      this.result = await this._executeAction(gameContext);

      // Store undo data if command supports undo
      if (this.canUndo) {
        this.undoData = await this._captureUndoData(gameContext);
      }

      this.status = 'completed';
      this.executionTime = Date.now() - startTime;

      // Emit action executed event
      await gameContext.game.emitEvent(EventTypes.ACTION.EXECUTED, {
        playerId: this.playerId,
        actionType: this.actionType,
        targetId: this.targetId,
        abilityId: this.abilityId,
        result: this.result,
        executionTime: this.executionTime,
        timestamp: new Date().toISOString()
      });

      return this.result;
    } catch (error) {
      this.status = 'failed';
      this.error = error.message;
      this.executionTime = Date.now() - startTime;

      // Emit action failed event
      await gameContext.game.emitEvent(EventTypes.ACTION.REJECTED, {
        playerId: this.playerId,
        actionType: this.actionType,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      logger.error('Command execution failed:', {
        commandId: this.id,
        playerId: this.playerId,
        actionType: this.actionType,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Undo the command (if supported)
   * @param {Object} gameContext - Current game context
   * @returns {Promise<boolean>} True if successfully undone
   */
  async undo(gameContext) {
    if (!this.canUndo) {
      throw new Error('Command does not support undo');
    }

    if (this.status !== 'completed') {
      throw new Error('Can only undo completed commands');
    }

    if (!this.undoData) {
      throw new Error('No undo data available');
    }

    try {
      await this._undoAction(gameContext);
      this.status = 'cancelled';
      
      // Emit action cancelled event
      await gameContext.game.emitEvent(EventTypes.ACTION.CANCELLED, {
        playerId: this.playerId,
        actionType: this.actionType,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      logger.error('Command undo failed:', {
        commandId: this.id,
        playerId: this.playerId,
        actionType: this.actionType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cancel the command before execution
   */
  cancel() {
    if (this.status === 'executing') {
      throw new Error('Cannot cancel command that is currently executing');
    }
    
    this.status = 'cancelled';
  }

  /**
   * Get command summary for logging/debugging
   * @returns {Object} Command summary
   */
  getSummary() {
    return {
      id: this.id,
      playerId: this.playerId,
      actionType: this.actionType,
      targetId: this.targetId,
      abilityId: this.abilityId,
      status: this.status,
      timestamp: this.timestamp,
      executionTime: this.executionTime,
      priority: this.priority,
      validationErrors: this.validationErrors,
      validationWarnings: this.validationWarnings,
      canUndo: this.canUndo
    };
  }

  // Protected methods for subclasses to override

  /**
   * Subclass-specific validation logic
   * @param {Object} gameContext - Current game context
   * @protected
   */
  async _validateAction(gameContext) {
    // Override in subclasses
  }

  /**
   * Subclass-specific execution logic
   * @param {Object} gameContext - Current game context
   * @returns {Promise<Object>} Execution result
   * @protected
   */
  async _executeAction(gameContext) {
    throw new Error('_executeAction must be implemented by subclass');
  }

  /**
   * Capture data needed to undo this command
   * @param {Object} gameContext - Current game context
   * @returns {Promise<Object>} Undo data
   * @protected
   */
  async _captureUndoData(gameContext) {
    return null; // Override in subclasses that support undo
  }

  /**
   * Undo the action using captured undo data
   * @param {Object} gameContext - Current game context
   * @protected
   */
  async _undoAction(gameContext) {
    throw new Error('_undoAction must be implemented by subclass if canUndo is true');
  }

  /**
   * Check if this action can be performed regardless of game phase
   * @returns {boolean} True if phase-independent
   * @protected
   */
  _isPhaseIndependentAction() {
    const phaseIndependentActions = ['spectate', 'chat', 'ready', 'not_ready'];
    return phaseIndependentActions.includes(this.actionType);
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command ID
   * @private
   */
  _generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Static helper methods

  /**
   * Create a command from action data
   * @param {string} playerId - Player ID
   * @param {Object} actionData - Action data from client
   * @returns {PlayerActionCommand} Appropriate command instance
   */
  static fromActionData(playerId, actionData) {
    const { actionType, targetId, abilityId, metadata } = actionData;
    
    // This will be expanded as we add specific command types
    return new PlayerActionCommand(playerId, actionType, {
      targetId,
      abilityId,
      metadata
    });
  }

  /**
   * Compare commands for priority sorting
   * @param {PlayerActionCommand} a - First command
   * @param {PlayerActionCommand} b - Second command
   * @returns {number} Sort comparison result
   */
  static comparePriority(a, b) {
    // Higher priority first, then by timestamp for tie-breaking
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return new Date(a.timestamp) - new Date(b.timestamp);
  }
}

module.exports = PlayerActionCommand;