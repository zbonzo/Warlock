/**
 * @fileoverview System for managing monster state, behavior, and interactions
 * Centralizes monster logic and respawn mechanics
 */
const config = require('@config');
const messages = require('@messages');
const logger = require('@utils/logger');

/**
 * MonsterController manages the monster entity in the game
 * Handles damage, attack patterns, aging, and respawn
 */
class MonsterController {
  /**
   * Create a monster controller
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
  }

  /**
   * Get current monster state
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
   * Calculate damage for next monster attack
   * @returns {number} Damage amount
   * @private
   */
  calculateNextAttackDamage() {
    // Use the damage calculation from config
    return config.gameBalance.calculateMonsterDamage
      ? config.gameBalance.calculateMonsterDamage(this.monster.age)
      : this.monster.baseDmg *
          (this.monster.age +
            config.gameBalance.monster.damageScaling.ageMultiplier);
  }

  /**
   * Age the monster, increasing its aggression
   */
  ageMonster() {
    this.monster.age += 1;
  }

  /**
   * Apply damage to the monster
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
   * Monster attacks a random player
   * @param {Array} log - Event log to append messages to
   * @param {CombatSystem} combatSystem - Combat system for damage application
   * @returns {Object|null} Attacked player or null if no attack
   */
  attack(log, combatSystem) {
    // Don't attack if defeated
    if (this.monster.hp <= 0) return null;

    // Find the target
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
   * Select a target for monster attack
   * @returns {Object|null} Selected player or null if no valid target
   * @private
   */
  selectTarget() {
    // Use monster targeting preferences from config
    const preferLowestHp = config.gameBalance.monster.targeting.preferLowestHp;
    const canAttackInvisible =
      config.gameBalance.monster.targeting.canAttackInvisible;
    const fallbackToHighestHp =
      config.gameBalance.monster.targeting.fallbackToHighestHp;

    // Get all visible players
    const visiblePlayers = Array.from(this.players.values()).filter(
      (p) =>
        p.isAlive &&
        (!p.hasStatusEffect ||
          !p.hasStatusEffect('invisible') ||
          canAttackInvisible)
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
   * Handle monster death and respawn for new level
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
   * Check if monster is dead
   * @returns {boolean} Whether the monster is dead
   */
  isDead() {
    return this.monster.hp <= 0;
  }
}

module.exports = MonsterController;
