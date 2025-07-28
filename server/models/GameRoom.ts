/**
 * @fileoverview TypeScript GameRoom model with enhanced action submission and validation
 * Phase 5: Controllers & Main Classes Migration
 * Manages game state, players, and coordinates systems with proper cooldown timing
 * Refactored to use composition with domain models for better separation of concerns
 */

import { Player } from './Player.js';
import config from '../config/index.js';
import SystemsFactory from './systems/SystemsFactory.js';
import logger from '../utils/logger.js';
import messages from '../messages/index.js';
import { GameState } from './game/GameState.js';
import { GamePhase } from './game/GamePhase.js';
import { GameRules } from './game/GameRules.js';
import { GameEventBus } from './events/GameEventBus.js';
import { EventMiddleware } from './events/EventMiddleware.js';
import { EventTypes } from './events/EventTypes.js';
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
  
  // Event system (Phase 4 enhancement)
  public readonly eventBus: GameEventBus;
  public readonly commandProcessor: CommandProcessor;
  
  // Socket event router
  public socketEventRouter: SocketEventRouter | null = null;
  
  // Systems (initialized when game starts)
  public systems: any = null;

  constructor(code: GameCode, options: GameRoomOptions = {}) {
    this.code = code;
    
    // Initialize domain models
    this.gameState = new GameState(code);
    this.gamePhase = new GamePhase(code);
    this.gameRules = new GameRules(code, {
      maxPlayers: options.maxPlayers,
      allowSpectators: options.allowSpectators,
      turnTimeLimit: options.timeLimit
    });
    
    // Initialize event system
    this.eventBus = new GameEventBus(code);
    this.setupEventMiddleware();
    
    // Initialize command system
    this.commandProcessor = new CommandProcessor(this);
    
    // Initialize monster from config
    this.gameState.initializeMonster(config);
    
    // Set up property delegation for backward compatibility
    this.setupPropertyDelegation();
    
    // Set up event listeners for this game room
    this.setupEventListeners();
    
    // Emit game creation event
    this.eventBus.emit(EventTypes.GAME.CREATED, {
      gameCode: code,
      createdBy: 'system',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Set up event middleware for the game room
   */
  private setupEventMiddleware(): void {
    // Add logging middleware
    this.eventBus.use(EventMiddleware.createLoggingMiddleware(this.code));
    
    // Add validation middleware
    this.eventBus.use(EventMiddleware.createValidationMiddleware());
    
    // Add metrics middleware
    this.eventBus.use(EventMiddleware.createMetricsMiddleware());
  }

  /**
   * Set up property delegation for backward compatibility
   */
  private setupPropertyDelegation(): void {
    // Delegate GameState properties
    Object.defineProperty(this, 'players', {
      get: () => this.gameState.players,
      set: (value: Map<string, Player>) => { this.gameState.players = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'hostId', {
      get: () => this.gameState.hostId,
      set: (value: string) => { this.gameState.hostId = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'started', {
      get: () => this.gameState.started,
      set: (value: boolean) => { this.gameState.started = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'round', {
      get: () => this.gameState.round,
      set: (value: number) => { this.gameState.round = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'level', {
      get: () => this.gameState.level,
      set: (value: number) => { this.gameState.level = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'aliveCount', {
      get: () => this.gameState.aliveCount,
      set: (value: number) => { this.gameState.aliveCount = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'disconnectedPlayers', {
      get: () => this.gameState.disconnectedPlayers,
      set: (value: Map<string, Player>) => { this.gameState.disconnectedPlayers = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'monster', {
      get: () => this.gameState.monster,
      set: (value: Monster) => { this.gameState.monster = value; },
      enumerable: true,
      configurable: true
    });

    // Delegate GamePhase properties
    Object.defineProperty(this, 'phase', {
      get: () => this.gamePhase.getCurrentPhase(),
      set: (value: GamePhaseEnum) => { this.gamePhase.setPhase(value); },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'pendingActions', {
      get: () => this.gamePhase.pendingActions,
      set: (value: Map<string, any>) => { this.gamePhase.pendingActions = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'pendingRacialActions', {
      get: () => this.gamePhase.pendingRacialActions,
      set: (value: Map<string, any>) => { this.gamePhase.pendingRacialActions = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'nextReady', {
      get: () => this.gamePhase.nextReady,
      set: (value: boolean) => { this.gamePhase.nextReady = value; },
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
    this.eventBus.on(EventTypes.GAME.PHASE_CHANGED, this.handlePhaseChanged.bind(this));
    
    // Listen for action events
    this.eventBus.on(EventTypes.ACTION.SUBMITTED, this.handleActionSubmitted.bind(this));
    this.eventBus.on(EventTypes.ACTION.VALIDATED, this.handleActionValidated.bind(this));
  }

  /**
   * Add a player to the game
   */
  addPlayer(id: string, name: string): AddPlayerResult {
    if (!this.gameRules.canAddPlayer(this.gameState.started, this.gameState.players.size)) {
      return {
        success: false,
        error: 'Cannot add player to this game'
      };
    }

    const player = new Player({ id, name });
    const success = this.gameState.addPlayer(player);
    
    if (success) {
      // Emit player joined event
      this.eventBus.emit(EventTypes.PLAYER.JOINED, {
        playerId: id,
        playerName: name,
        gameCode: this.code,
        timestamp: new Date().toISOString()
      });
      
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
    if (player.isWarlock && this.systems) {
      this.systems.warlockSystem?.decrementWarlockCount();
    }

    const success = this.gameState.removePlayer(id);
    
    if (success) {
      // Emit player left event
      this.eventBus.emit(EventTypes.PLAYER.LEFT, {
        playerId: id,
        playerName: player.name,
        gameCode: this.code,
        timestamp: new Date().toISOString()
      });
    }
    
    return success;
  }

  /**
   * Get a player by ID
   */
  getPlayer(id: string): Player | undefined {
    return this.gameState.getPlayer(id);
  }

  /**
   * Get all players
   */
  getPlayers(): Player[] {
    return Array.from(this.gameState.players.values());
  }

  /**
   * Get alive players
   */
  getAlivePlayers(): Player[] {
    return this.getPlayers().filter(player => player.isAlive);
  }

  /**
   * Start the game
   */
  async startGame(): Promise<ActionResult> {
    if (this.gameState.started) {
      return {
        success: false,
        reason: 'Game already started'
      };
    }

    if (!this.gameRules.canStartGame(this.gameState.players.size)) {
      return {
        success: false,
        reason: 'Not enough players to start the game'
      };
    }

    try {
      // Initialize systems
      this.systems = SystemsFactory.createSystems(this);
      
      // Start the game state
      this.gameState.start();
      
      // Set initial game phase
      this.gamePhase.setPhase('setup');
      
      // Emit game started event
      this.eventBus.emit(EventTypes.GAME.STARTED, {
        gameCode: this.code,
        playerCount: this.gameState.players.size,
        timestamp: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      logger.error(`Failed to start game ${this.code}:`, error);
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
    const result = player.submitAction(actionType, targetId, additionalData);
    
    if (result.success) {
      // Emit action submitted event
      this.eventBus.emit(EventTypes.ACTION.SUBMITTED, {
        playerId,
        actionType,
        targetId,
        gameCode: this.code,
        timestamp: new Date().toISOString()
      });
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
        const validationResult = player.validateSubmittedAction(alivePlayers, this.gameState.monster);
        results.push(validationResult);
        
        // Emit validation event
        this.eventBus.emit(EventTypes.ACTION.VALIDATED, {
          playerId: player.id,
          valid: validationResult.valid,
          gameCode: this.code,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  /**
   * Process a game round
   */
  async processRound(): Promise<ActionResult> {
    if (!this.systems) {
      return {
        success: false,
        reason: 'Game systems not initialized'
      };
    }

    try {
      // Process through combat system
      const result = await this.systems.combatSystem.processRound(this);
      
      // Check win conditions
      const winResult = this.systems.winConditionSystem.checkWinConditions(this);
      if (winResult.gameEnded) {
        await this.endGame(winResult.winner);
      }
      
      return { success: true, data: result };
    } catch (error) {
      logger.error(`Error processing round for game ${this.code}:`, error);
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
    this.eventBus.emit(EventTypes.GAME.ENDED, {
      gameCode: this.code,
      winner,
      duration: Date.now() - (this.gameState.startTime || Date.now()),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Set socket server for real-time communication
   */
  setSocketServer(io: SocketIOServer): void {
    this.socketEventRouter = new SocketEventRouter(this, io);
  }

  /**
   * Get current game statistics
   */
  getGameStats(): GameStats {
    return {
      playersCount: this.gameState.players.size,
      aliveCount: this.gameState.aliveCount,
      round: this.gameState.round,
      level: this.gameState.level,
      phase: this.gamePhase.getCurrentPhase(),
      isStarted: this.gameState.started,
      isEnded: this.gameState.ended
    };
  }

  /**
   * Get game state for client transmission
   */
  toClientData(playerId?: string): any {
    const players: Record<string, any> = {};
    
    for (const [id, player] of this.gameState.players) {
      players[id] = player.toClientData({
        includePrivate: false,
        requestingPlayerId: playerId
      });
    }
    
    return {
      code: this.code,
      players,
      monster: this.gameState.monster,
      phase: this.gamePhase.getCurrentPhase(),
      round: this.gameState.round,
      level: this.gameState.level,
      started: this.gameState.started,
      ended: this.gameState.ended,
      hostId: this.gameState.hostId,
      stats: this.getGameStats()
    };
  }

  /**
   * Type-safe serialization for Zod validation
   */
  toJSON(): Partial<GameStateType> {
    const playersRecord: Record<string, any> = {};
    
    for (const [id, player] of this.gameState.players) {
      playersRecord[id] = player.toJSON();
    }
    
    const gameStateData = {
      gameCode: this.code,
      players: playersRecord,
      monster: this.gameState.monster,
      phase: {
        current: this.gamePhase.getCurrentPhase(),
        round: this.gameState.round,
        turn: 1,
        canSubmitActions: true,
        actionsSubmitted: {}
      },
      rules: this.gameRules.getRules(),
      winner: this.gameState.winner,
      isActive: !this.gameState.ended,
      created: this.gameState.created,
      lastUpdated: new Date().toISOString(),
      metadata: {
        hostId: this.gameState.hostId,
        level: this.gameState.level,
        aliveCount: this.gameState.aliveCount
      }
    };

    // Validate with Zod schema
    const validation = Schemas.GameSchemas.gameState.safeParse(gameStateData);
    if (!validation.success) {
      logger.warn(`GameRoom serialization validation failed for ${this.code}:`, validation.error);
    }

    return gameStateData;
  }

  // Event handlers
  private async handlePlayerJoined(event: any): Promise<void> {
    logger.info(`Player ${event.playerName} joined game ${this.code}`);
  }

  private async handlePlayerLeft(event: any): Promise<void> {
    logger.info(`Player ${event.playerName} left game ${this.code}`);
  }

  private async handlePlayerDied(event: any): Promise<void> {
    logger.info(`Player ${event.playerId} died in game ${this.code}`);
    this.gameState.updateAliveCount();
  }

  private async handleGameStarted(event: any): Promise<void> {
    logger.info(`Game ${this.code} started with ${event.playerCount} players`);
  }

  private async handleGameEnded(event: any): Promise<void> {
    logger.info(`Game ${this.code} ended. Winner: ${event.winner || 'None'}`);
  }

  private async handlePhaseChanged(event: any): Promise<void> {
    logger.info(`Game ${this.code} phase changed to ${event.newPhase}`);
  }

  private async handleActionSubmitted(event: any): Promise<void> {
    logger.debug(`Action ${event.actionType} submitted by ${event.playerId} in game ${this.code}`);
  }

  private async handleActionValidated(event: any): Promise<void> {
    logger.debug(`Action validation for ${event.playerId} in game ${this.code}: ${event.valid ? 'valid' : 'invalid'}`);
  }
}

export default GameRoom;