/**
 * @fileoverview MonsterController with threat system implementation
 * This replaces/enhances the existing MonsterController.js
 */
const config = require('@config');
const messages = require('@messages');
const logger = require('@utils/logger');

/**
 * Enhanced MonsterController with threat-based targeting system
 * Manages monster state, behavior, and threat-based target selection
 */
class MonsterController {
  /**
   * Create a monster controller with threat system
   * @param {Object} monster - Monster state object
   * @param {Map} players - Map of player objects
   * @param {StatusEffectManager} statusEffectManager - Status effect manager
   * @param {RacialAbilitySystem} racialAbilitySystem - Racial ability system
   * @param {GameStateUtils} gameStateUtils - Game state utilities
   */
  constructor(
    monster,
    players,
    statusEffectManager,
    racialAbilitySystem,
    gameStateUtils
  ) {
    // Initialize existing properties
    this.monster = monster;
    this.players = players;
    this.statusEffectManager = statusEffectManager;
    this.racialAbilitySystem = racialAbilitySystem;
    this.gameStateUtils = gameStateUtils;

    // Initialize monster state if not set
    if (!this.monster.hp) this.monster.hp = config.gameBalance.monster.baseHp;
    if (!this.monster.maxHp)
      this.monster.maxHp = config.gameBalance.monster.baseHp;
    if (!this.monster.baseDmg)
      this.monster.baseDmg = config.gameBalance.monster.baseDamage;
    if (!this.monster.age)
      this.monster.age = config.gameBalance.monster.baseAge;

    // NEW: Initialize threat system
    this.threatTable = new Map(); // playerId -> threatValue
    this.lastTargets = []; // Array of recent target IDs
    this.threatConfig = config.gameBalance.monster.threat;

    logger.debug('MonsterController initialized with threat system:', {
      enabled: this.threatConfig?.enabled,
      decayRate: this.threatConfig?.decayRate,
      avoidLastTargetRounds: this.threatConfig?.avoidLastTargetRounds,
    });
  }

  /**
   * Get current monster state (existing method)
   * @returns {Object} Monster state object
   */
  getState() {
    return {
      hp: this.monster.hp,
      maxHp: this.monster.maxHp,
      nextDamage: this.calculateNextAttackDamage(),
      age: this.monster.age,
    };
  }

  /**
   * Calculate damage for next monster attack (existing method)
   * @returns {number} Damage amount
   * @private
   */
  calculateNextAttackDamage() {
    return config.gameBalance.calculateMonsterDamage
      ? config.gameBalance.calculateMonsterDamage(this.monster.age)
      : this.monster.baseDmg *
          (this.monster.age +
            config.gameBalance.monster.damageScaling.ageMultiplier);
  }

  // ===================
  // THREAT SYSTEM METHODS
  // ===================

  /**
   * Initialize threat for a new player
   * @param {string} playerId - Player ID to initialize
   */
  initializeThreat(playerId) {
    if (!this.threatTable.has(playerId)) {
      this.threatTable.set(playerId, 0);
    }
  }

  /**
   * Add threat to a player based on their actions
   * @param {string} playerId - Player who generated threat
   * @param {number} damageToMonster - Damage dealt to monster
   * @param {number} totalDamageDealt - Total damage dealt to all targets
   * @param {number} healingDone - Healing performed
   * @param {number} playerArmor - Player's current armor value
   */
  addThreat(
    playerId,
    damageToMonster = 0,
    totalDamageDealt = 0,
    healingDone = 0,
    playerArmor = 0
  ) {
    if (!this.threatConfig?.enabled) return;

    this.initializeThreat(playerId);

    const { armorMultiplier, damageMultiplier, healingMultiplier } =
      this.threatConfig;

    // Calculate threat using your formula: ((armor × damage to monster) + (total damage done to everyone) + (healing done))
    const armorThreat = playerArmor * damageToMonster * armorMultiplier;
    const damageThreat = totalDamageDealt * damageMultiplier;
    const healThreat = healingDone * healingMultiplier;

    const totalThreat = armorThreat + damageThreat + healThreat;

    if (totalThreat > 0) {
      const currentThreat = this.threatTable.get(playerId) || 0;
      this.threatTable.set(playerId, currentThreat + totalThreat);

      if (this.threatConfig.logThreatChanges) {
        logger.debug(
          `Threat added to ${this.players.get(playerId)?.name || playerId}: +${totalThreat.toFixed(1)} (Armor: ${armorThreat.toFixed(1)}, Damage: ${damageThreat.toFixed(1)}, Healing: ${healThreat.toFixed(1)}) = ${this.threatTable.get(playerId).toFixed(1)} total`
        );
      }
    }
  }

  /**
   * Apply threat decay to all players (called each round)
   */
  applyThreatDecay() {
    if (!this.threatConfig?.enabled) return;

    const decayRate = this.threatConfig.decayRate;
    const minThreshold = this.threatConfig.minimumThreatThreshold;

    for (const [playerId, threat] of this.threatTable.entries()) {
      const newThreat = threat * (1 - decayRate);

      if (newThreat < minThreshold) {
        this.threatTable.delete(playerId);
      } else {
        this.threatTable.set(playerId, newThreat);
      }
    }

    if (this.threatConfig.logThreatChanges) {
      logger.debug(`Applied ${decayRate * 100}% threat decay to all players`);
    }
  }

  /**
   * Reduce threat when monster dies/respawns
   */
  applyMonsterDeathThreatReduction() {
    if (!this.threatConfig?.enabled) return;

    const reductionRate = this.threatConfig.monsterDeathReduction;
    const minThreshold = this.threatConfig.minimumThreatThreshold;

    for (const [playerId, threat] of this.threatTable.entries()) {
      const newThreat = threat * (1 - reductionRate);

      if (newThreat < minThreshold) {
        this.threatTable.delete(playerId);
      } else {
        this.threatTable.set(playerId, newThreat);
      }
    }

    if (this.threatConfig.logThreatChanges) {
      logger.debug(
        `Applied ${reductionRate * 100}% threat reduction for monster death`
      );
    }
  }

  /**
   * Track the last target to avoid immediate re-targeting
   * @param {string} playerId - ID of the targeted player
   */
  trackLastTarget(playerId) {
    if (!this.threatConfig?.enabled || !playerId) return;

    this.lastTargets.unshift(playerId);

    // Keep only the last X targets based on config
    const maxTracked = this.threatConfig.avoidLastTargetRounds;
    if (this.lastTargets.length > maxTracked) {
      this.lastTargets = this.lastTargets.slice(0, maxTracked);
    }
  }

  /**
   * Check if a player was recently targeted
   * @param {string} playerId - Player ID to check
   * @returns {boolean} Whether the player was recently targeted
   */
  wasRecentlyTargeted(playerId) {
    if (!this.threatConfig?.enabled) return false;
    return this.lastTargets.includes(playerId);
  }

  /**
   * Clean up threat table for dead players
   */
  cleanupDeadPlayerThreat() {
    for (const [playerId] of this.threatTable.entries()) {
      const player = this.players.get(playerId);
      if (!player || !player.isAlive) {
        this.threatTable.delete(playerId);
      }
    }
  }

  // ===================
  // ENHANCED TARGETING
  // ===================

  /**
   * Select a target for monster attack using threat system
   * @returns {Object|null} Selected player or null if no valid target
   * @private
   */
  selectTarget() {
    // Use threat system if enabled, otherwise fall back to legacy targeting
    if (
      this.threatConfig?.enabled &&
      config.gameBalance.monster.targeting.useThreatSystem
    ) {
      return this.selectTargetByThreat();
    } else {
      return this.selectTargetLegacy();
    }
  }

  /**
   * Select target using threat-based logic
   * @returns {Object|null} Selected player or null if no valid target
   * @private
   */
  selectTargetByThreat() {
    const canAttackInvisible =
      config.gameBalance.monster.targeting.canAttackInvisible;
    const canAttackWarlock =
      config.gameBalance.monster.targeting.canAttackWarlock;

    // Get all valid targets (alive, visible, non-warlock)
    const validPlayers = Array.from(this.players.values()).filter(
      (p) =>
        p.isAlive &&
        (!p.hasStatusEffect ||
          !p.hasStatusEffect('invisible') ||
          canAttackInvisible) &&
        (canAttackWarlock || !p.isWarlock)
    );

    if (validPlayers.length === 0) {
      return null;
    }

    // Filter out recently targeted players
    const availablePlayers = validPlayers.filter(
      (p) => !this.wasRecentlyTargeted(p.id)
    );

    // If all players were recently targeted, use all valid players
    const targetPool =
      availablePlayers.length > 0 ? availablePlayers : validPlayers;

    // Get players with threat values
    const playersWithThreat = targetPool
      .map((player) => ({
        player,
        threat: this.threatTable.get(player.id) || 0,
      }))
      .filter((entry) => entry.threat > 0);

    // If no one has threat, fall back appropriately
    if (playersWithThreat.length === 0) {
      if (this.threatConfig.fallbackToLowestHp) {
        logger.debug('No threat found, falling back to lowest HP targeting');
        return this.gameStateUtils.getLowestHpPlayer(canAttackInvisible);
      }
      // Random selection from available players
      const randomIndex = Math.floor(Math.random() * targetPool.length);
      const selected = targetPool[randomIndex];
      this.trackLastTarget(selected.id);
      return selected;
    }

    // Find highest threat
    const maxThreat = Math.max(
      ...playersWithThreat.map((entry) => entry.threat)
    );
    const highestThreatPlayers = playersWithThreat.filter(
      (entry) => Math.abs(entry.threat - maxThreat) < 0.01 // Handle floating point comparison
    );

    // Handle tiebreaker
    let selectedTarget;
    if (highestThreatPlayers.length === 1) {
      selectedTarget = highestThreatPlayers[0].player;
    } else if (this.threatConfig.enableTiebreaker) {
      // Random selection among tied players (coinflip for ties)
      const randomIndex = Math.floor(
        Math.random() * highestThreatPlayers.length
      );
      selectedTarget = highestThreatPlayers[randomIndex].player;

      if (this.threatConfig.logThreatChanges) {
        logger.debug(
          `Threat tie broken randomly among ${highestThreatPlayers.length} players`
        );
      }
    } else {
      // Take first player (deterministic)
      selectedTarget = highestThreatPlayers[0].player;
    }

    // Track this target to avoid immediate re-targeting
    this.trackLastTarget(selectedTarget.id);

    if (this.threatConfig.logThreatChanges) {
      logger.debug(
        `Selected target: ${selectedTarget.name} (Threat: ${this.threatTable.get(selectedTarget.id)?.toFixed(1) || 0})`
      );
    }

    return selectedTarget;
  }

  /**
   * Legacy target selection (original logic) - fallback method
   * @returns {Object|null} Selected player or null if no valid target
   * @private
   */
  selectTargetLegacy() {
    // Use monster targeting preferences from config
    const preferLowestHp = config.gameBalance.monster.targeting.preferLowestHp;
    const canAttackInvisible =
      config.gameBalance.monster.targeting.canAttackInvisible;
    const fallbackToHighestHp =
      config.gameBalance.monster.targeting.fallbackToHighestHp;
    const canAttackWarlock =
      config.gameBalance.monster.targeting.canAttackWarlock;

    // Get all non-warlock visible players
    const visiblePlayers = Array.from(this.players.values()).filter(
      (p) =>
        p.isAlive &&
        (!p.hasStatusEffect ||
          !p.hasStatusEffect('invisible') ||
          canAttackInvisible) &&
        (canAttackWarlock || !p.isWarlock)
    );

    // If no visible targets, return null
    if (visiblePlayers.length === 0) {
      return fallbackToHighestHp
        ? this.gameStateUtils.getHighestHpPlayer(canAttackInvisible)
        : null;
    }

    if (preferLowestHp) {
      // Find the player with lowest HP
      return this.gameStateUtils.getLowestHpPlayer(canAttackInvisible);
    } else {
      // Select a random visible player
      const randomIndex = Math.floor(Math.random() * visiblePlayers.length);
      return visiblePlayers[randomIndex];
    }
  }

  /**
   * Get current threat information for debugging/display
   * @returns {Object} Threat information
   */
  getThreatInfo() {
    if (!this.threatConfig?.enabled) {
      return { enabled: false };
    }

    const threatData = {};
    for (const [playerId, threat] of this.threatTable.entries()) {
      const player = this.players.get(playerId);
      if (player) {
        threatData[playerId] = {
          playerName: player.name,
          threat: Math.round(threat * 10) / 10, // Round to 1 decimal
        };
      }
    }

    return {
      enabled: true,
      threatTable: threatData,
      lastTargets: this.lastTargets.map((id) => {
        const player = this.players.get(id);
        return { playerId: id, playerName: player?.name || 'Unknown' };
      }),
      config: this.threatConfig,
    };
  }

  // ===================
  // ENHANCED EXISTING METHODS
  // ===================

  /**
   * Age the monster, increasing its aggression and applying threat decay
   */
  ageMonster() {
    this.monster.age += 1;

    // Apply threat decay each round
    this.applyThreatDecay();
  }

  /**
   * Apply damage to the monster (existing method)
   * @param {number} amount - Amount of damage
   * @param {Object} attacker - Player who attacked
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the attack was successful
   */
  takeDamage(amount, attacker, log = []) {
    if (this.monster.hp <= 0) {
      log.push(
        messages.getEvent('monsterAlreadyDefeated', {
          playerName: attacker.name,
        })
      );
      return false;
    }

    // Apply damage
    this.monster.hp = Math.max(0, this.monster.hp - amount);

    // Log attack using config messages
    log.push(
      messages.getEvent('playerAttacksMonster', {
        playerName: attacker.name,
        damage: amount,
      })
    );

    if (this.monster.hp > 0) {
      log.push(
        messages.getEvent('monsterHpRemaining', {
          hp: this.monster.hp,
          maxHp: this.monster.maxHp,
        })
      );
    } else {
      log.push(messages.getEvent('monsterDefeated'));
    }

    return true;
  }

  /**
   * Monster attacks a player (enhanced with threat tracking)
   * @param {Array} log - Event log to append messages to
   * @param {CombatSystem} combatSystem - Combat system for damage application
   * @returns {Object|null} Attacked player or null if no attack
   */
  attack(log, combatSystem) {
    // Don't attack if defeated
    if (this.monster.hp <= 0) return null;

    // Clean up threat for dead players before selecting target
    this.cleanupDeadPlayerThreat();

    // Find the target using threat system
    const target = this.selectTarget();
    if (!target) {
      // Enhanced log for no target found
      const logEvent = {
        type: 'monster_no_target',
        public: true,
        message: messages.events.monsterNoTarget,
        privateMessage: messages.events.monsterNoTarget,
        attackerMessage: messages.events.monsterNoTarget,
      };
      log.push(logEvent);
      return null;
    }

    // Check again for invisibility right before attacking
    if (target.hasStatusEffect && target.hasStatusEffect('invisible')) {
      const logEvent = {
        type: 'monster_invisible_target',
        public: true,
        message: messages.events.monsterSwipesAtShadows,
        privateMessage: messages.events.monsterSwipesAtShadows,
        attackerMessage: messages.events.monsterSwipesAtShadows,
      };
      log.push(logEvent);
      return null;
    }

    // Calculate damage
    const damage = this.calculateNextAttackDamage();

    // Create a general "Monster attacks" message
    const attackAnnouncement = {
      type: 'monster_attack_announcement',
      public: true,
      message: messages.events.monsterAttacks,
      privateMessage: messages.events.monsterAttacks,
      attackerMessage: messages.events.monsterAttacks,
    };
    log.push(attackAnnouncement);

    // Apply damage (this will create the personalized damage log)
    combatSystem.applyDamageToPlayer(
      target,
      damage,
      { name: 'The Monster' },
      log
    );

    return target;
  }

  /**
   * Handle monster death and respawn for new level (enhanced with threat management)
   * @param {number} currentLevel - Current game level
   * @param {Array} log - Event log to append messages to
   * @returns {Object} Result with new level and monster state
   */
  handleDeathAndRespawn(currentLevel, log) {
    // If monster isn't dead, do nothing
    if (this.monster.hp > 0) {
      return { newLevel: currentLevel, monsterState: this.getState() };
    }

    // Calculate new level
    const newLevel = currentLevel + 1;

    // Apply threat reduction when monster dies/respawns
    this.applyMonsterDeathThreatReduction();

    // Respawn monster with increased health based on config
    const newMonsterHp = config.gameBalance.calculateMonsterHp
      ? config.gameBalance.calculateMonsterHp(newLevel)
      : config.gameBalance.monster.baseHp +
        (newLevel - 1) * config.gameBalance.monster.hpPerLevel;

    this.monster.hp = newMonsterHp;
    this.monster.maxHp = newMonsterHp;
    this.monster.age = config.gameBalance.monster.baseAge;

    // Log respawn using config messages
    log.push(messages.getEvent('levelUp', { level: newLevel }));
    log.push(messages.getEvent('monsterRespawns', { hp: newMonsterHp }));

    return {
      newLevel,
      monsterState: this.getState(),
    };
  }

  /**
   * Check if monster is dead (existing method)
   * @returns {boolean} Whether the monster is dead
   */
  isDead() {
    return this.monster.hp <= 0;
  }
}

module.exports = MonsterController;


