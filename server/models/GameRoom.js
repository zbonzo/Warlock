/**
 * @fileoverview Game room model with enhanced action submission and validation
 * Manages game state, players, and coordinates systems with proper cooldown timing
 * Refactored to use composition with domain models for better separation of concerns
 * Enhanced with event-driven architecture in Phase 2
 */
const Player = require('./Player');
const config = require('@config');
const SystemsFactory = require('./systems/SystemsFactory');
const logger = require('@utils/logger');
const messages = require('@messages');
const { GameState } = require('./game/GameState');
const { GamePhase } = require('./game/GamePhase');
const { GameRules } = require('./game/GameRules');
const GameEventBus = require('./events/GameEventBus');
const EventMiddleware = require('./events/EventMiddleware');
const { EventTypes } = require('./events/EventTypes');
const CommandProcessor = require('./commands/CommandProcessor');
const SocketEventRouter = require('./events/SocketEventRouter');

/**
 * GameRoom class represents a single game instance with enhanced action validation
 * Manages game state, players, and coordinating game systems
 */
class GameRoom {
  /**
   * Create a new game room
   * @param {string} code - Unique game code for identification
   */
  constructor(code) {
    this.code = code;
    
    // Domain models for better separation of concerns
    this.gameState = new GameState(code);
    this.gamePhase = new GamePhase(code);
    this.gameRules = new GameRules(code);
    
    // Initialize event system (Phase 2 enhancement)
    this.eventBus = new GameEventBus(code);
    this._setupEventMiddleware();
    
    // Initialize command system (Phase 2 enhancement)
    this.commandProcessor = new CommandProcessor(this);
    
    // Socket event router will be initialized when setSocketServer is called
    this.socketEventRouter = null;
    
    // Initialize monster from config
    this.gameState.initializeMonster(config);

    // Systems will be initialized when game starts (after players join)
    this.systems = null;
    
    // Set up property delegation for backward compatibility
    this._setupPropertyDelegation();
    
    // Set up event listeners for this game room
    this._setupEventListeners();
    
    // Emit game creation event
    this.eventBus.emit(EventTypes.GAME.CREATED, {
      gameCode: code,
      createdBy: 'system',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Set up property delegation for backward compatibility
   * @private
   */
  _setupPropertyDelegation() {
    // Delegate GameState properties
    Object.defineProperty(this, 'players', {
      get: () => this.gameState.players,
      set: (value) => { this.gameState.players = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'hostId', {
      get: () => this.gameState.hostId,
      set: (value) => { this.gameState.hostId = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'started', {
      get: () => this.gameState.started,
      set: (value) => { this.gameState.started = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'round', {
      get: () => this.gameState.round,
      set: (value) => { this.gameState.round = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'level', {
      get: () => this.gameState.level,
      set: (value) => { this.gameState.level = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'aliveCount', {
      get: () => this.gameState.aliveCount,
      set: (value) => { this.gameState.aliveCount = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'disconnectedPlayers', {
      get: () => this.gameState.disconnectedPlayers,
      set: (value) => { this.gameState.disconnectedPlayers = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'monster', {
      get: () => this.gameState.monster,
      set: (value) => { this.gameState.monster = value; },
      enumerable: true,
      configurable: true
    });

    // Delegate GamePhase properties
    Object.defineProperty(this, 'phase', {
      get: () => this.gamePhase.getCurrentPhase(),
      set: (value) => { this.gamePhase.setPhase(value); },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'pendingActions', {
      get: () => this.gamePhase.pendingActions,
      set: (value) => { this.gamePhase.pendingActions = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'pendingRacialActions', {
      get: () => this.gamePhase.pendingRacialActions,
      set: (value) => { this.gamePhase.pendingRacialActions = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'nextReady', {
      get: () => this.gamePhase.nextReady,
      set: (value) => { this.gamePhase.nextReady = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'pendingDisconnectEvents', {
      get: () => this.gamePhase.pendingDisconnectEvents,
      set: (value) => { this.gamePhase.pendingDisconnectEvents = value; },
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(this, 'pendingPassiveActivations', {
      get: () => this.gamePhase.pendingPassiveActivations,
      set: (value) => { this.gamePhase.pendingPassiveActivations = value; },
      enumerable: true,
      configurable: true
    });
  }

  /**
   * Add a player to the game
   * @param {string} id - Player's socket ID
   * @param {string} name - Player's display name
   * @returns {boolean} Success status
   */
  addPlayer(id, name) {
    if (!this.gameRules.canAddPlayer(this.gameState.started, this.gameState.players.size)) {
      return false;
    }

    const player = new Player(id, name);
    return this.gameState.addPlayer(player);
  }

  /**
   * Remove a player from the game
   * @param {string} id - Player's socket ID
   */
  removePlayer(id) {
    const player = this.gameState.getPlayer(id);
    if (!player) return;

    // Handle warlock count if systems are initialized
    if (player.isWarlock && this.systems) {
      this.systems.warlockSystem.decrementWarlockCount();
    }

    // Remove from game state
    this.gameState.removePlayer(id);

    // Clean up pending actions and ready state
    this.gamePhase.removePendingActionsForPlayer(id);
    this.gamePhase.setPlayerNotReady(id);
  }
  /**
   * Clear ready status for all players
   */
  clearReady() {
    this.gamePhase.clearReady();
    for (let p of this.gameState.players.values()) p.isReady = false;
  }

  /**
   * Set a player's race and class
   * @param {string} id - Player's socket ID
   * @param {string} race - Selected race
   * @param {string} cls - Selected class
   */
  setPlayerClass(id, race, cls) {
    const p = this.gameState.getPlayer(id);
    if (!p) return;

    p.race = race;
    p.class = cls;

    // Apply abilities list from class definition using new config system
    p.abilities = config.getAllClassAbilities(cls).map((a) => ({ ...a }));
    p.unlocked = p.abilities.filter((a) => a.unlockAt <= this.level);

    // Apply racial and class stat modifications from gameBalance config
    const stats = config.gameBalance.calculateStats
      ? config.gameBalance.calculateStats(race, cls)
      : null;

    if (stats) {
      p.maxHp = stats.maxHp;
      p.armor = stats.armor;
      p.damageMod = stats.damageMod;
    } else {
      // Fallback in case of invalid race/class
      p.maxHp = 80;
      p.armor = 0;
      p.damageMod = 1.0;
      logger.warn('InvalidRaceClassCombination', {
        race,
        className: cls,
        playerName: p.name,
        playerId: p.id,
      });
    }

    p.hp = p.maxHp; // Set current HP to max HP

    // Assign racial ability from config
    const racialAbility = config.racialAbilities[race];
    if (racialAbility) {
      p.setRacialAbility(racialAbility);

      // Special setup for Stone Armor (Rockhewn)
      if (race === 'Rockhewn') {
        logger.debug('RockhewnStoneArmorStart', {
          playerName: p.name,
          armorValue: p.stoneArmorValue,
        });
        logger.debug('TotalEffectiveArmor', {
          playerName: p.name,
          effectiveArmor: p.getEffectiveArmor(),
        });
      }

      // Double-check Undying for Lich - ensure it's properly set up
      if (race === 'Lich') {
        logger.debug('LichSetupStart', { playerName: p.name });

        // Double-check that Undying is properly set up
        if (
          !p.racialEffects ||
          !p.racialEffects.resurrect ||
          !p.racialEffects.resurrect.active
        ) {
          logger.warn('UndyingSetupFailed', { playerName: p.name });
          p.racialEffects = p.racialEffects || {};
          p.racialEffects.resurrect = {
            resurrectedHp: racialAbility.params?.resurrectedHp || 1,
            active: true,
          };
          logger.debug(`UNDYING FIXED:`, p.racialEffects.resurrect);
        }
      }
    }
  }

  /**
   * Assign initial warlocks with scaling
   * @param {Array} preferredPlayerIds - Optional preferred player IDs
   */
  assignInitialWarlock(preferredPlayerIds = []) {
    // Initialize systems now that players have joined
    if (!this.systems) {
      this.systems = SystemsFactory.createSystems(this.players, this.monster, this.eventBus);
    }

    // Convert single ID to array for backward compatibility
    const preferredIds = Array.isArray(preferredPlayerIds)
      ? preferredPlayerIds
      : preferredPlayerIds
        ? [preferredPlayerIds]
        : [];

    const assignedWarlocks =
      this.systems.warlockSystem.assignInitialWarlocks(preferredIds);

    // Set phase to action when game starts
    this.gamePhase.toAction();

    return assignedWarlocks;
  }

  /**
   * Add a player action to the pending actions queue (IMPROVED - handles AOE abilities)
   * @param {string} actorId - Player performing the action
   * @param {string} actionType - Type of action
   * @param {string} targetId - Target of the action
   * @param {Object} options - Additional options
   * @returns {boolean} Success status
   */
  addAction(actorId, actionType, targetId, options = {}) {
    if (!this.gameState.hasStarted()) return false;
    const actor = this.gameState.getPlayer(actorId);

    // Validate action using game rules
    const validation = this.gameRules.validateActionSubmission(actor, actionType, targetId, this.systems);
    if (!validation.valid) {
      if (validation.reason === 'Ability on cooldown') {
        logger.debug('AbilityOnCooldownAttempt', {
          playerName: actor.name,
          actionType,
          cooldown: actor.getAbilityCooldown(actionType),
        });
      } else if (validation.reason === 'Unknown ability type') {
        logger.warn('UnknownAbilityType', { actionType, playerName: actor.name });
      }
      return false;
    }

    const ability = actor.unlocked.find((a) => a.type === actionType);

    // Handle target resolution
    let finalTargetId = targetId;

    if (targetId === 'multi') {
      // For AOE abilities, validation already checked this is valid
      finalTargetId = 'multi';
    } else {
      // Handle invisibility redirection for single-target abilities on player targets
      if (targetId !== '__monster__' && targetId !== actorId) {
        const targetPlayer = this.gameState.getPlayer(targetId);
        if (targetPlayer && targetPlayer.hasStatusEffect('invisible')) {
          finalTargetId = this.systems.gameStateUtils.getRandomTarget(actorId, {
            excludeIds: [targetId],
            includeMonster: true,
            monsterRef: this.systems.monsterController.getState(),
          });

          if (!finalTargetId) return false; // No valid redirect target
        }
      }
    }

    // Use Player's submission method instead of directly manipulating state
    const submissionResult = actor.submitAction(
      actionType,
      finalTargetId,
      options
    );

    if (!submissionResult.success) {
      logger.debug('ActionSubmissionFailedInGameRoom', {
        playerName: actor.name,
        reason: submissionResult.reason,
      });
      return false;
    }

    // Add the action to pending actions (but don't put ability on cooldown yet)
    this.gamePhase.addPendingAction({
      actorId,
      actionType,
      targetId: finalTargetId,
      options,
    });

    logger.info('PlayerSubmittedActionInGameRoom', {
      playerName: actor.name,
      actionType,
      targetId: finalTargetId,
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
    if (!this.gameState.hasStarted()) return false;

    const actor = this.gameState.getPlayer(actorId);
    
    // Validate racial action using game rules
    const validation = this.gameRules.validateRacialActionSubmission(
      actor, 
      targetId, 
      this.gamePhase.getPendingRacialActions(), 
      this.systems
    );
    
    if (!validation.valid) {
      if (validation.reason === 'Unknown racial ability type') {
        logger.warn('UnknownRacialAbilityTypeInGameRoom', {
          racialAbilityType: actor.racialAbility?.type,
          playerName: actor.name,
        });
      }
      return false;
    }

    let finalTargetId = targetId;
    if (targetId !== config.MONSTER_ID && targetId !== actorId) {
      const targetPlayer = this.gameState.getPlayer(targetId);
      if (!targetPlayer || !targetPlayer.isAlive) return false; // Invalid player target
      if (
        targetPlayer.hasStatusEffect &&
        targetPlayer.hasStatusEffect('invisible')
      ) {
        finalTargetId = this.systems.gameStateUtils.getRandomTarget(actorId, {
          excludeIds: [targetId],
          onlyPlayers: true,
        });
        if (!finalTargetId) return false; // No valid redirect
      }
    }

    this.gamePhase.addPendingRacialAction({
      actorId,
      targetId: finalTargetId,
      racialType: actor.racialAbility.type,
    });

    actor.useRacialAbility(); // Mark as used on the player object
    return true;
  }

  /**
   * Validate all submitted actions against current game state
   * @returns {Object} Validation results
   */
  validateAllSubmittedActions() {
    const results = {
      validActions: [],
      invalidActions: [],
      playersToReset: [],
    };

    const alivePlayers = this.getAlivePlayers();

    for (const player of this.gameState.getAllPlayers()) {
      if (!player.hasSubmittedAction) continue;

      const validation = player.validateSubmittedAction(
        alivePlayers,
        this.gameState.monster
      );

      if (validation.isValid) {
        results.validActions.push({
          playerId: player.id,
          action: player.submittedAction,
        });
      } else {
        results.invalidActions.push({
          playerId: player.id,
          reason: validation.reason,
          action: player.submittedAction,
        });
        results.playersToReset.push(player.id);
      }
    }

    return results;
  }

  /**
   * UPDATED: Update player unlocked abilities and activate passives
   * Called after level up
   */
  updateUnlockedAbilities() {
    for (const player of this.gameState.getAllPlayers()) {
      if (!player.abilities || !player.abilities.length) continue;

      const newlyUnlocked = [];

      for (const ability of player.abilities) {
        const alreadyUnlocked = player.unlocked.some(
          (a) => a.type === ability.type
        );

        if (ability.unlockAt <= this.level && !alreadyUnlocked) {
          const abilityCopy = { ...ability };
          player.unlocked.push(abilityCopy);
          newlyUnlocked.push(ability.name);

          // Auto-activate passive abilities when unlocked
          if (ability.effect === 'passive') {
            this.activatePassiveAbility(player, ability);
          }
        }
      }

      if (newlyUnlocked.length > 0) {
        logger.info('PlayerUnlockedAbilities', {
          playerName: player.name,
          abilities: newlyUnlocked,
        });
      }

      // Update Relentless Fury level scaling for existing Barbarians
      if (player.class === 'Barbarian' && player.classEffects?.relentlessFury) {
        player.classEffects.relentlessFury.currentLevel = this.gameState.level;
      }
    }
  }

  /**
   * NEW: Activate a passive ability for a player
   * @param {Player} player - Player object
   * @param {Object} ability - Ability configuration
   */
  activatePassiveAbility(player, ability) {
    // Create a fake log array for ability execution
    const log = [];

    // Execute the passive ability through the ability registry
    const success = this.systems.abilityRegistry.executeClassAbility(
      ability.type,
      player, // actor
      player, // target (self for passives)
      ability,
      log,
      this.systems
    );

    if (success && log.length > 0) {
      // Add passive activation messages to the next round's log
      this.gamePhase.addPendingPassiveActivations(log);
    }

    logger.debug('PassiveAbilityActivated', {
      playerName: player.name,
      abilityType: ability.type,
      success: success,
    });
  }

  /**
   * Get a list of currently alive players
   * @returns {Array} List of alive player objects
   */
  getAlivePlayers() {
    return this.gameState.getAlivePlayers();
  }

  /**
   * Check if all player actions have been submitted
   * @returns {boolean} Whether all actions are submitted
   */
  allActionsSubmitted() {
    const alivePlayers = this.getAlivePlayers();
    const status = this.gameRules.checkActionSubmissionStatus(alivePlayers, this.systems.statusEffectManager);

    // Log for debugging purposes
    logger.debug('ActionSubmissionCheck', {
      alivePlayers: alivePlayers.length,
      activePlayerCount: status.activePlayerCount,
      submittedActionCount: status.submittedActionCount,
      stunned: status.stunnedPlayers
    });

    return status.allSubmitted;
  }
cleanupInvalidSubmissions() {
  for (const player of this.gameState.getAllPlayers()) {
    if (!player.isAlive) {
      // Clear submissions from dead players
      if (player.hasSubmittedAction) {
        player.clearActionSubmission();
        logger.debug('ClearedDeadPlayerSubmission', { playerName: player.name });
      }
      continue;
    }

    // Clear submissions from currently stunned players
    if (this.systems.statusEffectManager.isPlayerStunned(player.id)) {
      if (player.hasSubmittedAction) {
        player.clearActionSubmission();
        logger.debug('ClearedStunnedPlayerSubmission', { playerName: player.name });
      }
    }
  }
}

/**
 * NEW: Force progression when players are unable to act
 * Use this as a safety mechanism if the game gets stuck
 * @returns {boolean} Whether forced progression was applied
 */
forceProgressionIfStuck() {
  const alivePlayers = this.getAlivePlayers();
  return this.gameRules.shouldForceProgression(alivePlayers, this.systems.statusEffectManager);
}

/**
 * UPDATED: Modified to use cleanup methods before checking submissions
 * @returns {boolean} Whether all actions are submitted
 */
allActionsSubmittedSafe() {
  // Clean up invalid submissions first
  this.cleanupInvalidSubmissions();
  
  // Check if we should force progression
  if (this.forceProgressionIfStuck()) {
    return true;
  }
  
  // Phase 2: Use command system to check submissions
  if (this.commandProcessor) {
    const alivePlayers = this.getAlivePlayers();
    const playersWithActions = this.commandProcessor.getPlayersWithSubmittedActions();
    
    // Check if all alive, non-stunned players have submitted
    for (const player of alivePlayers) {
      if (!player.hasStatusEffect || !player.hasStatusEffect('stunned')) {
        if (!playersWithActions.has(player.id)) {
          return false;
        }
      }
    }
    return true;
  }
  
  // Fallback to old system if command processor not available
  return this.allActionsSubmitted();
}
  /**
   * UPDATED: Process a game round with passive activation messages
   * @returns {Object} Round result with events and state updates
   */
  processRound() {
    const log = [];
    this.gamePhase.toResults();

    // Reset per-round racial ability uses and process cooldowns for all players
    for (let player of this.gameState.getAllPlayers()) {
      player.resetRacialPerRoundUses();
      player.processAbilityCooldowns();
    }

    // Add pending disconnect events first
    const disconnectEvents = this.gamePhase.getPendingDisconnectEvents();
    if (disconnectEvents.length > 0) {
      log.push(...disconnectEvents);
    }

    // Add pending passive activation messages
    const passiveActivations = this.gamePhase.getPendingPassiveActivations();
    if (passiveActivations.length > 0) {
      log.push(...passiveActivations);
    }

    // Process racial abilities first
    this.processRacialAbilities(log);

    // Monster ages and prepares to strike
    this.systems.monsterController.ageMonster();

    // Process player actions
    this.processPlayerActions(log);

    // Monster attacks
    this.systems.monsterController.attack(log, this.systems.combatSystem);

    // Process life bond healing for Kinfolk
    if (this.gameState.monster.hp > 0) {
      for (const player of this.gameState.getAllPlayers()) {
        if (player.race === 'Kinfolk' && player.isAlive) {
          player.processLifeBondHealing(this.gameState.monster.hp, log);
        }
      }
    }

    // Status effects tick-down
    this.systems.statusEffectManager.processTimedEffects(log);

    // Process class effects (including Barbarian passives)
    for (const player of this.gameState.getAllPlayers()) {
      if (player.isAlive) {
        const classEffectResult = player.processClassEffects();
        if (classEffectResult) {
          log.push(classEffectResult.message);
        }
      }
    }

    // Re-check for pending deaths after poison/timed effects
    for (const player of this.gameState.getAllPlayers()) {
      if (player.isAlive && player.hp <= 0) {
        player.pendingDeath = true;
        player.deathAttacker = 'Effects';
      }
    }

    // Process racial effects
    this.systems.racialAbilitySystem.processEndOfRoundEffects(log);

    // Process pending deaths
    this.systems.combatSystem.processPendingDeaths(log);

    // Monster death & level-up
    const oldLevel = this.gameState.level;
    const monsterDeathResult =
      this.systems.monsterController.handleDeathAndRespawn(this.gameState.level, log);
    
    if (monsterDeathResult.newLevel > oldLevel) {
      this.gameState.levelUp(monsterDeathResult.newLevel);
      
      logger.info(`Game level up: ${oldLevel} -> ${this.gameState.level}`);

      const levelUpLog = {
        type: 'level_up',
        public: true,
        message: messages.getEvent('levelUp', { level: this.gameState.level }),
        privateMessage: messages.getEvent('levelUp', { level: this.gameState.level }),
        attackerMessage: null,
      };
      log.push(levelUpLog);

      this.updateUnlockedAbilities();

      // Apply level up bonuses to all living players
      for (const player of this.gameState.getAllPlayers()) {
        if (player.isAlive) {
          const bonuses = this.gameRules.applyLevelUpBonuses(player, this.gameState.level);

          // Log individual improvements
          const improvementLog = {
            type: 'level_up_bonus',
            public: false,
            targetId: player.id,
            message: '',
            privateMessage: messages.getSuccess('bonusesApplied', {
              level: this.gameState.level,
              hpIncrease: bonuses.hpIncrease,
            }),
            attackerMessage: null,
          };
          log.push(improvementLog);
        }
      }
    }

    // Clear all action submissions for the new round
    for (const player of this.gameState.getAllPlayers()) {
      player.clearActionSubmission();
    }

    // Sort log entries - move corruption messages to the end
    const sortedLog = this.gameRules.sortLogEntries(log);

    // Update game state
    this.gameState.updateAliveCount();
    const winner = this.gameRules.checkWinConditions(
      this.systems.warlockSystem.getWarlockCount(),
      this.gameState.aliveCount
    );

    // Process log for clients
    const processedLog = this.gameRules.processLogForClients(sortedLog);

    // Reset phase to action for next round BEFORE returning results
    this.gamePhase.toAction();
    
    // Advance to next round
    this.gameState.nextRound();

    return {
      eventsLog: processedLog,
      players: this.getPlayersInfo(),
      monster: this.systems.monsterController.getState(),
      turn: this.gameState.round - 1, // Return current round number (before increment)
      level: this.gameState.level,
      levelUp:
        this.gameState.level > oldLevel ? { oldLevel, newLevel: this.gameState.level } : null,
      winner: winner,
    };
  }

  /**
   * Sort log entries to put certain types at the end
   * @param {Array} log - Raw log entries
   * @returns {Array} Sorted log entries
   * @private
   */
  sortLogEntries(log) {
    const regularEntries = [];
    const endEntries = [];

    log.forEach((entry) => {
      if (entry.moveToEnd || entry.type === 'corruption') {
        endEntries.push(entry);
      } else {
        regularEntries.push(entry);
      }
    });

    return [...regularEntries, ...endEntries];
  }

  /**
   * Process the log to ensure it works with both enhanced and legacy systems
   * @param {Array} log - Raw log entries
   * @returns {Array} Processed log entries
   * @private
   */
  processLogForClients(log) {
    return log.map((entry) => {
      // If it's already a string, keep it as is (legacy support)
      if (typeof entry === 'string') {
        return {
          type: 'basic',
          public: true,
          message: entry,
          privateMessage: entry,
          attackerMessage: entry,
          visibleTo: [],
        };
      }

      const processed = {
        type: entry.type || 'basic',
        public: entry.public !== true, // Default to false
        targetId: entry.targetId || null,
        attackerId: entry.attackerId || null,
        message: entry.message || '',
        privateMessage: entry.privateMessage || entry.message || '',
        attackerMessage: entry.attackerMessage || entry.message || '',
        // Include any additional metadata
        ...entry,
      };

      // Compute visibility list for private events
      if (processed.public === false) {
        const visSet = new Set(processed.visibleTo || []);
        if (processed.attackerId) visSet.add(processed.attackerId);
        if (processed.targetId) visSet.add(processed.targetId);
        processed.visibleTo = Array.from(visSet);
      } else {
        processed.visibleTo = [];
      }

      return processed;
    });
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

      const target =
        action.targetId === config.MONSTER_ID
          ? null
          : this.gameState.getPlayer(action.targetId);

      if (action.targetId !== config.MONSTER_ID && !target) {
        continue;
      }

      if (
        actor.racialAbility &&
        actor.racialAbility.type === action.racialType
      ) {
        try {
          // ENHANCED: Execute racial ability with systems parameter
          this.systems.abilityRegistry.executeRacialAbility(
            action.racialType,
            actor,
            target || action.targetId,
            actor.racialAbility,
            log,
            this.systems // Pass all systems including monsterController for threat tracking
          );
        } catch (error) {
          logger.error(
            `Error executing racial ability ${action.racialType}:`,
            error
          );
        }
      }
    }

    this.gamePhase.pendingRacialActions = [];
  }

  /**
   * Analyze pending actions to calculate coordination bonuses
   * This must happen BEFORE actions are executed
   * @returns {Map} Map of targetId -> coordination info
   */
  analyzeCoordination() {
    return this.gameRules.calculateCoordinationBonuses(
      this.gamePhase.getPendingActions(),
      this.gameState.players
    );
  }
  /**
   * Process all pending player actions (IMPROVED with proper cooldown timing and multi-target handling)
   * @param {Array} log - Event log to append messages to
   */
  processPlayerActions(log) {
    // NEW: Analyze coordination BEFORE executing any actions
    const coordinationMap = this.analyzeCoordination();

    // Sort actions by their order value (lower numbers first)
    this.pendingActions.sort((a, b) => {
      const actor1 = this.players.get(a.actorId);
      const actor2 = this.players.get(b.actorId);

      if (!actor1 || !actor2) return 0;

      const ability1 = actor1.unlocked.find(
        (ability) => ability.type === a.actionType
      );
      const ability2 = actor2.unlocked.find(
        (ability) => ability.type === b.actionType
      );

      if (!ability1 || !ability2) return 0;

      // Use default order from config if order is undefined
      const defaultOrder = config.gameBalance.combat.defaultOrders.special;
      const order1 =
        typeof ability1.order === 'number' ? ability1.order : defaultOrder;
      const order2 =
        typeof ability2.order === 'number' ? ability2.order : defaultOrder;

      return order1 - order2;
    });

    // Log coordination announcements first
    for (const [targetId, coordination] of coordinationMap.entries()) {
      if (coordination.coordinatedDamage) {
        const targetName =
          targetId === '__monster__'
            ? 'the Monster'
            : this.players.get(targetId)?.name || 'Unknown';
        const playerCount = coordination.damageActions.length;

        const coordinationLog = {
          type: 'coordination_announcement',
          public: true,
          message: `Coordinated attack! ${playerCount} players target ${targetName} for +${coordination.damageBonus}% damage!`,
          privateMessage: '',
          attackerMessage: '',
        };
        log.push(coordinationLog);
      }

      if (coordination.coordinatedHealing) {
        const targetName =
          targetId === '__monster__'
            ? 'the Monster'
            : this.players.get(targetId)?.name || 'Unknown';
        const playerCount = coordination.healingActions.length;

        const coordinationLog = {
          type: 'coordination_healing_announcement',
          public: true,
          message: `Coordinated healing! ${playerCount} players heal ${targetName} for +${coordination.healingBonus}% healing!`,
          privateMessage: '',
          attackerMessage: '',
        };
        log.push(coordinationLog);
      }
    }

    // Process actions in the sorted order
    for (const action of this.pendingActions) {
      const actor = this.players.get(action.actorId);
      if (
        !actor ||
        !actor.isAlive ||
        this.systems.statusEffectManager.isPlayerStunned(action.actorId)
      ) {
        if (
          actor &&
          this.systems.statusEffectManager.isPlayerStunned(action.actorId)
        ) {
          const stunnedLog = {
            type: 'stunned',
            public: false,
            targetId: actor.id,
            message: '',
            privateMessage: messages.privateMessages.youAreStunned,
            attackerMessage: '',
          };
          log.push(stunnedLog);
        }
        continue;
      }

      const ability = actor.unlocked.find((a) => a.type === action.actionType);
      if (!ability) continue;

      // Put ability on cooldown BEFORE execution to prevent double-use
      if (ability.cooldown > 0) {
        actor.putAbilityOnCooldown(action.actionType, ability.cooldown);
      }

      // NEW: Handle "multi" target for AOE abilities
      let target;
      let targetName;

      if (action.targetId === 'multi') {
        // For AOE abilities, target is handled by the ability handler
        target = 'multi';
        targetName = 'multiple targets';
      } else if (action.targetId === '__monster__') {
        target = '__monster__';
        targetName = 'the Monster';
      } else {
        // Handle player targets
        target = this.players.get(action.targetId);
        if (!target) {
          logger.warn(
            `Invalid target ${action.targetId} for action by ${actor.name}`
          );
          continue;
        }
        targetName = target.name;
      }

      // Check for invisibility right before executing the ability (only for single-target player abilities)
      if (
        target !== '__monster__' &&
        target !== 'multi' &&
        ability.category === 'Attack' &&
        target.hasStatusEffect &&
        target.hasStatusEffect('invisible')
      ) {
        const invisibleLog = {
          type: 'attack_invisible',
          public: false,
          attackerId: actor.id,
          targetId: target.id,
          message: '',
          privateMessage: '',
          attackerMessage: messages.getEvent('attackInvisible', {
            targetName: target.name,
          }),
        };
        log.push(invisibleLog);
        continue;
      }

      // Create action announcement log
      const actionLog = {
        type: 'action_announcement',
        public: false,
        attackerId: actor.id,
        targetId:
          target === '__monster__'
            ? 'monster'
            : target === 'multi'
              ? 'multi'
              : target.id,
        abilityName: ability.name,
        message: messages.getEvent('playerAttacks', {
          playerName: actor.name,
          abilityName: ability.name,
          targetName: targetName,
        }),
        privateMessage: '',
        attackerMessage: '',
      };
      log.push(actionLog);

      // Check for Last Stand - player at 0 HP but still alive
      if (actor.hp === 0 && actor.isAlive) {
        const lastStandLog = {
          type: 'last_stand',
          public: true,
          attackerId: actor.id,
          targetId: null,
          message: `${actor.name} makes a Last Stand!`,
          privateMessage: '',
          attackerMessage: '',
        };
        log.push(lastStandLog);
      }

      // NEW: Pass coordination info to ability execution
      const coordinationInfo = coordinationMap.get(action.targetId) || {
        damageBonus: 0,
        healingBonus: 0,
        coordinatedDamage: false,
        coordinatedHealing: false,
      };

      // ENHANCED: Execute the ability with coordination info
      this.systems.abilityRegistry.executeClassAbility(
        action.actionType,
        actor,
        target,
        ability,
        log,
        this.systems, // Pass all systems including monsterController for threat tracking
        coordinationInfo // NEW: Pass coordination information
      );
    }

    // Clear the pending actions queue
    this.gamePhase.clearPendingActions();
  }

  /**
   * Get info about all players for client updates (including enhanced submission status)
   * @returns {Array} Array of player info objects
   */
  getPlayersInfo() {
    const playersInfo = this.gameState.getPlayersInfo();
    
    // Phase 2: Update submission status based on command queue
    if (this.commandProcessor) {
      const playersWithActions = this.commandProcessor.getPlayersWithSubmittedActions();
      
      return playersInfo.map(playerInfo => ({
        ...playerInfo,
        hasSubmittedAction: playersWithActions.has(playerInfo.id),
        // Keep old submissionStatus for backward compatibility
        submissionStatus: playersWithActions.has(playerInfo.id) ? 'submitted' : 'none'
      }));
    }
    
    return playersInfo;
  }

  /**
   * Transfer player ID when they reconnect
   * @param {string} oldId - Old socket ID
   * @param {string} newId - New socket ID
   * @returns {boolean} Whether the transfer was successful
   */
  transferPlayerId(oldId, newId) {
    // Transfer in game state
    const success = this.gameState.transferPlayerId(oldId, newId);
    if (!success) {
      return false;
    }

    // Update pending actions in game phase
    this.gamePhase.updatePendingActionTargets(oldId, newId);

    // Update ready status
    if (this.gamePhase.isPlayerReady(oldId)) {
      this.gamePhase.setPlayerNotReady(oldId);
      this.gamePhase.setPlayerReady(newId);
    }

    return true;
  }

  /**
   * Get the player by socket ID
   * @param {string} socketId - Socket ID
   * @returns {Object|null} Player object or null if not found
   */
  getPlayerBySocketId(socketId) {
    return this.gameState.getPlayer(socketId);
  }

  /**
   * Get player by player ID
   * @param {string} playerId - Player ID
   * @returns {Object|null} Player object or null if not found
   */
  getPlayerById(playerId) {
    return this.gameState.getPlayer(playerId);
  }

  /**
   * Clean up expired disconnected players
   * @param {number} timeoutMs - Timeout in milliseconds (default: 10 minutes)
   * @returns {Array} Array of cleaned up player names
   */
  cleanupDisconnectedPlayers(timeoutMs = 10 * 60 * 1000) {
    return this.gameState.cleanupDisconnectedPlayers(timeoutMs);
  }

  /**
   * Set up event middleware for this game room
   * @private
   */
  _setupEventMiddleware() {
    // Add standard middleware stack
    const middleware = EventMiddleware.createStandardStack({
      enableLogging: process.env.NODE_ENV !== 'production',
      enableValidation: true,
      enableRateLimit: process.env.NODE_ENV === 'production', // Disable rate limiting in development
      enablePerformance: true,
      logEventData: false,
      maxEventsPerMinute: 200, // Higher limit for active games
      slowEventThreshold: 50
    });

    // Add each middleware to the event bus
    middleware.forEach(mw => this.eventBus.addMiddleware(mw));
  }

  /**
   * Set up event listeners for this game room
   * @private
   */
  _setupEventListeners() {
    // Listen for player events to update game state
    this.eventBus.on(EventTypes.PLAYER.JOINED, (event) => {
      logger.info(`Player joined game ${this.code}:`, {
        playerId: event.data.playerId,
        playerName: event.data.playerName
      });
    });

    this.eventBus.on(EventTypes.PLAYER.LEFT, (event) => {
      logger.info(`Player left game ${this.code}:`, {
        playerId: event.data.playerId,
        playerName: event.data.playerName
      });
    });

    // Listen for game state changes
    this.eventBus.on(EventTypes.GAME.STARTED, (event) => {
      logger.info(`Game started: ${this.code}`, {
        playerCount: event.data.playerCount
      });
    });

    this.eventBus.on(EventTypes.GAME.ENDED, (event) => {
      logger.info(`Game ended: ${this.code}`, {
        winner: event.data.winner,
        duration: event.data.duration
      });
    });

    // Listen for phase changes
    this.eventBus.on(EventTypes.PHASE.CHANGED, (event) => {
      logger.debug(`Phase changed in game ${this.code}:`, {
        oldPhase: event.data.oldPhase,
        newPhase: event.data.newPhase
      });
    });
  }

  /**
   * Get the game code for this room
   * @returns {string} Game code
   */
  getGameCode() {
    return this.code;
  }

  /**
   * Get the event bus for this game room
   * @returns {GameEventBus} Event bus instance
   */
  getEventBus() {
    return this.eventBus;
  }

  /**
   * Initialize the socket event router with the Socket.IO server
   * @param {Object} io - Socket.IO server instance
   */
  setSocketServer(io) {
    if (!this.socketEventRouter) {
      this.socketEventRouter = new SocketEventRouter(this, io);
      logger.info('Socket event router initialized for game:', {
        gameCode: this.code
      });
    }
  }

  /**
   * Get the socket event router for this game room
   * @returns {SocketEventRouter|null} Socket event router instance or null if not initialized
   */
  getSocketEventRouter() {
    return this.socketEventRouter;
  }

  /**
   * Register a socket with the event router
   * @param {Object} socket - Socket.IO socket instance
   */
  registerSocket(socket) {
    if (this.socketEventRouter) {
      this.socketEventRouter.registerSocket(socket);
    } else {
      logger.warn('Attempted to register socket before router initialization:', {
        gameCode: this.code,
        socketId: socket.id
      });
    }
  }

  /**
   * Map a player to their socket connection
   * @param {string} playerId - Player ID
   * @param {string} socketId - Socket ID
   */
  mapPlayerSocket(playerId, socketId) {
    if (this.socketEventRouter) {
      this.socketEventRouter.mapPlayerSocket(playerId, socketId);
    }
  }

  /**
   * Emit an event through the game's event bus
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   * @returns {Promise<boolean>} Success status
   */
  async emitEvent(eventType, eventData) {
    return await this.eventBus.emit(eventType, eventData);
  }

  /**
   * Get the command processor for this game room
   * @returns {CommandProcessor} Command processor instance
   */
  getCommandProcessor() {
    return this.commandProcessor;
  }

  /**
   * Submit a player action through the command system
   * @param {string} playerId - Player ID
   * @param {Object} actionData - Action data from client
   * @returns {Promise<string>} Command ID
   */
  async submitPlayerAction(playerId, actionData) {
    return await this.commandProcessor.submitActionData(playerId, actionData);
  }

  /**
   * Clean up event bus and command processor when game room is destroyed
   */
  destroy() {
    if (this.commandProcessor) {
      this.commandProcessor.destroy();
    }
    if (this.eventBus) {
      this.eventBus.destroy();
    }
  }
}

module.exports = { GameRoom };
