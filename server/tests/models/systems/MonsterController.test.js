/**
 * @fileoverview Unit tests for MonsterController
 * Tests monster behavior, damage, and level progression
 */
const MonsterController = require('@models/systems/MonsterController');

describe('MonsterController', () => {
  let monsterController;
  let mockMonster;
  let mockPlayers;
  let mockStatusEffectManager;
  let mockRacialAbilitySystem;
  let mockGameStateUtils;
  let mockCombatSystem;
  let mockLog;
  let mockPlayer;
  
  beforeEach(() => {
    // Set up mock monster
    mockMonster = {
      hp: 100,
      maxHp: 100,
      baseDmg: 10,
      age: 0
    };
    
    // Create mock player
    mockPlayer = {
      id: 'player1',
      name: 'Alice',
      isAlive: true,
      hp: 100,
      hasStatusEffect: jest.fn().mockReturnValue(false)
    };
    
    // Setup mock players map
    mockPlayers = new Map();
    mockPlayers.set('player1', mockPlayer);
    
    // Set up mock status effect manager
    mockStatusEffectManager = {
      isPlayerStunned: jest.fn().mockReturnValue(false),
      hasEffect: jest.fn().mockReturnValue(false)
    };
    
    // Set up mock racial ability system
    mockRacialAbilitySystem = {
      processRacialEffects: jest.fn()
    };
    
    // Set up mock game state utils
    mockGameStateUtils = {
      getLowestHpPlayer: jest.fn().mockReturnValue(mockPlayer),
      getHighestHpPlayer: jest.fn().mockReturnValue(mockPlayer)
    };
    
    // Set up mock combat system
    mockCombatSystem = {
      applyDamageToPlayer: jest.fn()
    };
    
    // Create the monster controller
    monsterController = new MonsterController(
      mockMonster,
      mockPlayers,
      mockStatusEffectManager,
      mockRacialAbilitySystem,
      mockGameStateUtils
    );
    
    // Create log array
    mockLog = [];
  });
  
  describe('constructor', () => {
    it('should initialize with monster state and dependencies', () => {
      expect(monsterController.monster).toBe(mockMonster);
      expect(monsterController.players).toBe(mockPlayers);
      expect(monsterController.statusEffectManager).toBe(mockStatusEffectManager);
      expect(monsterController.racialAbilitySystem).toBe(mockRacialAbilitySystem);
      expect(monsterController.gameStateUtils).toBe(mockGameStateUtils);
    });
    
    it('should initialize monster state with default values if not provided', () => {
      // Create with empty monster object
      const emptyMonster = {};
      
      const controller = new MonsterController(
        emptyMonster,
        mockPlayers,
        mockStatusEffectManager,
        mockRacialAbilitySystem,
        mockGameStateUtils
      );
      
      // Should have initialized defaults
      expect(emptyMonster.hp).toBe(100);
      expect(emptyMonster.maxHp).toBe(100);
      expect(emptyMonster.baseDmg).toBe(10);
      expect(emptyMonster.age).toBe(0);
    });
  });
  
  describe('getState', () => {
    it('should return current monster state', () => {
      const state = monsterController.getState();
      
      expect(state).toEqual({
        hp: 100,
        maxHp: 100,
        nextDamage: 10, // baseDmg * (age + 1) = 10 * (0 + 1) = 10
        age: 0
      });
    });
  });
  
  describe('ageMonster', () => {
    it('should increment monster age', () => {
      // Initial age
      expect(mockMonster.age).toBe(0);
      
      // Age the monster
      monsterController.ageMonster();
      
      // Age should be incremented
      expect(mockMonster.age).toBe(1);
      
      // Age again
      monsterController.ageMonster();
      
      // Should be 2
      expect(mockMonster.age).toBe(2);
    });
  });
  
  describe('takeDamage', () => {
    it('should apply damage to the monster', () => {
      // Initial HP
      expect(mockMonster.hp).toBe(100);
      
      // Apply damage
      const result = monsterController.takeDamage(30, mockPlayer, mockLog);
      
      // Should succeed
      expect(result).toBe(true);
      
      // HP should be reduced
      expect(mockMonster.hp).toBe(70);
      
      // Should log damage
      expect(mockLog).toContain('Alice hits the Monster for 30 damage!');
      expect(mockLog).toContain('The Monster has 70/100 HP remaining.');
    });
    
    it('should handle monster defeat', () => {
      // Apply fatal damage
      const result = monsterController.takeDamage(150, mockPlayer, mockLog);
      
      // Should succeed
      expect(result).toBe(true);
      
      // HP should be 0
      expect(mockMonster.hp).toBe(0);
      
      // Should log defeat
      expect(mockLog).toContain('Alice hits the Monster for 150 damage!');
      expect(mockLog).toContain('The Monster has been defeated!');
    });
    
    it('should return false if monster is already defeated', () => {
      // Set monster as defeated
      mockMonster.hp = 0;
      
      // Try to damage
      const result = monsterController.takeDamage(30, mockPlayer, mockLog);
      
      // Should fail
      expect(result).toBe(false);
      
      // Should log that monster is already defeated
      expect(mockLog).toContain("Alice attacks the Monster, but it's already defeated.");
    });
  });
  
  describe('attack', () => {
    it('should attack the selected target', () => {
      // Monster attacks
      const target = monsterController.attack(mockLog, mockCombatSystem);
      
      // Should return the targeted player
      expect(target).toBe(mockPlayer);
      
      // Should log the attack
      expect(mockLog).toContain('The Monster attacks Alice!');
      
      // Should apply damage via combat system
      expect(mockCombatSystem.applyDamageToPlayer).toHaveBeenCalledWith(
        mockPlayer,
        10, // baseDmg * (age + 1) = 10 * (0 + 1) = 10
        { name: 'The Monster' },
        mockLog
      );
    });
    
    it('should not attack if the monster is defeated', () => {
      // Set monster as defeated
      mockMonster.hp = 0;
      
      // Try to attack
      const target = monsterController.attack(mockLog, mockCombatSystem);
      
      // Should not attack
      expect(target).toBeNull();
      expect(mockCombatSystem.applyDamageToPlayer).not.toHaveBeenCalled();
    });
    
    it('should not attack if no valid target is found', () => {
      // Set no valid target
      mockGameStateUtils.getLowestHpPlayer.mockReturnValue(null);
      mockGameStateUtils.getHighestHpPlayer.mockReturnValue(null);
      
      // Try to attack
      const target = monsterController.attack(mockLog, mockCombatSystem);
      
      // Should not attack
      expect(target).toBeNull();
      expect(mockLog).toContain('The Monster looks for a target, but no one is visible.');
      expect(mockCombatSystem.applyDamageToPlayer).not.toHaveBeenCalled();
    });
    
    it('should use highest HP player if no visible targets', () => {
      // Set no visible target but a highest HP player
      mockGameStateUtils.getLowestHpPlayer.mockReturnValue(null);
      
      const highHpPlayer = {
        id: 'player2',
        name: 'Bob',
        hp: 150
      };
      
      mockGameStateUtils.getHighestHpPlayer.mockReturnValue(highHpPlayer);
      
      // Monster attacks
      const target = monsterController.attack(mockLog, mockCombatSystem);
      
      // Should target the highest HP player
      expect(target).toBe(highHpPlayer);
      expect(mockLog).toContain('The Monster attacks Bob!');
    });
  });
  
  describe('handleDeathAndRespawn', () => {
    it('should respawn monster with increased HP for new level', () => {
      // Set monster as defeated
      mockMonster.hp = 0;
      
      // Handle death and respawn for level 1
      const result = monsterController.handleDeathAndRespawn(1, mockLog);
      
      // Should advance to level 2
      expect(result.newLevel).toBe(2);
      
      // Monster should respawn with level 2 HP (100 + (2-1)*50 = 150)
      expect(mockMonster.hp).toBe(150);
      expect(mockMonster.maxHp).toBe(150);
      expect(mockMonster.age).toBe(0); // Age reset
      
      // Should log respawn
      expect(mockLog).toContain('The Monster has been defeated! Level 2 begins.');
      expect(mockLog).toContain('A new Monster appears with 150 HP!');
      
      // Should return updated monster state
      expect(result.monsterState).toEqual({
        hp: 150,
        maxHp: 150,
        nextDamage: 10,
        age: 0
      });
    });
    
    it('should not respawn if monster is not defeated', () => {
      // Monster still alive
      mockMonster.hp = 50;
      
      // Try to handle death and respawn
      const result = monsterController.handleDeathAndRespawn(1, mockLog);
      
      // Should not advance level
      expect(result.newLevel).toBe(1);
      
      // Monster state should be unchanged
      expect(mockMonster.hp).toBe(50);
      expect(mockMonster.maxHp).toBe(100);
      
      // Log should be empty
      expect(mockLog).toHaveLength(0);
    });
    
    it('should respawn with correct HP for higher levels', () => {
      // Set monster as defeated
      mockMonster.hp = 0;
      
      // Handle death and respawn for level 3
      const result = monsterController.handleDeathAndRespawn(3, mockLog);
      
      // Should advance to level 4
      expect(result.newLevel).toBe(4);
      
      // Monster should respawn with level 4 HP (100 + (4-1)*50 = 250)
      expect(mockMonster.hp).toBe(250);
      expect(mockMonster.maxHp).toBe(250);
    });
  });
  
  describe('isDead', () => {
    it('should return true if monster HP is 0 or less', () => {
      // Set monster as defeated
      mockMonster.hp = 0;
      
      // Check if dead
      expect(monsterController.isDead()).toBe(true);
      
      // Set negative HP (shouldn't happen normally)
      mockMonster.hp = -10;
      
      // Should still be dead
      expect(monsterController.isDead()).toBe(true);
    });
    
    it('should return false if monster HP is above 0', () => {
      // Set monster HP
      mockMonster.hp = 1;
      
      // Check if dead
      expect(monsterController.isDead()).toBe(false);
    });
  });
});