/**
 * @fileoverview Combat system main module
 * Combines all combat-related functionality in a refactored structure
 */
const CoordinationTracker = require('./CoordinationTracker');
const ComebackMechanics = require('./ComebackMechanics');
const DamageCalculator = require('./DamageCalculator');

/**
 * RefactoredCombatSystem with separated concerns
 */
class RefactoredCombatSystem {
  constructor(
    players,
    monsterController,
    statusEffectManager,
    racialAbilitySystem,
    warlockSystem,
    gameStateUtils
  ) {
    this.players = players;
    this.monsterController = monsterController;
    this.statusEffectManager = statusEffectManager;
    this.racialAbilitySystem = racialAbilitySystem;
    this.warlockSystem = warlockSystem;
    this.gameStateUtils = gameStateUtils;

    // Initialize modular systems
    this.coordinationTracker = new CoordinationTracker();
    this.comebackMechanics = new ComebackMechanics(players);
    this.damageCalculator = new DamageCalculator();
  }

  /**
   * Reset for new round
   */
  resetCoordinationTracking() {
    this.coordinationTracker.resetTracking();
    this.updateComebackStatus();
  }

  /**
   * Update comeback status based on current game state
   */
  updateComebackStatus() {
    const monster = this.monsterController.getMonster();
    return this.comebackMechanics.updateComebackStatus(monster);
  }

  /**
   * Track coordination between players
   */
  trackCoordination(actorId, targetId) {
    this.coordinationTracker.trackCoordination(actorId, targetId);
  }

  /**
   * Get coordination count for a target
   */
  getCoordinationCount(targetId, excludeActorId) {
    return this.coordinationTracker.getCoordinationCount(targetId, excludeActorId);
  }

  /**
   * Get coordination statistics
   */
  getCoordinationStats() {
    return this.coordinationTracker.getCoordinationStats();
  }

  /**
   * Apply damage to a player with all modifiers
   */
  applyDamage(target, baseDamage, attacker, damageType = 'physical', options = {}) {
    // Calculate coordination bonus
    const coordinationInfo = this.coordinationTracker.calculateCoordinationBonus(
      attacker?.id,
      target?.id || 'monster'
    );

    // Calculate comeback bonus
    const comebackBonus = this.comebackMechanics.getComebackBonus(attacker);

    // Calculate final damage
    const damageResult = this.damageCalculator.calculateDamage(
      attacker,
      target,
      baseDamage,
      damageType,
      {
        coordinationBonus: coordinationInfo.bonus,
        comebackBonus,
        ...options
      }
    );

    // Apply the damage
    const actualDamage = Math.min(damageResult.finalDamage, target.hp);
    target.hp = Math.max(0, target.hp - actualDamage);

    return actualDamage;
  }

  /**
   * Apply healing to a player
   */
  applyHealing(healer, target, baseAmount, log = [], options = {}) {
    // Calculate comeback bonus
    const comebackBonus = this.comebackMechanics.getComebackBonus(healer);

    // Calculate final healing
    const healingResult = this.damageCalculator.calculateHealing(
      healer,
      target,
      baseAmount,
      {
        comebackBonus,
        ...options
      }
    );

    // Apply the healing
    const actualHealing = Math.min(healingResult.finalAmount, target.maxHp - target.hp);
    target.hp = Math.min(target.maxHp, target.hp + actualHealing);

    return actualHealing;
  }

  /**
   * Get enemy targets for a player
   */
  getEnemyTargets(actor) {
    const enemies = [];
    
    // Add monster as enemy if it's alive
    const monster = this.monsterController.getMonster();
    if (monster && monster.hp > 0) {
      enemies.push(monster);
    }

    // Add warlock players as enemies if actor is good
    if (!actor.isWarlock) {
      for (const player of this.players.values()) {
        if (player.isWarlock && player.isAlive) {
          enemies.push(player);
        }
      }
    }

    // Add good players as enemies if actor is warlock
    if (actor.isWarlock) {
      for (const player of this.players.values()) {
        if (!player.isWarlock && player.isAlive && player.id !== actor.id) {
          enemies.push(player);
        }
      }
    }

    return enemies;
  }

  /**
   * Get ally targets for a player
   */
  getAllyTargets(actor) {
    const allies = [];
    
    // Add players of same alignment
    for (const player of this.players.values()) {
      if (player.id !== actor.id && player.isAlive && player.isWarlock === actor.isWarlock) {
        allies.push(player);
      }
    }

    return allies;
  }

  // Re-export methods that don't need refactoring for compatibility
  // ... (other methods would be delegated to the original CombatSystem or reimplemented)
}

module.exports = {
  RefactoredCombatSystem,
  CoordinationTracker,
  ComebackMechanics,
  DamageCalculator
};