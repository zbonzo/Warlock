/**
 * @fileoverview Fixed Ability Registry that properly passes coordination information
 * Maps ability types to their handler functions with enhanced parameter support
 */

import logger from '../utils/logger.js';
import config from '../config/index.js';
import { secureRandomFloat, secureRandomChoice } from '../utils/secureRandom.js';
// Messages are now accessed through the config system
import type { Player, Monster, Ability } from '../types/generated.js';

interface AbilityHandler {
  (
    _ability: Ability,
    _actor: Player,
    _target: Player | Monster | string,
    _game: any,
    _systems: any,
    _eventBus?: any,
    _log?: any[],
    _coordination?: {
      bonus: number;
      players: Player[];
      isCoordinated: boolean;
    },
    _comeback?: {
      bonus: number;
      isActive: boolean;
    }
  ): any;
}

interface RacialAbilityHandler {
  (
    _actor: Player,
    _target: Player | Monster | string,
    _game: any,
    _systems: any,
    _eventBus?: any,
    _log?: any[]
  ): any;
}

interface RegistrationStats {
  classAbilities: number;
  racialAbilities: number;
  totalAbilities: number;
}

interface DebugInfo extends Record<string, unknown> {
  classAbilities: string[];
  racialAbilities: string[];
  totalRegistered: number;
}

/**
 * AbilityRegistry manages the mapping of ability types to their handler functions
 * Enhanced to support coordination bonuses and comeback mechanics
 */
class AbilityRegistry {
  private classAbilities: Map<string, AbilityHandler>;
  private racialAbilities: Map<string, RacialAbilityHandler>;

  constructor() {
    this.classAbilities = new Map();
    this.racialAbilities = new Map();
  }

  /**
   * Register a class ability handler
   */
  registerClassAbility(abilityType: string, handler: AbilityHandler): void {
    this.classAbilities.set(abilityType, handler);
    logger.debug(`Registered class ability handler: ${abilityType}`);
  }

  /**
   * Register multiple class abilities with the same handler
   */
  registerClassAbilities(abilityTypes: string[], handler: AbilityHandler): void {
    abilityTypes.forEach((type) => {
      this.registerClassAbility(type, handler);
    });
  }

  /**
   * Register a racial ability handler (interface-compatible version)
   */
  registerRacialAbility(abilityType: string, handler: any): void {
    this.racialAbilities.set(abilityType, handler);
    logger.debug(`Registered racial ability handler: ${abilityType}`);
  }

  /**
   * Check if a class ability is registered
   */
  hasClassAbility(abilityType: string): boolean {
    return this.classAbilities.has(abilityType);
  }

  /**
   * Check if a racial ability is registered
   */
  hasRacialAbility(abilityType: string): boolean {
    return this.racialAbilities.has(abilityType);
  }

  /**
   * Execute a class ability (interface-compatible version)
   */
  executeClassAbility(
    abilityType: string,
    actor: any,
    target: any,
    ability: any,
    log: any[],
    systems: any,
    coordinationInfo?: any
  ): boolean {
    const handler = this.classAbilities.get(abilityType);
    if (!handler) {
      const errorMsg = `No handler registered for class ability: ${abilityType}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      return handler(ability, actor, target, null, systems, null, log, coordinationInfo);
    } catch (error) {
      logger.error(`Error executing class ability ${abilityType}:`, error as any);
      throw error;
    }
  }

  /**
   * Execute a racial ability (interface-compatible version)
   */
  executeRacialAbility(
    abilityType: string,
    actor: any,
    target: any,
    ability: any,
    log: any[],
    systems: any,
    _coordinationInfo?: any
  ): boolean {
    const handler = this.racialAbilities.get(abilityType);
    if (!handler) {
      const errorMsg = `No handler registered for racial ability: ${abilityType}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      return handler(actor, target, null, systems, null, log);
    } catch (error) {
      logger.error(`Error executing racial ability ${abilityType}:`, error as any);
      throw error;
    }
  }

  /**
   * Execute a class ability with enhanced coordination support (legacy version)
   */
  executeClassAbilityLegacy(
    abilityType: string,
    ability: Ability,
    actor: Player,
    target: Player | Monster | string,
    game: any,
    systems: any,
    eventBus?: any,
    log: any[] = [],
    coordination?: {
      bonus: number;
      players: Player[];
      isCoordinated: boolean;
    },
    comeback?: {
      bonus: number;
      isActive: boolean;
    }
  ): any {
    const handler = this.classAbilities.get(abilityType);
    if (!handler) {
      const errorMsg = `No handler registered for class ability: ${abilityType}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Handle critical hit/ultra fail logic before executing ability
    let finalTarget = target;
    let critMultiplier = 1;
    let outcome = 'normal';

    // Critical hit calculation (5% chance) using secure randomness
    if (secureRandomFloat() < config.gameBalance.abilityVariance.critChance) {
      critMultiplier = config.gameBalance.abilityVariance.critMultiplier;
      outcome = 'crit';
      logger.info(`Critical hit! ${actor.name} using ${ability.name}`);
    }

    // Ultra fail calculation (1% chance) using secure randomness
    if (secureRandomFloat() < config.gameBalance.abilityVariance.ultraFailChance && target !== 'multi') {
      // Ultra fail: hit random target instead
      outcome = 'ultraFail';
      critMultiplier = config.gameBalance.abilityVariance.critMultiplier;

      if (target === config.MONSTER_ID) {
        // Was targeting monster, now hit random player
        const alivePlayers = game.players.filter((p: Player) => p.status === 'alive');
        if (alivePlayers.length > 0) {
          finalTarget = secureRandomChoice(alivePlayers);

          log.push({
            type: 'ability_ultra_fail',
            public: false,
            attackerId: actor.id,
            message: '',
            privateMessage: `ULTRA FAIL! Your ${ability.name} hit ${finalTarget.name} instead of the Monster!`,
            attackerMessage: '',
          });
        }
      } else if (typeof target === 'object' && 'id' in target) {
        // Was targeting a player, now hit monster or different player
        if (secureRandomFloat() < 0.5) {
          finalTarget = config.MONSTER_ID;
          log.push({
            type: 'ability_ultra_fail',
            public: false,
            attackerId: actor.id,
            message: '',
            privateMessage: `ULTRA FAIL! Your ${ability.name} hit the Monster instead of ${target.name}!`,
            attackerMessage: '',
          });
        } else {
          const otherPlayers = game.players.filter(
            (p: Player) => p.status === 'alive' && p.id !== target.id && p.id !== actor.id
          );
          if (otherPlayers.length > 0) {
            finalTarget = secureRandomChoice(otherPlayers);
            log.push({
              type: 'ability_ultra_fail',
              public: false,
              attackerId: actor.id,
              message: '',
              privateMessage: `ULTRA FAIL! Your ${ability.name} hit ${finalTarget.name} instead!`,
              attackerMessage: '',
            });
          }
        }
      }
    }

    // Log critical hits
    if (outcome === 'crit' || outcome === 'ultraFail') {
      actor.tempCritMultiplier = critMultiplier;
      const categoryKey = (ability['category'] as string)?.toLowerCase() || 'general';
      const critMsg = config.getAbilityMessage(
        `abilities.${categoryKey}`,
        'abilityCrit'
      );
      const targetName = finalTarget === config.MONSTER_ID
        ? 'the Monster'
        : finalTarget === 'multi'
        ? 'multiple targets'
        : (finalTarget as Player).name;

      log.push({
        type: 'ability_crit',
        public: true,
        attackerId: actor.id,
        targetId: (finalTarget as any)?.id || (typeof finalTarget === 'string' ? finalTarget : null),
        message: config.formatMessage(critMsg || '', {
          playerName: actor.name,
          abilityName: ability.name,
          targetName,
          amount: (ability['params'] as any)?.['amount'] ||
                 (ability['params'] as any)?.['damage'] ||
                 (ability['params'] as any)?.['armor'] ||
                 '',
        }),
        privateMessage: '',
        attackerMessage: '',
      });
    }

    // Execute the ability handler with all parameters
    try {
      return handler(
        ability,
        actor,
        finalTarget,
        game,
        systems,
        eventBus,
        log,
        coordination,
        comeback
      );
    } catch (error) {
      logger.error(`Error executing class ability ${abilityType}:`, error as any);
      throw error;
    }
  }

  /**
   * Execute a racial ability (legacy version)
   */
  executeRacialAbilityLegacy(
    abilityType: string,
    actor: Player,
    target: Player | Monster | string,
    game: any,
    systems: any,
    eventBus?: any,
    log: any[] = []
  ): any {
    const handler = this.racialAbilities.get(abilityType);
    if (!handler) {
      const errorMsg = `No handler registered for racial ability: ${abilityType}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      return handler(actor, target, game, systems, eventBus, log);
    } catch (error) {
      logger.error(`Error executing racial ability ${abilityType}:`, error as any);
      throw error;
    }
  }

  /**
   * Get all registered class ability types
   */
  getRegisteredClassAbilities(): string[] {
    return Array.from(this.classAbilities.keys());
  }

  /**
   * Get all registered racial ability types
   */
  getRegisteredRacialAbilities(): string[] {
    return Array.from(this.racialAbilities.keys());
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.classAbilities.clear();
    this.racialAbilities.clear();
    logger.debug('Cleared all ability registrations');
  }

  /**
   * Get registration statistics
   */
  getStats(): RegistrationStats {
    return {
      classAbilities: this.classAbilities.size,
      racialAbilities: this.racialAbilities.size,
      totalAbilities: this.classAbilities.size + this.racialAbilities.size,
    };
  }

  /**
   * Get debug information about registered handlers
   */
  getDebugInfo(): DebugInfo {
    return {
      classAbilities: Array.from(this.classAbilities.keys()),
      racialAbilities: Array.from(this.racialAbilities.keys()),
      totalRegistered: this.classAbilities.size + this.racialAbilities.size,
    };
  }
}

export default AbilityRegistry;
export type { AbilityHandler, RacialAbilityHandler, RegistrationStats, DebugInfo };
