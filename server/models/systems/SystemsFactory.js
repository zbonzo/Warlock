/**
 * @fileoverview Factory class for creating and connecting game systems
 * Centralizes system creation and dependency injection
 */
const GameStateUtils = require('./GameStateUtils');
const StatusEffectManager = require('./StatusEffectManager');
const RacialAbilitySystem = require('./RacialAbilitySystem');
const WarlockSystem = require('./WarlockSystem');
const MonsterController = require('@controllers/MonsterController');
const CombatSystem = require('./CombatSystem');
const AbilityRegistry = require('../AbilityRegistry');
const { registerAbilityHandlers } = require('./abilityHandlers');
const messages = require('@messages');

/**
 * Enhanced SystemsFactory to ensure AbilityRegistry has access to all systems
 * This should be added to or modify the existing SystemsFactory.js
 */
class SystemsFactory {
  /**
   * Create all game systems with proper dependency injection
   * @param {Map} players - Map of player objects
   * @param {Object} monster - Monster state object
   * @returns {Object} All game systems
   */
  static createSystems(players, monster) {
    // Create individual systems
    const gameStateUtils = new GameStateUtils(players);
    const statusEffectManager = new StatusEffectManager(
      players,
      gameStateUtils
    );
    const warlockSystem = new WarlockSystem(players, gameStateUtils);
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
      gameStateUtils
    );

    // Create AbilityRegistry and register all handlers
    const abilityRegistry = new AbilityRegistry();

    // IMPORTANT: Store systems reference in the registry for handler access
    abilityRegistry.systems = {
      players,
      monster,
      monsterController,
      combatSystem,
      statusEffectManager,
      warlockSystem,
      racialAbilitySystem,
      gameStateUtils,
    };

    // Register all ability handlers
    const { registerAbilityHandlers } = require('./abilityHandlers');
    registerAbilityHandlers(abilityRegistry);

    return {
      players: players,
      gameStateUtils,
      statusEffectManager,
      warlockSystem,
      racialAbilitySystem,
      monsterController,
      combatSystem,
      abilityRegistry,
    };
  }
}

module.exports = SystemsFactory;
