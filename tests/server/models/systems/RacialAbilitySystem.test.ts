/**
 * @fileoverview Tests for RacialAbilitySystem class
 * Tests racial ability validation, queuing, and processing
 */

import { RacialAbilitySystem } from '../../../../server/models/systems/RacialAbilitySystem';

// Mock dependencies
jest.mock('@config', () => ({
  MONSTER_ID: '__monster__'
}));

jest.mock('@utils/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
}));

jest.mock('@messages', () => ({
  getMessage: jest.fn().mockReturnValue('Test message'),
  getAbilityMessage: jest.fn().mockReturnValue('Test ability message'),
  formatMessage: jest.fn().mockReturnValue('Formatted message')
}));

describe('RacialAbilitySystem', () => {
  let players: Map<string, any>;
  let gameStateUtils: any;
  let statusEffectManager: any;
  let abilityRegistry: any;
  let racialAbilitySystem: RacialAbilitySystem;

  beforeEach(() => {
    players = new Map();
    gameStateUtils = {
      getRandomTarget: jest.fn()
    };
    statusEffectManager = {};
    abilityRegistry = {
      hasRacialAbility: jest.fn().mockReturnValue(true)
    };

    racialAbilitySystem = new RacialAbilitySystem(players, gameStateUtils, statusEffectManager);
    racialAbilitySystem.setAbilityRegistry(abilityRegistry);
  });

  describe('constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect(racialAbilitySystem).toBeDefined();
    });
  });

  describe('setAbilityRegistry', () => {
    it('should set the ability registry', () => {
      const newRegistry = { hasRacialAbility: jest.fn() };
      racialAbilitySystem.setAbilityRegistry(newRegistry);
      // Test by calling a method that uses the registry
      expect(() => racialAbilitySystem.validateAndQueueRacialAction('test', 'target', [])).not.toThrow();
    });
  });

  describe('validateAndQueueRacialAction', () => {
    let testPlayer: any;
    let pendingRacialActions: any[];

    beforeEach(() => {
      testPlayer = {
        id: 'player1',
        isAlive: true,
        racialAbility: { type: 'stone_skin' },
        racialCooldown: 0,
        canUseRacialAbility: jest.fn().mockReturnValue(true),
        useRacialAbility: jest.fn()
      };
      players.set('player1', testPlayer);
      pendingRacialActions = [];
    });

    it('should successfully queue valid racial action', () => {
      const result = racialAbilitySystem.validateAndQueueRacialAction(
        'player1',
        'player2',
        pendingRacialActions
      );

      expect(result).toBe(true);
      expect(pendingRacialActions).toHaveLength(1);
      expect(pendingRacialActions[0]).toEqual({
        actorId: 'player1',
        targetId: 'player2',
        racialType: 'stone_skin'
      });
      expect(testPlayer.useRacialAbility).toHaveBeenCalled();
    });

    it('should reject if player does not exist', () => {
      const result = racialAbilitySystem.validateAndQueueRacialAction(
        'nonexistent',
        'player2',
        pendingRacialActions
      );

      expect(result).toBe(false);
      expect(pendingRacialActions).toHaveLength(0);
    });

    it('should reject if player is not alive', () => {
      testPlayer.isAlive = false;

      const result = racialAbilitySystem.validateAndQueueRacialAction(
        'player1',
        'player2',
        pendingRacialActions
      );

      expect(result).toBe(false);
      expect(pendingRacialActions).toHaveLength(0);
    });

    it('should reject if player cannot use racial ability', () => {
      testPlayer.canUseRacialAbility.mockReturnValue(false);

      const result = racialAbilitySystem.validateAndQueueRacialAction(
        'player1',
        'player2',
        pendingRacialActions
      );

      expect(result).toBe(false);
      expect(pendingRacialActions).toHaveLength(0);
    });

    it('should reject if player already has queued racial action', () => {
      pendingRacialActions.push({
        actorId: 'player1',
        targetId: 'other',
        racialType: 'other_ability'
      });

      const result = racialAbilitySystem.validateAndQueueRacialAction(
        'player1',
        'player2',
        pendingRacialActions
      );

      expect(result).toBe(false);
      expect(pendingRacialActions).toHaveLength(1); // Only the original
    });

    it('should reject if racial ability is not registered', () => {
      abilityRegistry.hasRacialAbility.mockReturnValue(false);

      const result = racialAbilitySystem.validateAndQueueRacialAction(
        'player1',
        'player2',
        pendingRacialActions
      );

      expect(result).toBe(false);
      expect(pendingRacialActions).toHaveLength(0);
    });

    it('should reject if no racial ability set', () => {
      testPlayer.racialAbility = null;

      const result = racialAbilitySystem.validateAndQueueRacialAction(
        'player1',
        'player2',
        pendingRacialActions
      );

      expect(result).toBe(false);
      expect(pendingRacialActions).toHaveLength(0);
    });

    it('should handle monster target', () => {
      const result = racialAbilitySystem.validateAndQueueRacialAction(
        'player1',
        '__monster__',
        pendingRacialActions
      );

      expect(result).toBe(true);
      expect(pendingRacialActions[0].targetId).toBe('__monster__');
    });

    it('should validate target player exists and is alive', () => {
      const targetPlayer = {
        id: 'player2',
        isAlive: true
      };
      players.set('player2', targetPlayer);

      const result = racialAbilitySystem.validateAndQueueRacialAction(
        'player1',
        'player2',
        pendingRacialActions
      );

      expect(result).toBe(true);
      expect(pendingRacialActions[0].targetId).toBe('player2');
    });

    it('should reject if target player does not exist', () => {
      const result = racialAbilitySystem.validateAndQueueRacialAction(
        'player1',
        'nonexistent_target',
        pendingRacialActions
      );

      expect(result).toBe(false);
      expect(pendingRacialActions).toHaveLength(0);
    });

    it('should reject if target player is not alive', () => {
      const targetPlayer = {
        id: 'player2',
        isAlive: false
      };
      players.set('player2', targetPlayer);

      const result = racialAbilitySystem.validateAndQueueRacialAction(
        'player1',
        'player2',
        pendingRacialActions
      );

      expect(result).toBe(false);
      expect(pendingRacialActions).toHaveLength(0);
    });

    it('should handle invisible target redirection', () => {
      const targetPlayer = {
        id: 'player2',
        isAlive: true,
        hasStatusEffect: jest.fn().mockReturnValue(true)
      };
      players.set('player2', targetPlayer);

      gameStateUtils.getRandomTarget.mockReturnValue('player3');

      const result = racialAbilitySystem.validateAndQueueRacialAction(
        'player1',
        'player2',
        pendingRacialActions
      );

      expect(result).toBe(true);
      expect(pendingRacialActions[0].targetId).toBe('player3'); // Redirected
      expect(gameStateUtils.getRandomTarget).toHaveBeenCalledWith({
        actorId: 'player1',
        excludeIds: ['player2'],
        onlyPlayers: true
      });
    });

    it('should fail if invisible target redirection finds no valid target', () => {
      const targetPlayer = {
        id: 'player2',
        isAlive: true,
        hasStatusEffect: jest.fn().mockReturnValue(true)
      };
      players.set('player2', targetPlayer);

      gameStateUtils.getRandomTarget.mockReturnValue(null);

      const result = racialAbilitySystem.validateAndQueueRacialAction(
        'player1',
        'player2',
        pendingRacialActions
      );

      expect(result).toBe(false);
      expect(pendingRacialActions).toHaveLength(0);
    });
  });

  describe('processEndOfRoundEffects', () => {
    let log: any[];
    let player1: any;
    let player2: any;

    beforeEach(() => {
      log = [];
      player1 = {
        id: 'player1',
        name: 'Player 1',
        isAlive: true,
        racialCooldown: 2,
        hp: 80,
        maxHp: 100,
        racialEffects: {
          healOverTime: {
            turns: 2,
            amount: 10
          }
        }
      };
      player2 = {
        id: 'player2',
        name: 'Player 2',
        isAlive: false,
        racialCooldown: 1
      };

      players.set('player1', player1);
      players.set('player2', player2);
    });

    it('should process cooldowns for alive players', () => {
      racialAbilitySystem.processEndOfRoundEffects(log);

      expect(player1.racialCooldown).toBe(1); // Reduced by 1
      expect(player2.racialCooldown).toBe(1); // Dead player not processed
    });

    it('should generate log when cooldown expires', () => {
      player1.racialCooldown = 1;
      racialAbilitySystem.processEndOfRoundEffects(log);

      expect(player1.racialCooldown).toBe(0);
      expect(log).toHaveLength(2); // Cooldown log + heal log
    });

    it('should process healing over time effects', () => {
      racialAbilitySystem.processEndOfRoundEffects(log);

      expect(player1.hp).toBe(90); // 80 + 10 healing
      expect(player1.racialEffects.healOverTime.turns).toBe(1); // Reduced by 1
      expect(log.length).toBeGreaterThan(0);
    });

    it('should remove expired healing over time effects', () => {
      player1.racialEffects.healOverTime.turns = 1;
      racialAbilitySystem.processEndOfRoundEffects(log);

      expect(player1.racialEffects.healOverTime).toBeUndefined();
      expect(log.some((entry: any) => entry.type === 'racial_effect_expired')).toBe(true);
    });

    it('should cap healing at max HP', () => {
      player1.hp = 95;
      player1.racialEffects.healOverTime.amount = 10;

      racialAbilitySystem.processEndOfRoundEffects(log);

      expect(player1.hp).toBe(100); // Capped at maxHp
    });

    it('should skip healing when amount is 0 or negative', () => {
      player1.racialEffects.healOverTime.amount = 0;
      const originalHp = player1.hp;

      racialAbilitySystem.processEndOfRoundEffects(log);

      expect(player1.hp).toBe(originalHp); // No healing applied
    });

    it('should handle players without racial effects', () => {
      player1.racialEffects = undefined;

      expect(() => {
        racialAbilitySystem.processEndOfRoundEffects(log);
      }).not.toThrow();
    });

    it('should handle players without healing over time', () => {
      player1.racialEffects = { other: { someData: true } };

      expect(() => {
        racialAbilitySystem.processEndOfRoundEffects(log);
      }).not.toThrow();
    });

    it('should not process dead players', () => {
      player1.isAlive = false;
      const originalCooldown = player1.racialCooldown;
      const originalHp = player1.hp;

      racialAbilitySystem.processEndOfRoundEffects(log);

      expect(player1.racialCooldown).toBe(originalCooldown);
      expect(player1.hp).toBe(originalHp);
    });
  });
});
