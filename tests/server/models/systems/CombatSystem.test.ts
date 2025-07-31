/**
 * @fileoverview Comprehensive TypeScript tests for CombatSystem
 * Testing the migrated TypeScript CombatSystem class with full type safety and complex combat logic
 */

import { 
  CombatSystem, 
  CombatRoundResult, 
  CombatLogEntry, 
  RoundSummary, 
  CombatSystemDependencies 
} from '@models/systems/CombatSystem';
import { Player } from '@models/Player';
import { TurnResolver } from '@models/systems/TurnResolver';
import { EffectManager } from '@models/systems/EffectManager';
import { DamageCalculator } from '@models/systems/DamageCalculator';
import { GameEventBus } from '@models/events/GameEventBus';
import { EventTypes } from '@models/events/EventTypes';
import type { 
  Monster, 
  ValidationResult,
  GameEvent,
  GameRoom,
  DamageCalculation
} from '@server/types/generated';

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockConfig = {
  gameBalance: {
    coordination: {
      baseBonus: 0.1,
      bonusPerPlayer: 0.05
    },
    progression: {
      roundsPerLevel: 5,
      maxLevel: 10,
      levelBonuses: {
        damagePerLevel: 0.1,
        healthPerLevel: 10
      }
    }
  }
};

const mockMessages = {
  formatMessage: jest.fn((template: string, vars: any) => {
    return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] || match);
  })
};

// Mock all dependencies
jest.mock('@models/Player');
jest.mock('@models/systems/TurnResolver');
jest.mock('@models/systems/EffectManager');
jest.mock('@models/systems/DamageCalculator');
jest.mock('@models/events/GameEventBus');
jest.mock('@utils/logger', () => ({ default: mockLogger }));
jest.mock('@config', () => ({ default: mockConfig }));
jest.mock('@messages', () => ({ default: mockMessages }));

const MockedPlayer = Player as jest.MockedClass<typeof Player>;
const MockedTurnResolver = TurnResolver as jest.MockedClass<typeof TurnResolver>;
const MockedEffectManager = EffectManager as jest.MockedClass<typeof EffectManager>;
const MockedDamageCalculator = DamageCalculator as jest.MockedClass<typeof DamageCalculator>;
const MockedGameEventBus = GameEventBus as jest.MockedClass<typeof GameEventBus>;

describe('CombatSystem (TypeScript)', () => {
  let combatSystem: CombatSystem;
  let mockPlayers: Map<string, Player>;
  let mockMonsterController: any;
  let mockStatusEffectManager: any;
  let mockRacialAbilitySystem: any;
  let mockWarlockSystem: any;
  let mockGameStateUtils: any;
  let mockEventBus: jest.Mocked<GameEventBus>;
  let mockTurnResolver: jest.Mocked<TurnResolver>;
  let mockEffectManager: jest.Mocked<EffectManager>;
  let mockDamageCalculator: jest.Mocked<DamageCalculator>;
  let mockMonster: Monster;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock monster
    mockMonster = {
      id: 'monster1',
      hp: 100,
      maxHp: 100,
      baseDmg: 15,
      age: 1,
      isAlive: true
    };

    // Setup mock players map
    mockPlayers = new Map();

    // Setup mock dependencies
    mockMonsterController = {
      monster: mockMonster,
      processMonsterAction: jest.fn(),
    };

    mockStatusEffectManager = {
      processEffects: jest.fn(),
      applyEffect: jest.fn(),
    };

    mockRacialAbilitySystem = {
      processRacialAbilities: jest.fn(),
    };

    mockWarlockSystem = {
      processWarlockEffects: jest.fn(),
    };

    mockGameStateUtils = {
      updateGameState: jest.fn(),
    };

    // Setup mock domain models
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      use: jest.fn(),
    } as any;

    mockTurnResolver = {
      processPlayerAction: jest.fn(),
    } as any;

    mockEffectManager = {
      processEndOfRoundEffects: jest.fn(),
      getHealingModifier: jest.fn().mockReturnValue(0),
    } as any;

    mockDamageCalculator = {
      calculateDamage: jest.fn(),
    } as any;

    // Setup mocked constructors
    MockedGameEventBus.mockImplementation(() => mockEventBus);
    MockedTurnResolver.mockImplementation(() => mockTurnResolver);
    MockedEffectManager.mockImplementation(() => mockEffectManager);
    MockedDamageCalculator.mockImplementation(() => mockDamageCalculator);

    // Create dependencies object
    const dependencies: CombatSystemDependencies = {
      players: mockPlayers,
      monsterController: mockMonsterController,
      statusEffectManager: mockStatusEffectManager,
      racialAbilitySystem: mockRacialAbilitySystem,
      warlockSystem: mockWarlockSystem,
      gameStateUtils: mockGameStateUtils,
      eventBus: mockEventBus
    };

    // Create CombatSystem instance
    combatSystem = new CombatSystem(dependencies);
  });

  describe('Constructor', () => {
    it('should create CombatSystem with required dependencies and domain models', () => {
      expect(combatSystem.name).toBe('CombatSystem');
      expect(combatSystem.version).toBe('2.0.0');
      expect(MockedTurnResolver).toHaveBeenCalledWith({
        players: mockPlayers,
        monsterController: mockMonsterController,
        warlockSystem: mockWarlockSystem,
        gameStateUtils: mockGameStateUtils,
        eventBus: mockEventBus
      });
      expect(MockedEffectManager).toHaveBeenCalledWith({
        players: mockPlayers,
        statusEffectManager: mockStatusEffectManager,
        racialAbilitySystem: mockRacialAbilitySystem,
        warlockSystem: mockWarlockSystem,
        gameStateUtils: mockGameStateUtils,
        eventBus: mockEventBus
      });
      expect(MockedDamageCalculator).toHaveBeenCalledWith({
        players: mockPlayers,
        monsterController: mockMonsterController,
        statusEffectManager: mockStatusEffectManager,
        eventBus: mockEventBus
      });
    });

    it('should create CombatSystem without eventBus', () => {
      const deps: CombatSystemDependencies = {
        players: mockPlayers,
        monsterController: mockMonsterController,
        statusEffectManager: mockStatusEffectManager,
        racialAbilitySystem: mockRacialAbilitySystem,
        warlockSystem: mockWarlockSystem,
        gameStateUtils: mockGameStateUtils
      };

      const systemWithoutEventBus = new CombatSystem(deps);
      expect(systemWithoutEventBus).toBeInstanceOf(CombatSystem);
    });
  });

  describe('Round Processing', () => {
    let mockGameRoom: any;
    let mockPlayer1: jest.Mocked<Player>;
    let mockPlayer2: jest.Mocked<Player>;

    beforeEach(() => {
      mockGameRoom = {
        code: 'TEST123',
        round: 1,
        level: 1,
        aliveCount: 2
      };

      mockPlayer1 = createMockPlayer('player1', 'Alice');
      mockPlayer2 = createMockPlayer('player2', 'Bob');
      
      mockPlayers.set('player1', mockPlayer1);
      mockPlayers.set('player2', mockPlayer2);
    });

    it('should process complete combat round successfully', async () => {
      // Setup validation results
      const mockValidationResults: ValidationResult[] = [
        { valid: true, playerId: 'player1', errors: [] },
        { valid: true, playerId: 'player2', errors: [] }
      ];

      // Setup player actions
      mockPlayer1.isAlive = true;
      mockPlayer2.isAlive = true;
      (mockPlayer1 as any).hasSubmittedAction = true;
      (mockPlayer2 as any).hasSubmittedAction = true;
      (mockPlayer1 as any).submittedAction = { actionType: 'attack', targetId: 'monster1' };
      (mockPlayer2 as any).submittedAction = { actionType: 'heal', targetId: 'player1' };

      mockPlayer1.validateSubmittedAction.mockReturnValue({ valid: true, errors: [] });
      mockPlayer2.validateSubmittedAction.mockReturnValue({ valid: true, errors: [] });

      // Setup turn resolver results
      mockTurnResolver.processPlayerAction.mockResolvedValueOnce({
        damage: 25,
        logEntries: [{ type: 'attack', message: 'Alice attacks!', public: true }]
      });
      mockTurnResolver.processPlayerAction.mockResolvedValueOnce({
        healing: 15,
        logEntries: [{ type: 'heal', message: 'Bob heals Alice!', public: true }]
      });

      // Setup monster action
      mockMonsterController.processMonsterAction.mockResolvedValue({
        type: 'attack',
        damage: 10,
        targets: ['player1']
      });

      const result: CombatRoundResult = await combatSystem.processRound(mockGameRoom);

      expect(result.success).toBe(true);
      expect(result.roundSummary.totalDamageToMonster).toBe(25);
      expect(result.roundSummary.totalHealing).toBe(15);
      expect(result.roundSummary.totalDamageToPlayers).toBe(10);
      expect(result.roundSummary.abilitiesUsed).toBe(2);
      expect(result.log).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'attack', message: 'Alice attacks!' }),
          expect.objectContaining({ type: 'heal', message: 'Bob heals Alice!' })
        ])
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EventTypes.COMBAT.ROUND_COMPLETED,
        expect.objectContaining({
          gameCode: 'TEST123',
          round: 1,
          summary: expect.any(Object)
        })
      );
    });

    it('should handle coordinated actions with bonuses', async () => {
      // Setup coordinated attack actions
      mockPlayer1.isAlive = true;
      mockPlayer2.isAlive = true;
      (mockPlayer1 as any).hasSubmittedAction = true;
      (mockPlayer2 as any).hasSubmittedAction = true;
      (mockPlayer1 as any).submittedAction = { actionType: 'attack', targetId: 'monster1' };
      (mockPlayer2 as any).submittedAction = { actionType: 'attack', targetId: 'monster1' };

      mockPlayer1.validateSubmittedAction.mockReturnValue({ valid: true, errors: [] });
      mockPlayer2.validateSubmittedAction.mockReturnValue({ valid: true, errors: [] });

      // Setup turn resolver to handle coordination bonus
      mockTurnResolver.processPlayerAction.mockResolvedValue({
        damage: 30, // Enhanced damage due to coordination
        logEntries: [{ type: 'attack', message: 'Coordinated attack!', public: true }]
      });

      const result: CombatRoundResult = await combatSystem.processRound(mockGameRoom);

      expect(result.success).toBe(true);
      expect(result.roundSummary.coordinatedActions).toBe(2);
      expect(result.log).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'coordination',
            message: expect.stringContaining('Coordinated attack')
          })
        ])
      );
      
      // Verify coordination bonus was calculated (0.1 + (2-1) * 0.05 = 0.15)
      expect(mockTurnResolver.processPlayerAction).toHaveBeenCalledWith(
        mockPlayer1,
        expect.any(Object),
        0.15
      );
    });

    it('should handle validation failures gracefully', async () => {
      mockPlayer1.isAlive = true;
      (mockPlayer1 as any).hasSubmittedAction = true;
      mockPlayer1.validateSubmittedAction.mockReturnValue({ 
        valid: false, 
        errors: ['Invalid target'] 
      });

      const result: CombatRoundResult = await combatSystem.processRound(mockGameRoom);

      expect(result.success).toBe(true);
      expect(result.roundSummary.abilitiesUsed).toBe(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EventTypes.ACTION.VALIDATED,
        expect.objectContaining({
          playerId: 'player1',
          valid: false,
          errors: ['Invalid target']
        })
      );
    });

    it('should handle monster action processing', async () => {
      mockMonsterController.processMonsterAction.mockResolvedValue({
        type: 'special_attack',
        damage: 20,
        targets: ['player1', 'player2']
      });

      const result: CombatRoundResult = await combatSystem.processRound(mockGameRoom);

      expect(result.monsterAction).toEqual({
        type: 'special_attack',
        damage: 20,
        targets: ['player1', 'player2']
      });
      expect(result.roundSummary.totalDamageToPlayers).toBe(20);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EventTypes.MONSTER.ACTION_PROCESSED,
        expect.objectContaining({
          monsterId: 'monster1',
          actionType: 'special_attack',
          damage: 20,
          targets: ['player1', 'player2']
        })
      );
    });

    it('should handle dead monster gracefully', async () => {
      mockMonsterController.monster.isAlive = false;

      const result: CombatRoundResult = await combatSystem.processRound(mockGameRoom);

      expect(result.monsterAction).toBeNull();
      expect(mockMonsterController.processMonsterAction).not.toHaveBeenCalled();
    });

    it('should process end-of-round effects', async () => {
      await combatSystem.processRound(mockGameRoom);

      expect(mockEffectManager.processEndOfRoundEffects).toHaveBeenCalled();
      expect(mockPlayer1.processAbilityCooldowns).toHaveBeenCalled();
      expect(mockPlayer1.processRacialCooldowns).toHaveBeenCalled();
      expect(mockPlayer1.processClassEffects).toHaveBeenCalled();
    });

    it('should handle round processing errors', async () => {
      mockPlayer1.isAlive = true;
      (mockPlayer1 as any).hasSubmittedAction = true;
      mockPlayer1.validateSubmittedAction.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      const result: CombatRoundResult = await combatSystem.processRound(mockGameRoom);

      expect(result.success).toBe(false);
      expect(result.log).toEqual([
        expect.objectContaining({
          type: 'error',
          message: 'Failed to process combat round'
        })
      ]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Level Progression', () => {
    let mockGameRoom: any;

    beforeEach(() => {
      mockGameRoom = {
        code: 'TEST123',
        round: 5, // Multiple of roundsPerLevel
        level: 1,
        aliveCount: 2
      };

      const mockPlayer = createMockPlayer('player1', 'Alice');
      mockPlayer.isAlive = true;
      mockPlayer.damageMod = 1.0;
      mockPlayer.maxHp = 100;
      mockPlayer.hp = 80;
      mockPlayers.set('player1', mockPlayer);
    });

    it('should level up players when conditions are met', async () => {
      await combatSystem.processRound(mockGameRoom);

      expect(mockGameRoom.level).toBe(2);
      
      const player = mockPlayers.get('player1')!;
      expect(player.damageMod).toBe(1.1); // +0.1 per level
      expect(player.maxHp).toBe(110); // +10 per level
      expect(player.hp).toBe(90); // +10 healing from level up
      expect(player.updateRelentlessFuryLevel).toHaveBeenCalledWith(2);
      
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        EventTypes.GAME.LEVEL_UP,
        expect.objectContaining({
          gameCode: 'TEST123',
          newLevel: 2,
          round: 6 // Round incremented during processing
        })
      );
    });

    it('should not level up if already at max level', async () => {
      mockGameRoom.level = 10; // At max level
      mockGameRoom.round = 50; // Should trigger level up

      await combatSystem.processRound(mockGameRoom);

      expect(mockGameRoom.level).toBe(10); // Should remain at max
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        EventTypes.GAME.LEVEL_UP,
        expect.any(Object)
      );
    });

    it('should not level up if not enough rounds have passed', async () => {
      mockGameRoom.round = 3; // Not a multiple of roundsPerLevel (5)

      await combatSystem.processRound(mockGameRoom);

      expect(mockGameRoom.level).toBe(1); // Should remain the same
    });
  });

  describe('Combat State Queries', () => {
    beforeEach(() => {
      const alivePlayer = createMockPlayer('alive', 'Alive');
      const deadPlayer = createMockPlayer('dead', 'Dead');
      alivePlayer.isAlive = true;
      deadPlayer.isAlive = false;
      
      mockPlayers.set('alive', alivePlayer);
      mockPlayers.set('dead', deadPlayer);
    });

    it('should return current monster', () => {
      const monster = combatSystem.getMonster();
      expect(monster).toBe(mockMonster);
    });

    it('should return null when no monster controller', () => {
      const systemWithoutMonster = new CombatSystem({
        players: mockPlayers,
        monsterController: null,
        statusEffectManager: mockStatusEffectManager,
        racialAbilitySystem: mockRacialAbilitySystem,
        warlockSystem: mockWarlockSystem,
        gameStateUtils: mockGameStateUtils
      });

      expect(systemWithoutMonster.getMonster()).toBeNull();
    });

    it('should check if combat is active', () => {
      expect(combatSystem.isCombatActive()).toBe(true);
      
      // Test with dead monster
      mockMonsterController.monster.isAlive = false;
      expect(combatSystem.isCombatActive()).toBe(false);
      
      // Test with no alive players
      mockMonsterController.monster.isAlive = true;
      mockPlayers.get('alive')!.isAlive = false;
      expect(combatSystem.isCombatActive()).toBe(false);
    });

    it('should get combat statistics', () => {
      const stats = combatSystem.getCombatStats();
      
      expect(stats).toEqual({
        alivePlayerCount: 1,
        totalPlayerCount: 2,
        monsterAlive: true,
        monsterHp: 100,
        monsterMaxHp: 100
      });
    });
  });

  describe('GameSystem Interface Implementation', () => {
    let mockGameRoom: GameRoom;
    let mockGameEvent: GameEvent;

    beforeEach(() => {
      mockGameRoom = {
        code: 'TEST123',
        players: {},
        monster: mockMonster
      } as any;

      mockGameEvent = {
        type: EventTypes.ACTION.SUBMITTED,
        payload: { playerId: 'player1', actionType: 'attack' }
      };
    });

    it('should process ACTION.SUBMITTED events', async () => {
      jest.spyOn(combatSystem, 'processRound').mockResolvedValue({
        success: true,
        log: [],
        playerActions: new Map(),
        roundSummary: {
          totalDamageToMonster: 0,
          totalDamageToPlayers: 0,
          totalHealing: 0,
          playersKilled: [],
          abilitiesUsed: 0,
          coordinatedActions: 0
        }
      });

      const result = await combatSystem.process(mockGameRoom, mockGameEvent);
      expect(result).toBe(mockGameRoom); // Should return updated state
    });

    it('should validate events correctly', () => {
      const mockPlayer = createMockPlayer('player1', 'Alice');
      mockPlayer.isAlive = true;
      mockPlayers.set('player1', mockPlayer);

      const validationResult = combatSystem.validate(mockGameEvent);
      
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(validationResult.score).toBe(100);
    });

    it('should reject events when combat is not active', () => {
      mockMonsterController.monster.isAlive = false;

      const validationResult = combatSystem.validate(mockGameEvent);
      
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toContain('Combat is not active');
      expect(validationResult.score).toBe(0);
    });

    it('should reject events for non-existent players', () => {
      const invalidEvent: GameEvent = {
        type: EventTypes.ACTION.SUBMITTED,
        payload: { playerId: 'nonexistent', actionType: 'attack' }
      };

      const validationResult = combatSystem.validate(invalidEvent);
      
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toContain('Player not found');
    });

    it('should reject events for dead players', () => {
      const deadPlayer = createMockPlayer('dead', 'Dead');
      deadPlayer.isAlive = false;
      mockPlayers.set('dead', deadPlayer);

      const invalidEvent: GameEvent = {
        type: EventTypes.ACTION.SUBMITTED,
        payload: { playerId: 'dead', actionType: 'attack' }
      };

      const validationResult = combatSystem.validate(invalidEvent);
      
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toContain('Player is not alive');
    });

    it('should check if it can handle combat events', () => {
      expect(combatSystem.canHandle(mockGameEvent)).toBe(true);
      
      const nonCombatEvent: GameEvent = {
        type: 'GAME.CREATED' as any,
        payload: {}
      };
      expect(combatSystem.canHandle(nonCombatEvent)).toBe(false);
    });

    it('should return subscribed event types', () => {
      const subscribedTypes = combatSystem.subscribedEvents();
      
      expect(subscribedTypes).toContain(EventTypes.ACTION.SUBMITTED);
      expect(subscribedTypes).toContain(EventTypes.DAMAGE.CALCULATED);
      expect(subscribedTypes).toContain(EventTypes.HEAL.APPLIED);
      expect(subscribedTypes).toContain(EventTypes.ABILITY.USED);
    });

    it('should handle events with correct types', async () => {
      jest.spyOn(combatSystem, 'process').mockResolvedValue(mockGameRoom);

      const result = await combatSystem.handleEvent(
        mockGameRoom,
        EventTypes.ACTION.SUBMITTED,
        { playerId: 'player1', actionType: 'attack' }
      );

      expect(result).toBe(mockGameRoom);
      expect(combatSystem.process).toHaveBeenCalledWith(
        mockGameRoom,
        expect.objectContaining({
          type: EventTypes.ACTION.SUBMITTED,
          payload: { playerId: 'player1', actionType: 'attack' }
        })
      );
    });

    it('should return correct processing priority', () => {
      expect(combatSystem.getPriority()).toBe(10);
    });
  });

  describe('CombatSystemInterface Implementation', () => {
    it('should calculate damage between entities', () => {
      const mockAttacker = createMockPlayer('attacker', 'Attacker');
      const mockDefender = createMockPlayer('defender', 'Defender');
      
      mockDamageCalculator.calculateDamage.mockReturnValue({
        finalDamage: 25,
        baseDamage: 20,
        modifiers: ['critical'],
        isCritical: true,
        isBlocked: false,
        damageType: 'physical'
      });

      const result: DamageCalculation = combatSystem.calculateDamage(
        mockAttacker,
        mockDefender,
        20
      );

      expect(result).toEqual({
        finalDamage: 25,
        baseDamage: 20,
        modifiers: ['critical'],
        isCritical: true,
        isBlocked: false,
        damageType: 'physical'
      });
      expect(mockDamageCalculator.calculateDamage).toHaveBeenCalledWith(
        mockAttacker,
        mockDefender,
        20
      );
    });

    it('should apply damage to entities', () => {
      const mockTarget = createMockPlayer('target', 'Target');
      
      const result = combatSystem.applyDamage(mockTarget, 30);
      
      expect(result).toBe(mockTarget);
      expect(mockTarget.takeDamage).toHaveBeenCalledWith(30);
    });

    it('should calculate healing with modifiers', () => {
      const mockHealer = createMockPlayer('healer', 'Healer');
      const mockTarget = createMockPlayer('target', 'Target');
      
      mockEffectManager.getHealingModifier.mockReturnValue(0.2); // 20% bonus
      
      const healing = combatSystem.calculateHealing(mockHealer, mockTarget, 50);
      
      expect(healing).toBe(60); // 50 * 1.2 = 60
      expect(mockEffectManager.getHealingModifier).toHaveBeenCalledWith(mockHealer);
    });

    it('should check if entities can attack', () => {
      const mockAttacker = createMockPlayer('attacker', 'Attacker');
      const mockTarget = createMockPlayer('target', 'Target');
      
      mockAttacker.isAlive = true;
      mockTarget.isAlive = true;
      mockAttacker.statusEffects = [];

      expect(combatSystem.canAttack(mockAttacker, mockTarget)).toBe(true);
      
      // Test with dead attacker
      mockAttacker.isAlive = false;
      expect(combatSystem.canAttack(mockAttacker, mockTarget)).toBe(false);
      
      // Test with stunned attacker
      mockAttacker.isAlive = true;
      mockAttacker.statusEffects = [{ type: 'debuff', name: 'Stunned' }];
      expect(combatSystem.canAttack(mockAttacker, mockTarget)).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types for CombatRoundResult', () => {
      const result: CombatRoundResult = {
        success: true,
        log: [],
        playerActions: new Map(),
        roundSummary: {
          totalDamageToMonster: 0,
          totalDamageToPlayers: 0,
          totalHealing: 0,
          playersKilled: [],
          abilitiesUsed: 0,
          coordinatedActions: 0
        }
      };
      
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.log)).toBe(true);
      expect(result.playerActions).toBeInstanceOf(Map);
      expect(typeof result.roundSummary.totalDamageToMonster).toBe('number');
    });

    it('should enforce correct types for CombatLogEntry', () => {
      const logEntry: CombatLogEntry = {
        type: 'attack',
        message: 'Player attacks monster',
        playerId: 'player1',
        targetId: 'monster1',
        damage: 25,
        public: true
      };
      
      expect(typeof logEntry.type).toBe('string');
      expect(typeof logEntry.message).toBe('string');
      expect(typeof logEntry.damage).toBe('number');
      expect(typeof logEntry.public).toBe('boolean');
    });

    it('should enforce correct types for system interfaces', () => {
      expect(combatSystem.name).toBe('CombatSystem');
      expect(combatSystem.version).toBe('2.0.0');
      expect(typeof combatSystem.getPriority()).toBe('number');
      expect(Array.isArray(combatSystem.subscribedEvents())).toBe(true);
    });
  });

  /**
   * Helper function to create mock player instances
   */
  function createMockPlayer(id: string, name: string): jest.Mocked<Player> {
    return {
      id,
      name,
      isAlive: true,
      hp: 100,
      maxHp: 100,
      armor: 0,
      level: 1,
      damageMod: 1.0,
      statusEffects: [],
      validateSubmittedAction: jest.fn(),
      processAbilityCooldowns: jest.fn(),
      processRacialCooldowns: jest.fn(),
      processClassEffects: jest.fn(),
      takeDamage: jest.fn(),
      heal: jest.fn(),
      addDeath: jest.fn(),
      updateRelentlessFuryLevel: jest.fn(),
      toJSON: jest.fn().mockReturnValue({ id, name }),
    } as any;
  }
});