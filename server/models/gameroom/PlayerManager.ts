/**
 * @fileoverview Player management utilities for GameRoom - TypeScript version
 * Handles player lifecycle, warlock assignment, and player state management
 * Phase 9: TypeScript Migration - Converted from PlayerManager.js
 */

import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import { Player } from '../Player.js';
import type { GameRoom } from '../GameRoom.js';
import type { 
  Race, 
  Class, 
  Ability, 
  StatusEffect,
  RacialAbility 
} from '../../types/generated.js';

/**
 * Player information object for client updates
 */
export interface PlayerInfo {
  id: string;
  name: string;
  isAlive: boolean;
  hp: number;
  maxHp: number;
  armor: number;
  race: Race | null;
  class: Class | null;
  isWarlock: boolean;
  hasSubmittedAction: boolean;
  statusEffects: StatusEffect[];
  abilities: Ability[];
  racialAbility: RacialAbility | null;
  level: number;
  isReady: boolean;
}

/**
 * Player action summary for debugging
 */
export interface PlayerActionSummary {
  total: number;
  alive: number;
  hasSubmittedAction: number;
  canAct: number;
  stunned: number;
  details: Array<{
    id: string;
    name: string;
    isAlive: boolean;
    hasSubmittedAction: boolean;
    canAct: boolean;
    statusEffects: string[];
  }>;
}

/**
 * PlayerManager handles all player-related operations
 */
export class PlayerManager {
  private gameRoom: GameRoom;

  constructor(gameRoom: GameRoom) {
    this.gameRoom = gameRoom;
  }

  /**
   * Add a new player to the game
   */
  addPlayer(id: string, name: string): boolean {
    if (this.gameRoom.gameState.started || this.gameRoom.gameState.players.size >= config.maxPlayers) {
      return false;
    }

    const player = new Player(id, name);
    this.gameRoom.gameState.players.set(id, player);
    this.gameRoom.gameState.aliveCount++;

    // Set host if this is the first player
    if (!this.gameRoom.gameState.hostId) {
      this.gameRoom.gameState.hostId = id;
    }

    logger.info(`Player ${name} (${id}) added to game ${this.gameRoom.code}`);
    return true;
  }

  /**
   * Remove a player from the game
   */
  removePlayer(id: string): boolean {
    const player = this.gameRoom.gameState.players.get(id);
    if (!player) return false;

    // Update counters
    if (player.isAlive) {
      this.gameRoom.gameState.aliveCount--;
    }
    if (player.isWarlock) {
      this.gameRoom.systems.warlockSystem.decrementWarlockCount();
    }

    // Remove from collections
    this.gameRoom.gameState.players.delete(id);
    
    // Remove from pending actions
    this.removePendingActionsForPlayer(id);
    
    // Update host if necessary
    this.updateHostIfNeeded(id);

    logger.info(`Player ${player.name} (${id}) removed from game ${this.gameRoom.code}`);
    return true;
  }

  /**
   * Set player class and race
   */
  setPlayerClass(id: string, race: Race, cls: Class): boolean {
    const player = this.gameRoom.gameState.players.get(id);
    if (!player) return false;

    // Set basic properties
    player.race = race;
    player.class = cls;

    // Apply class stats
    const stats = config.classStats[cls];
    if (stats) {
      player.hp = stats.hp;
      player.maxHp = stats.hp;
      player.armor = stats.armor;
      player.abilities = [...stats.abilities];
      player.unlockedAbilities = stats.abilities.filter(
        (ability: Ability) => ability.unlockAt <= 1
      );
      player.classEffects = {
        ...stats.effects,
        className: cls,
      };
    }

    // Apply racial abilities
    const racialAbility = config.racialAbilities[race];
    if (racialAbility) {
      player.racialAbility = racialAbility;

      // Apply racial effects
      if (race === 'Rockhewn') {
        (player as any).racialEffects = {
          stoneArmor: { armor: 3, intact: true }
        };
        (player as any).stoneArmorIntact = true;
      }

      if (race === 'Lich') {
        (player as any).racialEffects = {
          undeadNature: { 
            immuneToPoisonDamage: true,
            immuneToCharisma: true 
          }
        };
        if (!player.classEffects.immunities) {
          player.classEffects.immunities = [];
        }
        player.classEffects.immunities.push('poison', 'charm');
      }
    }

    logger.info(`Player ${player.name} set to ${race} ${cls}`);
    return true;
  }

  /**
   * Assign initial warlock(s) to the game
   */
  assignInitialWarlock(preferredPlayerIds: string[] = []): string[] {
    const players = Array.from(this.gameRoom.gameState.players.values());
    const warlockCount = this.calculateWarlockCount(players.length);
    const warlocks: string[] = [];

    // Try preferred players first
    for (const playerId of preferredPlayerIds) {
      const player = this.gameRoom.gameState.players.get(playerId);
      if (player && !player.isWarlock && warlocks.length < warlockCount) {
        this.makePlayerWarlock(player);
        warlocks.push(playerId);
      }
    }

    // Fill remaining warlock slots randomly
    const remainingPlayers = players.filter(p => !p.isWarlock);
    while (warlocks.length < warlockCount && remainingPlayers.length > 0) {
      const randomIndex = Math.floor(Math.random() * remainingPlayers.length);
      const selectedPlayer = remainingPlayers.splice(randomIndex, 1)[0];
      
      this.makePlayerWarlock(selectedPlayer);
      warlocks.push(selectedPlayer.id);
    }

    logger.info(`Assigned warlocks: ${warlocks.join(', ')} in game ${this.gameRoom.code}`);
    return warlocks;
  }

  /**
   * Make a player a warlock
   */
  private makePlayerWarlock(player: Player): void {
    player.isWarlock = true;
    this.gameRoom.systems.warlockSystem.incrementWarlockCount();
    
    // Apply warlock-specific effects
    this.applyWarlockEffects(player);
  }

  /**
   * Apply warlock-specific effects to a player
   */
  private applyWarlockEffects(player: Player): void {
    // Add warlock-specific abilities or modifications
    if (!player.classEffects) {
      player.classEffects = {};
    }
    
    player.classEffects.warlockNature = {
      corruptionResistance: 0.2,
      darkMagicBonus: 0.1
    };
    
    // Warlocks might get special abilities
    const warlockAbilities = config.warlockAbilities || [];
    (player as any).warlockAbilities = [...warlockAbilities];
  }

  /**
   * Calculate number of warlocks needed
   */
  private calculateWarlockCount(playerCount: number): number {
    if (playerCount <= 3) return 1;
    if (playerCount <= 6) return 2;
    return Math.ceil(playerCount * 0.3); // 30% warlocks for larger games
  }

  /**
   * Clear ready status for all players
   */
  clearReady(): void {
    (this.gameRoom as any).nextReady = false;
    for (const player of this.gameRoom.gameState.players.values()) {
      player.isReady = false;
    }
  }

  /**
   * Get information about all players for client updates
   */
  getPlayersInfo(): PlayerInfo[] {
    return Array.from(this.gameRoom.gameState.players.values()).map(player => ({
      id: player.id,
      name: player.name,
      isAlive: player.isAlive,
      hp: player.hp,
      maxHp: player.maxHp,
      armor: player.armor,
      race: player.race,
      class: player.class,
      isWarlock: player.isWarlock,
      hasSubmittedAction: player.hasSubmittedAction,
      statusEffects: player.getStatusEffectsSummary(),
      abilities: player.getAvailableAbilities(),
      racialAbility: player.racialAbility,
      level: this.gameRoom.gamePhase.level,
      isReady: player.isReady
    }));
  }

  /**
   * Transfer player ID (for reconnection handling)
   */
  transferPlayerId(oldId: string, newId: string): boolean {
    const player = this.gameRoom.gameState.players.get(oldId);
    if (!player) return false;

    // Add new socket ID to tracking and update current ID
    player.addSocketId(newId);
    
    // Update maps
    this.gameRoom.gameState.players.delete(oldId);
    this.gameRoom.gameState.players.set(newId, player);
    
    // Update host if necessary
    if (this.gameRoom.gameState.hostId === oldId) {
      this.gameRoom.gameState.hostId = newId;
    }
    
    // Update pending actions
    this.updatePendingActionsPlayerId(oldId, newId);
    
    logger.info(`Transferred player ID from ${oldId} to ${newId} for ${player.name}. Socket IDs: ${player.socketIds.join(', ')}`);
    return true;
  }

  /**
   * Get player by socket ID
   */
  getPlayerBySocketId(socketId: string): Player | null {
    for (const player of this.gameRoom.gameState.players.values()) {
      if (player.id === socketId) {
        return player;
      }
    }
    return null;
  }

  /**
   * Get player by any socket ID they've used (for reconnection)
   */
  getPlayerByAnySocketId(socketId: string): Player | null {
    for (const player of this.gameRoom.gameState.players.values()) {
      if (player.hasUsedSocketId && player.hasUsedSocketId(socketId)) {
        return player;
      }
    }
    return null;
  }

  /**
   * Get player by ID
   */
  getPlayerById(playerId: string): Player | null {
    return this.gameRoom.gameState.players.get(playerId) || null;
  }

  /**
   * Get all alive players
   */
  getAlivePlayers(): Player[] {
    return Array.from(this.gameRoom.gameState.players.values()).filter(p => p.isAlive);
  }

  /**
   * Get players by team (warlock vs good)
   */
  getPlayersByTeam(isWarlock: boolean): Player[] {
    return Array.from(this.gameRoom.gameState.players.values()).filter(p => 
      p.isAlive && p.isWarlock === isWarlock
    );
  }

  /**
   * Update player ready status
   */
  setPlayerReady(playerId: string, isReady: boolean): boolean {
    const player = this.gameRoom.gameState.players.get(playerId);
    if (!player) return false;
    
    player.isReady = isReady;
    
    // Check if all players are ready
    const allReady = Array.from(this.gameRoom.gameState.players.values())
      .every(p => p.isReady);
    
    if (allReady && this.gameRoom.gameState.players.size >= config.minPlayers) {
      (this.gameRoom as any).allPlayersReady = true;
    }
    
    return true;
  }

  /**
   * Check if player can act this round
   */
  canPlayerAct(playerId: string): boolean {
    const player = this.gameRoom.gameState.players.get(playerId);
    if (!player || !player.isAlive) return false;
    if (player.hasSubmittedAction) return false;
    
    // Check for disabling status effects
    if (player.hasStatusEffect('stunned')) return false;
    if (player.hasStatusEffect('paralyzed')) return false;
    if (player.hasStatusEffect('frozen')) return false;
    
    return true;
  }

  /**
   * Get player action summary for debugging
   */
  getPlayerActionSummary(): PlayerActionSummary {
    const summary: PlayerActionSummary = {
      total: this.gameRoom.gameState.players.size,
      alive: 0,
      hasSubmittedAction: 0,
      canAct: 0,
      stunned: 0,
      details: []
    };
    
    for (const player of this.gameRoom.gameState.players.values()) {
      if (player.isAlive) {
        summary.alive++;
        
        if (player.hasSubmittedAction) {
          summary.hasSubmittedAction++;
        }
        
        if (this.canPlayerAct(player.id)) {
          summary.canAct++;
        }
        
        if (player.hasStatusEffect('stunned')) {
          summary.stunned++;
        }
        
        summary.details.push({
          id: player.id,
          name: player.name,
          isAlive: player.isAlive,
          hasSubmittedAction: player.hasSubmittedAction,
          canAct: this.canPlayerAct(player.id),
          statusEffects: Object.keys((player as any).statusEffects || {})
        });
      }
    }
    
    return summary;
  }

  // Private helper methods
  private removePendingActionsForPlayer(playerId: string): void {
    // Remove from class actions
    if ((this.gameRoom as any).actionProcessor) {
      const pending = (this.gameRoom as any).actionProcessor.getPendingActions();
      pending.classActions = pending.classActions.filter((a: any) => a.actorId !== playerId);
      pending.racialActions = pending.racialActions.filter((a: any) => a.actorId !== playerId);
    }
  }

  private updateHostIfNeeded(removedPlayerId: string): void {
    if (this.gameRoom.gameState.hostId === removedPlayerId) {
      // Find a new host
      const remainingPlayers = Array.from(this.gameRoom.gameState.players.values());
      if (remainingPlayers.length > 0) {
        this.gameRoom.gameState.hostId = remainingPlayers[0].id;
        logger.info(`New host assigned: ${remainingPlayers[0].name}`);
      } else {
        this.gameRoom.gameState.hostId = null;
      }
    }
  }

  private updatePendingActionsPlayerId(oldId: string, newId: string): void {
    if ((this.gameRoom as any).actionProcessor) {
      const pending = (this.gameRoom as any).actionProcessor.getPendingActions();
      
      // Update class actions
      pending.classActions.forEach((action: any) => {
        if (action.actorId === oldId) action.actorId = newId;
        if (action.targetId === oldId) action.targetId = newId;
      });
      
      // Update racial actions
      pending.racialActions.forEach((action: any) => {
        if (action.actorId === oldId) action.actorId = newId;
        if (action.targetId === oldId) action.targetId = newId;
      });
    }
  }
}

export default PlayerManager;