/**
 * @fileoverview Game room model with cooldown support
 * Manages game state, players, and coordinates systems with ability cooldowns
 */
const Player = require('./Player');
const config = require('@config');
const SystemsFactory = require('./systems/SystemsFactory');
const logger = require('@utils/logger');

/**
 * GameRoom class represents a single game instance with cooldown support
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
      logger.warn(
        `Invalid race/class combination: ${race}/${cls} for player ${p.name}`
      );
    }

    p.hp = p.maxHp; // Set current HP to max HP

    // Assign racial ability from config
    const racialAbility = config.racialAbilities[race];
    if (racialAbility) {
      p.setRacialAbility(racialAbility);

      // Special setup for Stone Armor (Dwarf)
      if (race === 'Dwarf') {
        logger.debug(
          `Dwarf ${p.name} starts with Stone Armor: ${p.stoneArmorValue} armor`
        );
        logger.debug(`Total effective armor: ${p.getEffectiveArmor()}`);
      }

      // Double-check Undying for Skeletons - ensure it's properly set up
      if (race === 'Skeleton') {
        logger.debug(
          `Skeleton racial ability set for ${p.name}:`,
          p.racialEffects
        );

        // If not set correctly, set it manually
        if (!p.racialEffects || !p.racialEffects.resurrect) {
          logger.debug(`Manually setting up Undying for ${p.name}`);
          p.racialEffects = p.racialEffects || {};
          p.racialEffects.resurrect = {
            resurrectedHp: racialAbility.params.resurrectedHp || 1,
          };
          logger.debug(`Undying now set:`, p.racialEffects);
        }
      }
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
   * Add a player action to the pending actions queue (with cooldown validation)
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
    if (this.pendingActions.some((a) => a.actorId === actorId)) return false; // Already acted

    // Find the ability being used
    const ability = actor.unlocked.find((a) => a.type === actionType);
    if (!ability) return false; // Ability not found or not unlocked

    // Check if ability is on cooldown
    if (actor.isAbilityOnCooldown(actionType)) {
      logger.debug(
        `Player ${actor.name} tried to use ${actionType} but it's on cooldown for ${actor.getAbilityCooldown(actionType)} more turns`
      );
      return false; // Ability is on cooldown
    }

    // Check if our registry knows this ability type
    if (!this.systems.abilityRegistry.hasClassAbility(actionType)) {
      logger.warn(`Unknown ability type: ${actionType}`);
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
          monsterRef: this.systems.monsterController.getState(),
        });

        if (!finalTargetId) return false; // No valid redirect target
      }
    }

    // Put ability on cooldown BEFORE adding to pending actions
    if (ability.cooldown > 0) {
      actor.putAbilityOnCooldown(actionType, ability.cooldown);
    }

    // Add the action to pending actions
    this.pendingActions.push({
      actorId,
      actionType,
      targetId: finalTargetId,
      options,
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
      logger.warn(`Unknown racial ability type: ${actor.racialAbility?.type}`);
      return false;
    }

    let finalTargetId = targetId;
    if (targetId !== '__monster__' && targetId !== actorId) {
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
   * Update player unlocked abilities based on current level
   * Called after level up
   */
  updateUnlockedAbilities() {
    for (const player of this.players.values()) {
      if (!player.abilities || !player.abilities.length) continue;

      // Check all abilities to see if they should be unlocked at the current level
      const newlyUnlocked = [];

      for (const ability of player.abilities) {
        const alreadyUnlocked = player.unlocked.some(
          (a) => a.type === ability.type
        );

        if (ability.unlockAt <= this.level && !alreadyUnlocked) {
          // Create a copy to avoid reference issues
          const abilityCopy = { ...ability };
          player.unlocked.push(abilityCopy);
          newlyUnlocked.push(ability.name);
        }
      }

      if (newlyUnlocked.length > 0) {
        logger.info(
          `Player ${player.name} unlocked abilities: ${newlyUnlocked.join(', ')}`
        );
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
    const activePlayerCount = this.getAlivePlayers().filter(
      (p) => !this.systems.statusEffectManager.isPlayerStunned(p.id)
    ).length;
    return this.pendingActions.length >= activePlayerCount;
  }

  /**
   * Process a game round (updated to handle cooldowns)
   * @returns {Object} Round result with events and state updates
   */
  processRound() {
    const log = [];

    // Reset per-round racial ability uses and process cooldowns for all players
    for (let player of this.players.values()) {
      player.resetRacialPerRoundUses();
      // Process ability cooldowns
      player.processAbilityCooldowns();
    }

    // Process racial abilities first
    this.processRacialAbilities(log);

    // Monster ages and prepares to strike
    this.systems.monsterController.ageMonster();

    // Process player actions
    this.processPlayerActions(log);

    // Monster attacks
    this.systems.monsterController.attack(log, this.systems.combatSystem);

    // Status effects tick-down
    this.systems.statusEffectManager.processTimedEffects(log);

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

      // Use config for level up message
      const levelUpLog = {
        type: 'level_up',
        public: true,
        message: config.messages.getEvent('levelUp', { level: this.level }),
        privateMessage: config.messages.success.newAbilitiesUnlocked.replace(
          '{level}',
          this.level
        ),
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
          player.hp = player.maxHp; // Set to new max after increase

          // Apply damage increase from config
          player.damageMod *= config.gameBalance.player.levelUp.damageIncrease;

          // Log individual improvements
          const improvementLog = {
            type: 'level_up_bonus',
            public: false,
            targetId: player.id,
            message: '',
            privateMessage: config.messages.getSuccess('bonusesApplied', {
              level: this.level,
              hpIncrease: hpIncrease,
            }),
            attackerMessage: null,
          };
          log.push(improvementLog);
        }
      }

      // Add individual ability unlock messages
      for (const player of this.players.values()) {
        if (player.isAlive) {
          const abilityUnlockLog = {
            type: 'ability_unlock',
            public: false,
            targetId: player.id,
            message: '',
            privateMessage:
              config.messages.success.newAbilitiesUnlocked.replace(
                '{level}',
                this.level
              ),
            attackerMessage: null,
          };
          log.push(abilityUnlockLog);
        }
      }
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

    // LOG THE EVENTS FOR FRONTEND TEAM
    logger.debug('=== EVENTS LOG FOR FRONTEND ===');
    logger.debug(`Game: ${this.code}, Round: ${this.round}`);
    logger.debug(
      JSON.stringify(processedLog.slice(0, 5), null, 2) + '... and more'
    );
    logger.debug('=== END EVENTS LOG ===');

    return {
      eventsLog: processedLog,
      players: this.getPlayersInfo(),
      monster: this.systems.monsterController.getState(),
      turn: this.round++,
      level: this.level,
      levelUp:
        this.level > oldLevel ? { oldLevel, newLevel: this.level } : null,
      winner,
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
        };
      }

      // If it's an enhanced log object, ensure it has all required properties
      return {
        type: entry.type || 'basic',
        public: entry.public !== false, // Default to public
        targetId: entry.targetId || null,
        attackerId: entry.attackerId || null,
        message: entry.message || '',
        privateMessage: entry.privateMessage || entry.message || '',
        attackerMessage: entry.attackerMessage || entry.message || '',
        // Include any additional metadata
        ...entry,
      };
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
        action.targetId === '__monster__'
          ? null
          : this.players.get(action.targetId);

      if (action.targetId !== '__monster__' && !target) {
        continue;
      }

      if (
        actor.racialAbility &&
        actor.racialAbility.type === action.racialType
      ) {
        try {
          this.systems.abilityRegistry.executeRacialAbility(
            action.racialType,
            actor,
            target || action.targetId,
            actor.racialAbility,
            log
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
   * Process all pending player actions
   * @param {Array} log - Event log to append messages to
   */
  processPlayerActions(log) {
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
            privateMessage: config.messages.privateMessages.youAreStunned,
            attackerMessage: '',
          };
          log.push(stunnedLog);
        }
        continue;
      }

      const ability = actor.unlocked.find((a) => a.type === action.actionType);
      if (!ability) continue;

      const target =
        action.targetId === '__monster__'
          ? '__monster__'
          : this.players.get(action.targetId);

      if (target !== '__monster__' && !target) {
        logger.warn(
          `Invalid target ${action.targetId} for action by ${actor.name}`
        );
        continue;
      }

      // Check for invisibility right before executing the ability
      if (
        target !== '__monster__' &&
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
          attackerMessage: config.messages.getEvent('attackInvisible', {
            targetName: target.name,
          }),
        };
        log.push(invisibleLog);
        continue;
      }

      // Create action announcement log - this shows who used what on whom
      const actionLog = {
        type: 'action_announcement',
        public: true,
        attackerId: actor.id,
        targetId: target === '__monster__' ? 'monster' : target.id,
        abilityName: ability.name,
        // Public message shows the action (visible to people involved)
        message: config.messages.getEvent('playerAttacks', {
          playerName: actor.name,
          abilityName: ability.name,
          targetName: target === '__monster__' ? 'the Monster' : target.name,
        }),
        // Private messages are empty since this is just an announcement
        privateMessage: '',
        attackerMessage: '',
      };
      log.push(actionLog);

      // Execute the ability (this will generate additional logs for damage, healing, etc.)
      this.systems.abilityRegistry.executeClassAbility(
        action.actionType,
        actor,
        target,
        ability,
        log
      );
    }

    // Clear the pending actions queue
    this.pendingActions = [];
  }

  /**
   * Get info about all players for client updates (including cooldowns)
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
}

module.exports = { GameRoom };
