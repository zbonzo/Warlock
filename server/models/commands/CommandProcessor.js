/**
 * @fileoverview Command processor for executing player action commands
 * Handles command queuing, validation, execution, and coordination
 * Part of Phase 2 refactoring - Event-Driven Architecture
 */
const PlayerActionCommand = require('./PlayerActionCommand');
const AbilityCommand = require('./AbilityCommand');
const ValidationCommand = require('./ValidationCommand');
const { EventTypes } = require('../events/EventTypes');
const logger = require('@utils/logger');

/**
 * Processes and executes player action commands
 * Provides centralized command execution with validation and event integration
 */
class CommandProcessor {
  /**
   * Create a new command processor
   * @param {Object} gameRoom - Game room instance
   */
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.eventBus = gameRoom.getEventBus();
    
    // Command queues
    this.pendingCommands = new Map(); // playerId -> command queue
    this.executingCommands = new Map(); // commandId -> command
    this.completedCommands = new Map(); // commandId -> command (limited history)
    
    // Processing state
    this.isProcessing = false;
    this.maxHistorySize = 100;
    this.batchSize = 10; // Max commands to process in one batch
    
    // Statistics
    this.stats = {
      commandsProcessed: 0,
      commandsFailed: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0
    };

    // Set up event listeners
    this._setupEventListeners();
  }

  /**
   * Submit a command for processing
   * @param {PlayerActionCommand} command - Command to submit
   * @returns {Promise<string>} Command ID
   */
  async submitCommand(command) {
    if (!(command instanceof PlayerActionCommand)) {
      throw new Error('Command must be an instance of PlayerActionCommand');
    }

    const playerId = command.playerId;
    
    // Initialize player queue if needed
    if (!this.pendingCommands.has(playerId)) {
      this.pendingCommands.set(playerId, []);
    }

    // Add command to player's queue
    this.pendingCommands.get(playerId).push(command);

    // Emit command submitted event
    await this.eventBus.emit(EventTypes.ACTION.SUBMITTED, {
      playerId: command.playerId,
      actionType: command.actionType,
      targetId: command.targetId,
      abilityId: command.abilityId,
      commandId: command.id,
      timestamp: command.timestamp
    });

    logger.debug('Command submitted:', {
      commandId: command.id,
      playerId: command.playerId,
      actionType: command.actionType,
      gameCode: this.gameRoom.code
    });

    // Commands will be processed during resolution phase via event listener

    return command.id;
  }

  /**
   * Cancel a pending command
   * @param {string} commandId - ID of command to cancel
   * @returns {boolean} True if command was cancelled
   */
  cancelCommand(commandId) {
    // Find and remove from pending commands
    for (const [playerId, queue] of this.pendingCommands.entries()) {
      const commandIndex = queue.findIndex(cmd => cmd.id === commandId);
      if (commandIndex !== -1) {
        const command = queue[commandIndex];
        command.cancel();
        queue.splice(commandIndex, 1);
        
        this.eventBus.emit(EventTypes.ACTION.CANCELLED, {
          playerId: command.playerId,
          actionType: command.actionType,
          commandId: command.id,
          timestamp: new Date().toISOString()
        });

        return true;
      }
    }

    return false;
  }

  /**
   * Get command status
   * @param {string} commandId - Command ID
   * @returns {Object|null} Command status or null if not found
   */
  getCommandStatus(commandId) {
    // Check executing commands
    if (this.executingCommands.has(commandId)) {
      const command = this.executingCommands.get(commandId);
      return command.getSummary();
    }

    // Check completed commands
    if (this.completedCommands.has(commandId)) {
      const command = this.completedCommands.get(commandId);
      return command.getSummary();
    }

    // Check pending commands
    for (const queue of this.pendingCommands.values()) {
      const command = queue.find(cmd => cmd.id === commandId);
      if (command) {
        return command.getSummary();
      }
    }

    return null;
  }

  /**
   * Get pending commands for a player
   * @param {string} playerId - Player ID
   * @returns {PlayerActionCommand[]} Array of pending commands
   */
  getPendingCommands(playerId) {
    return this.pendingCommands.get(playerId) || [];
  }

  /**
   * Check if a player has submitted an action (has pending command)
   * @param {string} playerId - Player ID
   * @returns {boolean} True if player has pending command
   */
  hasPlayerSubmittedAction(playerId) {
    const commands = this.getPendingCommands(playerId);
    return commands.length > 0 && commands.some(cmd => 
      cmd.status === 'pending' && cmd.actionType === 'ability'
    );
  }

  /**
   * Get all players who have submitted actions
   * @returns {Set<string>} Set of player IDs who have submitted
   */
  getPlayersWithSubmittedActions() {
    const playersWithActions = new Set();
    for (const [playerId, commands] of this.pendingCommands.entries()) {
      if (commands.length > 0 && commands.some(cmd => 
        cmd.status === 'pending' && cmd.actionType === 'ability'
      )) {
        playersWithActions.add(playerId);
      }
    }
    return playersWithActions;
  }

  /**
   * Clear all pending commands for a player
   * @param {string} playerId - Player ID
   * @returns {number} Number of commands cleared
   */
  clearPlayerCommands(playerId) {
    const queue = this.pendingCommands.get(playerId) || [];
    const count = queue.length;
    
    // Cancel all pending commands
    queue.forEach(command => command.cancel());
    
    // Clear the queue
    this.pendingCommands.delete(playerId);
    
    return count;
  }

  /**
   * Process all pending commands
   * @returns {Promise<void>}
   */
  async processCommands() {
    if (this.isProcessing) {
      return; // Already processing
    }

    this.isProcessing = true;

    try {
      // Clear any existing pending actions in the game
      if (this.gameRoom.gamePhase) {
        this.gameRoom.gamePhase.clearPendingActions();
      }

      // Collect all pending commands across all players
      const allCommands = [];
      for (const queue of this.pendingCommands.values()) {
        allCommands.push(...queue);
      }

      if (allCommands.length === 0) {
        return;
      }

      // Sort commands by priority (highest first)
      allCommands.sort(PlayerActionCommand.comparePriority);

      // Process commands in batches
      for (let i = 0; i < allCommands.length; i += this.batchSize) {
        const batch = allCommands.slice(i, i + this.batchSize);
        await this._processBatch(batch);
      }

      // Clear processed commands from pending queues
      this._clearProcessedCommands();

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a batch of commands
   * @param {PlayerActionCommand[]} commands - Commands to process
   * @private
   */
  async _processBatch(commands) {
    const processingPromises = commands.map(command => this._processCommand(command));
    await Promise.allSettled(processingPromises);
  }

  /**
   * Process a single command
   * @param {PlayerActionCommand} command - Command to process
   * @private
   */
  async _processCommand(command) {
    const startTime = Date.now();
    
    try {
      // Move to executing state
      this.executingCommands.set(command.id, command);

      // Create game context
      const gameContext = {
        game: this.gameRoom,
        systems: this.gameRoom.systems,
        eventBus: this.eventBus
      };

      logger.debug(`Processing command for ${command.playerId}: ${command.actionType} -> ${command.targetId || 'no target'} (${command.abilityId || 'no ability'})`, {
        commandId: command.id,
        playerId: command.playerId,
        actionType: command.actionType,
        targetId: command.targetId,
        abilityId: command.abilityId,
        gameCode: this.gameRoom.code
      });

      // Validate command
      const isValid = await command.validate(gameContext);
      if (!isValid) {
        logger.error(`Command validation failed for ${command.playerId} (${command.actionType}): ${command.validationErrors.join(', ')}`, {
          commandId: command.id,
          playerId: command.playerId,
          actionType: command.actionType,
          targetId: command.targetId,
          abilityId: command.abilityId,
          validationErrors: command.validationErrors,
          gameCode: this.gameRoom.code
        });
        throw new Error(`Command validation failed: ${command.validationErrors.join(', ')}`);
      }

      logger.debug('Command validation passed:', {
        commandId: command.id,
        playerId: command.playerId,
        actionType: command.actionType,
        gameCode: this.gameRoom.code
      });

      // Execute command
      const result = await command.execute(gameContext);

      logger.debug('Command execution completed:', {
        commandId: command.id,
        playerId: command.playerId,
        actionType: command.actionType,
        result: result,
        gameCode: this.gameRoom.code
      });

      // Move to completed state
      this.executingCommands.delete(command.id);
      this._addToHistory(command);

      // Update statistics
      this.stats.commandsProcessed++;
      const executionTime = Date.now() - startTime;
      this._updateAverageExecutionTime(executionTime);

      logger.debug('Command executed successfully:', {
        commandId: command.id,
        playerId: command.playerId,
        actionType: command.actionType,
        executionTime,
        gameCode: this.gameRoom.code
      });

      return result;

    } catch (error) {
      // Handle command failure
      this.executingCommands.delete(command.id);
      this._addToHistory(command);
      this.stats.commandsFailed++;

      logger.error('Command execution failed:', {
        commandId: command.id,
        playerId: command.playerId,
        actionType: command.actionType,
        error: error.message,
        stack: error.stack,
        validationErrors: command.validationErrors,
        gameCode: this.gameRoom.code
      });

      // Emit failure event
      await this.eventBus.emit(EventTypes.ACTION.REJECTED, {
        playerId: command.playerId,
        actionType: command.actionType,
        commandId: command.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Create and submit an ability command
   * @param {string} playerId - Player ID
   * @param {string} abilityId - Ability ID
   * @param {Object} options - Command options
   * @returns {Promise<string>} Command ID
   */
  async submitAbilityCommand(playerId, abilityId, options = {}) {
    const command = new AbilityCommand(playerId, abilityId, options);
    return await this.submitCommand(command);
  }

  /**
   * Create and submit a validation command
   * @param {string} playerId - Player ID
   * @param {string} validationType - Type of validation
   * @param {Object} actionData - Data to validate
   * @param {Object} options - Validation options
   * @returns {Promise<string>} Command ID
   */
  async submitValidationCommand(playerId, validationType, actionData, options = {}) {
    const command = ValidationCommand.create(playerId, validationType, actionData, options);
    return await this.submitCommand(command);
  }

  /**
   * Create command from action data
   * @param {string} playerId - Player ID
   * @param {Object} actionData - Action data from client
   * @returns {Promise<string>} Command ID
   */
  async submitActionData(playerId, actionData) {
    let command;

    switch (actionData.actionType) {
      case 'ability':
        command = AbilityCommand.fromActionData(playerId, actionData);
        break;
      default:
        command = PlayerActionCommand.fromActionData(playerId, actionData);
        break;
    }

    return await this.submitCommand(command);
  }

  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    // Commands are now processed directly by gameService.processGameRound()
    // before the round is processed, ensuring proper timing

    // Listen for player disconnections to clear their commands
    this.eventBus.on(EventTypes.PLAYER.DISCONNECTED, (event) => {
      const clearedCount = this.clearPlayerCommands(event.data.playerId);
      if (clearedCount > 0) {
        logger.info(`Cleared ${clearedCount} commands for disconnected player:`, {
          playerId: event.data.playerId,
          gameCode: this.gameRoom.code
        });
      }
    });
  }

  /**
   * Schedule command processing
   * @private
   */
  _scheduleProcessing() {
    // Use setImmediate to process commands on next tick
    setImmediate(() => {
      if (!this.isProcessing) {
        this.processCommands().catch(error => {
          logger.error('Command processing error:', {
            error: error.message,
            gameCode: this.gameRoom.code
          });
        });
      }
    });
  }

  /**
   * Clear processed commands from pending queues
   * @private
   */
  _clearProcessedCommands() {
    for (const [playerId, queue] of this.pendingCommands.entries()) {
      // Remove completed and failed commands
      const remainingCommands = queue.filter(cmd => 
        cmd.status === 'pending' || cmd.status === 'executing'
      );
      
      if (remainingCommands.length === 0) {
        this.pendingCommands.delete(playerId);
      } else {
        this.pendingCommands.set(playerId, remainingCommands);
      }
    }
  }

  /**
   * Add command to history
   * @param {PlayerActionCommand} command - Command to add
   * @private
   */
  _addToHistory(command) {
    this.completedCommands.set(command.id, command);

    // Trim history if too large
    if (this.completedCommands.size > this.maxHistorySize) {
      const oldestKey = this.completedCommands.keys().next().value;
      this.completedCommands.delete(oldestKey);
    }
  }

  /**
   * Update average execution time
   * @param {number} executionTime - Time in milliseconds
   * @private
   */
  _updateAverageExecutionTime(executionTime) {
    this.stats.totalExecutionTime += executionTime;
    this.stats.averageExecutionTime = this.stats.totalExecutionTime / this.stats.commandsProcessed;
  }

  /**
   * Get processor statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      pendingCommands: Array.from(this.pendingCommands.values()).reduce((sum, queue) => sum + queue.length, 0),
      executingCommands: this.executingCommands.size,
      completedCommands: this.completedCommands.size,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Clean up processor resources
   */
  destroy() {
    // Cancel all pending commands
    for (const queue of this.pendingCommands.values()) {
      queue.forEach(command => command.cancel());
    }

    // Clear all collections
    this.pendingCommands.clear();
    this.executingCommands.clear();
    this.completedCommands.clear();

    // Reset processing state
    this.isProcessing = false;
  }
}

module.exports = CommandProcessor;