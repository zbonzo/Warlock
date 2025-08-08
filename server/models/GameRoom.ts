/**
 * @fileoverview TypeScript GameRoom model with enhanced action submission and validation
 * Phase 5: Controllers & Main Classes Migration
 * Manages game state, players, and coordinates systems with proper cooldown timing
 * Refactored to use composition with domain models for better separation of concerns
 */

import { Player } from './Player.js';
import config from '../config/index.js';
import { SystemsFactory } from './systems/SystemsFactory.js';
import logger from '../utils/logger.js';
import { getCurrentTimestamp } from '../utils/timestamp.js';
// Messages are now accessed through the config system
import { GameState, DisconnectedPlayer } from './game/GameState.js';
import { GamePhase, GamePhaseType } from './game/GamePhase.js';
import { GameRules } from './game/GameRules.js';
import { GameEventBus } from './events/GameEventBus.js';
import { EventMiddleware } from './events/EventMiddleware.js';
import { EventTypes, GameEvent } from './events/EventTypes.js';
import { CommandProcessor } from './commands/CommandProcessor.js';
import SocketEventRouter from './events/SocketEventRouter.js';
import {
  GameState as GameStateType,
  GameCode,
  PlayerAction,
  GamePhase as GamePhaseEnum,
  Monster,
  GameRules as GameRulesType,
  ActionResult,
  ValidationResult,
  Schemas
} from '../types/generated.js';
import { Server as SocketIOServer } from 'socket.io';
import { createDebugLogger } from '../config/debug.config.js';

export interface AddPlayerResult {
  success: boolean;
  player?: Player;
  error?: string;
}

export interface GameRoomOptions {
  maxPlayers?: number;
  allowSpectators?: boolean;
  timeLimit?: number;
}

export interface PlayerActionData {
  playerId: string;
  actionType: string;
  targetId?: string;
  additionalData?: Record<string, any>;
}

export interface GameStats {
  playersCount: number;
  aliveCount: number;
  round: number;
  level: number;
  phase: GamePhaseEnum;
  isStarted: boolean;
  isEnded: boolean;
}

/**
 * GameRoom class represents a single game instance with enhanced action validation
 * Manages game state, players, and coordinating game systems
 */
export class GameRoom {
  public readonly code: GameCode;

  // Domain models for better separation of concerns
  public readonly gameState: GameState;
  public readonly gamePhase: GamePhase;
  public readonly gameRules: GameRules;

  // Delegated properties (defined via Object.defineProperty in setupPropertyDelegation)
  public players!: Map<string, Player>;
  public hostId!: string | null;
  public started!: boolean;
  public round!: number;
  public level!: number;
  public aliveCount!: number;
  public disconnectedPlayers!: DisconnectedPlayer[];
  public monster!: Monster;
  public phase!: GamePhaseEnum;
  public pendingActions!: Map<string, any>;
  public pendingRacialActions!: Map<string, any>;
  public nextReady!: boolean;
  public ended!: boolean;
  public winner!: string | null;
  public created!: number;
  public startTime!: number | null;

  // Event system (Phase 4 enhancement)
  public readonly eventBus: GameEventBus;
  public readonly commandProcessor: CommandProcessor | null;

  // Socket event router
  public socketEventRouter: SocketEventRouter | null = null;

  // Direct socket.io server reference (temporary for pragmatic approach)
  public io: SocketIOServer | null = null;

  // Systems (initialized when game starts)
  public systems: any = null;

  // Debug loggers
  private combatDebug = createDebugLogger('combat', 'GameRoom:Combat');
  private roundResultsDebug = createDebugLogger('roundResults', 'GameRoom:RoundResults');
  private phaseDebug = createDebugLogger('phaseTransitions', 'GameRoom:Phase');


  constructor(code: GameCode, options: GameRoomOptions = {}) {
    this.code = code;

    // Initialize domain models
    this.gameState = new GameState(code);
    this.gamePhase = new GamePhase(code);
    this.gameRules = new GameRules(code);

    // Initialize event system
    this.eventBus = new GameEventBus(code);
    // TODO: Re-enable event middleware once core functionality is working
    // this.setupEventMiddleware();

    // Initialize command system
    // TODO: Re-enable CommandProcessor once core functionality is working
    // this.commandProcessor = new CommandProcessor(this);
    this.commandProcessor = null; // Temporary placeholder

    // Initialize monster from config
    (this.gameState as any).initializeMonster(config as any);

    // Set up property delegation for backward compatibility
    this.setupPropertyDelegation();

    // Set up event listeners for this game room
    this.setupEventListeners();

    // Emit game creation event
    this.eventBus.emit((EventTypes as any).GAME.CREATED, {
      gameCode: code,
      createdBy: 'system',
      timestamp: new Date().toISOString()
    } as any);
  }

  /**
   * Set up event middleware for the game room
   */
  private setupEventMiddleware(): void {
    // Add logging middleware
    this.eventBus.addMiddleware(EventMiddleware.logging({ logData: true }));

    // Add validation middleware
    this.eventBus.addMiddleware(EventMiddleware.validation({ strict: true }));

    // Add performance monitoring middleware
    this.eventBus.addMiddleware(EventMiddleware.performance({ slowEventThreshold: 1000 }));
  }

  /**
   * Set up property delegation for backward compatibility
   */
  private setupPropertyDelegation(): void {
    // Delegate GameState properties
    Object.defineProperty(this, 'players', {
      get: () => this.gameState.getPlayersMap(),
      set: (value: Map<string, Player>) => { this.gameState.setPlayersMap(value as any); },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'hostId', {
      get: () => this.gameState.getHostId(),
      set: (value: string | null) => {
        this.gameState.setHostId(value);
      },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'started', {
      get: () => this.gameState.hasStarted(),
      set: (value: boolean) => { this.gameState.setStarted(value); },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'round', {
      get: () => this.gameState.getRound(),
      set: (value: number) => { this.gameState.setRound(value); },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'level', {
      get: () => this.gameState.getLevel(),
      set: (value: number) => { this.gameState.setLevel(value); },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'aliveCount', {
      get: () => this.gameState.getAliveCount(),
      set: (value: number) => { this.gameState.setAliveCount(value); },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'disconnectedPlayers', {
      get: () => this.gameState.getDisconnectedPlayers(),
      set: (value: DisconnectedPlayer[]) => { this.gameState.setDisconnectedPlayers(value); },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'monster', {
      get: () => this.gameState.getMonster(),
      set: (value: Monster) => { this.gameState.setMonster(value as any); },
      enumerable: true,
      configurable: true
    });

    // Delegate GamePhase properties
    Object.defineProperty(this, 'phase', {
      get: () => this.gamePhase.getCurrentPhase(),
      set: (value: GamePhaseType) => { this.gamePhase.setPhase(value); },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'pendingActions', {
      get: () => this.gamePhase.getPendingActions(),
      set: (value: Map<string, any>) => { this.gamePhase.setPendingActions(value); },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'pendingRacialActions', {
      get: () => this.gamePhase.getPendingRacialActions(),
      set: (value: Map<string, any>) => { this.gamePhase.setPendingRacialActions(value); },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'nextReady', {
      get: () => this.gamePhase.getNextReady(),
      set: (value: boolean) => { this.gamePhase.setNextReady(value); },
      enumerable: true,
      configurable: true
    });

    // Add delegation for new GameState properties
    Object.defineProperty(this, 'ended', {
      get: () => this.gameState.getEnded(),
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'winner', {
      get: () => this.gameState.getWinner(),
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'created', {
      get: () => this.gameState.getCreated(),
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'startTime', {
      get: () => this.gameState.getStartTime(),
      enumerable: true,
      configurable: true
    });
  }

  /**
   * Set up event listeners for game room events
   */
  private setupEventListeners(): void {
    // Listen for player events
    this.eventBus.on(EventTypes.PLAYER.JOINED, this.handlePlayerJoined.bind(this));
    this.eventBus.on(EventTypes.PLAYER.LEFT, this.handlePlayerLeft.bind(this));
    this.eventBus.on(EventTypes.PLAYER.DIED, this.handlePlayerDied.bind(this));

    // Listen for game state events
    this.eventBus.on(EventTypes.GAME.STARTED, this.handleGameStarted.bind(this));
    this.eventBus.on(EventTypes.GAME.ENDED, this.handleGameEnded.bind(this));
    this.eventBus.on(EventTypes.PHASE.CHANGED, this.handlePhaseChanged.bind(this));

    // Listen for action events
    this.eventBus.on(EventTypes.ACTION.SUBMITTED, this.handleActionSubmitted.bind(this));
    this.eventBus.on(EventTypes.ACTION.VALIDATED, this.handleActionValidated.bind(this));
  }

  /**
   * Add a player to the game
   */
  addPlayer(id: string, name: string): AddPlayerResult {
    if (!this.gameRules.canAddPlayer((this.gameState as any).started, (this.gameState as any).players.size)) {
      return {
        success: false,
        error: 'Cannot add player to this game'
      };
    }

    const player = new Player({ id, name });
    const success = this.gameState.addPlayer(player as any);

    if (success) {
      // Emit player joined event
      this.eventBus.emit((EventTypes as any).PLAYER.JOINED, {
        playerId: id,
        playerName: name,
        gameCode: this.code,
        timestamp: new Date().toISOString()
      } as any);

      return { success: true, player };
    }

    return {
      success: false,
      error: 'Failed to add player to game state'
    };
  }

  /**
   * Remove a player from the game
   */
  removePlayer(id: string): boolean {
    const player = this.gameState.getPlayer(id);
    if (!player) return false;

    // Handle warlock count if systems are initialized
    if ((player as any).isWarlock && this.systems) {
      (this.systems as any).warlockSystem?.decrementWarlockCount();
    }

    const removedPlayer = this.gameState.removePlayer(id);
    const success = removedPlayer !== null;

    if (success) {
      // Emit player left event
      this.eventBus.emit((EventTypes as any).PLAYER.LEFT, {
        playerId: id,
        playerName: (player as any).name,
        gameCode: this.code,
        timestamp: new Date().toISOString()
      } as any);
    }

    return success;
  }

  /**
   * Get a player by ID
   */
  getPlayer(id: string): Player | undefined {
    const gamePlayer = this.gameState.getPlayer(id);
    return (gamePlayer as any) || undefined;
  }

  /**
   * Get a player by socket ID
   */
  getPlayerBySocketId(socketId: string): Player | undefined {
    const players = this.getPlayers();
    return players.find(player => player.id === socketId || (player.socketIds && player.socketIds.includes(socketId)));
  }

  /**
   * Get all players
   */
  getPlayers(): Player[] {
    return Array.from((this.gameState as any).players.values());
  }

  /**
   * Get alive players
   */
  getAlivePlayers(): Player[] {
    return this.getPlayers().filter(player => (player as any).isAlive);
  }

  /**
   * Start the game
   */
  async startGame(): Promise<ActionResult> {
    if ((this.gameState as any).started) {
      return {
        success: false,
        reason: 'Game already started'
      };
    }

    const playerCount = (this.gameState as any).players.size;
    const readyCount = playerCount; // Assume all players are ready when checking if game can start
    if (!this.gameRules.canStartGame(playerCount, readyCount)) {
      return {
        success: false,
        reason: 'Not enough players to start the game'
      };
    }

    try {
      // Initialize systems
      this.systems = (SystemsFactory as any).createSystems(
        this.players,
        this.monster,
        this.eventBus
      );

      // Assign initial warlocks
      if (this.systems && (this.systems as any).warlockSystem) {
        const warlockAssignments = (this.systems as any).warlockSystem.assignInitialWarlocks();
        logger.info(`Assigned ${warlockAssignments.length} warlocks for game ${this.code}`);
      }

      // Start the game state
      this.gameState.start();

      // Set initial game phase
      (this.gamePhase as any).setPhase('action');

      // Emit game started event
      this.eventBus.emit((EventTypes as any).GAME.STARTED, {
        gameCode: this.code,
        playerCount: this.players.size,
        warlockCount: this.systems && (this.systems as any).warlockSystem ? (this.systems as any).warlockSystem.numWarlocks : 0,
        timestamp: new Date().toISOString()
      } as any);

      return { success: true };
    } catch (error) {
      (logger as any).error(`Failed to start game ${this.code}:`, error as any);
      return {
        success: false,
        reason: 'Failed to initialize game systems'
      };
    }
  }

  /**
   * Submit a player action
   */
  async submitAction(data: PlayerActionData): Promise<ActionResult> {
    const { playerId, actionType, targetId, additionalData = {} } = data;

    const player = this.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        reason: 'Player not found'
      };
    }

    // Submit action through player
    const result = (player as any).submitAction(actionType, targetId, additionalData);

    if (result.success) {
      // Get batch progress
      const alivePlayers = this.getAlivePlayers();
      const totalExpected = alivePlayers.length;
      const currentSubmitted = alivePlayers.filter(p => (p as any).hasSubmittedAction).length;

      // Log batch progress instead of immediate processing
      (logger as any).info(`[GameRoom:${this.code}] Action added to batch. Batch size currently at ${currentSubmitted} of ${totalExpected}`);

      // Emit action submitted event for batch tracking
      this.eventBus.emit((EventTypes as any).ACTION.SUBMITTED, {
        playerId,
        actionType,
        targetId,
        batchProgress: {
          current: currentSubmitted,
          total: totalExpected,
          complete: currentSubmitted === totalExpected
        },
        timestamp: new Date().toISOString()
      } as any);
    }

    return result;
  }

  /**
   * Validate all submitted actions
   */
  async validateActions(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const alivePlayers = this.getAlivePlayers();

    for (const player of alivePlayers) {
      if ((player as any).hasSubmittedAction) {
        const validationResult = (player as any).validateSubmittedAction(alivePlayers, (this.gameState as any).monster);
        results.push(validationResult);

        // Emit validation event
        this.eventBus.emit((EventTypes as any).ACTION.VALIDATED, {
          playerId: (player as any).id,
          actionType: '',
          targetId: '',
          timestamp: new Date().toISOString()
        } as any);
      }
    }

    return results;
  }

  /**
   * Process a game round
   */
  async processRound(): Promise<ActionResult> {
    this.combatDebug.info(`🎮 Processing round for game ${this.code}...`);

    if (!this.systems) {
      this.combatDebug.error(`❌ Game systems not initialized for game ${this.code}`);
      return {
        success: false,
        reason: 'Game systems not initialized'
      };
    }

    this.combatDebug.verbose('Pre-round game state:', {
      playersCount: this.players?.size || 0,
      aliveCount: this.getAlivePlayers().length,
      round: this.round,
      phase: this.gamePhase.getCurrentPhase()
    });

    try {
      // Process through combat system
      this.combatDebug.info(`⚔️ Delegating to combat system for round processing...`);
      const result = await (this.systems as any).combatSystem.processRound(this);
      this.combatDebug.verbose('Combat system result:', {
        hasResult: !!result,
        resultKeys: result ? Object.keys(result) : [],
        hasLog: !!(result?.log || result?.eventsLog),
        logLength: (result?.log || result?.eventsLog)?.length || 0
      });

      // Check win conditions
      const warlockCount = (this.systems as any).warlockSystem.getWarlockCount();
      const aliveCount = (this.gameState as any).getAliveCount();
      this.combatDebug.verbose(`Win condition check: warlocks=${warlockCount}, alive=${aliveCount}`);

      const winner = (this.systems as any).gameStateUtils.checkWinConditions(warlockCount, aliveCount);
      if (winner) {
        this.combatDebug.info(`🏆 Game winner detected: ${winner}`);
        await this.endGame(winner);
      } else {
        this.combatDebug.verbose('No winner detected, game continues');
      }

      this.combatDebug.info(`✅ Round processing completed successfully for game ${this.code}`);
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';

      this.combatDebug.error(`🔥 CRITICAL ERROR processing round for game ${this.code}: ${errorMessage}`);
      this.combatDebug.error('Error details:', {
        error: errorMessage,
        stack: errorStack,
        code: this.code,
        systemsExists: !!this.systems,
        playersCount: this.players?.size || 0,
        gamePhase: (this.gameState as any)?.phase || 'unknown'
      });

      // Reset player actions on failure to allow resubmission
      if (this.players) {
        for (const player of this.players.values()) {
          (player as any).clearActionSubmission();
        }
        (logger as any).error(`Round processing failed for game ${this.code}. Resetting player actions.`);
      }

      return {
        success: false,
        reason: 'Failed to process round'
      };
    }
  }

  /**
   * End the game
   */
  async endGame(winner?: string): Promise<void> {
    this.gameState.end(winner);

    // Emit game ended event
    this.eventBus.emit((EventTypes as any).GAME.ENDED, {
      gameCode: this.code,
      winner,
      duration: getCurrentTimestamp() - ((this.gameState as any).startTime || getCurrentTimestamp()),
      timestamp: new Date().toISOString()
    } as any);
  }

  /**
   * Set socket server for real-time communication
   */
  setSocketServer(io: SocketIOServer): void {
    // TODO: Re-enable SocketEventRouter once core functionality is working
    // this.socketEventRouter = new SocketEventRouter(this, io);
    this.socketEventRouter = null; // Temporary placeholder
    this.io = io; // Store the socket server directly for now
  }

  /**
   * Get current game statistics
   */
  getGameStats(): GameStats {
    return {
      playersCount: (this.gameState as any).players.size,
      aliveCount: (this.gameState as any).aliveCount,
      round: (this.gameState as any).round,
      level: (this.gameState as any).level,
      phase: this.gamePhase.getCurrentPhase() as any,
      isStarted: (this.gameState as any).started,
      isEnded: (this.gameState as any).ended
    };
  }

  /**
   * Get game state for client transmission
   */
  toClientData(playerId?: string): Partial<GameRoom> {
    const players: Partial<Player>[] = [];

    for (const [, player] of (this.gameState as any).players) {
      players.push((player as any).toClientData({
        includePrivate: false,
        requestingPlayerId: playerId
      }));
    }

    return {
      code: this.code,
      players: Array.from(this.players.values()) as any,
      monster: (this.gameState as any).monster,
      phase: this.gamePhase.getCurrentPhase() as any,
      round: (this.gameState as any).round,
      level: (this.gameState as any).level,
      started: (this.gameState as any).started,
      ended: (this.gameState as any).ended,
      hostId: (this.gameState as any).hostId
    };
  }

  /**
   * Type-safe serialization for Zod validation
   */
  toJSON(): Partial<GameStateType> {
    const playersRecord: Record<string, any> = {};

    for (const [id, player] of (this.gameState as any).players) {
      playersRecord[id] = (player as any).toJSON();
    }

    const gameStateData = {
      gameCode: this.code,
      players: playersRecord,
      monster: (this.gameState as any).getMonster(),
      phase: {
        current: this.gamePhase.getCurrentPhase(),
        round: (this.gameState as any).getRound(),
        turn: 1,
        canSubmitActions: true,
        actionsSubmitted: {}
      },
      rules: {},
      winner: (this.gameState as any).getWinner(),
      isActive: !(this.gameState as any).getEnded(),
      created: (this.gameState as any).getCreated(),
      lastUpdated: new Date().toISOString(),
      metadata: {
        hostId: (this.gameState as any).getHostId(),
        level: (this.gameState as any).getLevel(),
        aliveCount: (this.gameState as any).getAliveCount()
      }
    };

    // Validate with Zod schema
    const validation = (Schemas as any).GameSchemas.gameState.safeParse(gameStateData);
    if (!(validation as any).success) {
      (logger as any).warn(`GameRoom serialization validation failed for ${this.code}:`, (validation as any).error);
    }

    return gameStateData;
  }

  // Event handlers
  private async handlePlayerJoined(event: GameEvent): Promise<void> {
    // Event structure has changed - playerName is in event.payload
    const playerName = (event.payload as any)?.playerName || (event as any).playerName;
    (logger as any).info('PlayerJoinedGame', {
      playerName: playerName,
      gameCode: this.code
    });
  }

  private async handlePlayerLeft(event: GameEvent): Promise<void> {
    // Event structure has changed - playerName is in event.payload
    const playerName = (event.payload as any)?.playerName || (event as any).playerName;
    (logger as any).info('PlayerTimedOutOrLeft', {
      playerName: playerName,
      gameCode: this.code
    });
  }

  private async handlePlayerDied(event: GameEvent): Promise<void> {
    (logger as any).info(`Player ${(event as any).playerId} died in game ${this.code}`);
    (this.gameState as any).updateAliveCount();
  }

  private async handleGameStarted(event: GameEvent): Promise<void> {
    const playerCount = (event as any).playerCount || this.players.size;
    (logger as any).info(`Game ${this.code} started with ${playerCount} players`);
  }

  private async handleGameEnded(event: GameEvent): Promise<void> {
    (logger as any).info(`Game ${this.code} ended. Winner: ${(event as any).winner || 'None'}`);
  }

  private async handlePhaseChanged(event: GameEvent): Promise<void> {
    (logger as any).info(`Game ${this.code} phase changed to ${(event as any).newPhase}`);
  }

  private async handleActionSubmitted(event: GameEvent): Promise<void> {
    this.combatDebug.info(`Action ${(event.payload as any)?.actionType || 'unknown'} submitted by ${(event.payload as any)?.playerId || 'unknown'} in game ${this.code}`);

    // Check if all alive players have submitted their actions
    const alivePlayers = this.getAlivePlayers();
    const allSubmitted = alivePlayers.every(player => (player as any).hasSubmittedAction);

    this.combatDebug.verbose(`Player action submission status in game ${this.code}:`, {
      totalAlive: alivePlayers.length,
      submittedActions: alivePlayers.filter(p => (p as any).hasSubmittedAction).length,
      allSubmitted
    });

    if (allSubmitted && this.gamePhase.getCurrentPhase() === 'action') {
      this.combatDebug.info(`🎯 All players have submitted actions in game ${this.code}. Processing round...`);

      // Change phase to results
      this.phaseDebug.info(`Phase transition: action → results (game ${this.code})`);
      this.gamePhase.setPhase('results');

      // Notify all players that processing is starting
      if (this.socketEventRouter) {
        this.phaseDebug.verbose('Broadcasting phase:changed event to all players');
        this.socketEventRouter.broadcastToGame('phase:changed', {
          phase: 'results',
          message: 'Processing actions...'
        });
      }

      // Process the round
      this.combatDebug.info(`🛡️ Starting round processing for game ${this.code}...`);
      const roundResult = await this.processRound();
      this.combatDebug.info(`🛡️ Round processing completed for game ${this.code}:`, {
        success: roundResult.success,
        hasData: !!roundResult.data,
        dataKeys: roundResult.data ? Object.keys(roundResult.data) : []
      });

      if (roundResult.success) {
        // Reset player actions for the next round
        this.combatDebug.info(`✅ Resetting player actions for next round in game ${this.code}`);
        for (const player of this.players.values()) {
          (player as any).clearActionSubmission();
        }

        // Change phase back to action for next round
        this.phaseDebug.info(`Phase transition: results → action (game ${this.code})`);
        this.gamePhase.setPhase('action');

        // Emit results and new phase
        if (this.socketEventRouter) {
          this.roundResultsDebug.info(`📢 Broadcasting round:results to all players in game ${this.code}`);
          this.roundResultsDebug.verbose('Round results data structure:', {
            hasLog: !!(roundResult.data?.log || roundResult.data?.eventsLog),
            logLength: (roundResult.data?.log || roundResult.data?.eventsLog)?.length || 0,
            hasWinner: !!roundResult.data?.winner,
            hasPlayers: !!roundResult.data?.players,
            playerCount: roundResult.data?.players?.length || 0,
            round: roundResult.data?.round || roundResult.data?.turn || 'unknown'
          });

          this.socketEventRouter.broadcastToGame('round:results', {
            results: roundResult.data,
            newPhase: 'action'
          });

          this.roundResultsDebug.info(`✅ Successfully broadcasted round:results for game ${this.code}`);
        } else if (this.io) {
          // Fallback to direct io broadcast when socketEventRouter is not available
          this.roundResultsDebug.info(`📢 Broadcasting round:results using direct io for game ${this.code}`);
          this.roundResultsDebug.verbose('Round results data structure:', {
            hasLog: !!(roundResult.data?.log || roundResult.data?.eventsLog),
            logLength: (roundResult.data?.log || roundResult.data?.eventsLog)?.length || 0,
            hasWinner: !!roundResult.data?.winner,
            hasPlayers: !!roundResult.data?.players,
            playerCount: roundResult.data?.players?.length || 0,
            round: roundResult.data?.round || roundResult.data?.turn || 'unknown'
          });

          this.io.to(this.code).emit('round:results', {
            results: roundResult.data,
            newPhase: 'action'
          });

          this.roundResultsDebug.info(`✅ Successfully broadcasted round:results for game ${this.code}`);
        } else {
          this.roundResultsDebug.error(`❌ No socketEventRouter or io available to broadcast round:results for game ${this.code}`);
        }

        // Broadcast updated game state after round processing
        this.combatDebug.info(`📢 Broadcasting updated game state after round for game ${this.code}`);
        if (this.io) {
          for (const playerId of this.players.keys()) {
            const personalizedGameData = this.toClientData(playerId);
            this.io.to(playerId).emit('gameStateUpdate', personalizedGameData);
          }
        }
      } else {
        // If round processing failed, reset player actions and go back to action phase
        this.combatDebug.error(`❌ Round processing FAILED for game ${this.code}. Resetting player actions.`);
        this.combatDebug.error('Round failure details:', roundResult);

        // Reset all player actions
        for (const player of this.players.values()) {
          (player as any).clearActionSubmission();
        }

        // Change phase back to action
        this.phaseDebug.warn(`Phase transition: results → action (FAILURE RECOVERY) (game ${this.code})`);
        this.gamePhase.setPhase('action');

        // Notify players of the error and phase change
        if (this.socketEventRouter) {
          this.phaseDebug.error('Broadcasting phase:changed error recovery to all players');
          this.socketEventRouter.broadcastToGame('phase:changed', {
            phase: 'action',
            message: 'Round processing failed. Please submit your actions again.',
            error: true
          });

          // Emit game state update to reset UI
          this.socketEventRouter.broadcastToGame('gameStateUpdate', this.toJSON());
        }
      }
    }
  }

  private async handleActionValidated(event: GameEvent): Promise<void> {
    (logger as any).debug(`Action validation for ${(event as any).playerId} in game ${this.code}: ${(event as any).valid ? 'valid' : 'invalid'}`);
  }
}

export default GameRoom;
