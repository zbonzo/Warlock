/**
 * @fileoverview Command processor for executing player action commands with TypeScript
 * Handles command queuing, validation, execution, and coordination
 * Part of Phase 4 refactoring - TypeScript Migration with strong typing for command processing
 */
import { PlayerActionCommand, GameContext, CommandSummary } from './PlayerActionCommand.js';
import { AbilityCommand } from './AbilityCommand.js';
import ValidationCommand, { ValidationType } from './ValidationCommand.js';
import { EventTypes } from '../events/EventTypes.js';

import logger from '../../utils/logger.js';

/**
 * Command processor statistics
 */
export interface ProcessorStats {
  commandsProcessed: number;
  commandsFailed: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  pendingCommands: number;
  executingCommands: number;
  completedCommands: number;
  isProcessing: boolean;
}

import type { GameRoom } from '../GameRoom.js';

/**
 * Processes and executes player action commands
 * Provides centralized command execution with validation and event integration
 */
export class CommandProcessor {
  private gameRoom: GameRoom;
  private eventBus: any;
  
  // Command queues
  private pendingCommands: Map<string, PlayerActionCommand[]> = new Map();
  private executingCommands: Map<string, PlayerActionCommand> = new Map();
  private completedCommands: Map<string, PlayerActionCommand> = new Map();
  
  // Processing state
  private isProcessing: boolean = false;
  private readonly maxHistorySize: number = 100;
  private readonly batchSize: number = 10; // Max commands to process in one batch
  
  // Statistics
  private stats = {
    commandsProcessed: 0,
    commandsFailed: 0,
    averageExecutionTime: 0,
    totalExecutionTime: 0
  };

  /**
   * Create a new command processor
   * @param gameRoom - Game room instance
   */
  constructor(gameRoom: GameRoom) {
    this.gameRoom = gameRoom;
    this.eventBus = gameRoom.eventBus;

    // Set up event listeners
    this._setupEventListeners();
  }

  /**
   * Submit a command for processing
   * @param command - Command to submit
   * @returns Command ID
   */
  async submitCommand(command: PlayerActionCommand): Promise<string> {
    if (!(command instanceof PlayerActionCommand)) {
      throw new Error('Command must be an instance of PlayerActionCommand');
    }

    const playerId = command.playerId;
    
    // Initialize player queue if needed
    if (!this.pendingCommands.has(playerId)) {
      this.pendingCommands.set(playerId, []);
    }

    // Add command to player's queue
    this.pendingCommands.get(playerId)!.push(command);

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

    return command.id;
  }

  /**
   * Cancel a pending command
   * @param commandId - ID of command to cancel
   * @returns True if command was cancelled
   */
  cancelCommand(commandId: string): boolean {
    // Find and remove from pending commands
    for (const [playerId, queue] of this.pendingCommands.entries()) {
      const commandIndex = queue.findIndex(cmd => cmd.id === commandId);
      if (commandIndex !== -1) {
        const command = queue[commandIndex];
        if (command) {
          command.cancel();
          queue.splice(commandIndex, 1);
          
          this.eventBus.emit(EventTypes.ACTION.CANCELLED, {
            playerId: command.playerId,
            actionType: command.actionType,
            commandId: command.id,
            timestamp: new Date().toISOString()
          });
        }

        return true;
      }
    }

    return false;
  }

  /**
   * Get command status
   * @param commandId - Command ID
   * @returns Command status or null if not found
   */
  getCommandStatus(commandId: string): CommandSummary | null {
    // Check executing commands
    if (this.executingCommands.has(commandId)) {
      const command = this.executingCommands.get(commandId)!;
      return command.getSummary();
    }

    // Check completed commands
    if (this.completedCommands.has(commandId)) {
      const command = this.completedCommands.get(commandId)!;
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
   * @param playerId - Player ID
   * @returns Array of pending commands
   */
  getPendingCommands(playerId: string): PlayerActionCommand[] {
    return this.pendingCommands.get(playerId) || [];
  }

  /**
   * Check if a player has submitted an action (has pending command)
   * @param playerId - Player ID
   * @returns True if player has pending command
   */
  hasPlayerSubmittedAction(playerId: string): boolean {
    const commands = this.getPendingCommands(playerId);
    return commands.length > 0 && commands.some(cmd => 
      cmd.status === 'pending' && cmd.actionType === 'ability'
    );
  }

  /**
   * Get all players who have submitted actions
   * @returns Set of player IDs who have submitted
   */
  getPlayersWithSubmittedActions(): Set<string> {
    const playersWithActions = new Set<string>();
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
   * @param playerId - Player ID
   * @returns Number of commands cleared
   */
  clearPlayerCommands(playerId: string): number {
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
   */
  async processCommands(): Promise<void> {
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
      const allCommands: PlayerActionCommand[] = [];
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
   * @param commands - Commands to process
   * @private
   */
  private async _processBatch(commands: PlayerActionCommand[]): Promise<void> {
    const processingPromises = commands.map(command => this._processCommand(command));
    await Promise.allSettled(processingPromises);
  }

  /**
   * Process a single command
   * @param command - Command to process
   * @private
   */
  private async _processCommand(command: PlayerActionCommand): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Move to executing state
      this.executingCommands.set(command.id, command);

      // Create game context
      const gameContext: GameContext = {
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

    } catch (error: any) {
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
   * @param playerId - Player ID
   * @param abilityId - Ability ID
   * @param options - Command options
   * @returns Command ID
   */
  async submitAbilityCommand(playerId: string, abilityId: string, options: Record<string, unknown> = {}): Promise<string> {
    const command = new AbilityCommand(playerId, abilityId, options);
    return await this.submitCommand(command);
  }

  /**
   * Create and submit a validation command
   * @param playerId - Player ID
   * @param validationType - Type of validation
   * @param actionData - Data to validate
   * @param options - Validation options
   * @returns Command ID
   */
  async submitValidationCommand(playerId: string, validationType: ValidationType, actionData: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<string> {
    const command = ValidationCommand.create(playerId, validationType, actionData, options);
    return await this.submitCommand(command);
  }

  /**
   * Create command from action data
   * @param playerId - Player ID
   * @param actionData - Action data from client
   * @returns Command ID
   */
  async submitActionData(playerId: string, actionData: Record<string, unknown>): Promise<string> {
    let command: PlayerActionCommand;

    switch (actionData['actionType']) {
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
  private _setupEventListeners(): void {
    // Commands are now processed directly by gameService.processGameRound()
    // before the round is processed, ensuring proper timing

    // Listen for player disconnections to clear their commands
    this.eventBus.on(EventTypes.PLAYER.DISCONNECTED, (event: any) => {
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
   * Clear processed commands from pending queues
   * @private
   */
  private _clearProcessedCommands(): void {
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
   * @param command - Command to add
   * @private
   */
  private _addToHistory(command: PlayerActionCommand): void {
    this.completedCommands.set(command.id, command);

    // Trim history if too large
    if (this.completedCommands.size > this.maxHistorySize) {
      const oldestKey = this.completedCommands.keys().next().value;
      if (oldestKey !== undefined) {
        this.completedCommands.delete(oldestKey);
      }
    }
  }

  /**
   * Update average execution time
   * @param executionTime - Time in milliseconds
   * @private
   */
  private _updateAverageExecutionTime(executionTime: number): void {
    this.stats.totalExecutionTime += executionTime;
    this.stats.averageExecutionTime = this.stats.totalExecutionTime / this.stats.commandsProcessed;
  }

  /**
   * Get processor statistics
   * @returns Statistics object
   */
  getStats(): ProcessorStats {
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
  destroy(): void {
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

// ES module export
export default CommandProcessor;