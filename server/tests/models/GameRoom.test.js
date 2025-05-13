/**
 * @fileoverview Unit tests for GameRoom class
 * Tests core game logic and state management
 */
const { GameRoom } = require('@models/GameRoom');
const Player = require('@models/Player');
const SystemsFactory = require('@models/systems/SystemsFactory');
const classAbilities = require('@config/classAbilities');
const racialAbilities = require('@config/racialAbilities');
const { calculateStats } = require('@config/balancing');

// Mock dependencies
jest.mock('@models/systems/SystemsFactory');
jest.mock('@models/Player');
jest.mock('@config/classAbilities');
jest.mock('@config/racialAbilities');
jest.mock('@config/balancing');

describe('GameRoom', () => {
  let gameRoom;
  let mockSystems;
  
  beforeEach(() => {
    // Set up mock systems
    mockSystems = {
      gameStateUtils: {
        getAlivePlayers: jest.fn().mockReturnValue([]),
        getRandomTarget: jest.fn(),
        checkWinConditions: jest.fn()
      },
      statusEffectManager: {
        isPlayerStunned: jest.fn().mockReturnValue(false),
        processTimedEffects: jest.fn(),
        hasEffect: jest.fn()
      },
      warlockSystem: {
        decrementWarlockCount: jest.fn(),
        getWarlockCount: jest.fn().mockReturnValue(0),
        assignInitialWarlock: jest.fn()
      },
      racialAbilitySystem: {
        processEndOfRoundEffects: jest.fn()
      },
      monsterController: {
        getState: jest.fn().mockReturnValue({ hp: 100, maxHp: 100, nextDamage: 10 }),
        ageMonster: jest.fn(),
        attack: jest.fn(),
        handleDeathAndRespawn: jest.fn().mockReturnValue({ newLevel: 1, monsterState: {} })
      },
      combatSystem: {
        processPendingDeaths: jest.fn()
      },
      abilityRegistry: {
        hasClassAbility: jest.fn().mockReturnValue(true),
        hasRacialAbility: jest.fn().mockReturnValue(true),
        executeClassAbility: jest.fn(),
        executeRacialAbility: jest.fn()
      }
    };
    
    // Mock SystemsFactory
    SystemsFactory.createSystems.mockReturnValue(mockSystems);
    
    // Create game room
    gameRoom = new GameRoom('TEST123');
  });
  
  describe('constructor', () => {
    it('should initialize with the correct default values', () => {
      expect(gameRoom.code).toBe('TEST123');
      expect(gameRoom.players.size).toBe(0);
      expect(gameRoom.hostId).toBeNull();
      expect(gameRoom.started).toBe(false);
      expect(gameRoom.round).toBe(0);
      expect(gameRoom.level).toBe(1);
      expect(gameRoom.aliveCount).toBe(0);
      expect(gameRoom.pendingActions).toEqual([]);
      expect(gameRoom.pendingRacialActions).toEqual([]);
      expect(gameRoom.nextReady.size).toBe(0);
      
      // Check if systems factory was called
      expect(SystemsFactory.createSystems).toHaveBeenCalledWith(
        gameRoom.players, 
        gameRoom.monster
      );
    });
  });
  
  describe('addPlayer', () => {
    it('should add a player and increment alive count', () => {
      // Mock Player constructor
      Player.mockImplementation((id, name) => ({
        id, 
        name, 
        isAlive: true
      }));
      
      // Execute
      const result = gameRoom.addPlayer('player1', 'Alice');
      
      // Verify
      expect(result).toBe(true);
      expect(gameRoom.players.size).toBe(1);
      expect(gameRoom.aliveCount).toBe(1);
      expect(gameRoom.hostId).toBe('player1');
      expect(Player).toHaveBeenCalledWith('player1', 'Alice');
    });
    
    it('should set the first player as host', () => {
      // Add first player
      gameRoom.addPlayer('player1', 'Alice');
      
      // Add second player
      gameRoom.addPlayer('player2', 'Bob');
      
      // Verify hostId is still the first player
      expect(gameRoom.hostId).toBe('player1');
    });
    
    it('should return false if game has already started', () => {
      // Set game as started
      gameRoom.started = true;
      
      // Try to add player
      const result = gameRoom.addPlayer('player1', 'Alice');
      
      // Verify
      expect(result).toBe(false);
      expect(gameRoom.players.size).toBe(0);
    });
  });
  
  describe('removePlayer', () => {
    beforeEach(() => {
      // Set up players
      gameRoom.players.set('player1', { id: 'player1', name: 'Alice', isAlive: true, isWarlock: false });
      gameRoom.players.set('player2', { id: 'player2', name: 'Bob', isAlive: true, isWarlock: true });
      gameRoom.aliveCount = 2;
    });
    
    it('should remove a player and decrement alive count', () => {
      // Execute
      gameRoom.removePlayer('player1');
      
      // Verify
      expect(gameRoom.players.size).toBe(1);
      expect(gameRoom.aliveCount).toBe(1);
      expect(gameRoom.players.has('player1')).toBe(false);
    });
    
    it('should call decrementWarlockCount if player was a warlock', () => {
      // Execute
      gameRoom.removePlayer('player2');
      
      // Verify
      expect(mockSystems.warlockSystem.decrementWarlockCount).toHaveBeenCalled();
    });
  });
  
  describe('assignInitialWarlock', () => {
    it('should call the warlock system to assign the initial warlock', () => {
      // Execute
      gameRoom.assignInitialWarlock();
      
      // Verify
      expect(mockSystems.warlockSystem.assignInitialWarlock).toHaveBeenCalledWith(null);
    });
    
    it('should pass the preferred player ID when provided', () => {
      // Execute
      gameRoom.assignInitialWarlock('player1');
      
      // Verify
      expect(mockSystems.warlockSystem.assignInitialWarlock).toHaveBeenCalledWith('player1');
    });
  });
  
  describe('setPlayerClass', () => {
    beforeEach(() => {
      // Mock the player
      const mockPlayer = {
        race: null,
        class: null,
        abilities: [],
        unlocked: [],
        hp: 0,
        maxHp: 0,
        armor: 0,
        damageMod: 0,
        setRacialAbility: jest.fn()
      };
      
      // Add player to game
      gameRoom.players.set('player1', mockPlayer);
      
      // Mock class abilities
      classAbilities.Warrior = [
        { type: 'slash', name: 'Slash', unlockAt: 1 }
      ];
      
      // Mock racial abilities
      racialAbilities.Human = { type: 'adaptability' };
      
      // Mock balancing stats
      calculateStats.mockReturnValue({
        maxHp: 100,
        armor: 2,
        damageMod: 1.2
      });
    });
    
    it('should apply race and class to player', () => {
      // Get player reference
      const player = gameRoom.players.get('player1');
      
      // Execute
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      
      // Verify
      expect(player.race).toBe('Human');
      expect(player.class).toBe('Warrior');
    });
    
    it('should set abilities from class definition', () => {
      // Get player reference
      const player = gameRoom.players.get('player1');
      
      // Execute
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      
      // Verify
      expect(player.abilities).toEqual([
        { type: 'slash', name: 'Slash', unlockAt: 1 }
      ]);
      expect(player.unlocked).toEqual([
        { type: 'slash', name: 'Slash', unlockAt: 1 }
      ]);
    });
    
    it('should apply stats from race and class combination', () => {
      // Get player reference
      const player = gameRoom.players.get('player1');
      
      // Execute
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      
      // Verify
      expect(calculateStats).toHaveBeenCalledWith('Human', 'Warrior');
      expect(player.maxHp).toBe(100);
      expect(player.hp).toBe(100); // Should set current HP equal to maxHP
      expect(player.armor).toBe(2);
      expect(player.damageMod).toBe(1.2);
    });
    
    it('should set racial ability if available', () => {
      // Get player reference
      const player = gameRoom.players.get('player1');
      
      // Execute
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      
      // Verify
      expect(player.setRacialAbility).toHaveBeenCalledWith(racialAbilities.Human);
    });
    
    it('should use fallback values if stats calculation fails', () => {
      // Make calculateStats return null to simulate failure
      calculateStats.mockReturnValue(null);
      
      // Get player reference
      const player = gameRoom.players.get('player1');
      
      // Execute
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      
      // Verify fallback values were used
      expect(player.maxHp).toBe(80);
      expect(player.armor).toBe(0);
      expect(player.damageMod).toBe(1.0);
    });
  });
  
  describe('addAction', () => {
    beforeEach(() => {
      // Set up a player with abilities
      const mockPlayer = {
        id: 'player1',
        name: 'Alice',
        isAlive: true,
        hasStatusEffect: jest.fn().mockReturnValue(false),
        unlocked: [
          { type: 'slash', name: 'Slash' }
        ]
      };
      
      // Add player to game
      gameRoom.players.set('player1', mockPlayer);
      
      // Set game as started
      gameRoom.started = true;
      
      // Mock ability registry
      mockSystems.abilityRegistry.hasClassAbility.mockReturnValue(true);
    });
    
    it('should add a valid action to pendingActions', () => {
      // Execute
      const result = gameRoom.addAction('player1', 'slash', 'player2', { option: 'value' });
      
      // Verify
      expect(result).toBe(true);
      expect(gameRoom.pendingActions).toHaveLength(1);
      expect(gameRoom.pendingActions[0]).toEqual({
        actorId: 'player1',
        actionType: 'slash',
        targetId: 'player2',
        options: { option: 'value' }
      });
    });
    
    it('should return false if game has not started', () => {
      // Set game as not started
      gameRoom.started = false;
      
      // Execute
      const result = gameRoom.addAction('player1', 'slash', 'player2');
      
      // Verify
      expect(result).toBe(false);
      expect(gameRoom.pendingActions).toHaveLength(0);
    });
    
    it('should return false if player does not exist', () => {
      // Execute
      const result = gameRoom.addAction('nonexistent', 'slash', 'player2');
      
      // Verify
      expect(result).toBe(false);
      expect(gameRoom.pendingActions).toHaveLength(0);
    });
    
    it('should return false if player is dead', () => {
      // Set player as dead
      gameRoom.players.get('player1').isAlive = false;
      
      // Execute
      const result = gameRoom.addAction('player1', 'slash', 'player2');
      
      // Verify
      expect(result).toBe(false);
      expect(gameRoom.pendingActions).toHaveLength(0);
    });
    
    it('should return false if player is stunned', () => {
      // Set player as stunned
      mockSystems.statusEffectManager.isPlayerStunned.mockReturnValue(true);
      
      // Execute
      const result = gameRoom.addAction('player1', 'slash', 'player2');
      
      // Verify
      expect(result).toBe(false);
      expect(gameRoom.pendingActions).toHaveLength(0);
    });
    
    it('should return false if player has already acted', () => {
      // Add an existing action for this player
      gameRoom.pendingActions.push({
        actorId: 'player1',
        actionType: 'slash',
        targetId: 'player2'
      });
      
      // Execute
      const result = gameRoom.addAction('player1', 'slash', 'player3');
      
      // Verify
      expect(result).toBe(false);
      expect(gameRoom.pendingActions).toHaveLength(1); // Still only one action
    });
    
    it('should return false if ability is not found', () => {
      // Execute
      const result = gameRoom.addAction('player1', 'unknown', 'player2');
      
      // Verify
      expect(result).toBe(false);
      expect(gameRoom.pendingActions).toHaveLength(0);
    });
    
    it('should return false if ability is not registered', () => {
      // Mock ability registry to say ability is not registered
      mockSystems.abilityRegistry.hasClassAbility.mockReturnValue(false);
      
      // Execute
      const result = gameRoom.addAction('player1', 'slash', 'player2');
      
      // Verify
      expect(result).toBe(false);
      expect(gameRoom.pendingActions).toHaveLength(0);
    });
    
    it('should handle invisible target redirection', () => {
      // Set up an invisible target
      const invisibleTarget = {
        id: 'player2',
        hasStatusEffect: jest.fn().mockReturnValue(true)
      };
      
      // Add invisible target to game
      gameRoom.players.set('player2', invisibleTarget);
      
      // Mock the random target selection
      mockSystems.gameStateUtils.getRandomTarget.mockReturnValue('player3');
      
      // Execute
      const result = gameRoom.addAction('player1', 'slash', 'player2');
      
      // Verify
      expect(result).toBe(true);
      expect(gameRoom.pendingActions).toHaveLength(1);
      expect(gameRoom.pendingActions[0].targetId).toBe('player3'); // Redirected
    });
  });
  describe('Human Adaptability racial ability', () => {
  let gameRoom;
  let mockSocket;
  let mockIo;
  
  beforeEach(() => {
    // Create a new game room for each test
    gameRoom = new GameRoom('TEST123');
    
    // Add a human player with a couple of abilities
    const mockHumanPlayer = {
      id: 'human1',
      name: 'Alice',
      race: 'Human',
      class: 'Wizard',
      isAlive: true,
      racialUsesLeft: 1,
      abilities: [
        { type: 'fireball', name: 'Fireball', category: 'Attack', unlockAt: 1 },
        { type: 'arcaneShield', name: 'Arcane Shield', category: 'Defense', unlockAt: 2 }
      ],
      unlocked: [
        { type: 'fireball', name: 'Fireball', category: 'Attack', unlockAt: 1 }
      ],
      racialAbility: { type: 'adaptability', name: 'Adaptability' }
    };
    
    gameRoom.players.set('human1', mockHumanPlayer);
    
    // Mock socket and io for event handling
    mockSocket = {
      id: 'human1',
      emit: jest.fn()
    };
    
    mockIo = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      })
    };
  });
  
  it('should handle adaptability ability trigger correctly', () => {
    // Set up game controller
    const gameController = require('@controllers/gameController');
    
    // Execute the handler
    const result = gameController.handleRacialAbility(
      mockIo, 
      mockSocket, 
      'TEST123', 
      'self', 
      'adaptability'
    );
    
    // Verify the result
    expect(result).toBe(true);
    
    // Check if the proper event was emitted
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'adaptabilityChooseAbility',
      expect.objectContaining({
        abilities: expect.any(Array),
        maxLevel: expect.any(Number)
      })
    );
    
    // Check if the ability use was recorded
    expect(gameRoom.players.get('human1').racialUsesLeft).toBe(0);
  });
  
  it('should handle ability replacement correctly', () => {
    // Mock class abilities
    jest.mock('../../config/classAbilities', () => ({
      Wizard: [
        { type: 'fireball', name: 'Fireball', category: 'Attack', unlockAt: 1 },
        { type: 'magicMissile', name: 'Magic Missile', category: 'Attack', unlockAt: 1 },
        { type: 'arcaneShield', name: 'Arcane Shield', category: 'Defense', unlockAt: 2 }
      ]
    }));
    
    // Execute the replace handler
    const gameController = require('@controllers/gameController');
    
    const result = gameController.handleAdaptabilityReplace(
      mockIo,
      mockSocket,
      'TEST123',
      'fireball',
      'magicMissile',
      1
    );
    
    // Verify result
    expect(result).toBe(true);
    
    // Check if ability was replaced in both abilities and unlocked arrays
    const player = gameRoom.players.get('human1');
    const hasNewAbility = player.abilities.some(a => a.type === 'magicMissile');
    const hasNewUnlocked = player.unlocked.some(a => a.type === 'magicMissile');
    
    expect(hasNewAbility).toBe(true);
    expect(hasNewUnlocked).toBe(true);
    
    // Check old ability was removed
    const hasOldAbility = player.abilities.some(a => a.type === 'fireball');
    const hasOldUnlocked = player.unlocked.some(a => a.type === 'fireball');
    
    expect(hasOldAbility).toBe(false);
    expect(hasOldUnlocked).toBe(false);
  });
  
  it('should fail if player has no uses left', () => {
    // Set uses to 0
    gameRoom.players.get('human1').racialUsesLeft = 0;
    
    // Execute the handler
    const gameController = require('@controllers/gameController');
    
    const result = gameController.handleRacialAbility(
      mockIo, 
      mockSocket, 
      'TEST123', 
      'self', 
      'adaptability'
    );
    
    // Verify the result is false
    expect(result).toBe(false);
    
    // Check if the error message was emitted
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'racialAbilityUsed',
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('No uses left')
      })
    );
  });
});
  describe('processRound', () => {
    beforeEach(() => {
      // Set up for round processing
      gameRoom.players = new Map([
        ['player1', { resetRacialPerRoundUses: jest.fn(), isAlive: true, hp: 10 }],
        ['player2', { resetRacialPerRoundUses: jest.fn(), isAlive: true, hp: 0 }]
      ]);
      
      // Mock win condition check
      mockSystems.gameStateUtils.checkWinConditions.mockReturnValue(null); // No winner yet
      
      // Mock monster death result
      mockSystems.monsterController.handleDeathAndRespawn.mockReturnValue({ 
        newLevel: 2, 
        monsterState: { hp: 150, maxHp: 150 } 
      });
    });
    
    it('should process a complete game round', () => {
      // Execute
      const result = gameRoom.processRound();
      
      // Verify all steps were executed
      expect(gameRoom.players.get('player1').resetRacialPerRoundUses).toHaveBeenCalled();
      expect(gameRoom.players.get('player2').resetRacialPerRoundUses).toHaveBeenCalled();
      expect(mockSystems.monsterController.ageMonster).toHaveBeenCalled();
      expect(mockSystems.monsterController.attack).toHaveBeenCalled();
      expect(mockSystems.statusEffectManager.processTimedEffects).toHaveBeenCalled();
      expect(mockSystems.racialAbilitySystem.processEndOfRoundEffects).toHaveBeenCalled();
      expect(mockSystems.combatSystem.processPendingDeaths).toHaveBeenCalled();
      expect(mockSystems.monsterController.handleDeathAndRespawn).toHaveBeenCalledWith(1, expect.any(Array));
      
      // Check level was updated
      expect(gameRoom.level).toBe(2);
      
      // Check round was incremented
      expect(gameRoom.round).toBe(1);
    });
    
    it('should mark players with 0 HP for pending death', () => {
      // Execute
      gameRoom.processRound();
      
      // Verify
      expect(gameRoom.players.get('player2').pendingDeath).toBe(true);
      expect(gameRoom.players.get('player2').deathAttacker).toBe("Effects");
    });
    
    it('should not increment round if there is a winner', () => {
      // Mock a winner
      mockSystems.gameStateUtils.checkWinConditions.mockReturnValue('Good');
      
      // Initial round
      gameRoom.round = 5;
      
      // Execute
      const result = gameRoom.processRound();
      
      // Verify
      expect(result.winner).toBe('Good');
      expect(gameRoom.round).toBe(5); // Unchanged
    });
    
    it('should return all required data in the result', () => {
      // Execute
      const result = gameRoom.processRound();
      
      // Verify
      expect(result).toEqual({
        eventsLog: expect.any(Array),
        players: expect.any(Array),
        monster: expect.any(Object),
        turn: 1,
        level: 2,
        winner: null
      });
    });
  });
});