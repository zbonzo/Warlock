/**
 * @fileoverview Game state management utilities for GameRoom
 * Handles level progression, monster state, and round processing
 */
const config = require('@config');
const logger = require('@utils/logger');
const messages = require('@messages');

/**
 * GameStateManager handles game progression and state management
 */
class GameStateManager {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
  }

  /**
   * Process a complete round of the game
   * @returns {Array} Log of events that occurred
   */
  processRound() {
    const log = [];
    
    // Process round start
    this.handleRoundStart(log);
    
    // Process racial abilities first
    this.gameRoom.actionProcessor.processRacialAbilities(log);
    
    // Process player actions
    const actionResults = this.gameRoom.actionProcessor.processPlayerActions(log);
    
    // Process monster actions
    this.processMonsterTurn(log);
    
    // Handle level progression
    const oldLevel = this.gameRoom.level;
    this.updateGameLevel();
    
    if (this.gameRoom.level > oldLevel) {
      this.handleLevelUp(oldLevel, log);
    }
    
    // Process end of round effects
    this.handleRoundEnd(log);
    
    // Clear actions for next round
    this.gameRoom.actionProcessor.clearPendingActions();
    this.clearPlayerActionStates();
    
    return log;
  }

  /**
   * Handle start of round effects
   * @param {Array} log - Event log to append to
   */
  handleRoundStart(log) {
    // Reset player action states
    for (const player of this.gameRoom.players.values()) {
      player.resetForNewRound();
    }
    
    // Process any start-of-round effects
    this.processStatusEffectTicks(log, 'start');
    
    // Update comeback mechanics
    this.gameRoom.systems.combatSystem.updateComebackStatus();
  }

  /**
   * Process monster's turn
   * @param {Array} log - Event log to append to
   */
  processMonsterTurn(log) {
    if (this.gameRoom.monster.hp <= 0) {
      return; // Monster is dead
    }
    
    // Process monster abilities and effects
    const alivePlayers = this.getAlivePlayers();
    
    // Apply any monster-specific logic here
    for (const player of alivePlayers) {
      if (player.race === 'Kinfolk' && player.isAlive) {
        // Special Kinfolk end-of-round processing
        this.processKinfolkEndOfRound(player, log);
      }
    }
    
    // Process class-specific end-of-round effects
    for (const player of alivePlayers) {
      if (player.isAlive) {
        const classEffectResult = this.processClassEndOfRoundEffects(player, log);
        if (classEffectResult && classEffectResult.length > 0) {
          log.push(...classEffectResult);
        }
      }
      
      // Handle players who died during round processing
      if (player.isAlive && player.hp <= 0) {
        this.handlePlayerDeath(player, log);
      }
    }
  }

  /**
   * Update the game level based on current state
   */
  updateGameLevel() {
    const aliveCount = this.getAlivePlayers().length;
    const totalPlayers = this.gameRoom.players.size;
    
    // Calculate level based on game progression rules
    const newLevel = this.calculateGameLevel(aliveCount, totalPlayers, this.gameRoom.monster.hp);
    
    if (newLevel !== this.gameRoom.level) {
      this.gameRoom.level = newLevel;
      logger.debug(`Game level updated to ${newLevel}`);
    }
  }

  /**
   * Handle level up events
   * @param {number} oldLevel - Previous level
   * @param {Array} log - Event log to append to
   */
  handleLevelUp(oldLevel, log) {
    log.push(`🎉 Level Up! The party has reached level ${this.gameRoom.level}!`);
    
    // Unlock new abilities for all players
    this.updateUnlockedAbilities(log);
    
    // Apply level up bonuses
    for (const player of this.gameRoom.players.values()) {
      if (player.isAlive) {
        this.applyLevelUpBonuses(player, oldLevel, log);
      }
    }
    
    // Enhance monster if needed
    this.enhanceMonsterForLevel(this.gameRoom.level, log);
  }

  /**
   * Handle end of round effects
   * @param {Array} log - Event log to append to
   */
  handleRoundEnd(log) {
    // Process status effects that tick at end of round
    this.processStatusEffectTicks(log, 'end');
    
    // Process pending deaths
    this.gameRoom.systems.combatSystem.processPendingDeaths(log);
    
    // Update game statistics
    this.updateGameStatistics();
    
    // Check for game end conditions
    this.checkGameEndConditions(log);
  }

  /**
   * Update unlocked abilities for all players
   * @param {Array} log - Event log to append to
   */
  updateUnlockedAbilities(log) {
    for (const player of this.gameRoom.players.values()) {
      const newlyUnlocked = [];
      
      for (const ability of player.abilities) {
        const alreadyUnlocked = player.unlockedAbilities.some(
          a => a.type === ability.type
        );
        
        if (ability.unlockAt <= this.gameRoom.level && !alreadyUnlocked) {
          player.unlockedAbilities.push(ability);
          newlyUnlocked.push(ability);
          
          // Activate passive abilities immediately
          if (ability.effect === 'passive') {
            this.activatePassiveAbility(player, ability, log);
          }
        }
      }
      
      if (newlyUnlocked.length > 0) {
        const abilityNames = newlyUnlocked.map(a => a.name).join(', ');
        log.push(`⚡ ${player.name} unlocked: ${abilityNames}`);
      }
      
      // Handle class-specific level up effects
      if (player.class === 'Barbarian' && player.classEffects?.relentlessFury) {
        // Special Barbarian logic
        this.processBarbarianLevelUp(player, log);
      }
    }
  }

  /**
   * Activate a passive ability for a player
   * @param {Object} player - Player to activate ability for
   * @param {Object} ability - Ability to activate
   * @param {Array} log - Event log to append to
   */
  activatePassiveAbility(player, ability, log) {
    const systems = this.gameRoom.systems;
    const success = systems.abilityRegistry.executeClassAbility(
      ability.type,
      player,
      player,
      ability,
      log,
      systems
    );
    
    if (success && log.length > 0) {
      // Store passive activation for later processing
      if (!this.gameRoom.pendingPassiveActivations) {
        this.gameRoom.pendingPassiveActivations = [];
      }
      this.gameRoom.pendingPassiveActivations.push({
        player: player.id,
        ability: ability.type,
        log: [...log]
      });
    }
  }

  /**
   * Get all alive players
   * @returns {Array} Array of alive players
   */
  getAlivePlayers() {
    return Array.from(this.gameRoom.players.values()).filter(p => p.isAlive);
  }

  /**
   * Check if all actions have been submitted
   * @returns {boolean} True if all alive players have submitted actions
   */
  allActionsSubmitted() {
    const alivePlayers = this.getAlivePlayers();
    
    // Count players who haven't submitted actions
    let playersWhoCanAct = 0;
    let playersWithRecentSubmissions = [];
    
    for (const player of alivePlayers) {
      if (!player.isAlive) {
        continue;
      }
      
      // Players who submitted actions this round
      if (player.hasSubmittedAction) {
        playersWithRecentSubmissions.push(player.id);
      }
      
      // Players who can potentially act
      if (player.hasSubmittedAction) {
        // Player has acted
      } else if (this.canPlayerAct(player)) {
        playersWhoCanAct++;
      }
    }
    
    // Check if we can proceed
    const activePlayerCount = alivePlayers.length;
    
    if (activePlayerCount === 0) {
      return true; // No players alive, can proceed
    }
    
    // All players who can act have acted
    if (playersWhoCanAct === 0) {
      return true;
    }
    
    // Check for timeout or other conditions
    const playersWhoCanActCount = playersWhoCanAct;
    if (playersWhoCanActCount > 0 && playersWithRecentSubmissions.length < playersWhoCanActCount) {
      return false; // Still waiting for actions
    }
    
    return true;
  }

  /**
   * Check if a player can act this round
   * @param {Object} player - Player to check
   * @returns {boolean} True if player can act
   */
  canPlayerAct(player) {
    if (!player.isAlive) return false;
    if (player.hasSubmittedAction) return false;
    
    // Check for status effects that prevent action
    if (player.hasStatusEffect('stunned')) return false;
    if (player.hasStatusEffect('paralyzed')) return false;
    
    return true;
  }

  /**
   * Calculate game level based on current state
   * @param {number} aliveCount - Number of alive players
   * @param {number} totalPlayers - Total number of players
   * @param {number} monsterHp - Current monster HP
   * @returns {number} Calculated game level
   */
  calculateGameLevel(aliveCount, totalPlayers, monsterHp) {
    // Implement level calculation logic
    const baseLevel = Math.max(1, totalPlayers - aliveCount + 1);
    
    // Adjust based on monster health
    const monsterHealthFactor = Math.floor((1 - monsterHp / this.gameRoom.monster.maxHp) * 2);
    
    return Math.min(baseLevel + monsterHealthFactor, config.maxLevel || 10);
  }

  /**
   * Apply level up bonuses to a player
   * @param {Object} player - Player to apply bonuses to
   * @param {number} oldLevel - Previous level
   * @param {Array} log - Event log to append to
   */
  applyLevelUpBonuses(player, oldLevel, log) {
    // Implement level up bonus logic
    const healthBonus = 5;
    player.maxHp += healthBonus;
    player.hp = Math.min(player.hp + healthBonus, player.maxHp);
    
    log.push(`❤️ ${player.name} gains ${healthBonus} max HP from leveling up!`);
  }

  /**
   * Enhance monster for new level
   * @param {number} level - New level
   * @param {Array} log - Event log to append to
   */
  enhanceMonsterForLevel(level, log) {
    // Implement monster enhancement logic
    const healthBonus = level * 10;
    this.gameRoom.monster.maxHp += healthBonus;
    this.gameRoom.monster.hp += healthBonus;
    
    log.push(`👹 The monster grows stronger with the party's experience!`);
  }

  /**
   * Process status effects that tick at specific times
   * @param {Array} log - Event log to append to
   * @param {string} timing - 'start' or 'end' of round
   */
  processStatusEffectTicks(log, timing) {
    for (const player of this.gameRoom.players.values()) {
      if (player.isAlive) {
        this.gameRoom.systems.statusEffectManager.processStatusEffects(
          player, 
          timing, 
          log
        );
      }
    }
  }

  /**
   * Handle player death
   * @param {Object} player - Player who died
   * @param {Array} log - Event log to append to
   */
  handlePlayerDeath(player, log) {
    player.isAlive = false;
    this.gameRoom.aliveCount--;
    
    log.push(`💀 ${player.name} has fallen!`);
    
    // Process death-related effects
    this.gameRoom.systems.combatSystem.handlePotentialDeath(player, null, log);
  }

  /**
   * Process Kinfolk end-of-round effects
   * @param {Object} player - Kinfolk player
   * @param {Array} log - Event log to append to
   */
  processKinfolkEndOfRound(player, log) {
    // Implement Kinfolk-specific logic
    if (player.racialEffects && player.racialEffects.packHunting) {
      // Pack hunting effects
      const packBonus = this.calculatePackHuntingBonus(player);
      if (packBonus > 0) {
        log.push(`🐺 ${player.name} benefits from pack hunting instincts!`);
      }
    }
  }

  /**
   * Process class-specific end-of-round effects
   * @param {Object} player - Player to process
   * @param {Array} log - Event log to append to
   * @returns {Array} Additional log entries
   */
  processClassEndOfRoundEffects(player, log) {
    const additionalLog = [];
    
    switch (player.class) {
      case 'Barbarian':
        this.processBarbarianEndOfRound(player, additionalLog);
        break;
      case 'Ranger':
        this.processRangerEndOfRound(player, additionalLog);
        break;
      // Add other classes as needed
    }
    
    return additionalLog;
  }

  /**
   * Process Barbarian-specific end-of-round effects
   * @param {Object} player - Barbarian player
   * @param {Array} log - Event log to append to
   */
  processBarbarianEndOfRound(player, log) {
    if (player.classEffects?.relentlessFury) {
      // Process relentless fury effects
      const furyBonus = this.calculateRelentlessFuryBonus(player);
      if (furyBonus > 0) {
        log.push(`⚡ ${player.name}'s relentless fury intensifies!`);
      }
    }
  }

  /**
   * Process Barbarian level up effects
   * @param {Object} player - Barbarian player
   * @param {Array} log - Event log to append to
   */
  processBarbarianLevelUp(player, log) {
    // Barbarian-specific level up bonuses
    if (player.classEffects?.relentlessFury) {
      const furyBonus = Math.floor(this.gameRoom.level / 2);
      player.classEffects.relentlessFury.damage += furyBonus;
      log.push(`🔥 ${player.name}'s fury grows stronger! (+${furyBonus} fury damage)`);
    }
  }

  /**
   * Update game statistics
   */
  updateGameStatistics() {
    // Update round counter
    this.gameRoom.roundNumber = (this.gameRoom.roundNumber || 0) + 1;
    
    // Update other statistics as needed
    this.gameRoom.totalDamageDealt = (this.gameRoom.totalDamageDealt || 0);
    this.gameRoom.totalHealingDone = (this.gameRoom.totalHealingDone || 0);
  }

  /**
   * Check for game end conditions
   * @param {Array} log - Event log to append to
   * @returns {boolean} True if game should end
   */
  checkGameEndConditions(log) {
    const alivePlayers = this.getAlivePlayers();
    
    // Check win conditions
    if (this.gameRoom.monster.hp <= 0) {
      log.push('🎉 Victory! The monster has been defeated!');
      this.gameRoom.gameEnded = true;
      this.gameRoom.victory = true;
      return true;
    }
    
    // Check loss conditions
    if (alivePlayers.length === 0) {
      log.push('💀 Defeat! All heroes have fallen...');
      this.gameRoom.gameEnded = true;
      this.gameRoom.victory = false;
      return true;
    }
    
    return false;
  }

  /**
   * Clear player action states for new round
   */
  clearPlayerActionStates() {
    for (const player of this.gameRoom.players.values()) {
      if (player.isAlive) {
        player.hasSubmittedAction = false;
        player.currentAction = null;
      }
    }
  }

  // Helper methods for calculating bonuses
  calculatePackHuntingBonus(player) {
    // Implement pack hunting bonus calculation
    const nearbyAllies = this.getAlivePlayers().filter(p => 
      p.id !== player.id && p.race === 'Kinfolk'
    ).length;
    return nearbyAllies * 0.1; // 10% bonus per nearby Kinfolk ally
  }

  calculateRelentlessFuryBonus(player) {
    // Implement relentless fury bonus calculation
    const missingHpRatio = 1 - (player.hp / player.maxHp);
    return missingHpRatio * 0.2; // 20% bonus when at low health
  }

  processRangerEndOfRound(player, log) {
    // Implement Ranger-specific end-of-round effects
    if (player.classEffects?.tracking) {
      log.push(`🏹 ${player.name} tracks enemy movements!`);
    }
  }
}

module.exports = GameStateManager;