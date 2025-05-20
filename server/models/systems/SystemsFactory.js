/**
 * @fileoverview Factory class for creating and connecting game systems
 * Centralizes system creation and dependency injection 
 */
const GameStateUtils = require('./GameStateUtils');
const StatusEffectManager = require('./StatusEffectManager');
const RacialAbilitySystem = require('./RacialAbilitySystem');
const WarlockSystem = require('./WarlockSystem');
const MonsterController = require('../../controllers/MonsterController');
const CombatSystem = require('./CombatSystem');
const AbilityRegistry = require('../AbilityRegistry');
const { registerAbilityHandlers } = require('./abilityHandlers');

/**
 * Factory class for creating and connecting game systems
 * Centralizes the creation and dependency injection of all game systems
 */
class SystemsFactory {
  /**
   * Create all game systems with proper dependencies
   * 
   * @param {Map} players - The map of player objects
   * @param {Object} monster - The monster state object
   * @returns {Object} Object containing all initialized systems
   */
  static createSystems(players, monster) {
    // Create systems in dependency order
    const gameStateUtils = new GameStateUtils(players);
    const statusEffectManager = new StatusEffectManager(players, gameStateUtils);
    const warlockSystem = new WarlockSystem(players, gameStateUtils);
    const racialAbilitySystem = new RacialAbilitySystem(players, gameStateUtils, statusEffectManager);
    const monsterController = new MonsterController(monster, players, statusEffectManager, racialAbilitySystem, gameStateUtils);
    const combatSystem = new CombatSystem(
      players, 
      monsterController, 
      statusEffectManager, 
      racialAbilitySystem, 
      warlockSystem, 
      gameStateUtils
    );
    
    // Initialize ability registry
    const abilityRegistry = new AbilityRegistry();
    
    // Set up system references for ability handlers
    abilityRegistry.setSystems({
      players,
      gameStateUtils,
      statusEffectManager,
      warlockSystem,
      racialAbilitySystem,
      monsterController,
      combatSystem
    });
    
    // Connect RacialAbilitySystem to the registry
    racialAbilitySystem.setAbilityRegistry(abilityRegistry);
    
    // Register all ability handlers
    registerAbilityHandlers(abilityRegistry);
    
    // Return all systems as an object
    return {
      gameStateUtils,
      statusEffectManager,
      warlockSystem,
      racialAbilitySystem,
      monsterController,
      combatSystem,
      abilityRegistry
    };
  }
}

module.exports = SystemsFactory;