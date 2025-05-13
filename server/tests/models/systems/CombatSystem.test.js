/**
 * @fileoverview Unit tests for CombatSystem
 * Tests damage application, death processing, and combat utilities
 */
const CombatSystem = require('@models/systems/CombatSystem');

describe('CombatSystem', () => {
  let combatSystem;
  let mockPlayers;
  let mockMonsterController;
  let mockStatusEffectManager;
  let mockRacialAbilitySystem;
  let mockWarlockSystem;
  let mockGameStateUtils;
  let mockLog;
  let mockPlayer;
  let mockTarget;
  let mockAttacker;
  
  beforeEach(() => {
    // Set up mock players collection
    mockPlayers = new Map();
    
    // Create mock player
    mockPlayer = {
      id: 'player1',
      name: 'Alice',
      isAlive: true,
      hp: 100,
      maxHp: 100,
      calculateDamageReduction: jest.fn(damage => damage),
      hasStatusEffect: jest.fn(),
      modifyDamage: jest.fn(damage => damage),
      racialEffects: {},
      getHealingModifier: jest.fn().mockReturnValue(1.0),
      unlocked: [
        { type: 'slash', name: 'Slash' }
      ]
    };
    
    // Create mock target
    mockTarget = {
      id: 'player2',
      name: 'Bob',
      isAlive: true,
      hp: 100,
      maxHp: 100,
      isWarlock: false,
      calculateDamageReduction: jest.fn(damage => damage),
      racialEffects: {}
    };
    
    // Create mock attacker
    mockAttacker = {
      id: 'player3',
      name: 'Charlie',
      isAlive: true,
      isWarlock: true
    };
    
    // Add to players map
    mockPlayers.set('player1', mockPlayer);
    mockPlayers.set('player2', mockTarget);
    mockPlayers.set('player3', mockAttacker);
    
    // Mock monster controller
    mockMonsterController = {
      getState: jest.fn().mockReturnValue({ hp: 100, maxHp: 100 }),
      takeDamage: jest.fn().mockReturnValue(true)
    };
    
    // Mock status effect manager
    mockStatusEffectManager = {
      isPlayerStunned: jest.fn().mockReturnValue(false),
      hasEffect: jest.fn().mockReturnValue(false)
    };
    
    // Mock racial ability system
    mockRacialAbilitySystem = {
      processRacialEffects: jest.fn()
    };
    
    // Mock warlock system
    mockWarlockSystem = {
      decrementWarlockCount: jest.fn(),
      attemptConversion: jest.fn()
    };
    
    // Mock game state utils
    mockGameStateUtils = {
      getRandomTarget: jest.fn().mockReturnValue('player3')
    };
    
    // Create the combat system
    combatSystem = new CombatSystem(
      mockPlayers,
      mockMonsterController,
      mockStatusEffectManager,
      mockRacialAbilitySystem,
      mockWarlockSystem,
      mockGameStateUtils
    );
    
    // Create log array
    mockLog = [];
  });
  
  describe('constructor', () => {
    it('should initialize with all dependencies', () => {
      expect(combatSystem.players).toBe(mockPlayers);
      expect(combatSystem.monsterController).toBe(mockMonsterController);
      expect(combatSystem.statusEffectManager).toBe(mockStatusEffectManager);
      expect(combatSystem.racialAbilitySystem).toBe(mockRacialAbilitySystem);
      expect(combatSystem.warlockSystem).toBe(mockWarlockSystem);
      expect(combatSystem.gameStateUtils).toBe(mockGameStateUtils);
    });
  });
  
  describe('validateAndQueueAction', () => {
    let pendingActions;
    
    beforeEach(() => {
      pendingActions = [];
    });
    
    it('should add a valid action to pendingActions', () => {
      // Execute
      const result = combatSystem.validateAndQueueAction(
        'player1', 'slash', 'player2', { option: 'value' }, pendingActions
      );
      
      // Verify
      expect(result).toBe(true);
      expect(pendingActions).toHaveLength(1);
      expect(pendingActions[0]).toEqual({
        actorId: 'player1',
        actionType: 'slash',
        targetId: 'player2',
        options: {}
      });
    });
    
    it('should handle allowed options correctly', () => {
      // Execute
      const result = combatSystem.validateAndQueueAction(
        'player1', 'slash', 'player2', 
        { bloodRageActive: true, keenSensesActive: true }, 
        pendingActions
      );
      
      // Verify
      expect(result).toBe(true);
      expect(pendingActions).toHaveLength(1);
      expect(pendingActions[0].options).toEqual({
        bloodRageActive: true,
        keenSensesActive: true
      });
    });
    
    it('should return false if player does not exist', () => {
      // Execute
      const result = combatSystem.validateAndQueueAction(
        'nonexistent', 'slash', 'player2', {}, pendingActions
      );
      
      // Verify
      expect(result).toBe(false);
      expect(pendingActions).toHaveLength(0);
    });
    
    it('should return false if player is dead', () => {
      // Set player as dead
      mockPlayer.isAlive = false;
      
      // Execute
      const result = combatSystem.validateAndQueueAction(
        'player1', 'slash', 'player2', {}, pendingActions
      );
      
      // Verify
      expect(result).toBe(false);
      expect(pendingActions).toHaveLength(0);
    });
    
    it('should return false if player is stunned', () => {
      // Set player as stunned
      mockStatusEffectManager.isPlayerStunned.mockReturnValue(true);
      
      // Execute
      const result = combatSystem.validateAndQueueAction(
        'player1', 'slash', 'player2', {}, pendingActions
      );
      
      // Verify
      expect(result).toBe(false);
      expect(pendingActions).toHaveLength(0);
    });
    
    it('should return false if player has already acted', () => {
      // Add existing action for player
      pendingActions.push({
        actorId: 'player1',
        actionType: 'slash',
        targetId: 'player2'
      });
      
      // Execute
      const result = combatSystem.validateAndQueueAction(
        'player1', 'slash', 'player3', {}, pendingActions
      );
      
      // Verify
      expect(result).toBe(false);
      expect(pendingActions).toHaveLength(1);
    });
    
    it('should return false if ability is not found', () => {
      // Execute with non-existent ability
      const result = combatSystem.validateAndQueueAction(
        'player1', 'nonexistent', 'player2', {}, pendingActions
      );
      
      // Verify
      expect(result).toBe(false);
      expect(pendingActions).toHaveLength(0);
    });
    
    it('should return false if target is invalid', () => {
      // Set target as non-existent
      const result = combatSystem.validateAndQueueAction(
        'player1', 'slash', 'nonexistent', {}, pendingActions
      );
      
      // Verify
      expect(result).toBe(false);
      expect(pendingActions).toHaveLength(0);
    });
    
    it('should redirect target if invisible', () => {
      // Set up target with invisibility
      mockTarget.hasStatusEffect = jest.fn().mockImplementation(effect => effect === 'invisible');
      
      // Execute
      const result = combatSystem.validateAndQueueAction(
        'player1', 'slash', 'player2', {}, pendingActions
      );
      
      // Verify
      expect(result).toBe(true);
      expect(pendingActions).toHaveLength(1);
      expect(pendingActions[0].targetId).toBe('player3'); // Redirected
      expect(mockGameStateUtils.getRandomTarget).toHaveBeenCalled();
    });
    
    it('should allow monster as target', () => {
      // Execute with monster target
      const result = combatSystem.validateAndQueueAction(
        'player1', 'slash', '__monster__', {}, pendingActions
      );
      
      // Verify
      expect(result).toBe(true);
      expect(pendingActions).toHaveLength(1);
      expect(pendingActions[0].targetId).toBe('__monster__');
    });
  });
  
  describe('applyDamageToPlayer', () => {
    it('should apply damage and reduce HP', () => {
      // Initial state
      mockTarget.hp = 100;
      mockTarget.calculateDamageReduction.mockReturnValue(30);
      
      // Execute
      const result = combatSystem.applyDamageToPlayer(mockTarget, 40, mockAttacker, mockLog);
      
      // Verify
      expect(result).toBe(true);
      expect(mockTarget.hp).toBe(70); // 100 - 30
      expect(mockLog).toContain('Bob takes 30 damage from Charlie. Armor reduced initial 40 damage.');
    });
    
    it('should return false if target is not alive', () => {
      // Set target as dead
      mockTarget.isAlive = false;
      
      // Execute
      const result = combatSystem.applyDamageToPlayer(mockTarget, 40, mockAttacker, mockLog);
      
      // Verify
      expect(result).toBe(false);
      expect(mockLog).toHaveLength(0);
    });
    
    it('should handle Stone Resolve immunity', () => {
      // Set up Stone Resolve
      mockTarget.racialEffects.immuneNextDamage = true;
      
      // Execute
      const result = combatSystem.applyDamageToPlayer(mockTarget, 40, mockAttacker, mockLog);
      
      // Verify
      expect(result).toBe(false);
      expect(mockTarget.hp).toBe(100); // Unchanged
      expect(mockTarget.racialEffects.immuneNextDamage).toBeUndefined(); // Consumed
      expect(mockLog).toContain("Bob's Stone Resolve absorbed all damage from Charlie!");
    });
    
    it('should trigger Keen Senses to reveal warlock status', () => {
      // Execute with Keen Senses flag
      const result = combatSystem.applyDamageToPlayer(mockTarget, 40, mockAttacker, mockLog, true);
      
      // Verify
      expect(result).toBe(true);
      expect(mockLog).toContain("Charlie's Keen Senses reveal that Bob is NOT a Warlock!");
    });
    
    it('should mark for death when HP reaches 0', () => {
      // Set up for lethal damage
      mockTarget.hp = 20;
      mockTarget.calculateDamageReduction.mockReturnValue(30);
      
      // Execute
      const result = combatSystem.applyDamageToPlayer(mockTarget, 40, mockAttacker, mockLog);
      
      // Verify
      expect(result).toBe(true);
      expect(mockTarget.hp).toBe(0);
      expect(mockTarget.pendingDeath).toBe(true);
      expect(mockTarget.deathAttacker).toBe('Charlie');
    });
    
    it('should use Undying to prevent immediate death', () => {
      // Set up for lethal damage with Undying
      mockTarget.hp = 20;
      mockTarget.calculateDamageReduction.mockReturnValue(30);
      mockTarget.racialEffects.resurrect = { resurrectedHp: 5 };
      
      // Execute
      const result = combatSystem.applyDamageToPlayer(mockTarget, 40, mockAttacker, mockLog);
      
      // Verify
      expect(result).toBe(true);
      expect(mockTarget.hp).toBe(5); // Resurrected
      expect(mockTarget.racialEffects.resurrect).toBeUndefined(); // Consumed
      expect(mockLog).toContain("Bob avoided death through Undying! Resurrected with 5 HP.");
    });
    
    it('should attempt warlock conversion if attacker is warlock', () => {
      // Execute
      combatSystem.applyDamageToPlayer(mockTarget, 40, mockAttacker, mockLog);
      
      // Verify warlock conversion was attempted
      expect(mockWarlockSystem.attemptConversion).toHaveBeenCalledWith(
        mockAttacker, mockTarget, mockLog
      );
    });
  });
  
  describe('processPendingDeaths', () => {
    it('should process all pending deaths', () => {
      // Set up multiple players with pending death
      mockPlayer.pendingDeath = true;
      mockPlayer.deathAttacker = 'Monster';
      
      mockTarget.pendingDeath = true;
      mockTarget.deathAttacker = 'Charlie';
      
      // Execute
      combatSystem.processPendingDeaths(mockLog);
      
      // Verify
      expect(mockPlayer.isAlive).toBe(false);
      expect(mockTarget.isAlive).toBe(false);
      expect(mockLog).toContain("Alice has died from wounds inflicted by Monster!");
      expect(mockLog).toContain("Bob has died from wounds inflicted by Charlie!");
      expect(mockPlayer.pendingDeath).toBeUndefined();
      expect(mockTarget.pendingDeath).toBeUndefined();
    });
    
    it('should handle Undying during death processing', () => {
      // Set up pending death with Undying
      mockPlayer.pendingDeath = true;
      mockPlayer.deathAttacker = 'Monster';
      mockPlayer.racialEffects.resurrect = { resurrectedHp: 5 };
      
      // Execute
      combatSystem.processPendingDeaths(mockLog);
      
      // Verify
      expect(mockPlayer.isAlive).toBe(true); // Still alive
      expect(mockPlayer.hp).toBe(5); // Resurrected
      expect(mockLog).toContain("Alice avoided death through Undying! Resurrected with 5 HP.");
      expect(mockPlayer.pendingDeath).toBeUndefined();
      expect(mockPlayer.racialEffects.resurrect).toBeUndefined(); // Consumed
    });
    
    it('should decrement warlock count for warlock deaths', () => {
      // Set up pending death for a warlock
      mockAttacker.pendingDeath = true;
      mockAttacker.deathAttacker = 'Bob';
      mockPlayers.set('player3', mockAttacker);
      
      // Execute
      combatSystem.processPendingDeaths(mockLog);
      
      // Verify
      expect(mockAttacker.isAlive).toBe(false);
      expect(mockWarlockSystem.decrementWarlockCount).toHaveBeenCalled();
    });
  });
  
  describe('applyDamageToMonster', () => {
    it('should delegate to monster controller', () => {
      // Execute
      const result = combatSystem.applyDamageToMonster(50, mockPlayer, mockLog);
      
      // Verify
      expect(result).toBe(true);
      expect(mockMonsterController.takeDamage).toHaveBeenCalledWith(50, mockPlayer, mockLog);
    });
  });
  
  describe('applyAreaDamage', () => {
    it('should apply damage to multiple targets', () => {
      // Mock the applyDamageToPlayer method
      jest.spyOn(combatSystem, 'applyDamageToPlayer').mockImplementation(() => true);
      
      // Targets array
      const targets = [mockTarget, mockAttacker];
      
      // Execute
      const result = combatSystem.applyAreaDamage(mockPlayer, 30, targets, mockLog);
      
      // Verify
      expect(result).toHaveLength(2);
      expect(combatSystem.applyDamageToPlayer).toHaveBeenCalledTimes(2);
      expect(combatSystem.applyDamageToPlayer).toHaveBeenCalledWith(
        mockTarget, 30, mockPlayer, mockLog
      );
      expect(combatSystem.applyDamageToPlayer).toHaveBeenCalledWith(
        mockAttacker, 30, mockPlayer, mockLog
      );
    });
    
    it('should exclude self when specified', () => {
      // Mock the applyDamageToPlayer method
      jest.spyOn(combatSystem, 'applyDamageToPlayer').mockImplementation(() => true);
      
      // Targets array including self
      const targets = [mockPlayer, mockTarget, mockAttacker];
      
      // Execute
      const result = combatSystem.applyAreaDamage(mockPlayer, 30, targets, mockLog, { excludeSelf: true });
      
      // Verify
      expect(result).toHaveLength(2);
      expect(combatSystem.applyDamageToPlayer).toHaveBeenCalledTimes(2);
      // Should not call with self
      expect(combatSystem.applyDamageToPlayer).not.toHaveBeenCalledWith(
        mockPlayer, expect.any(Number), expect.any(Object), expect.any(Array)
      );
    });
    
    it('should attempt warlock conversion with reduced chance', () => {
      // Setup warlock attacker
      mockPlayer.isWarlock = true;
      
      // Execute
      combatSystem.applyAreaDamage(mockPlayer, 30, [mockTarget], mockLog);
      
      // Verify
      expect(mockWarlockSystem.attemptConversion).toHaveBeenCalledWith(
        mockPlayer, mockTarget, mockLog, 0.5 // Half the normal chance
      );
    });
    
    it('should skip dead or non-existent targets', () => {
      // Mock the applyDamageToPlayer method
      jest.spyOn(combatSystem, 'applyDamageToPlayer').mockImplementation(() => true);
      
      // Set one target as dead
      mockTarget.isAlive = false;
      
      // Targets array with dead target and null
      const targets = [mockTarget, null, mockAttacker];
      
      // Execute
      const result = combatSystem.applyAreaDamage(mockPlayer, 30, targets, mockLog);
      
      // Verify
      expect(result).toHaveLength(1); // Only one valid target
      expect(combatSystem.applyDamageToPlayer).toHaveBeenCalledTimes(1);
      expect(combatSystem.applyDamageToPlayer).toHaveBeenCalledWith(
        mockAttacker, 30, mockPlayer, mockLog
      );
    });
  });
  
  describe('applyAreaHealing', () => {
    it('should heal multiple targets', () => {
      // Setup players with less than max HP
      mockPlayer.hp = 70;
      mockTarget.hp = 60;
      mockAttacker.hp = 50;
      
      // Targets array
      const targets = [mockPlayer, mockTarget, mockAttacker];
      
      // Execute
      const result = combatSystem.applyAreaHealing(mockPlayer, 20, targets, mockLog);
      
      // Verify
      expect(result).toHaveLength(2); // Excludes warlock by default
      expect(mockPlayer.hp).toBe(90); // 70 + 20
      expect(mockTarget.hp).toBe(80); // 60 + 20
      expect(mockAttacker.hp).toBe(50); // Unchanged (warlock)
      expect(mockLog).toContain("Alice is healed for 20 HP by Alice's ability.");
      expect(mockLog).toContain("Bob is healed for 20 HP by Alice's ability.");
    });
    
    it('should not heal above max HP', () => {
      // Setup player near max HP
      mockPlayer.hp = 95;
      mockPlayer.maxHp = 100;
      
      // Execute
      combatSystem.applyAreaHealing(mockPlayer, 20, [mockPlayer], mockLog);
      
      // Verify
      expect(mockPlayer.hp).toBe(100); // Capped at max
      expect(mockLog).toContain("Alice is healed for 5 HP by Alice's ability.");
    });
    
    it('should apply healing modifier from source', () => {
      // Setup healing modifier
      mockPlayer.getHealingModifier.mockReturnValue(1.5);
      mockTarget.hp = 70;
      
      // Execute
      combatSystem.applyAreaHealing(mockPlayer, 20, [mockTarget], mockLog);
      
      // Verify
      expect(mockTarget.hp).toBe(100); // 70 + (20 * 1.5)
      expect(mockLog).toContain("Bob is healed for 30 HP by Alice's ability.");
    });
    
    it('should include warlocks when specified', () => {
      // Setup players
      mockTarget.hp = 60;
      mockAttacker.hp = 50;
      mockAttacker.isWarlock = true;
      
      // Execute
      combatSystem.applyAreaHealing(mockPlayer, 20, [mockTarget, mockAttacker], mockLog, { 
        excludeWarlocks: false 
      });
      
      // Verify
      expect(mockTarget.hp).toBe(80); // 60 + 20
      expect(mockAttacker.hp).toBe(70); // 50 + 20
      expect(mockLog).toContain("Bob is healed for 20 HP by Alice's ability.");
      expect(mockLog).toContain("Charlie is healed for 20 HP by Alice's ability.");
    });
    
    it('should exclude self when specified', () => {
      // Setup players
      mockPlayer.hp = 70;
      mockTarget.hp = 60;
      
      // Execute
      combatSystem.applyAreaHealing(mockPlayer, 20, [mockPlayer, mockTarget], mockLog, { 
        excludeSelf: true 
      });
      
      // Verify
      expect(mockPlayer.hp).toBe(70); // Unchanged
      expect(mockTarget.hp).toBe(80); // 60 + 20
      expect(mockLog).not.toContain("Alice is healed");
      expect(mockLog).toContain("Bob is healed for 20 HP by Alice's ability.");
    });
  });
});