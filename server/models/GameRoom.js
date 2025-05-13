/**
 * @fileoverview Game room model that manages game state and coordinates systems
 * Core class for game logic processing and state management
 */
const Player = require('./Player');
const classAbilities = require('../config/classAbilities');
const racialAbilities = require('../config/racialAbilities');
const { calculateStats } = require('../config/balancing');
const SystemsFactory = require('./systems/SystemsFactory');

/**
 * GameRoom class represents a single game instance
 * Manages game state, players, and coordinating game systems
 */
class GameRoom {
  /**
   * Create a new game room
   * @param {string} code - Unique game code for identification
   */
  constructor(code) {
    this.code = code;
    this.players = new Map();
    this.hostId = null;
    this.started = false;
    this.round = 0;
    this.level = 1;
    this.aliveCount = 0;
    this.pendingActions = [];
    this.pendingRacialActions = [];
    this.nextReady = new Set();

    // Monster setup
    this.monster = {
      hp: 100,
      maxHp: 100,
      baseDmg: 10,
      age: 0
    };
    
    // Initialize systems using SystemsFactory
    this.systems = SystemsFactory.createSystems(this.players, this.monster);
  }

  /**
   * Add a player to the game
   * @param {string} id - Player's socket ID
   * @param {string} name - Player's display name
   * @returns {boolean} Success status
   */
  addPlayer(id, name) {
    if (this.started || this.players.size >= 20) return false;
    
    const p = new Player(id, name);
    this.players.set(id, p);
    this.aliveCount++;
    
    if (!this.hostId) this.hostId = id;
    return true;
  }

  /**
   * Remove a player from the game
   * @param {string} id - Player's socket ID
   */
  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    
    if (p.isAlive) this.aliveCount--;
    if (p.isWarlock) this.systems.warlockSystem.decrementWarlockCount();
    this.players.delete(id);
  }

  /**
   * Clear ready status for all players
   */
  clearReady() {
    this.nextReady.clear();
    for (let p of this.players.values()) p.isReady = false;
  }

  /**
   * Set a player's race and class
   * @param {string} id - Player's socket ID
   * @param {string} race - Selected race
   * @param {string} cls - Selected class
   */
  setPlayerClass(id, race, cls) {
    const p = this.players.get(id);
    if (!p) return;
    
    p.race = race;
    p.class = cls;
    
    // Apply abilities list from class definition
    p.abilities = (classAbilities[cls] || []).map(a => ({...a}));
    p.unlocked = p.abilities.filter(a => a.unlockAt <= this.level);
    
    // Apply racial and class stat modifications
    const stats = calculateStats(race, cls);
    if (stats) {
      p.maxHp = stats.maxHp;
      p.armor = stats.armor;
      p.damageMod = stats.damageMod;
    } else {
      // Fallback in case of invalid race/class
      p.maxHp = 80;
      p.armor = 0;
      p.damageMod = 1.0;
    }
    
    p.hp = p.maxHp; // Set current HP to max HP
    
    // Assign racial ability
    if (racialAbilities[race]) {
      p.setRacialAbility(racialAbilities[race]);
    }
  }

  /**
   * Assign the initial warlock
   * @param {string|null} pref - Preferred player ID to make warlock
   */
  assignInitialWarlock(pref = null) {
    this.systems.warlockSystem.assignInitialWarlock(pref);
  }

  /**
   * Add a player action to the pending actions queue
   * @param {string} actorId - Player performing the action
   * @param {string} actionType - Type of action
   * @param {string} targetId - Target of the action
   * @param {Object} options - Additional options
   * @returns {boolean} Success status
   */
  addAction(actorId, actionType, targetId, options = {}) {
    if (!this.started) return false;
    const actor = this.players.get(actorId);
    
    // Basic validation
    if (!actor || !actor.isAlive || this.systems.statusEffectManager.isPlayerStunned(actorId)) return false;
    if (this.pendingActions.some(a => a.actorId === actorId)) return false; // Already acted
    
    // Find the ability being used
    const ability = actor.unlocked.find(a => a.type === actionType);
    if (!ability) return false; // Ability not found or not unlocked
    
    // Check if our registry knows this ability type
    if (!this.systems.abilityRegistry.hasClassAbility(actionType)) {
      console.warn(`Unknown ability type: ${actionType}`);
      return false;
    }
    
    // Handle invisibility redirection for player targets
    let finalTargetId = targetId;
    if (targetId !== '__monster__' && targetId !== actorId) {
      const targetPlayer = this.players.get(targetId);
      if (targetPlayer && targetPlayer.hasStatusEffect('invisible')) {
        finalTargetId = this.systems.gameStateUtils.getRandomTarget(actorId, { 
          excludeIds: [targetId], 
          includeMonster: true, 
          monsterRef: this.systems.monsterController.getState() 
        });
        
        if (!finalTargetId) return false; // No valid redirect target
      }
    }
    
    // Add the action to pending actions
    this.pendingActions.push({ 
      actorId, 
      actionType, 
      targetId: finalTargetId, 
      options 
    });
    
    return true;
  }

  /**
   * Add a racial ability action to the pending queue
   * @param {string} actorId - Player using the racial ability
   * @param {string} targetId - Target of the ability
   * @returns {boolean} Success status
   */
  addRacialAction(actorId, targetId) {
    if (!this.started) return false;
    
    const actor = this.players.get(actorId);
    if (!actor || !actor.isAlive || !actor.canUseRacialAbility()) return false;
    if (this.pendingRacialActions.some(a => a.actorId === actorId)) return false; // Already used racial this round
    
    // Check if our registry knows this racial ability type
    if (!actor.racialAbility || !this.systems.abilityRegistry.hasRacialAbility(actor.racialAbility.type)) {
      console.warn(`Unknown racial ability type: ${actor.racialAbility?.type}`);
      return false;
    }
    
    let finalTargetId = targetId;
    if (targetId !== '__monster__' && targetId !== actorId) {
      const targetPlayer = this.players.get(targetId);
      if (!targetPlayer || !targetPlayer.isAlive) return false; // Invalid player target
      if (targetPlayer.hasStatusEffect('invisible')) {
        finalTargetId = this.systems.gameStateUtils.getRandomTarget(actorId, { 
          excludeIds: [targetId], 
          onlyPlayers: true 
        });
        if (!finalTargetId) return false; // No valid redirect
      }
    }
    
    this.pendingRacialActions.push({
      actorId,
      targetId: finalTargetId,
      racialType: actor.racialAbility.type
    });
    
    actor.useRacialAbility(); // Mark as used on the player object
    return true;
  }

/**
 * Update player unlocked abilities based on current level
 * Called after level up
 */
updateUnlockedAbilities() {
  for (const player of this.players.values()) {
    if (!player.abilities || !player.abilities.length) continue;
    
    // Check all abilities to see if they should be unlocked at the current level
    const newlyUnlocked = [];
    
    for (const ability of player.abilities) {
      const alreadyUnlocked = player.unlocked.some(a => a.type === ability.type);
      
      if (ability.unlockAt <= this.level && !alreadyUnlocked) {
        // Create a copy to avoid reference issues
        const abilityCopy = { ...ability };
        player.unlocked.push(abilityCopy);
        newlyUnlocked.push(ability.name);
      }
    }
    
    if (newlyUnlocked.length > 0) {
      console.log(`Player ${player.name} unlocked abilities: ${newlyUnlocked.join(', ')}`);
    }
  }
}

  /**
   * Get a list of currently alive players
   * @returns {Array} List of alive player objects
   */
  getAlivePlayers() {
    return this.systems.gameStateUtils.getAlivePlayers();
  }

  /**
   * Check if all player actions have been submitted
   * @returns {boolean} Whether all actions are submitted
   */
  allActionsSubmitted() {
    // Only count players who aren't stunned
    const activePlayerCount = this.getAlivePlayers()
      .filter(p => !this.systems.statusEffectManager.isPlayerStunned(p.id))
      .length;
    return this.pendingActions.length >= activePlayerCount;
  }

  /**
   * Process a game round
   * @returns {Object} Round result with events and state updates
   */
  processRound() {
    const log = [];
    
    // Reset per-round racial ability uses for all players
    for (let player of this.players.values()) {
      player.resetRacialPerRoundUses();
    }
  
    // Process racial abilities first
    this.processRacialAbilities(log);
  
    // Monster ages and prepares to strike
    this.systems.monsterController.ageMonster();
  
    // Process player actions using the ability registry
    this.processPlayerActions(log);
  
    // Monster attacks using CombatSystem for unified damage logic
    this.systems.monsterController.attack(log, this.systems.combatSystem); 
  
    // Status effects tick-down
    this.systems.statusEffectManager.processTimedEffects(log);
    
    // Re-check for pending deaths after poison/timed effects
    for (const player of this.players.values()) {
      if (player.isAlive && player.hp <= 0) {
        player.pendingDeath = true;
        player.deathAttacker = "Effects";
      }
    }
    
    // Process racial effects
    this.systems.racialAbilitySystem.processEndOfRoundEffects(log);
  
    // Process pending deaths (including Undying resurrections)
    this.systems.combatSystem.processPendingDeaths(log);
  
    // Monster death & level-up
    const oldLevel = this.level; // Store old level for comparison
    const monsterDeathResult = this.systems.monsterController.handleDeathAndRespawn(this.level, log);
    this.level = monsterDeathResult.newLevel;
    
    // Check for level-up - use oldLevel instead of levelup
    if (this.level > oldLevel) {
      console.log(`Game level up: ${oldLevel} -> ${this.level}`);
      log.push(`The party has advanced to level ${this.level}!`);
      this.updateUnlockedAbilities();
      
      // Add level-up messages for each player
      for (const player of this.players.values()) {
        if (player.isAlive) {
          log.push(`${player.name} gains access to new abilities at level ${this.level}!`);
        }
      }
    }
      const levelUp = (this.level > oldLevel) ? {
    oldLevel,
    newLevel: this.level
  } : null;

    if (monsterDeathResult.newLevel > this.level) {
      this.updateUnlockedAbilities();
    }
  
    // Update aliveCount before checking win conditions
    this.aliveCount = this.getAlivePlayers().length; 
    const winner = this.systems.gameStateUtils.checkWinConditions(
      this.systems.warlockSystem.getWarlockCount(), 
      this.aliveCount
    );
    
    if (!winner) {
      this.round++;
    }
  
    return {
    eventsLog: log,
    players: this.getPlayersInfo(),
    monster: this.systems.monsterController.getState(),
    turn: this.round,
    level: this.level,
    levelUp: this.level > oldLevel ? { oldLevel, newLevel: this.level } : null,
    winner
    };
  }

  /**
   * Process all pending racial abilities
   * @param {Array} log - Event log to append messages to
   */
  processRacialAbilities(log) {
    for (const action of this.pendingRacialActions) {
      const actor = this.players.get(action.actorId);
      if (!actor || !actor.isAlive) {
        continue;
      }
      
      const target = action.targetId === '__monster__' ? 
        null : this.players.get(action.targetId);
      
      if (action.targetId !== '__monster__' && !target) {
        continue;
      }
      
      if (actor.racialAbility && actor.racialAbility.type === action.racialType) {
        try {
          this.systems.abilityRegistry.executeRacialAbility(
            action.racialType,
            actor,
            target || action.targetId,
            actor.racialAbility,
            log
          );
        } catch (error) {
          console.error(`Error executing racial ability ${action.racialType}:`, error);
        }
      }
    }
    
    this.pendingRacialActions = [];
  }

  /**
   * Process all pending player actions
   * @param {Array} log - Event log to append messages to
   */
  processPlayerActions(log) {
    for (const action of this.pendingActions) {
      const actor = this.players.get(action.actorId);
      if (!actor || !actor.isAlive || this.systems.statusEffectManager.isPlayerStunned(action.actorId)) {
        if (actor && this.systems.statusEffectManager.isPlayerStunned(action.actorId)) {
          log.push(`${actor.name} is stunned and cannot act.`);
        }
        continue;
      }
      
      const ability = actor.unlocked.find(a => a.type === action.actionType);
      if (!ability) continue;
      
      const target = action.targetId === '__monster__' ? 
        '__monster__' : this.players.get(action.targetId);
      
      log.push(`${actor.name} uses ${ability.name} on ${target === '__monster__' ? 'the Monster' : target.name}.`);
      
      this.systems.abilityRegistry.executeClassAbility(
        action.actionType,
        actor,
        target,
        ability,
        log
      );
    }
    this.pendingActions = [];
  }

  /**
   * Get info about all players for client updates
   * @returns {Array} Array of player info objects
   */
  getPlayersInfo() {
    return Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      race: p.race,
      class: p.class,
      hp: p.hp,
      maxHp: p.maxHp,
      armor: p.armor,
      damageMod: p.damageMod,
      isWarlock: p.isWarlock,
      isAlive: p.isAlive,
      isReady: p.isReady,
      unlocked: p.unlocked,
      racialAbility: p.racialAbility,
      racialUsesLeft: p.racialUsesLeft,
      racialCooldown: p.racialCooldown,
      level: this.level,
      statusEffects: p.statusEffects
    }));
  }
}

module.exports = { GameRoom, classAbilities };