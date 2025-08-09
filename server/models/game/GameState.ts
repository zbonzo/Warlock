/**
 * @fileoverview GameState domain model - TypeScript migration
 * Manages core game state including players, monster, and progression tracking
 * Part of Phase 3: Core Domain Models Migration
 */

import { z } from 'zod';
import logger from '../../utils/logger.js';
import type { Player, GameCode } from '../../types/generated.js';

// Monster schema for type safety
const MonsterStateSchema = z.object({
  hp: z.number().int().min(0),
  maxHp: z.number().int().min(1),
  baseDmg: z.number().int().min(0),
  age: z.number().int().min(0),
});

const DisconnectedPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  disconnectedAt: z.number(),
});

const GameStateSnapshotSchema = z.object({
  code: z.string(),
  hostId: z.string().nullable(),
  started: z.boolean(),
  round: z.number().int().min(0),
  level: z.number().int().min(1),
  playerCount: z.number().int().min(0),
  aliveCount: z.number().int().min(0),
  monster: MonsterStateSchema,
});

// Type definitions
export type MonsterState = z.infer<typeof MonsterStateSchema>;
export type DisconnectedPlayer = z.infer<typeof DisconnectedPlayerSchema>;
export type GameStateSnapshot = z.infer<typeof GameStateSnapshotSchema>;

export interface GameConfig {
  gameBalance: {
    monster: {
      baseHp: number;
      baseDamage: number;
      baseAge: number;
    };
  };
}

export interface PlayerInfo {
  id: string;
  name: string;
  race: string;
  class: string;
  hp: number;
  maxHp: number;
  armor: number;
  damageMod: number;
  isWarlock: boolean;
  isAlive: boolean;
  isReady: boolean;
  unlocked: any[];
  racialAbility: any;
  racialUsesLeft: number;
  racialCooldown: number;
  level: number;
  statusEffects: any;
  abilityCooldowns: Record<string, number>;
  hasSubmittedAction: boolean;
  submissionStatus: string;
  stoneArmor: {
    active: boolean;
    value: number;
    effectiveArmor: number;
  } | null;
  stats: {
    totalDamageDealt: number;
    totalHealingDone: number;
    damageTaken: number;
    corruptionsPerformed: number;
    abilitiesUsed: number;
    monsterKills: number;
    timesDied: number;
    selfHeals: number;
    highestSingleHit: number;
  };
}

// Extended Player interface for internal use
export interface GamePlayer extends Player {
  getSubmissionStatus?(): string;
  getEffectiveArmor?(): number;
  stoneArmorIntact?: boolean;
  stoneArmorValue?: number;
  stats: any; // Required - Player class always has stats via playerStats
  hasSubmittedAction?: boolean;
  abilityCooldowns?: Record<string, number>;
}

/**
 * GameState class manages core game state
 * Extracted from GameRoom to improve separation of concerns
 */
export class GameState {
  private code: GameCode;
  private players: Map<string, GamePlayer> = new Map();
  private hostId: string | null = null;
  private started: boolean = false;
  private round: number = 0;
  private level: number = 1;
  private aliveCount: number = 0;
  private disconnectedPlayers: DisconnectedPlayer[] = [];
  private monster: MonsterState;
  private ended: boolean = false;
  private winner: string | null = null;
  private created: number = performance.now();
  private startTime: number | null = null;

  /**
   * Create a new game state
   * @param code - Unique game code for identification
   */
  constructor(code: GameCode) {
    this.code = code;

    // Initialize monster state with valid default values
    this.monster = MonsterStateSchema.parse({
      hp: 1,      // Changed from 0 to 1 (valid HP)
      maxHp: 1,   // Changed from 0 to 1 (minimum required by schema)
      baseDmg: 0, // 0 is valid for damage
      age: 0,     // 0 is valid for age
    });
  }

  /**
   * Initialize monster from config
   * @param config - Game configuration
   */
  initializeMonster(config: GameConfig): void {
    this.monster = MonsterStateSchema.parse({
      hp: config.gameBalance.monster.baseHp,
      maxHp: config.gameBalance.monster.baseHp,
      baseDmg: config.gameBalance.monster.baseDamage,
      age: config.gameBalance.monster.baseAge,
    });
  }

  /**
   * Add a player to the game state
   * @param player - Player object
   * @returns Success status
   */
  addPlayer(player: GamePlayer): boolean {
    // If player with this ID already exists, update their name instead
    const existingPlayer = this.players.get(player['id']);
    if (existingPlayer) {
      // Update the existing player's name if it changed
      if (existingPlayer['name'] !== player['name']) {
        const oldName = existingPlayer['name'];
        existingPlayer['name'] = player['name'];
        logger.debug('PlayerNameUpdated', {
          gameCode: this.code,
          playerId: player['id'],
          oldName: oldName,
          newName: player['name']
        });
      }
      return true; // Still return success since player is in the game
    }

    this.players.set(player['id'], player);
    this.aliveCount++;

    if (!this.hostId) {
      this.hostId = player['id'];
    }

    return true;
  }

  /**
   * Remove a player from the game state
   * @param playerId - Player's ID
   * @returns Removed player or null if not found
   */
  removePlayer(playerId: string): GamePlayer | null {
    const player = this.players.get(playerId);
    if (!player) {
      return null;
    }

    if (player['status'] === 'alive') {
      this.aliveCount--;
    }

    this.players.delete(playerId);

    // Update host if needed
    if (this.hostId === playerId) {
      const remainingPlayers = Array.from(this.players.keys());
      this.hostId = remainingPlayers.length > 0 ? remainingPlayers[0]! : null;
    }

    return player;
  }

  /**
   * Get a player by ID
   * @param playerId - Player's ID
   * @returns Player object or null if not found
   */
  getPlayer(playerId: string): GamePlayer | null {
    return this.players.get(playerId) || null;
  }

  /**
   * Get all players
   * @returns Array of all players
   */
  getAllPlayers(): GamePlayer[] {
    return Array.from(this.players.values());
  }

  /**
   * Get alive players
   * @returns Array of alive players
   */
  getAlivePlayers(): GamePlayer[] {
    return Array.from(this.players.values()).filter(p => p['status'] === 'alive');
  }

  /**
   * Update alive count based on current player states
   */
  updateAliveCount(): void {
    this.aliveCount = this.getAlivePlayers().length;
  }

  /**
   * Check if the game has started
   * @returns Whether the game has started
   */
  hasStarted(): boolean {
    return this.started;
  }

  /**
   * Start the game
   */
  startGame(): void {
    this.started = true;
    this.startTime = performance.now();

    // Calculate warlock count for log message template
    const warlockCount = Array.from(this.players.values()).filter((p: any) => p.isWarlock).length;

    logger.info('GameStarted', {
      gameCode: this.code,
      playerCount: this.players.size,
      warlockCount: warlockCount
    });
  }

  /**
   * Alias for startGame() for backward compatibility
   */
  start(): void {
    this.startGame();
  }

  /**
   * End the game
   */
  end(winner?: string): void {
    this.ended = true;
    this.winner = winner || null;
    logger.info('GameEnded', { gameCode: this.code, winner: this.winner });
  }

  /**
   * Advance to next round
   */
  nextRound(): void {
    this.round++;
    logger.debug('RoundAdvanced', { gameCode: this.code, round: this.round });
  }

  /**
   * Level up the game
   * @param newLevel - New level
   */
  levelUp(newLevel: number): void {
    const oldLevel = this.level;
    this.level = newLevel;
    logger.info('GameLevelUp', {
      gameCode: this.code,
      oldLevel,
      newLevel: this.level
    });
  }

  /**
   * Get current game state snapshot
   * @returns Game state information
   */
  getSnapshot(): GameStateSnapshot {
    return GameStateSnapshotSchema.parse({
      code: this.code,
      hostId: this.hostId,
      started: this.started,
      round: this.round,
      level: this.level,
      playerCount: this.players.size,
      aliveCount: this.aliveCount,
      monster: { ...this.monster },
    });
  }

  /**
   * Transfer player ID when they reconnect
   * @param oldId - Old player ID
   * @param newId - New player ID
   * @returns Whether the transfer was successful
   */
  transferPlayerId(oldId: string, newId: string): boolean {
    const player = this.players.get(oldId);
    if (!player) {
      return false;
    }

    // Remove from old ID
    this.players.delete(oldId);

    // Update player's ID
    player['id'] = newId;

    // Add to new ID
    this.players.set(newId, player);

    // Update host if needed
    if (this.hostId === oldId) {
      this.hostId = newId;
    }

    logger.debug('PlayerIdTransferred', {
      gameCode: this.code,
      oldId,
      newId,
      playerName: player['name']
    });

    return true;
  }

  /**
   * Add a disconnected player for tracking
   * @param player - Disconnected player
   */
  addDisconnectedPlayer(player: GamePlayer): void {
    const disconnectedPlayer = DisconnectedPlayerSchema.parse({
      id: player['id'],
      name: player['name'],
      disconnectedAt: performance.now(),
    });

    this.disconnectedPlayers.push(disconnectedPlayer);
  }

  /**
   * Clean up expired disconnected players
   * @param timeoutMs - Timeout in milliseconds (default: 10 minutes)
   * @returns Array of cleaned up player names
   */
  cleanupDisconnectedPlayers(timeoutMs: number = 10 * 60 * 1000): string[] {
    const now = performance.now();
    const cleanedUp: string[] = [];

    this.disconnectedPlayers = this.disconnectedPlayers.filter(player => {
      if (now - player.disconnectedAt > timeoutMs) {
        cleanedUp.push(player.name);
        return false;
      }
      return true;
    });

    return cleanedUp;
  }

  /**
   * Get players info for client updates
   * @returns Array of player info objects
   */
  getPlayersInfo(): PlayerInfo[] {
    return Array.from(this.players.values()).map(p => ({
      id: p['id'],
      name: p['name'],
      race: p['race'],
      class: p['class'],
      hp: p.stats.hp,
      maxHp: p.stats.maxHp,
      armor: p.stats.defensePower,
      damageMod: p.stats.attackPower / 10, // Convert to modifier
      isWarlock: p['role'] === 'Warlock',
      isAlive: p['status'] === 'alive',
      isReady: p['isReady'],
      unlocked: p['abilities'].filter((a: any) => a.unlocked),
      racialAbility: p['abilities'].find((a: any) => a.type === 'racial'),
      racialUsesLeft: 0, // TODO: Extract from abilities system
      racialCooldown: 0, // TODO: Extract from abilities system
      level: this.level,
      statusEffects: p['statusEffects'],
      abilityCooldowns: p.abilityCooldowns || {},
      hasSubmittedAction: p.hasSubmittedAction || false,
      submissionStatus: p.getSubmissionStatus ? p.getSubmissionStatus() : 'none',
      stoneArmor: p.stoneArmorIntact ? {
        active: true,
        value: p.stoneArmorValue || 0,
        effectiveArmor: p.getEffectiveArmor ? p.getEffectiveArmor() : p.stats.defensePower,
      } : null,
      stats: p.stats ? {
        totalDamageDealt: p.stats.totalDamageDealt || 0,
        totalHealingDone: p.stats.totalHealingDone || 0,
        damageTaken: p.stats.damageTaken || 0,
        corruptionsPerformed: p.stats.corruptionsPerformed || 0,
        abilitiesUsed: p.stats.abilitiesUsed || 0,
        monsterKills: p.stats.monsterKills || 0,
        timesDied: p.stats.timesDied || 0,
        selfHeals: p.stats.selfHeals || 0,
        highestSingleHit: p.stats.highestSingleHit || 0,
      } : {
        totalDamageDealt: 0,
        totalHealingDone: 0,
        damageTaken: 0,
        corruptionsPerformed: 0,
        abilitiesUsed: 0,
        monsterKills: 0,
        timesDied: 0,
        selfHeals: 0,
        highestSingleHit: 0,
      },
    }));
  }

  /**
   * Get game code
   * @returns Game code
   */
  getCode(): GameCode {
    return this.code;
  }

  /**
   * Get host ID
   * @returns Host player ID
   */
  getHostId(): string | null {
    return this.hostId;
  }

  /**
   * Set host ID
   * @param hostId - New host player ID
   */
  setHostId(hostId: string | null): void {
    this.hostId = hostId;
  }

  /**
   * Get current round
   * @returns Current round number
   */
  getRound(): number {
    return this.round;
  }

  /**
   * Get current level
   * @returns Current level
   */
  getLevel(): number {
    return this.level;
  }

  /**
   * Get monster state
   * @returns Monster state
   */
  getMonster(): MonsterState {
    return { ...this.monster };
  }

  /**
   * Get players map
   * @returns Map of players
   */
  getPlayers(): Map<string, GamePlayer> {
    return this.players;
  }

  /**
   * Get started status
   * @returns Whether the game has started
   */
  getStarted(): boolean {
    return this.started;
  }

  /**
   * Update monster HP
   * @param newHp - New HP value
   */
  updateMonsterHp(newHp: number): void {
    this.monster.hp = Math.max(0, Math.min(newHp, this.monster.maxHp));
  }

  /**
   * Get player count
   * @returns Number of players
   */
  getPlayerCount(): number {
    return this.players.size;
  }

  /**
   * Get alive count
   * @returns Number of alive players
   */
  getAliveCount(): number {
    return this.aliveCount;
  }

  /**
   * Get ended status
   * @returns Whether the game has ended
   */
  getEnded(): boolean {
    return this.ended;
  }

  /**
   * Get winner
   * @returns Winner of the game
   */
  getWinner(): string | null {
    return this.winner;
  }

  /**
   * Get created timestamp
   * @returns When the game was created
   */
  getCreated(): number {
    return this.created;
  }

  /**
   * Get start time
   * @returns When the game was started
   */
  getStartTime(): number | null {
    return this.startTime;
  }

  /**
   * Set started status
   * @param started - Whether the game has started
   */
  setStarted(started: boolean): void {
    this.started = started;
  }

  /**
   * Set round number
   * @param round - Current round number
   */
  setRound(round: number): void {
    this.round = round;
  }

  /**
   * Set level
   * @param level - Current level
   */
  setLevel(level: number): void {
    this.level = level;
  }

  /**
   * Set alive count
   * @param count - Number of alive players
   */
  setAliveCount(count: number): void {
    this.aliveCount = count;
  }

  /**
   * Get players map
   * @returns Players map
   */
  getPlayersMap(): Map<string, GamePlayer> {
    return this.players;
  }

  /**
   * Set players map
   * @param players - Players map
   */
  setPlayersMap(players: Map<string, GamePlayer>): void {
    this.players = players;
  }

  /**
   * Get disconnected players
   * @returns Disconnected players array
   */
  getDisconnectedPlayers(): DisconnectedPlayer[] {
    return this.disconnectedPlayers;
  }

  /**
   * Set disconnected players
   * @param players - Disconnected players array
   */
  setDisconnectedPlayers(players: DisconnectedPlayer[]): void {
    this.disconnectedPlayers = players;
  }

  /**
   * Set monster state
   * @param monster - Monster state
   */
  setMonster(monster: MonsterState): void {
    this.monster = monster;
  }

  /**
   * Type-safe serialization
   * @returns Serializable game state data
   */
  toJSON(): Record<string, any> {
    return {
      code: this.code,
      players: Array.from(this.players.entries()),
      hostId: this.hostId,
      started: this.started,
      round: this.round,
      level: this.level,
      aliveCount: this.aliveCount,
      disconnectedPlayers: this.disconnectedPlayers,
      monster: this.monster,
    };
  }

  /**
   * Create GameState from serialized data
   * @param data - Serialized game state data
   * @returns New GameState instance
   */
  static fromJSON(data: any): GameState {
    const gameState = new GameState(data.code);

    // Restore players
    if (data.players) {
      for (const [playerId, player] of data.players) {
        gameState.players.set(playerId, player);
      }
    }

    gameState.hostId = data.hostId;
    gameState.started = data.started || false;
    gameState.round = data.round || 0;
    gameState.level = data.level || 1;
    gameState.aliveCount = data.aliveCount || 0;
    gameState.disconnectedPlayers = data.disconnectedPlayers || [];

    if (data.monster) {
      gameState.monster = MonsterStateSchema.parse(data.monster);
    }

    return gameState;
  }
}

export default GameState;
