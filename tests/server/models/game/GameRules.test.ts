/**
 * @fileoverview Tests for GameRules domain model
 * Tests game rules, validation, and coordination calculations
 */

import { GameRules, GameSystems, ValidationResult } from '@server/models/game/GameRules';
import type { Player } from '@server/types/generated';

// Mock config
jest.mock('@config', () => ({
  maxPlayers: 12,
  minPlayers: 4
}));

// Mock logger to avoid console output during tests
jest.mock('@utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('GameRules', () => {
  let gameRules: GameRules;
  let mockSystems: GameSystems;

  const mockPlayer: Player = {
    id: 'player1',
    name: 'TestPlayer',
    status: 'alive',
    role: 'Innocent'
  } as Player;

  const mockDeadPlayer: Player = {
    id: 'player2',
    name: 'DeadPlayer',
    status: 'dead',
    role: 'Innocent'
  } as Player;

  const mockWarlock: Player = {
    id: 'warlock1',
    name: 'TestWarlock',
    status: 'alive',
    role: 'Warlock'
  } as Player;

  beforeEach(() => {
    gameRules = new GameRules('TEST123');
    mockSystems = {
      statusEffectManager: {
        isPlayerStunned: jest.fn().mockReturnValue(false)
      }
    };
  });

  describe('constructor', () => {
    it('should create GameRules with game code', () => {
      expect(gameRules).toBeInstanceOf(GameRules);
    });

    it('should accept any valid game code', () => {
      const gameRules1 = new GameRules('ABCD');
      const gameRules2 = new GameRules('1234');
      expect(gameRules1).toBeInstanceOf(GameRules);
      expect(gameRules2).toBeInstanceOf(GameRules);
    });
  });

  describe('canAddPlayer', () => {
    it('should allow adding players when game not started and under max', () => {
      expect(gameRules.canAddPlayer(false, 5)).toBe(true);
      expect(gameRules.canAddPlayer(false, 11)).toBe(true);
    });

    it('should not allow adding players when game started', () => {
      expect(gameRules.canAddPlayer(true, 5)).toBe(false);
      expect(gameRules.canAddPlayer(true, 1)).toBe(false);
    });

    it('should not allow adding players when at max capacity', () => {
      expect(gameRules.canAddPlayer(false, 12)).toBe(false);
      expect(gameRules.canAddPlayer(false, 15)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(gameRules.canAddPlayer(false, 0)).toBe(true);
      expect(gameRules.canAddPlayer(true, 0)).toBe(false);
    });
  });

  describe('validateActionSubmission', () => {
    it('should validate successful action submission', () => {
      const result = gameRules.validateActionSubmission(
        mockPlayer,
        'attack',
        'target1',
        mockSystems
      );

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject action from dead player', () => {
      const result = gameRules.validateActionSubmission(
        mockDeadPlayer,
        'attack',
        'target1',
        mockSystems
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Actor not alive');
    });

    it('should reject action from null/undefined player', () => {
      const result = gameRules.validateActionSubmission(
        null as any,
        'attack',
        'target1',
        mockSystems
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Actor not alive');
    });

    it('should reject action from stunned player', () => {
      mockSystems.statusEffectManager.isPlayerStunned.mockReturnValue(true);

      const result = gameRules.validateActionSubmission(
        mockPlayer,
        'attack',
        'target1',
        mockSystems
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Actor is stunned');
      expect(mockSystems.statusEffectManager.isPlayerStunned).toHaveBeenCalledWith('player1');
    });

    it('should return proper ValidationResult type', () => {
      const result = gameRules.validateActionSubmission(
        mockPlayer,
        'heal',
        'target2',
        mockSystems
      );

      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
      if (result.reason) {
        expect(typeof result.reason).toBe('string');
      }
    });
  });

  describe('canStartGame', () => {
    it('should allow starting when meeting minimum players and all ready', () => {
      expect(gameRules.canStartGame(4, 4)).toBe(true);
      expect(gameRules.canStartGame(8, 8)).toBe(true);
      expect(gameRules.canStartGame(12, 12)).toBe(true);
    });

    it('should not allow starting with insufficient players', () => {
      expect(gameRules.canStartGame(3, 3)).toBe(false);
      expect(gameRules.canStartGame(2, 2)).toBe(false);
      expect(gameRules.canStartGame(1, 1)).toBe(false);
    });

    it('should not allow starting when not all players ready', () => {
      expect(gameRules.canStartGame(4, 3)).toBe(false);
      expect(gameRules.canStartGame(6, 5)).toBe(false);
      expect(gameRules.canStartGame(8, 0)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(gameRules.canStartGame(0, 0)).toBe(false);
      expect(gameRules.canStartGame(4, 0)).toBe(false);
      expect(gameRules.canStartGame(0, 4)).toBe(false);
    });
  });

  describe('calculateCoordinationBonus', () => {
    it('should return 1.0 for single or no actions', () => {
      expect(gameRules.calculateCoordinationBonus([])).toBe(1.0);
      expect(gameRules.calculateCoordinationBonus([{ type: 'attack' }])).toBe(1.0);
    });

    it('should calculate bonus for multiple coordinated actions', () => {
      const twoActions = [{ type: 'attack' }, { type: 'attack' }];
      expect(gameRules.calculateCoordinationBonus(twoActions)).toBe(1.1);

      const threeActions = [{ type: 'attack' }, { type: 'attack' }, { type: 'heal' }];
      expect(gameRules.calculateCoordinationBonus(threeActions)).toBe(1.2);

      const fourActions = [{ type: 'attack' }, { type: 'attack' }, { type: 'heal' }, { type: 'defend' }];
      expect(gameRules.calculateCoordinationBonus(fourActions)).toBe(1.3);
    });

    it('should handle large coordination groups', () => {
      const manyActions = Array(10).fill({ type: 'attack' });
      expect(gameRules.calculateCoordinationBonus(manyActions)).toBe(1.9);
    });

    it('should handle empty actions gracefully', () => {
      expect(gameRules.calculateCoordinationBonus([])).toBe(1.0);
    });
  });

  describe('isValidTarget', () => {
    it('should validate targets in available list', () => {
      const availableTargets = ['player1', 'player2', 'monster1'];

      expect(gameRules.isValidTarget('player1', availableTargets)).toBe(true);
      expect(gameRules.isValidTarget('player2', availableTargets)).toBe(true);
      expect(gameRules.isValidTarget('monster1', availableTargets)).toBe(true);
    });

    it('should reject targets not in available list', () => {
      const availableTargets = ['player1', 'player2'];

      expect(gameRules.isValidTarget('player3', availableTargets)).toBe(false);
      expect(gameRules.isValidTarget('monster1', availableTargets)).toBe(false);
      expect(gameRules.isValidTarget('', availableTargets)).toBe(false);
    });

    it('should handle empty target lists', () => {
      expect(gameRules.isValidTarget('player1', [])).toBe(false);
    });

    it('should handle case sensitivity', () => {
      const availableTargets = ['Player1', 'MONSTER1'];

      expect(gameRules.isValidTarget('player1', availableTargets)).toBe(false);
      expect(gameRules.isValidTarget('Player1', availableTargets)).toBe(true);
      expect(gameRules.isValidTarget('monster1', availableTargets)).toBe(false);
      expect(gameRules.isValidTarget('MONSTER1', availableTargets)).toBe(true);
    });
  });

  describe('shouldEndRound', () => {
    it('should end round when all alive players submitted', () => {
      expect(gameRules.shouldEndRound(4, 4)).toBe(true);
      expect(gameRules.shouldEndRound(1, 1)).toBe(true);
      expect(gameRules.shouldEndRound(8, 8)).toBe(true);
    });

    it('should not end round when some players havent submitted', () => {
      expect(gameRules.shouldEndRound(4, 3)).toBe(false);
      expect(gameRules.shouldEndRound(6, 0)).toBe(false);
      expect(gameRules.shouldEndRound(2, 1)).toBe(false);
    });

    it('should handle over-submission scenarios', () => {
      // This might happen due to race conditions or bugs
      expect(gameRules.shouldEndRound(4, 5)).toBe(true);
      expect(gameRules.shouldEndRound(1, 2)).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(gameRules.shouldEndRound(0, 0)).toBe(true);
      expect(gameRules.shouldEndRound(0, 1)).toBe(true);
    });
  });

  describe('checkWinCondition', () => {
    const aliveInnocents = [mockPlayer, { ...mockPlayer, id: 'player3' }] as Player[];
    const aliveWarlocks = [mockWarlock, { ...mockWarlock, id: 'warlock2' }] as Player[];
    const mixedPlayers = [mockPlayer, mockWarlock] as Player[];

    it('should detect monster defeated victory', () => {
      const result = gameRules.checkWinCondition(aliveInnocents, 0);

      expect(result.gameEnded).toBe(true);
      expect(result.winner).toBe('Good');
      expect(result.reason).toBe('Monster defeated');
    });

    it('should detect monster defeated even with negative HP', () => {
      const result = gameRules.checkWinCondition(aliveInnocents, -50);

      expect(result.gameEnded).toBe(true);
      expect(result.winner).toBe('Good');
      expect(result.reason).toBe('Monster defeated');
    });

    it('should detect all players dead', () => {
      const result = gameRules.checkWinCondition([], 100);

      expect(result.gameEnded).toBe(true);
      expect(result.winner).toBe('Evil');
      expect(result.reason).toBe('All players died');
    });

    it('should detect warlock victory when equal numbers', () => {
      const result = gameRules.checkWinCondition(mixedPlayers, 100);

      expect(result.gameEnded).toBe(true);
      expect(result.winner).toBe('warlocks');
      expect(result.reason).toBe('Warlocks equal or outnumber innocents');
    });

    it('should detect warlock victory when outnumbering', () => {
      const result = gameRules.checkWinCondition(aliveWarlocks, 100);

      expect(result.gameEnded).toBe(true);
      expect(result.winner).toBe('warlocks');
      expect(result.reason).toBe('Warlocks equal or outnumber innocents');
    });

    it('should continue game when innocents outnumber warlocks', () => {
      const result = gameRules.checkWinCondition(aliveInnocents, 100);

      expect(result.gameEnded).toBe(false);
      expect(result.winner).toBeUndefined();
      expect(result.reason).toBeUndefined();
    });

    it('should handle mixed scenarios with monster alive', () => {
      const manyInnocents = [
        mockPlayer,
        { ...mockPlayer, id: 'player3' },
        { ...mockPlayer, id: 'player4' }
      ] as Player[];
      const fewWarlocks = [mockWarlock] as Player[];
      const mixedGroup = [...manyInnocents, ...fewWarlocks];

      const result = gameRules.checkWinCondition(mixedGroup, 50);

      expect(result.gameEnded).toBe(false);
    });

    it('should prioritize monster defeat over other win conditions', () => {
      // Even with warlock advantage, monster defeat should win
      const result = gameRules.checkWinCondition(aliveWarlocks, 0);

      expect(result.gameEnded).toBe(true);
      expect(result.winner).toBe('Good');
      expect(result.reason).toBe('Monster defeated');
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const json = gameRules.toJSON();

      expect(json).toHaveProperty('gameCode', 'TEST123');
      expect(typeof json).toBe('object');
    });

    it('should deserialize from JSON', () => {
      const json = { gameCode: 'RESTORED' };
      const restored = GameRules.fromJSON(json);

      expect(restored).toBeInstanceOf(GameRules);
      expect(restored.toJSON().gameCode).toBe('RESTORED');
    });

    it('should maintain functionality after serialization roundtrip', () => {
      const json = gameRules.toJSON();
      const restored = GameRules.fromJSON(json);

      // Should work the same as original
      expect(restored.canAddPlayer(false, 5)).toBe(true);
      expect(restored.canStartGame(4, 4)).toBe(true);
      expect(restored.calculateCoordinationBonus([{}, {}])).toBe(1.1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete game validation workflow', () => {
      // Game setup
      expect(gameRules.canAddPlayer(false, 3)).toBe(true);
      expect(gameRules.canStartGame(4, 4)).toBe(true);

      // Action validation
      const validAction = gameRules.validateActionSubmission(
        mockPlayer,
        'attack',
        'monster1',
        mockSystems
      );
      expect(validAction.valid).toBe(true);

      // Target validation
      expect(gameRules.isValidTarget('monster1', ['monster1', 'player2'])).toBe(true);

      // Round completion
      expect(gameRules.shouldEndRound(4, 4)).toBe(true);

      // Win condition check
      const gameState = gameRules.checkWinCondition([mockPlayer], 0);
      expect(gameState.gameEnded).toBe(true);
      expect(gameState.winner).toBe('Good');
    });

    it('should handle warlock infiltration scenario', () => {
      const players = [
        mockPlayer,
        { ...mockPlayer, id: 'player2' },
        mockWarlock,
        { ...mockWarlock, id: 'warlock2' }
      ] as Player[];

      // Start with innocents having advantage
      let result = gameRules.checkWinCondition(players, 100);
      expect(result.gameEnded).toBe(false);

      // Simulate innocent deaths
      const remainingPlayers = [mockWarlock, { ...mockWarlock, id: 'warlock2' }] as Player[];
      result = gameRules.checkWinCondition(remainingPlayers, 100);
      expect(result.gameEnded).toBe(true);
      expect(result.winner).toBe('warlocks');
    });

    it('should handle complex coordination scenarios', () => {
      const actions = [
        { type: 'attack', player: 'p1' },
        { type: 'attack', player: 'p2' },
        { type: 'heal', player: 'p3' }
      ];

      const bonus = gameRules.calculateCoordinationBonus(actions);
      expect(bonus).toBe(1.2);

      // Should work with different action types
      const mixedActions = [
        { type: 'defend' },
        { type: 'special' },
        { type: 'racial' },
        { type: 'ultimate' }
      ];

      const mixedBonus = gameRules.calculateCoordinationBonus(mixedActions);
      expect(mixedBonus).toBe(1.3);
    });
  });
});