/**
 * @fileoverview Factory class for creating and connecting game systems
 * Centralizes system creation and dependency injection
 * Migrated to TypeScript for Phase 6
 */

import type { Player, Monster } from '../../types/generated.js';
import type { MonsterState } from '../game/GameState.js';
import type { AbilityRegistry as AbilityRegistryInterface } from './abilityHandlers/abilityRegistryUtils.js';
import { registerAbilityHandlers } from './abilityHandlers/index.js';

import GameStateUtils from './GameStateUtils.js';
import StatusEffectManager from './StatusEffectManager.js'; // Legacy - will be replaced
import NewStatusEffectManager from './NewStatusEffectManager.js';
import StatusEffectSystemFactory from './StatusEffectSystemFactory.js';
import RacialAbilitySystemClass from './RacialAbilitySystem.js';
import WarlockSystem from './WarlockSystem.js';
import MonsterController from '../../controllers/MonsterController.js';
import CombatSystem from './CombatSystem.js';
import AbilityRegistryClass from '../AbilityRegistry.js';
import messages from '../../config/messages/index.js';
import { GameEventBus } from '../events/GameEventBus.js';

/**
 * Status effect system interface
 */
interface StatusEffectSystem {
  manager: any;
  hasEffect: (targetId: string, effectType: string) => boolean;
  applyEffect(
    targetId: string,
    type: string,
    params: any,
    sourceId: string | null,
    sourceName: string | null,
    log: any[]
  ): any;
}

/**
 * System collection interface
 */
export interface GameSystems {
  players: Map<string, Player>;
  gameStateUtils: any;
  statusEffectManager: any;
  statusEffectSystem: StatusEffectSystem;
  warlockSystem: any;
  racialAbilitySystem: any;
  monsterController: any;
  combatSystem: any;
  abilityRegistry: AbilityRegistryInterface;
  monster: {
    hp: number;
  };
  game?: any; // Game state or context
  calculateDamageModifiers?: (actor: Player, target: Player | Monster, ability: any) => number;
  comebackMechanics?: {
    getBonus: (playerId: string) => number;
  };
}

/**
 * Enhanced SystemsFactory to ensure AbilityRegistry has access to all systems
 */
export class SystemsFactory {
  /**
   * Create all game systems with proper dependency injection
   * @param players - Map of player objects
   * @param monster - Monster state object
   * @param eventBus - Event bus for system communication
   * @returns All game systems
   */
  static createSystems(
    players: Map<string, Player>,
    monster: Monster,
    eventBus: GameEventBus | null = null
  ): GameSystems {
    // Create individual systems
    const gameStateUtils = new GameStateUtils(players);

    // Create NEW status effect system
    const warlockSystem = new WarlockSystem(players, gameStateUtils);
    const newStatusEffectSystem: StatusEffectSystem = StatusEffectSystemFactory.createSystem(
      players,
      monster,
      warlockSystem,
      true // Migrate existing status effects
    );

    // Use the new status effect manager
    const statusEffectManager = newStatusEffectSystem.manager;

    const racialAbilitySystem = new RacialAbilitySystemClass(
      players,
      gameStateUtils,
      statusEffectManager
    );

    // Create enhanced MonsterController with threat system
    const monsterController = new MonsterController({
      monster,
      players,
      statusEffectManager,
      racialAbilitySystem,
      gameStateUtils
    });

    const combatSystem = new CombatSystem({
      players,
      monsterController,
      statusEffectManager,
      racialAbilitySystem,
      warlockSystem,
      gameStateUtils,
      eventBus: eventBus || undefined
    });

    // Create AbilityRegistry and register all handlers
    const abilityRegistry: AbilityRegistryInterface = new AbilityRegistryClass();

    // IMPORTANT: Store systems reference in the registry for handler access
    (abilityRegistry as any).systems = {
      players,
      monster,
      monsterController,
      combatSystem,
      statusEffectManager,
      statusEffectSystem: newStatusEffectSystem,
      warlockSystem,
      racialAbilitySystem,
      gameStateUtils,
    };

    // Register all ability handlers
    registerAbilityHandlers(abilityRegistry);

    return {
      players: players,
      gameStateUtils,
      statusEffectManager,
      statusEffectSystem: newStatusEffectSystem, // NEW: Include full status effect system
      warlockSystem,
      racialAbilitySystem,
      monsterController,
      combatSystem,
      abilityRegistry,
      monster: { hp: monster.hp },
    };
  }

  /**
   * Validate system dependencies
   * @param systems - Systems to validate
   * @returns Validation result
   */
  static validateSystems(systems: GameSystems): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required systems
    const requiredSystems = [
      'players',
      'gameStateUtils',
      'statusEffectManager',
      'statusEffectSystem',
      'warlockSystem',
      'racialAbilitySystem',
      'monsterController',
      'combatSystem',
      'abilityRegistry',
      'monster'
    ];

    for (const systemName of requiredSystems) {
      if (!systems[systemName as keyof GameSystems]) {
        errors.push(`Missing required system: ${systemName}`);
      }
    }

    // Check system interconnections
    if (systems.abilityRegistry && !(systems.abilityRegistry as any).systems) {
      errors.push('AbilityRegistry missing systems reference');
    }

    if (systems.players && systems.players.size === 0) {
      errors.push('Players map is empty');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get system status information
   * @param systems - Systems to get status for
   * @returns System status information
   */
  static getSystemStatus(systems: GameSystems): Record<string, any> {
    return {
      playerCount: systems.players?.size || 0,
      systemsLoaded: Object.keys(systems).length,
      abilityHandlersRegistered: systems.abilityRegistry?.getDebugInfo?.() || null,
      statusEffectSystemActive: !!systems.statusEffectSystem,
      eventBusConnected: !!systems.combatSystem?.eventBus,
      timestamp: Date.now()
    };
  }

  /**
   * Cleanup all systems
   * @param systems - Systems to cleanup
   */
  static async cleanupSystems(systems: GameSystems): Promise<void> {
    // Cleanup in reverse dependency order
    const cleanupPromises: Promise<void>[] = [];

    // Cleanup systems that support async cleanup
    if (systems.combatSystem?.cleanup) {
      cleanupPromises.push(systems.combatSystem.cleanup());
    }

    await Promise.all(cleanupPromises);
  }
}

// Default export for CommonJS compatibility
export default SystemsFactory;
