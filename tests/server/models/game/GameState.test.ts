/**
 * @fileoverview Tests for GameState domain model
 * Tests game state management, validation, and progression tracking
 */

// Mock dependencies
jest.mock('@utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../../../server/types/generated', () => ({
  Player: {},
  Monster: {},
  GameCode: {}
}), { virtual: true });

import { GameState } from '../../../../server/models/game/GameState';
import type { MonsterState, DisconnectedPlayer, GameStateSnapshot, GameConfig } from '../../../../server/models/game/GameState';

describe('GameState Domain Model', () => {
  let gameState: GameState;
  let mockConfig: GameConfig;

  beforeEach(() => {
    mockConfig = {
      gameBalance: {
        monster: {
          baseHp: 100,
          baseDamage: 25,
          baseAge: 0
        }
      }
    };

    gameState = new GameState('TEST123', 'host123', mockConfig);
  });

  describe('GameState Constructor', () => {
    it('should create GameState with valid parameters', () => {
      expect(gameState).toBeDefined();
      expect(gameState.code).toBe('TEST123');
      expect(gameState.hostId).toBe('host123');
    });

    it('should initialize with default values', () => {
      expect(gameState.started).toBe(false);
      expect(gameState.round).toBe(0);
      expect(gameState.level).toBe(1);
      expect(gameState.playerCount).toBe(0);
      expect(gameState.aliveCount).toBe(0);
    });

    it('should initialize monster with config values', () => {
      const monster = gameState.monster;
      expect(monster.hp).toBe(100);
      expect(monster.maxHp).toBe(100);
      expect(monster.baseDmg).toBe(25);
      expect(monster.age).toBe(0);
    });

    it('should throw error for invalid game code', () => {
      expect(() => {
        new GameState('', 'host123', mockConfig);
      }).toThrow();
    });

    it('should throw error for invalid host ID', () => {
      expect(() => {
        new GameState('TEST123', '', mockConfig);
      }).toThrow();
    });
  });

  describe('Game State Properties', () => {
    it('should have correct initial game code', () => {
      expect(gameState.code).toBe('TEST123');
    });

    it('should have correct initial host ID', () => {
      expect(gameState.hostId).toBe('host123');
    });

    it('should not be started initially', () => {
      expect(gameState.started).toBe(false);
    });

    it('should start at round 0', () => {
      expect(gameState.round).toBe(0);
    });

    it('should start at level 1', () => {
      expect(gameState.level).toBe(1);
    });

    it('should have zero players initially', () => {
      expect(gameState.playerCount).toBe(0);
      expect(gameState.aliveCount).toBe(0);
    });
  });

  describe('Monster State', () => {
    it('should initialize monster with correct properties', () => {
      const monster = gameState.monster;
      expect(monster).toHaveProperty('hp');
      expect(monster).toHaveProperty('maxHp');
      expect(monster).toHaveProperty('baseDmg');
      expect(monster).toHaveProperty('age');
    });

    it('should have monster HP equal to max HP initially', () => {
      const monster = gameState.monster;
      expect(monster.hp).toBe(monster.maxHp);
    });

    it('should use config values for monster stats', () => {
      const monster = gameState.monster;
      expect(monster.maxHp).toBe(mockConfig.gameBalance.monster.baseHp);
      expect(monster.baseDmg).toBe(mockConfig.gameBalance.monster.baseDamage);
      expect(monster.age).toBe(mockConfig.gameBalance.monster.baseAge);
    });
  });

  describe('Game Progression', () => {
    it('should be able to start game', () => {
      gameState.start();
      expect(gameState.started).toBe(true);
    });

    it('should increment round', () => {
      const initialRound = gameState.round;
      gameState.nextRound();
      expect(gameState.round).toBe(initialRound + 1);
    });

    it('should increment level', () => {
      const initialLevel = gameState.level;
      gameState.levelUp();
      expect(gameState.level).toBe(initialLevel + 1);
    });

    it('should update player counts', () => {
      gameState.setPlayerCount(5);
      expect(gameState.playerCount).toBe(5);
    });

    it('should update alive count', () => {
      gameState.setAliveCount(3);
      expect(gameState.aliveCount).toBe(3);
    });
  });

  describe('Monster Management', () => {
    it('should allow updating monster HP', () => {
      gameState.updateMonsterHp(75);
      expect(gameState.monster.hp).toBe(75);
    });

    it('should not allow negative monster HP', () => {
      gameState.updateMonsterHp(-10);
      expect(gameState.monster.hp).toBe(0);
    });

    it('should not allow monster HP above max', () => {
      gameState.updateMonsterHp(150);
      expect(gameState.monster.hp).toBe(gameState.monster.maxHp);
    });

    it('should allow updating monster age', () => {
      gameState.updateMonsterAge(5);
      expect(gameState.monster.age).toBe(5);
    });

    it('should calculate monster damage based on age', () => {
      gameState.updateMonsterAge(3);
      const damage = gameState.getMonsterDamage();
      expect(damage).toBeGreaterThanOrEqual(gameState.monster.baseDmg);
    });
  });

  describe('State Validation', () => {
    it('should validate monster state schema', () => {
      const monster: MonsterState = {
        hp: 100,
        maxHp: 100,
        baseDmg: 25,
        age: 0
      };

      expect(() => {
        gameState.validateMonsterState(monster);
      }).not.toThrow();
    });

    it('should reject invalid monster state', () => {
      const invalidMonster = {
        hp: -10, // Invalid negative HP
        maxHp: 100,
        baseDmg: 25,
        age: 0
      };

      expect(() => {
        gameState.validateMonsterState(invalidMonster as MonsterState);
      }).toThrow();
    });

    it('should validate game state snapshot', () => {
      const snapshot: GameStateSnapshot = {
        code: 'TEST123',
        hostId: 'host123',
        started: false,
        round: 0,
        level: 1,
        playerCount: 0,
        aliveCount: 0,
        monster: {
          hp: 100,
          maxHp: 100,
          baseDmg: 25,
          age: 0
        }
      };

      expect(() => {
        gameState.validateSnapshot(snapshot);
      }).not.toThrow();
    });
  });

  describe('Disconnected Players', () => {
    it('should track disconnected players', () => {
      const disconnectedPlayer: DisconnectedPlayer = {
        id: 'player123',
        name: 'TestPlayer',
        disconnectedAt: Date.now()
      };

      gameState.addDisconnectedPlayer(disconnectedPlayer);
      const disconnected = gameState.getDisconnectedPlayers();

      expect(disconnected).toContain(disconnectedPlayer);
    });

    it('should remove disconnected players on reconnect', () => {
      const disconnectedPlayer: DisconnectedPlayer = {
        id: 'player123',
        name: 'TestPlayer',
        disconnectedAt: Date.now()
      };

      gameState.addDisconnectedPlayer(disconnectedPlayer);
      gameState.removeDisconnectedPlayer('player123');

      const disconnected = gameState.getDisconnectedPlayers();
      expect(disconnected).not.toContain(disconnectedPlayer);
    });

    it('should clear expired disconnected players', () => {
      const expiredPlayer: DisconnectedPlayer = {
        id: 'player123',
        name: 'TestPlayer',
        disconnectedAt: Date.now() - 120000 // 2 minutes ago
      };

      gameState.addDisconnectedPlayer(expiredPlayer);
      gameState.clearExpiredDisconnectedPlayers(60000); // 1 minute timeout

      const disconnected = gameState.getDisconnectedPlayers();
      expect(disconnected).not.toContain(expiredPlayer);
    });
  });

  describe('Game State Snapshot', () => {
    it('should create valid snapshot', () => {
      const snapshot = gameState.createSnapshot();

      expect(snapshot).toHaveProperty('code');
      expect(snapshot).toHaveProperty('hostId');
      expect(snapshot).toHaveProperty('started');
      expect(snapshot).toHaveProperty('round');
      expect(snapshot).toHaveProperty('level');
      expect(snapshot).toHaveProperty('playerCount');
      expect(snapshot).toHaveProperty('aliveCount');
      expect(snapshot).toHaveProperty('monster');
    });

    it('should restore from snapshot', () => {
      const originalSnapshot = gameState.createSnapshot();

      // Modify state
      gameState.start();
      gameState.nextRound();
      gameState.levelUp();

      // Restore from snapshot
      gameState.restoreFromSnapshot(originalSnapshot);

      expect(gameState.started).toBe(originalSnapshot.started);
      expect(gameState.round).toBe(originalSnapshot.round);
      expect(gameState.level).toBe(originalSnapshot.level);
    });
  });

  describe('Game Status Checks', () => {
    it('should check if game is in progress', () => {
      expect(gameState.isInProgress()).toBe(false);

      gameState.start();
      expect(gameState.isInProgress()).toBe(true);
    });

    it('should check if monster is alive', () => {
      expect(gameState.isMonsterAlive()).toBe(true);

      gameState.updateMonsterHp(0);
      expect(gameState.isMonsterAlive()).toBe(false);
    });

    it('should check if game can start', () => {
      gameState.setPlayerCount(1);
      expect(gameState.canStart()).toBe(false); // Need minimum players

      gameState.setPlayerCount(4);
      expect(gameState.canStart()).toBe(true);
    });

    it('should check if level up is needed', () => {
      gameState.updateMonsterHp(0);
      expect(gameState.needsLevelUp()).toBe(true);

      gameState.updateMonsterHp(50);
      expect(gameState.needsLevelUp()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid player counts gracefully', () => {
      expect(() => {
        gameState.setPlayerCount(-1);
      }).toThrow();
    });

    it('should handle invalid alive counts gracefully', () => {
      expect(() => {
        gameState.setAliveCount(-1);
      }).toThrow();
    });

    it('should handle invalid level values gracefully', () => {
      expect(() => {
        gameState.setLevel(0);
      }).toThrow();
    });

    it('should handle invalid round values gracefully', () => {
      expect(() => {
        gameState.setRound(-1);
      }).toThrow();
    });
  });

  describe('State Persistence', () => {
    it('should serialize to JSON', () => {
      const json = gameState.toJSON();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(parsed.code).toBe(gameState.code);
      expect(parsed.hostId).toBe(gameState.hostId);
    });

    it('should restore from JSON', () => {
      const originalJson = gameState.toJSON();

      // Create new instance and restore
      const newGameState = GameState.fromJSON(originalJson, mockConfig);

      expect(newGameState.code).toBe(gameState.code);
      expect(newGameState.hostId).toBe(gameState.hostId);
      expect(newGameState.started).toBe(gameState.started);
    });
  });

  describe('Configuration Integration', () => {
    it('should use provided config values', () => {
      const customConfig: GameConfig = {
        gameBalance: {
          monster: {
            baseHp: 200,
            baseDamage: 50,
            baseAge: 1
          }
        }
      };

      const customGameState = new GameState('CUSTOM123', 'host456', customConfig);

      expect(customGameState.monster.maxHp).toBe(200);
      expect(customGameState.monster.baseDmg).toBe(50);
      expect(customGameState.monster.age).toBe(1);
    });

    it('should validate config on construction', () => {
      const invalidConfig = {
        gameBalance: {
          monster: {
            baseHp: -100, // Invalid
            baseDamage: 25,
            baseAge: 0
          }
        }
      };

      expect(() => {
        new GameState('TEST123', 'host123', invalidConfig as GameConfig);
      }).toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should maintain TypeScript type safety', () => {
      const monster: MonsterState = gameState.monster;
      expect(typeof monster.hp).toBe('number');
      expect(typeof monster.maxHp).toBe('number');
      expect(typeof monster.baseDmg).toBe('number');
      expect(typeof monster.age).toBe('number');
    });

    it('should validate schema types at runtime', () => {
      const validSnapshot: GameStateSnapshot = {
        code: 'TEST123',
        hostId: 'host123',
        started: false,
        round: 0,
        level: 1,
        playerCount: 0,
        aliveCount: 0,
        monster: {
          hp: 100,
          maxHp: 100,
          baseDmg: 25,
          age: 0
        }
      };

      expect(() => {
        gameState.validateSnapshot(validSnapshot);
      }).not.toThrow();
    });
  });
});
