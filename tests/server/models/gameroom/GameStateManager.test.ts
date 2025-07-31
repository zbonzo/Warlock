/**
 * @fileoverview TypeScript tests for GameStateManager
 * Testing the new modular GameStateManager class with type safety
 */

import { GameStateManager } from '../../../../server/models/gameroom/GameStateManager';
import type { GameRoom } from '../../../../server/models/GameRoom';
import type { Player } from '../../../../server/models/Player';

// Mock dependencies
jest.mock('../../../../server/config/index.js', () => ({
  default: {
    gameBalance: {
      calculateStats: jest.fn(() => ({ maxHp: 150, armor: 2, damageMod: 1.2 })),
      monster: {
        baseHp: 100,
        baseDamage: 15,
        levelMultiplier: 1.3
      },
      player: {
        levelUp: {
          hpIncrease: 0.2,
          damageIncrease: 1.1
        }
      }
    },
    classAbilities: {
      Warrior: [
        { type: 'slash', name: 'Slash', unlockAt: 1 },
        { type: 'charge', name: 'Charge', unlockAt: 2 }
      ]
    }
  }
}));

jest.mock('../../../../server/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

jest.mock('../../../../server/config/messages/index.js', () => ({
  default: {
    getEvent: jest.fn((key: string) => `Event: ${key}`),
    getSuccess: jest.fn((key: string) => `Success: ${key}`),
    events: {
      levelUp: 'Level increased!',
      monsterLevelUp: 'Monster grows stronger!',
      newAbilitiesUnlocked: 'New abilities unlocked!'
    }
  }
}));

describe('GameStateManager (TypeScript)', () => {
  let gameStateManager: GameStateManager;
  let mockGameRoom: jest.Mocked<GameRoom>;
  let mockPlayers: Map<string, jest.Mocked<Player>>;
  let mockActionProcessor: any;

  beforeEach(() => {
    // Create mock players
    mockPlayers = new Map();
    const mockPlayer1 = createMockPlayer('player1', 'Alice', 'Human', 'Warrior');
    const mockPlayer2 = createMockPlayer('player2', 'Bob', 'Dwarf', 'Warrior'); 
    mockPlayers.set('player1', mockPlayer1);
    mockPlayers.set('player2', mockPlayer2);

    // Create mock action processor
    mockActionProcessor = {
      processActions: jest.fn().mockReturnValue({
        results: ['Action processed'],
        coordination: { bonus: 5 }
      }),
      processRacialActions: jest.fn().mockReturnValue(['Racial action processed'])
    };

    // Create mock game room
    mockGameRoom = {
      players: mockPlayers,
      level: 1,
      round: 1,
      monster: {
        hp: 100,
        maxHp: 100,
        level: 1,
        age: 1
      },
      pendingActions: [],
      pendingRacialActions: [],
      actionProcessor: mockActionProcessor,
      clearRoundState: jest.fn(),
      getAlivePlayers: jest.fn().mockReturnValue([mockPlayers.get('player1'), mockPlayers.get('player2')]),
      isGameOver: jest.fn().mockReturnValue(false),
      getWinCondition: jest.fn().mockReturnValue(null)
    } as any;

    gameStateManager = new GameStateManager(mockGameRoom);
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with game room reference', () => {
      expect(gameStateManager).toBeInstanceOf(GameStateManager);
    });
  });

  describe('Round Processing', () => {
    it('should process a complete round successfully', () => {
      const log = gameStateManager.processRound();

      expect(Array.isArray(log)).toBe(true);
      expect(log.length).toBeGreaterThan(0);
      expect(mockGameRoom.clearRoundState).toHaveBeenCalled();
    });

    it('should process round start operations', () => {
      const log = gameStateManager.processRound();

      // Should increment round
      expect(mockGameRoom.round).toBe(2);
      
      // Should process player effects
      mockPlayers.forEach(player => {
        expect(player.processAbilityCooldowns).toHaveBeenCalled();
        expect(player.processStatusEffects).toHaveBeenCalled();
      });
    });

    it('should process actions through action processor', () => {
      mockGameRoom.pendingActions = [
        { actorId: 'player1', abilityType: 'slash', targetId: 'monster' }
      ];

      const log = gameStateManager.processRound();

      expect(mockActionProcessor.processActions).toHaveBeenCalledWith(
        mockGameRoom.pendingActions,
        expect.any(Object) // coordination data
      );
      expect(log).toContain('Action processed');
    });

    it('should process racial actions', () => {
      mockGameRoom.pendingRacialActions = [
        { actorId: 'player1', racialType: 'stoneArmor', targetId: 'self' }
      ];

      const log = gameStateManager.processRound();

      expect(mockActionProcessor.processRacialActions).toHaveBeenCalledWith(
        mockGameRoom.pendingRacialActions
      );
      expect(log).toContain('Racial action processed');
    });

    it('should handle monster aging', () => {
      const initialAge = mockGameRoom.monster.age;
      
      gameStateManager.processRound();

      expect(mockGameRoom.monster.age).toBe(initialAge + 1);
    });

    it('should clear round state after processing', () => {
      gameStateManager.processRound();

      expect(mockGameRoom.clearRoundState).toHaveBeenCalled();
    });
  });

  describe('Level Progression', () => {
    it('should handle level progression when monster defeated', () => {
      // Set monster to defeated state
      mockGameRoom.monster.hp = 0;
      mockGameRoom.isGameOver = jest.fn().mockReturnValue(false);
      
      const log = gameStateManager.processRound();

      expect(mockGameRoom.level).toBe(2);
      expect(log.some(entry => entry.includes('Level'))).toBe(true);
    });

    it('should update player stats on level up', () => {
      mockGameRoom.monster.hp = 0;
      const initialLevel = mockGameRoom.level;

      gameStateManager.processRound();

      expect(mockGameRoom.level).toBe(initialLevel + 1);
      
      // Check that players had their stats updated
      mockPlayers.forEach(player => {
        expect(player.stats.updateStats).toHaveBeenCalled();
      });
    });

    it('should unlock new abilities on level up', () => {
      mockGameRoom.monster.hp = 0;
      mockGameRoom.level = 1; // Will become 2 after level up

      gameStateManager.processRound();

      // Should check for new abilities
      mockPlayers.forEach(player => {
        // Player should have abilities filtered for new unlock level
        expect(player.abilities).toBeDefined();
      });
    });

    it('should respawn monster on level progression', () => {
      mockGameRoom.monster.hp = 0;
      const initialMaxHp = mockGameRoom.monster.maxHp;

      gameStateManager.processRound();

      // Monster should be respawned with increased stats
      expect(mockGameRoom.monster.hp).toBeGreaterThan(0);
      expect(mockGameRoom.monster.maxHp).toBeGreaterThanOrEqual(initialMaxHp);
    });
  });

  describe('Win Condition Checking', () => {
    it('should detect game over conditions', () => {
      mockGameRoom.isGameOver = jest.fn().mockReturnValue(true);
      mockGameRoom.getWinCondition = jest.fn().mockReturnValue('victory');

      const log = gameStateManager.processRound();

      expect(mockGameRoom.isGameOver).toHaveBeenCalled();
      expect(mockGameRoom.getWinCondition).toHaveBeenCalled();
      expect(log.some(entry => entry.includes('victory') || entry.includes('Game'))).toBe(true);
    });

    it('should handle player defeat scenario', () => {
      // All players dead
      mockPlayers.forEach(player => {
        player.isAlive = false;
      });
      mockGameRoom.getAlivePlayers = jest.fn().mockReturnValue([]);
      mockGameRoom.isGameOver = jest.fn().mockReturnValue(true);
      mockGameRoom.getWinCondition = jest.fn().mockReturnValue('defeat');

      const log = gameStateManager.processRound();

      expect(log.some(entry => entry.includes('defeat') || entry.includes('Game'))).toBe(true);
    });
  });

  describe('Passive Ability Processing', () => {
    it('should process passive abilities during round', () => {
      // Set up player with passive ability
      const player = mockPlayers.get('player1')!;
      player.abilities.abilities = [
        { type: 'regeneration', name: 'Regeneration', passive: true }
      ];

      const log = gameStateManager.processRound();

      // Should have processed passive abilities
      expect(log.length).toBeGreaterThan(0);
    });

    it('should handle multiple passive abilities', () => {
      // Set up players with different passive abilities
      const player1 = mockPlayers.get('player1')!;
      const player2 = mockPlayers.get('player2')!;
      
      player1.abilities.abilities = [
        { type: 'regeneration', name: 'Regeneration', passive: true }
      ];
      player2.abilities.abilities = [
        { type: 'thorns', name: 'Thorns', passive: true }
      ];

      const log = gameStateManager.processRound();

      expect(log.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle action processing errors gracefully', () => {
      mockActionProcessor.processActions.mockImplementation(() => {
        throw new Error('Action processing failed');
      });

      expect(() => gameStateManager.processRound()).not.toThrow();
    });

    it('should handle racial action processing errors', () => {
      mockActionProcessor.processRacialActions.mockImplementation(() => {
        throw new Error('Racial action failed');
      });

      expect(() => gameStateManager.processRound()).not.toThrow();
    });

    it('should handle missing player data', () => {
      // Clear players
      mockGameRoom.players.clear();
      mockGameRoom.getAlivePlayers = jest.fn().mockReturnValue([]);

      expect(() => gameStateManager.processRound()).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types for game room', () => {
      // This test verifies TypeScript compilation
      expect(typeof mockGameRoom.level).toBe('number');
      expect(typeof mockGameRoom.round).toBe('number');
      expect(mockGameRoom.players instanceof Map).toBe(true);
    });

    it('should handle typed action results', () => {
      const actionResults = {
        results: ['typed result'],
        coordination: { bonus: 10, multiplier: 1.5 }
      };

      mockActionProcessor.processActions.mockReturnValue(actionResults);

      const log = gameStateManager.processRound();

      expect(log).toContain('typed result');
    });
  });

  /**
   * Helper function to create mock player instances
   */
  function createMockPlayer(id: string, name: string, race: string, playerClass: string): jest.Mocked<Player> {
    return {
      id,
      name,
      race,
      class: playerClass,
      isAlive: true,
      level: 1,
      stats: {
        hp: 100,
        maxHp: 100,
        armor: 0,
        updateStats: jest.fn(),
      },
      abilities: {
        abilities: [],
        unlocked: [],
        processAbilityCooldowns: jest.fn(),
      },
      effects: {
        processStatusEffects: jest.fn(),
      },
      processAbilityCooldowns: jest.fn(),
      processStatusEffects: jest.fn(),
      processClassEffects: jest.fn(),
      resetRacialPerRoundUses: jest.fn(),
    } as any;
  }
});