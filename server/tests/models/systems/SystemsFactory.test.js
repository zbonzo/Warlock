/**
 * @fileoverview Unit tests for SystemsFactory
 * Tests system creation and dependency injection
 */
const SystemsFactory = require('@models/systems/SystemsFactory');
const GameStateUtils = require('@models/systems/GameStateUtils');
const StatusEffectManager = require('@models/systems/StatusEffectManager');
const WarlockSystem = require('@models/systems/WarlockSystem');
const RacialAbilitySystem = require('@models/systems/RacialAbilitySystem');
const MonsterController = require('@models/systems/MonsterController');
const CombatSystem = require('@models/systems/CombatSystem');
const AbilityRegistry = require('@models/systems/AbilityRegistry');
const { registerAbilityHandlers } = require('@models/systems/abilityHandlers');

// Mock dependencies to avoid full initialization
jest.mock('@models/systems/GameStateUtils');
jest.mock('@models/systems/StatusEffectManager');
jest.mock('@models/systems/WarlockSystem');
jest.mock('@models/systems/RacialAbilitySystem');
jest.mock('@models/systems/MonsterController');
jest.mock('@models/systems/CombatSystem');
jest.mock('@models/systems/AbilityRegistry');
jest.mock('@models/systems/abilityHandlers', () => ({
  registerAbilityHandlers: jest.fn()
}));

describe('SystemsFactory', () => {
  let players;
  let monster;
  
  beforeEach(() => {
    // Setup test data
    players = new Map();
    monster = { hp: 100, maxHp: 100, baseDmg: 10, age: 0 };
    
    // Mock implementation of required methods
    AbilityRegistry.mockImplementation(() => ({
      setSystems: jest.fn(),
      setAbilityRegistry: jest.fn()
    }));
    
    RacialAbilitySystem.mockImplementation(() => ({
      setAbilityRegistry: jest.fn()
    }));
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  describe('createSystems', () => {
    it('should create all game systems with proper dependencies', () => {
      // Execute
      const systems = SystemsFactory.createSystems(players, monster);
      
      // Verify all systems were created
      expect(systems.gameStateUtils).toBeInstanceOf(GameStateUtils);
      expect(systems.statusEffectManager).toBeInstanceOf(StatusEffectManager);
      expect(systems.warlockSystem).toBeInstanceOf(WarlockSystem);
      expect(systems.racialAbilitySystem).toBeInstanceOf(RacialAbilitySystem);
      expect(systems.monsterController).toBeInstanceOf(MonsterController);
      expect(systems.combatSystem).toBeInstanceOf(CombatSystem);
      expect(systems.abilityRegistry).toBeInstanceOf(AbilityRegistry);
      
      // Verify systems were created with correct dependencies
      expect(GameStateUtils).toHaveBeenCalledWith(players);
      
      expect(StatusEffectManager).toHaveBeenCalledWith(
        players, 
        systems.gameStateUtils
      );
      
      expect(WarlockSystem).toHaveBeenCalledWith(
        players,
        systems.gameStateUtils
      );
      
      expect(RacialAbilitySystem).toHaveBeenCalledWith(
        players, 
        systems.gameStateUtils, 
        systems.statusEffectManager
      );
      
      expect(MonsterController).toHaveBeenCalledWith(
        monster,
        players,
        systems.statusEffectManager,
        systems.racialAbilitySystem,
        systems.gameStateUtils
      );
      
      expect(CombatSystem).toHaveBeenCalledWith(
        players,
        systems.monsterController,
        systems.statusEffectManager,
        systems.racialAbilitySystem,
        systems.warlockSystem,
        systems.gameStateUtils
      );
    });
    
    it('should set up the ability registry with all system references', () => {
      // Execute
      const systems = SystemsFactory.createSystems(players, monster);
      
      // Verify registry was set up with all systems
      expect(systems.abilityRegistry.setSystems).toHaveBeenCalledWith({
        players,
        gameStateUtils: systems.gameStateUtils,
        statusEffectManager: systems.statusEffectManager,
        warlockSystem: systems.warlockSystem,
        racialAbilitySystem: systems.racialAbilitySystem,
        monsterController: systems.monsterController,
        combatSystem: systems.combatSystem
      });
    });
    
    it('should connect racialAbilitySystem to the registry', () => {
      // Execute
      const systems = SystemsFactory.createSystems(players, monster);
      
      // Verify connection
      expect(systems.racialAbilitySystem.setAbilityRegistry).toHaveBeenCalledWith(
        systems.abilityRegistry
      );
    });
    
    it('should register all ability handlers', () => {
      // Execute
      SystemsFactory.createSystems(players, monster);
      
      // Verify handlers were registered
      expect(registerAbilityHandlers).toHaveBeenCalled();
    });
    
    it('should return an object with all systems', () => {
      // Execute
      const systems = SystemsFactory.createSystems(players, monster);
      
      // Verify all expected systems are included in the result
      const expectedSystems = [
        'gameStateUtils',
        'statusEffectManager',
        'warlockSystem',
        'racialAbilitySystem',
        'monsterController',
        'combatSystem',
        'abilityRegistry'
      ];
      
      expectedSystems.forEach(system => {
        expect(systems).toHaveProperty(system);
      });
    });
  });
});