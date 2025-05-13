/**
 * @fileoverview System for managing monster state, behavior, and interactions
 * Centralizes monster logic and respawn mechanics
 */

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
  constructor(monster, players, statusEffectManager, racialAbilitySystem, gameStateUtils) {
    this.monster = monster;
    this.players = players;
    this.statusEffectManager = statusEffectManager;
    this.racialAbilitySystem = racialAbilitySystem;
    this.gameStateUtils = gameStateUtils;
    
    // Initialize monster state if not set
    if (!this.monster.hp) this.monster.hp = 100;
    if (!this.monster.maxHp) this.monster.maxHp = 100;
    if (!this.monster.baseDmg) this.monster.baseDmg = 10;
    if (!this.monster.age) this.monster.age = 0;
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
      age: this.monster.age
    };
  }
  
  /**
   * Calculate damage for next monster attack
   * @returns {number} Damage amount
   * @private
   */
  calculateNextAttackDamage() {
    // Damage increases with monster age
    return this.monster.baseDmg * (this.monster.age + 1);
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
      log.push(`${attacker.name} attacks the Monster, but it's already defeated.`);
      return false;
    }
    
    // Apply damage
    this.monster.hp = Math.max(0, this.monster.hp - amount);
    
    // Log attack
    log.push(`${attacker.name} hits the Monster for ${amount} damage!`);
    if (this.monster.hp > 0) {
      log.push(`The Monster has ${this.monster.hp}/${this.monster.maxHp} HP remaining.`);
    } else {
      log.push(`The Monster has been defeated!`);
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
    
    // Find the target (lowest HP player who isn't invisible)
    const target = this.selectTarget();
    if (!target) {
      log.push(`The Monster looks for a target, but no one is visible.`);
      return null;
    }
    
    // Calculate damage
    const damage = this.calculateNextAttackDamage();
    
    // Log attack
    log.push(`The Monster attacks ${target.name}!`);
    
    // Apply damage
    combatSystem.applyDamageToPlayer(target, damage, { name: 'The Monster' }, log);
    
    return target;
  }
  
  /**
   * Select a target for monster attack
   * @returns {Object|null} Selected player or null if no valid target
   * @private
   */
  selectTarget() {
    // Try to find the player with lowest HP who isn't invisible
    const lowestHpPlayer = this.gameStateUtils.getLowestHpPlayer(false);
    
    // If no visible targets, pick the player with highest HP
    if (!lowestHpPlayer) {
      return this.gameStateUtils.getHighestHpPlayer(true);
    }
    
    return lowestHpPlayer;
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
    
    // Respawn monster with increased health
    const newMonsterHp = 100 + (newLevel - 1) * 50;
    this.monster.hp = newMonsterHp;
    this.monster.maxHp = newMonsterHp;
    this.monster.age = 0;
    
    // Log respawn
    log.push(`The Monster has been defeated! Level ${newLevel} begins.`);
    log.push(`A new Monster appears with ${newMonsterHp} HP!`);
    
    return {
      newLevel,
      monsterState: this.getState()
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