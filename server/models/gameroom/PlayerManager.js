/**
 * @fileoverview Player management utilities for GameRoom
 * Handles player lifecycle, warlock assignment, and player state management
 */
const config = require('@config');
const logger = require('@utils/logger');
const Player = require('../Player');

/**
 * PlayerManager handles all player-related operations
 */
class PlayerManager {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
  }

  /**
   * Add a new player to the game
   * @param {string} id - Player ID
   * @param {string} name - Player name
   * @returns {boolean} Success status
   */
  addPlayer(id, name) {
    if (this.gameRoom.started || this.gameRoom.players.size >= config.maxPlayers) {
      return false;
    }

    const player = new Player(id, name);
    this.gameRoom.players.set(id, player);
    this.gameRoom.aliveCount++;

    // Set host if this is the first player
    if (!this.gameRoom.hostId) {
      this.gameRoom.hostId = id;
    }

    logger.info(`Player ${name} (${id}) added to game ${this.gameRoom.code}`);
    return true;
  }

  /**
   * Remove a player from the game
   * @param {string} id - Player ID to remove
   * @returns {boolean} Success status
   */
  removePlayer(id) {
    const player = this.gameRoom.players.get(id);
    if (!player) return false;

    // Update counters
    if (player.isAlive) {
      this.gameRoom.aliveCount--;
    }
    if (player.isWarlock) {
      this.gameRoom.systems.warlockSystem.decrementWarlockCount();
    }

    // Remove from collections
    this.gameRoom.players.delete(id);
    
    // Remove from pending actions
    this.removePendingActionsForPlayer(id);
    
    // Update host if necessary
    this.updateHostIfNeeded(id);

    logger.info(`Player ${player.name} (${id}) removed from game ${this.gameRoom.code}`);
    return true;
  }

  /**
   * Set player class and race
   * @param {string} id - Player ID
   * @param {string} race - Player race
   * @param {string} cls - Player class
   * @returns {boolean} Success status
   */
  setPlayerClass(id, race, cls) {
    const player = this.gameRoom.players.get(id);
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
        ability => ability.unlockAt <= 1
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
        player.racialEffects = {
          stoneArmor: { armor: 3, intact: true }
        };
        player.stoneArmorIntact = true;
      }

      if (race === 'Lich') {
        player.racialEffects = {
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
   * @param {Array} preferredPlayerIds - Preferred player IDs for warlock assignment
   * @returns {Array} Array of warlock player IDs
   */
  assignInitialWarlock(preferredPlayerIds = []) {
    const players = Array.from(this.gameRoom.players.values());
    const warlockCount = this.calculateWarlockCount(players.length);
    const warlocks = [];

    // Try preferred players first
    for (const playerId of preferredPlayerIds) {
      const player = this.gameRoom.players.get(playerId);
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
   * @param {Object} player - Player to make warlock
   */
  makePlayerWarlock(player) {
    player.isWarlock = true;
    this.gameRoom.systems.warlockSystem.incrementWarlockCount();
    
    // Apply warlock-specific effects
    this.applyWarlockEffects(player);
  }

  /**
   * Apply warlock-specific effects to a player
   * @param {Object} player - Player to apply effects to
   */
  applyWarlockEffects(player) {
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
    player.warlockAbilities = [...warlockAbilities];
  }

  /**
   * Calculate number of warlocks needed
   * @param {number} playerCount - Total number of players
   * @returns {number} Number of warlocks needed
   */
  calculateWarlockCount(playerCount) {
    if (playerCount <= 3) return 1;
    if (playerCount <= 6) return 2;
    return Math.ceil(playerCount * 0.3); // 30% warlocks for larger games
  }

  /**
   * Clear ready status for all players
   */
  clearReady() {
    this.gameRoom.nextReady = false;
    for (const player of this.gameRoom.players.values()) {
      player.isReady = false;
    }
  }

  /**
   * Get information about all players for client updates
   * @returns {Array} Array of player information objects
   */
  getPlayersInfo() {
    return Array.from(this.gameRoom.players.values()).map(player => ({
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
      level: this.gameRoom.level,
      isReady: player.isReady
    }));
  }

  /**
   * Transfer player ID (for reconnection handling)
   * @param {string} oldId - Old player ID
   * @param {string} newId - New player ID
   * @returns {boolean} Success status
   */
  transferPlayerId(oldId, newId) {
    const player = this.gameRoom.players.get(oldId);
    if (!player) return false;

    // Add new socket ID to tracking and update current ID
    player.addSocketId(newId);
    
    // Update maps
    this.gameRoom.players.delete(oldId);
    this.gameRoom.players.set(newId, player);
    
    // Update host if necessary
    if (this.gameRoom.hostId === oldId) {
      this.gameRoom.hostId = newId;
    }
    
    // Update pending actions
    this.updatePendingActionsPlayerId(oldId, newId);
    
    logger.info(`Transferred player ID from ${oldId} to ${newId} for ${player.name}. Socket IDs: ${player.socketIds.join(', ')}`);
    return true;
  }

  /**
   * Get player by socket ID
   * @param {string} socketId - Socket ID to search for
   * @returns {Object|null} Player object or null
   */
  getPlayerBySocketId(socketId) {
    for (const player of this.gameRoom.players.values()) {
      if (player.id === socketId) {
        return player;
      }
    }
    return null;
  }

  /**
   * Get player by any socket ID they've used (for reconnection)
   * @param {string} socketId - Socket ID to search for
   * @returns {Object|null} Player object or null
   */
  getPlayerByAnySocketId(socketId) {
    for (const player of this.gameRoom.players.values()) {
      if (player.hasUsedSocketId && player.hasUsedSocketId(socketId)) {
        return player;
      }
    }
    return null;
  }

  /**
   * Get player by ID
   * @param {string} playerId - Player ID to search for
   * @returns {Object|null} Player object or null
   */
  getPlayerById(playerId) {
    return this.gameRoom.players.get(playerId) || null;
  }

  /**
   * Get all alive players
   * @returns {Array} Array of alive players
   */
  getAlivePlayers() {
    return Array.from(this.gameRoom.players.values()).filter(p => p.isAlive);
  }

  /**
   * Get players by team (warlock vs good)
   * @param {boolean} isWarlock - True for warlocks, false for good team
   * @returns {Array} Array of players on the specified team
   */
  getPlayersByTeam(isWarlock) {
    return Array.from(this.gameRoom.players.values()).filter(p => 
      p.isAlive && p.isWarlock === isWarlock
    );
  }

  /**
   * Update player ready status
   * @param {string} playerId - Player ID
   * @param {boolean} isReady - Ready status
   * @returns {boolean} Success status
   */
  setPlayerReady(playerId, isReady) {
    const player = this.gameRoom.players.get(playerId);
    if (!player) return false;
    
    player.isReady = isReady;
    
    // Check if all players are ready
    const allReady = Array.from(this.gameRoom.players.values())
      .every(p => p.isReady);
    
    if (allReady && this.gameRoom.players.size >= config.minPlayers) {
      this.gameRoom.allPlayersReady = true;
    }
    
    return true;
  }

  /**
   * Check if player can act this round
   * @param {string} playerId - Player ID to check
   * @returns {boolean} True if player can act
   */
  canPlayerAct(playerId) {
    const player = this.gameRoom.players.get(playerId);
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
   * @returns {Object} Summary of player action states
   */
  getPlayerActionSummary() {
    const summary = {
      total: this.gameRoom.players.size,
      alive: 0,
      hasSubmittedAction: 0,
      canAct: 0,
      stunned: 0,
      details: []
    };
    
    for (const player of this.gameRoom.players.values()) {
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
          statusEffects: Object.keys(player.statusEffects || {})
        });
      }
    }
    
    return summary;
  }

  // Private helper methods
  removePendingActionsForPlayer(playerId) {
    // Remove from class actions
    if (this.gameRoom.actionProcessor) {
      const pending = this.gameRoom.actionProcessor.getPendingActions();
      pending.classActions = pending.classActions.filter(a => a.actorId !== playerId);
      pending.racialActions = pending.racialActions.filter(a => a.actorId !== playerId);
    }
  }

  updateHostIfNeeded(removedPlayerId) {
    if (this.gameRoom.hostId === removedPlayerId) {
      // Find a new host
      const remainingPlayers = Array.from(this.gameRoom.players.values());
      if (remainingPlayers.length > 0) {
        this.gameRoom.hostId = remainingPlayers[0].id;
        logger.info(`New host assigned: ${remainingPlayers[0].name}`);
      } else {
        this.gameRoom.hostId = null;
      }
    }
  }

  updatePendingActionsPlayerId(oldId, newId) {
    if (this.gameRoom.actionProcessor) {
      const pending = this.gameRoom.actionProcessor.getPendingActions();
      
      // Update class actions
      pending.classActions.forEach(action => {
        if (action.actorId === oldId) action.actorId = newId;
        if (action.targetId === oldId) action.targetId = newId;
      });
      
      // Update racial actions
      pending.racialActions.forEach(action => {
        if (action.actorId === oldId) action.actorId = newId;
        if (action.targetId === oldId) action.targetId = newId;
      });
    }
  }
}

module.exports = PlayerManager;