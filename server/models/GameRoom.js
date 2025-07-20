/**
 * @fileoverview Game room model with enhanced action submission and validation
 * Manages game state, players, and coordinates systems with proper cooldown timing
 */
const Player = require('./Player');
const config = require('@config');
const SystemsFactory = require('./systems/SystemsFactory');
const logger = require('@utils/logger');
const messages = require('@messages');

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
    this.players = new Map();
    this.hostId = null;
    this.started = false;
    this.round = 0;
    this.level = 1;
    this.phase = 'lobby'; // 'lobby', 'action', 'results'
    this.aliveCount = 0;
    this.pendingActions = [];
    this.pendingRacialActions = [];
    this.nextReady = new Set();
    this.disconnectedPlayers = [];

    // Monster setup from config
    this.monster = {
      hp: config.gameBalance.monster.baseHp,
      maxHp: config.gameBalance.monster.baseHp,
      baseDmg: config.gameBalance.monster.baseDamage,
      age: config.gameBalance.monster.baseAge,
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
    if (this.started || this.players.size >= config.maxPlayers) return false;

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

    // Clean up any pending actions for this player
    this.pendingActions = this.pendingActions.filter(
      (action) => action.actorId !== id
    );
    this.pendingRacialActions = this.pendingRacialActions.filter(
      (action) => action.actorId !== id
    );

    // Remove from ready set if present
    if (this.nextReady) {
      this.nextReady.delete(id);
    }
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

    // Apply abilities list from class definition using config
    p.abilities = (config.classAbilities[cls] || []).map((a) => ({ ...a }));
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
    // Convert single ID to array for backward compatibility
    const preferredIds = Array.isArray(preferredPlayerIds)
      ? preferredPlayerIds
      : preferredPlayerIds
        ? [preferredPlayerIds]
        : [];

    const assignedWarlocks =
      this.systems.warlockSystem.assignInitialWarlocks(preferredIds);

    // Set phase to action when game starts
    this.phase = 'action';

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
    if (!this.started) return false;
    const actor = this.players.get(actorId);

    // Basic validation
    if (
      !actor ||
      !actor.isAlive ||
      this.systems.statusEffectManager.isPlayerStunned(actorId)
    )
      return false;

    // Check if player already has an action submitted
    if (actor.hasSubmittedAction) return false;

    // Find the ability being used
    const ability = actor.unlocked.find((a) => a.type === actionType);
    if (!ability) return false; // Ability not found or not unlocked

    // Check if ability is on cooldown
    if (actor.isAbilityOnCooldown(actionType)) {
      logger.debug('AbilityOnCooldownAttempt', {
        playerName: actor.name,
        actionType,
        cooldown: actor.getAbilityCooldown(actionType),
      });
      return false; // Ability is on cooldown
    }

    // Check if our registry knows this ability type
    if (!this.systems.abilityRegistry.hasClassAbility(actionType)) {
      logger.warn('UnknownAbilityType', { actionType, playerName: actor.name });
      return false;
    }

    // NEW: Handle AOE abilities with "multi" target
    let finalTargetId = targetId;

    if (targetId === 'multi') {
      // For AOE abilities, keep "multi" as the target
      // The ability handlers will process this correctly
      const isAOEAbility =
        ability.target === 'Multi' ||
        ability.isAOE === true ||
        ability.targetType === 'multi' ||
        [
          'massHeal',
          'thunderStrike',
          'earthquake',
          'massStun',
          'groupHeal',
          'meteorShower',
          'infernoBlast',
          'chainLightning',
          'rejuvenation',
          'battleCry',
          'divineShield',
          'entangle',
          'poisonTrap',
        ].includes(ability.type);

      if (!isAOEAbility) {
        logger.warn('NonAoeAbilityWithMultiTarget', {
          playerName: actor.name,
          actionType,
        });
        return false;
      }

      // Keep finalTargetId as "multi" for AOE abilities
      finalTargetId = 'multi';
    } else {
      // Handle invisibility redirection for single-target abilities on player targets
      if (targetId !== '__monster__' && targetId !== actorId) {
        const targetPlayer = this.players.get(targetId);
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
    this.pendingActions.push({
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
    if (!this.started) return false;

    const actor = this.players.get(actorId);
    if (!actor || !actor.isAlive || !actor.canUseRacialAbility()) return false;
    if (this.pendingRacialActions.some((a) => a.actorId === actorId))
      return false; // Already used racial this round

    // Check if our registry knows this racial ability type
    if (
      !actor.racialAbility ||
      !this.systems.abilityRegistry.hasRacialAbility(actor.racialAbility.type)
    ) {
      logger.warn('UnknownRacialAbilityTypeInGameRoom', {
        racialAbilityType: actor.racialAbility?.type,
        playerName: actor.name,
      });
      return false;
    }

    let finalTargetId = targetId;
    if (targetId !== config.MONSTER_ID && targetId !== actorId) {
      const targetPlayer = this.players.get(targetId);
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

    this.pendingRacialActions.push({
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

    for (const player of this.players.values()) {
      if (!player.hasSubmittedAction) continue;

      const validation = player.validateSubmittedAction(
        alivePlayers,
        this.monster
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
    for (const player of this.players.values()) {
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

          // NEW: Auto-activate passive abilities when unlocked
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

      // NEW: Update Relentless Fury level scaling for existing Barbarians
      if (player.class === 'Barbarian' && player.classEffects?.relentlessFury) {
        player.classEffects.relentlessFury.currentLevel = this.level;
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
      if (!this.pendingPassiveActivations) {
        this.pendingPassiveActivations = [];
      }
      this.pendingPassiveActivations.push(...log);
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
    return this.systems.gameStateUtils.getAlivePlayers();
  }

  /**
   * Check if all player actions have been submitted
   * @returns {boolean} Whether all actions are submitted
   */
  allActionsSubmitted() {
    // Get all alive players
    const alivePlayers = this.getAlivePlayers();
    
    // Filter to only players who can currently act (not stunned)
    const activePlayerCount = alivePlayers.filter(player => {
      // Double-check stun status in real-time
      const isCurrentlyStunned = this.systems.statusEffectManager.isPlayerStunned(player.id);
      
      // Also check player's status effects directly as a fallback
      const hasStunEffect = player.hasStatusEffect && player.hasStatusEffect('stunned');
      
      // Player can act if they're not stunned by either check
      return !isCurrentlyStunned && !hasStunEffect;
    }).length;

    // Count valid submitted actions from non-stunned players
    const submittedActionCount = Array.from(this.players.values()).filter(player => {
      if (!player.isAlive) return false;
      if (!player.hasSubmittedAction) return false;
      if (player.actionValidationState !== 'valid') return false;
      
      // Double-check that this player is not currently stunned
      const isCurrentlyStunned = this.systems.statusEffectManager.isPlayerStunned(player.id);
      const hasStunEffect = player.hasStatusEffect && player.hasStatusEffect('stunned');
      
      return !isCurrentlyStunned && !hasStunEffect;
    }).length;

    // Log for debugging purposes
    logger.debug('ActionSubmissionCheck', {
      alivePlayers: alivePlayers.length,
      activePlayerCount: activePlayerCount,
      submittedActionCount: submittedActionCount,
      stunned: Array.from(this.players.values())
        .filter(p => p.isAlive && this.systems.statusEffectManager.isPlayerStunned(p.id))
        .map(p => p.name)
    });

    return submittedActionCount >= activePlayerCount;
  }
cleanupInvalidSubmissions() {
  for (const player of this.players.values()) {
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
  const activePlayerCount = alivePlayers.filter(player => 
    !this.systems.statusEffectManager.isPlayerStunned(player.id)
  ).length;
  
  // If no players can act, force progression
  if (activePlayerCount === 0) {
    logger.warn('ForceProgressionNoActivePlayers', {
      gameCode: this.code,
      aliveCount: alivePlayers.length,
      phase: this.phase
    });
    return true;
  }
  
  // Check for timeout scenario (if players haven't submitted in reasonable time)
  const submissionDeadline = Date.now() - (30 * 1000); // 30 seconds ago
  const playersWithRecentSubmissions = Array.from(this.players.values()).filter(player => {
    return player.isAlive && 
           !this.systems.statusEffectManager.isPlayerStunned(player.id) &&
           player.actionSubmissionTime &&
           player.actionSubmissionTime > submissionDeadline;
  });
  
  const playersWhoCanActCount = Array.from(this.players.values()).filter(player => {
    return player.isAlive && !this.systems.statusEffectManager.isPlayerStunned(player.id);
  }).length;
  
  // If players can act but haven't submitted recently, don't force yet
  if (playersWhoCanActCount > 0 && playersWithRecentSubmissions.length < playersWhoCanActCount) {
    return false;
  }
  
  return false; // Don't force progression under normal circumstances
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
  
  // Use the normal check
  return this.allActionsSubmitted();
}
  /**
   * UPDATED: Process a game round with passive activation messages
   * @returns {Object} Round result with events and state updates
   */
  processRound() {
    const log = [];
    this.phase = 'results';

    // Reset per-round racial ability uses and process cooldowns for all players
    for (let player of this.players.values()) {
      player.resetRacialPerRoundUses();
      player.processAbilityCooldowns();
    }

    // Add pending disconnect events first
    if (
      this.pendingDisconnectEvents &&
      this.pendingDisconnectEvents.length > 0
    ) {
      log.push(...this.pendingDisconnectEvents);
      this.pendingDisconnectEvents = [];
    }

    // NEW: Add pending passive activation messages
    if (
      this.pendingPassiveActivations &&
      this.pendingPassiveActivations.length > 0
    ) {
      log.push(...this.pendingPassiveActivations);
      this.pendingPassiveActivations = [];
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
    if (this.monster.hp > 0) {
      for (const player of this.players.values()) {
        if (player.race === 'Kinfolk' && player.isAlive) {
          player.processLifeBondHealing(this.monster.hp, log);
        }
      }
    }

    // Status effects tick-down
    this.systems.statusEffectManager.processTimedEffects(log);

    // Process class effects (including Barbarian passives)
    for (const player of this.players.values()) {
      if (player.isAlive) {
        const classEffectResult = player.processClassEffects();
        if (classEffectResult) {
          log.push(classEffectResult.message);
        }
      }
    }

    // Re-check for pending deaths after poison/timed effects
    for (const player of this.players.values()) {
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
    const oldLevel = this.level;
    const monsterDeathResult =
      this.systems.monsterController.handleDeathAndRespawn(this.level, log);
    this.level = monsterDeathResult.newLevel;

    // Handle level-up
    if (this.level > oldLevel) {
      logger.info(`Game level up: ${oldLevel} -> ${this.level}`);

      const levelUpLog = {
        type: 'level_up',
        public: true,
        message: messages.getEvent('levelUp', { level: this.level }),
        privateMessage: messages.getEvent('levelUp', { level: this.level }),
        attackerMessage: null,
      };
      log.push(levelUpLog);

      this.updateUnlockedAbilities();

      // Apply level up bonuses to all living players
      for (const player of this.players.values()) {
        if (player.isAlive) {
          // Full heal
          const oldHp = player.hp;
          player.hp = player.maxHp;

          // Apply HP increase from config
          const hpIncrease = Math.floor(
            player.maxHp * config.gameBalance.player.levelUp.hpIncrease
          );
          player.maxHp += hpIncrease;
          player.hp = player.maxHp;

          // Apply damage increase from config
          player.damageMod *= config.gameBalance.player.levelUp.damageIncrease;

          // Log individual improvements
          const improvementLog = {
            type: 'level_up_bonus',
            public: false,
            targetId: player.id,
            message: '',
            privateMessage: messages.getSuccess('bonusesApplied', {
              level: this.level,
              hpIncrease: hpIncrease,
            }),
            attackerMessage: null,
          };
          log.push(improvementLog);

          if (player.class === 'Barbarian') {
            player.updateRelentlessFuryLevel(this.level);
          }
        }
      }
    }

    // Clear all action submissions for the new round
    for (const player of this.players.values()) {
      player.clearActionSubmission();
    }

    // Sort log entries - move corruption messages to the end
    const sortedLog = this.sortLogEntries(log);

    // Update game state
    this.aliveCount = this.getAlivePlayers().length;
    const winner = this.systems.gameStateUtils.checkWinConditions(
      this.systems.warlockSystem.getWarlockCount(),
      this.aliveCount
    );

    // Process log for clients
    const processedLog = this.processLogForClients(sortedLog);

    // Reset phase to action for next round BEFORE returning results
    this.phase = 'action';

    return {
      eventsLog: this.processLogForClients(this.sortLogEntries(log)),
      players: this.getPlayersInfo(),
      monster: this.systems.monsterController.getState(),
      turn: this.round++,
      level: this.level,
      levelUp:
        this.level > oldLevel ? { oldLevel, newLevel: this.level } : null,
      winner: this.systems.gameStateUtils.checkWinConditions(
        this.systems.warlockSystem.getWarlockCount(),
        this.aliveCount
      ),
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
          : this.players.get(action.targetId);

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

    this.pendingRacialActions = [];
  }

  /**
   * NEW: Analyze pending actions to calculate coordination bonuses
   * This must happen BEFORE actions are executed
   * @returns {Map} Map of targetId -> coordination info
   */
  analyzeCoordination() {
    const coordinationMap = new Map();

    // Group actions by target
    const actionsByTarget = new Map();

    for (const action of this.pendingActions) {
      const actor = this.players.get(action.actorId);
      if (!actor || !actor.isAlive) continue;

      const ability = actor.unlocked.find((a) => a.type === action.actionType);
      if (!ability) continue;

      // Determine if this is a damage or healing ability
      const isDamageAbility =
        ability.category === 'Attack' || ability.params.damage > 0;
      const isHealingAbility =
        ability.category === 'Heal' || ability.params.amount > 0;

      if (!isDamageAbility && !isHealingAbility) continue;

      const targetId = action.targetId;

      if (!actionsByTarget.has(targetId)) {
        actionsByTarget.set(targetId, {
          damageActions: [],
          healingActions: [],
        });
      }

      const targetActions = actionsByTarget.get(targetId);

      if (isDamageAbility) {
        targetActions.damageActions.push({
          actorId: action.actorId,
          actionType: action.actionType,
          ability: ability,
          actor: actor,
        });
      } else if (isHealingAbility) {
        targetActions.healingActions.push({
          actorId: action.actorId,
          actionType: action.actionType,
          ability: ability,
          actor: actor,
        });
      }
    }

    // Calculate coordination bonuses for each target
    for (const [targetId, actions] of actionsByTarget.entries()) {
      const damageCount = actions.damageActions.length;
      const healingCount = actions.healingActions.length;

      coordinationMap.set(targetId, {
        damageActions: actions.damageActions,
        healingActions: actions.healingActions,
        damageBonus:
          damageCount > 1
            ? (damageCount - 1) *
              config.gameBalance.coordinationBonus.damageBonus
            : 0,
        healingBonus:
          healingCount > 1
            ? (healingCount - 1) *
              config.gameBalance.coordinationBonus.healingBonus
            : 0,
        coordinatedDamage: damageCount > 1,
        coordinatedHealing: healingCount > 1,
      });
    }

    return coordinationMap;
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
    this.pendingActions = [];
  }

  /**
   * Get info about all players for client updates (including enhanced submission status)
   * @returns {Array} Array of player info objects
   */
  getPlayersInfo() {
    return Array.from(this.players.values()).map((p) => ({
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
      statusEffects: p.statusEffects,
      abilityCooldowns: p.abilityCooldowns || {},
      hasSubmittedAction: p.hasSubmittedAction || false,
      submissionStatus: p.getSubmissionStatus(),
      stoneArmor: p.stoneArmorIntact
        ? {
            active: true,
            value: p.stoneArmorValue,
            effectiveArmor: p.getEffectiveArmor(),
          }
        : null,
    }));
  }

  /**
   * Transfer player ID when they reconnect
   * @param {string} oldId - Old socket ID
   * @param {string} newId - New socket ID
   * @returns {boolean} Whether the transfer was successful
   */
  transferPlayerId(oldId, newId) {
    // Check if the old ID exists
    if (!this.players.has(oldId)) {
      return false;
    }

    // Get the player
    const player = this.players.get(oldId);

    // Remove from old ID
    this.players.delete(oldId);

    // Update player's ID
    player.id = newId;

    // Add to new ID
    this.players.set(newId, player);

    // Update host if needed
    if (this.hostId === oldId) {
      this.hostId = newId;
    }

    // Also check and update pending actions
    this.pendingActions = this.pendingActions.map((action) => {
      if (action.actorId === oldId) {
        action.actorId = newId;
      }
      if (action.targetId === oldId) {
        action.targetId = newId;
      }
      return action;
    });

    // Update pending racial actions
    this.pendingRacialActions = this.pendingRacialActions.map((action) => {
      if (action.actorId === oldId) {
        action.actorId = newId;
      }
      if (action.targetId === oldId) {
        action.targetId = newId;
      }
      return action;
    });

    // Update ready players set
    if (this.nextReady.has(oldId)) {
      this.nextReady.delete(oldId);
      this.nextReady.add(newId);
    }

    return true;
  }

  /**
   * Get the player by socket ID
   * @param {string} socketId - Socket ID
   * @returns {Object|null} Player object or null if not found
   */
  getPlayerBySocketId(socketId) {
    return this.players.get(socketId) || null;
  }

  /**
   * Get player by player ID
   * @param {string} playerId - Player ID
   * @returns {Object|null} Player object or null if not found
   */
  getPlayerById(playerId) {
    return this.players.get(playerId) || null;
  }

  /**
   * Clean up expired disconnected players
   * @param {number} timeoutMs - Timeout in milliseconds (default: 10 minutes)
   * @returns {Array} Array of cleaned up player names
   */
  cleanupDisconnectedPlayers(timeoutMs = 10 * 60 * 1000) {
    const now = Date.now();
    const cleanedUp = [];
    
    this.disconnectedPlayers = this.disconnectedPlayers.filter(player => {
      if (now - player.disconnectedAt > timeoutMs) {
        cleanedUp.push(player.name);
        return false; // Remove from array
      }
      return true; // Keep in array
    });
    
    return cleanedUp;
  }
}

module.exports = { GameRoom };
