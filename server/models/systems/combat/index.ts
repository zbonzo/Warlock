/**
 * @fileoverview Combat system main module
 * Combines all combat-related functionality in a refactored structure
 */

import CoordinationTracker from './CoordinationTracker.js';
import ComebackMechanics from './ComebackMechanics.js';
import DamageCalculator from './DamageCalculator.js';

interface Player {
  id: string;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  isWarlock: boolean;
}

interface Monster {
  hp: number;
  maxHp: number;
}

interface MonsterController {
  getMonster(): Monster;
}

interface StatusEffectManager {
  // Define methods as needed
}

interface RacialAbilitySystem {
  // Define methods as needed
}

interface WarlockSystem {
  // Define methods as needed
}

interface GameStateUtils {
  // Define methods as needed
}

/**
 * RefactoredCombatSystem with separated concerns
 */
class RefactoredCombatSystem {
  private players: Map<string, Player>;
  private monsterController: MonsterController;
  private statusEffectManager: StatusEffectManager;
  private racialAbilitySystem: RacialAbilitySystem;
  private warlockSystem: WarlockSystem;
  private gameStateUtils: GameStateUtils;
  private coordinationTracker: CoordinationTracker;
  private comebackMechanics: ComebackMechanics;
  private damageCalculator: DamageCalculator;

  constructor(
    players: Map<string, Player>,
    monsterController: MonsterController,
    statusEffectManager: StatusEffectManager,
    racialAbilitySystem: RacialAbilitySystem,
    warlockSystem: WarlockSystem,
    gameStateUtils: GameStateUtils
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
  resetCoordinationTracking(): void {
    this.coordinationTracker.resetTracking();
    this.updateComebackStatus();
  }

  /**
   * Update comeback status based on current game state
   */
  updateComebackStatus(): boolean {
    const monster = this.monsterController.getMonster();
    return this.comebackMechanics.updateComebackStatus(monster);
  }

  /**
   * Track coordination between players
   */
  trackCoordination(actorId: string, targetId: string): void {
    this.coordinationTracker.trackCoordination(actorId, targetId);
  }

  /**
   * Get coordination count for a target
   */
  getCoordinationCount(targetId: string, excludeActorId: string): number {
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
  applyDamage(
    target: Player, 
    baseDamage: number, 
    attacker: Player | null, 
    damageType: string = 'physical', 
    options: any = {}
  ): number {
    // Calculate coordination bonus
    const coordinationInfo = this.coordinationTracker.calculateCoordinationBonus(
      attacker?.id || '',
      target?.id || 'monster'
    );

    // Calculate comeback bonus
    const comebackBonus = this.comebackMechanics.getComebackBonus(attacker);

    // Calculate final damage
    const damageResult = this.damageCalculator.calculateDamage(
      attacker,
      target,
      baseDamage,
      damageType as any,
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
  applyHealing(
    healer: Player | null, 
    target: Player, 
    baseAmount: number, 
    log: string[] = [], 
    options: any = {}
  ): number {
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
  getEnemyTargets(actor: Player): (Monster | Player)[] {
    const enemies: (Monster | Player)[] = [];
    
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
  getAllyTargets(actor: Player): Player[] {
    const allies: Player[] = [];
    
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

export {
  RefactoredCombatSystem,
  CoordinationTracker,
  ComebackMechanics,
  DamageCalculator
};

export default {
  RefactoredCombatSystem,
  CoordinationTracker,
  ComebackMechanics,
  DamageCalculator
};