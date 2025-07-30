/**
 * @fileoverview Factory class for creating and connecting game systems
 * Centralizes system creation and dependency injection
 * Migrated to TypeScript for Phase 6
 */

import type { Player, Monster } from '../../types/generated';
import type { AbilityRegistry } from './abilityHandlers/abilityRegistryUtils';
import { registerAbilityHandlers } from './abilityHandlers';

const GameStateUtils = require('./GameStateUtils');
const StatusEffectManager = require('./StatusEffectManager'); // Legacy - will be replaced
const NewStatusEffectManager = require('./NewStatusEffectManager');
const StatusEffectSystemFactory = require('./StatusEffectSystemFactory');
const RacialAbilitySystem = require('./RacialAbilitySystem'); // Keep using JS version for now
const WarlockSystem = require('./WarlockSystem');
const MonsterController = require('@controllers/MonsterController');
const CombatSystem = require('./CombatSystem');
const AbilityRegistry = require('../AbilityRegistry');
const messages = require('@messages');

/**
 * Game event bus interface
 */
interface GameEventBus {
  emit(event: string, ...args: any[]): void;
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
}

/**
 * Status effect system interface
 */
interface StatusEffectSystem {
  manager: any;
  applyEffect(
    targetId: string,
    effectType: string,
    effectData: Record<string, any>,
    sourceId?: string,
    sourceName?: string,
    log?: any[]
  ): void;
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
  abilityRegistry: AbilityRegistry;
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
    
    const racialAbilitySystem = new RacialAbilitySystem(
      players,
      statusEffectManager
    );

    // Create enhanced MonsterController with threat system
    const monsterController = new MonsterController(
      monster,
      players,
      statusEffectManager,
      racialAbilitySystem,
      gameStateUtils
    );

    const combatSystem = new CombatSystem(
      players,
      monsterController,
      statusEffectManager,
      racialAbilitySystem,
      warlockSystem,
      gameStateUtils,
      eventBus
    );

    // Create AbilityRegistry and register all handlers
    const abilityRegistry: AbilityRegistry = new AbilityRegistry();

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
      'abilityRegistry'
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
    if (systems.abilityRegistry?.cleanup) {
      cleanupPromises.push(systems.abilityRegistry.cleanup());
    }

    if (systems.combatSystem?.cleanup) {
      cleanupPromises.push(systems.combatSystem.cleanup());
    }

    if (systems.statusEffectSystem?.cleanup) {
      cleanupPromises.push(systems.statusEffectSystem.cleanup());
    }

    await Promise.all(cleanupPromises);
  }
}

// Default export for CommonJS compatibility
module.exports = SystemsFactory;
