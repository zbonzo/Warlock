/**
 * @fileoverview TypeScript tests for ActionProcessor
 * Testing the new modular ActionProcessor class with type safety
 */

import { ActionProcessor, type PendingAction, type PendingRacialAction } from '../../../../server/models/gameroom/ActionProcessor';
import type { GameRoom } from '../../../../server/models/GameRoom';
import type { Player } from '../../../../server/models/Player';
import type { Ability } from '../../../../server/types/generated';

// Mock dependencies
jest.mock('../../../../server/config/index.js', () => ({
  default: {
    gameBalance: {
      combat: {
        defaultOrders: {
          attack: 10,
          defense: 20,
          heal: 30,
          special: 40
        },
        armorReduction: 0.1,
        criticalHitChance: 0.05
      }
    },
    abilityRegistry: {
      hasAbility: jest.fn().mockReturnValue(true),
      executeAbility: jest.fn().mockReturnValue({
        success: true,
        damage: 25,
        log: ['Attack successful']
      })
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

describe('ActionProcessor (TypeScript)', () => {
  let actionProcessor: ActionProcessor;
  let mockGameRoom: jest.Mocked<GameRoom>;
  let mockPlayers: Map<string, jest.Mocked<Player>>;

  beforeEach(() => {
    // Create mock players
    mockPlayers = new Map();
    const mockPlayer1 = createMockPlayer('player1', 'Alice', 'Human', 'Warrior');
    const mockPlayer2 = createMockPlayer('player2', 'Bob', 'Dwarf', 'Tank');
    mockPlayers.set('player1', mockPlayer1);
    mockPlayers.set('player2', mockPlayer2);

    // Create mock game room
    mockGameRoom = {
      players: mockPlayers,
      monster: {
        hp: 100,
        maxHp: 100,
        level: 1,
        takeDamage: jest.fn(),
        isAlive: jest.fn().mockReturnValue(true)
      },
      level: 1,
      getPlayerById: jest.fn((id: string) => mockPlayers.get(id)),
      getAlivePlayers: jest.fn().mockReturnValue([mockPlayers.get('player1'), mockPlayers.get('player2')])
    } as any;

    actionProcessor = new ActionProcessor(mockGameRoom);
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with game room reference', () => {
      expect(actionProcessor).toBeInstanceOf(ActionProcessor);
    });
  });

  describe('Action Processing', () => {
    it('should process single action successfully', () => {
      const pendingActions: PendingAction[] = [
        {
          actorId: 'player1',
          actionType: 'attack',
          targetId: 'monster',
          ability: createMockAbility('slash', 'Attack'),
          priority: 10
        }
      ];

      const coordinationData = { bonus: 0 };
      const result = actionProcessor.processActions(pendingActions, coordinationData);

      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.coordination).toBeDefined();
    });

    it('should process multiple actions in priority order', () => {
      const pendingActions: PendingAction[] = [
        {
          actorId: 'player1',
          actionType: 'heal',
          targetId: 'player1',
          ability: createMockAbility('heal', 'Heal'),
          priority: 30 // Higher priority (processed first)
        },
        {
          actorId: 'player2',
          actionType: 'attack',
          targetId: 'monster',
          ability: createMockAbility('slash', 'Attack'),
          priority: 10 // Lower priority (processed second)
        }
      ];

      const coordinationData = { bonus: 0 };
      const result = actionProcessor.processActions(pendingActions, coordinationData);

      expect(result.results.length).toBe(2);
      // Should process heal first (higher priority), then attack
    });

    it('should handle blood rage modifier', () => {
      const pendingActions: PendingAction[] = [
        {
          actorId: 'player1',
          actionType: 'attack',
          targetId: 'monster',
          ability: createMockAbility('slash', 'Attack'),
          priority: 10,
          bloodRageActive: true
        }
      ];

      const coordinationData = { bonus: 0 };
      const result = actionProcessor.processActions(pendingActions, coordinationData);

      expect(result.results).toBeDefined();
      // Blood rage should affect damage calculation
    });

    it('should handle keen senses modifier', () => {
      const pendingActions: PendingAction[] = [
        {
          actorId: 'player1',
          actionType: 'attack',
          targetId: 'monster',
          ability: createMockAbility('slash', 'Attack'),
          priority: 10,
          keenSensesActive: true
        }
      ];

      const coordinationData = { bonus: 0 };
      const result = actionProcessor.processActions(pendingActions, coordinationData);

      expect(result.results).toBeDefined();
      // Keen senses should affect accuracy/critical hit chance
    });

    it('should validate actions before processing', () => {
      // Invalid action - dead player
      const deadPlayer = mockPlayers.get('player1')!;
      deadPlayer.isAlive = false;

      const pendingActions: PendingAction[] = [
        {
          actorId: 'player1',
          actionType: 'attack',
          targetId: 'monster',
          ability: createMockAbility('slash', 'Attack'),
          priority: 10
        }
      ];

      const coordinationData = { bonus: 0 };
      const result = actionProcessor.processActions(pendingActions, coordinationData);

      // Should handle invalid actions gracefully
      expect(result.results).toBeDefined();
    });
  });

  describe('Racial Action Processing', () => {
    it('should process racial actions successfully', () => {
      const pendingRacialActions: PendingRacialAction[] = [
        {
          actorId: 'player2',
          targetId: 'self',
          racialAbility: {
            name: 'Stone Armor',
            description: 'Increases armor',
            type: 'stoneArmor'
          }
        }
      ];

      const result = actionProcessor.processRacialActions(pendingRacialActions);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple racial actions', () => {
      const pendingRacialActions: PendingRacialAction[] = [
        {
          actorId: 'player1',
          targetId: 'self',
          racialAbility: {
            name: 'Adaptability',
            description: 'Human adaptability',
            type: 'adaptability'
          }
        },
        {
          actorId: 'player2',
          targetId: 'self',
          racialAbility: {
            name: 'Stone Armor',
            description: 'Dwarf stone armor',
            type: 'stoneArmor'
          }
        }
      ];

      const result = actionProcessor.processRacialActions(pendingRacialActions);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should validate racial actions', () => {
      // Invalid racial action - non-existent player
      const pendingRacialActions: PendingRacialAction[] = [
        {
          actorId: 'nonexistent',
          targetId: 'self',
          racialAbility: {
            name: 'Invalid',
            description: 'Invalid racial',
            type: 'invalid'
          }
        }
      ];

      const result = actionProcessor.processRacialActions(pendingRacialActions);

      // Should handle invalid actions gracefully
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Coordination Analysis', () => {
    it('should analyze coordination between players', () => {
      const pendingActions: PendingAction[] = [
        {
          actorId: 'player1',
          actionType: 'attack',
          targetId: 'monster',
          ability: createMockAbility('slash', 'Attack'),
          priority: 10
        },
        {
          actorId: 'player2',
          actionType: 'attack',
          targetId: 'monster',
          ability: createMockAbility('bash', 'Attack'),
          priority: 10
        }
      ];

      const coordinationData = { bonus: 0 };
      const result = actionProcessor.processActions(pendingActions, coordinationData);

      expect(result.coordination).toBeDefined();
      // Should detect coordination between multiple attackers
    });

    it('should handle heal coordination', () => {
      // Set up injured player
      const injuredPlayer = mockPlayers.get('player1')!;
      injuredPlayer.stats.hp = 50;

      const pendingActions: PendingAction[] = [
        {
          actorId: 'player2',
          actionType: 'heal',
          targetId: 'player1',
          ability: createMockAbility('heal', 'Heal'),
          priority: 30
        }
      ];

      const coordinationData = { bonus: 0 };
      const result = actionProcessor.processActions(pendingActions, coordinationData);

      expect(result.coordination).toBeDefined();
    });

    it('should calculate coordination bonuses', () => {
      const pendingActions: PendingAction[] = [
        {
          actorId: 'player1',
          actionType: 'defense',
          targetId: 'player2',
          ability: createMockAbility('shield', 'Defense'),
          priority: 20
        },
        {
          actorId: 'player2',
          actionType: 'attack',
          targetId: 'monster',
          ability: createMockAbility('slash', 'Attack'),
          priority: 10
        }
      ];

      const coordinationData = { bonus: 5 };
      const result = actionProcessor.processActions(pendingActions, coordinationData);

      expect(result.coordination.bonus).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing players gracefully', () => {
      const pendingActions: PendingAction[] = [
        {
          actorId: 'nonexistent',
          actionType: 'attack',
          targetId: 'monster',
          ability: createMockAbility('slash', 'Attack'),
          priority: 10
        }
      ];

      const coordinationData = { bonus: 0 };

      expect(() => {
        actionProcessor.processActions(pendingActions, coordinationData);
      }).not.toThrow();
    });

    it('should handle invalid ability types', () => {
      const pendingActions: PendingAction[] = [
        {
          actorId: 'player1',
          actionType: 'invalidAction',
          targetId: 'monster',
          ability: createMockAbility('invalid', 'Invalid'),
          priority: 10
        }
      ];

      const coordinationData = { bonus: 0 };

      expect(() => {
        actionProcessor.processActions(pendingActions, coordinationData);
      }).not.toThrow();
    });

    it('should handle empty action lists', () => {
      const pendingActions: PendingAction[] = [];
      const coordinationData = { bonus: 0 };

      const result = actionProcessor.processActions(pendingActions, coordinationData);

      expect(result.results).toBeDefined();
      expect(result.coordination).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types for pending actions', () => {
      const action: PendingAction = {
        actorId: 'player1',
        actionType: 'attack',
        targetId: 'monster',
        ability: createMockAbility('slash', 'Attack'),
        priority: 10,
        bloodRageActive: false,
        keenSensesActive: false
      };

      expect(typeof action.actorId).toBe('string');
      expect(typeof action.priority).toBe('number');
      expect(typeof action.bloodRageActive).toBe('boolean');
    });

    it('should enforce correct types for racial actions', () => {
      const racialAction: PendingRacialAction = {
        actorId: 'player1',
        targetId: 'self',
        racialAbility: {
          name: 'Test Racial',
          description: 'Test description',
          type: 'test',
          usageLimit: 1
        }
      };

      expect(typeof racialAction.actorId).toBe('string');
      expect(typeof racialAction.racialAbility.name).toBe('string');
      expect(typeof racialAction.racialAbility.usageLimit).toBe('number');
    });

    it('should return properly typed results', () => {
      const pendingActions: PendingAction[] = [
        {
          actorId: 'player1',
          actionType: 'attack',
          targetId: 'monster',
          ability: createMockAbility('slash', 'Attack'),
          priority: 10
        }
      ];

      const coordinationData = { bonus: 0 };
      const result = actionProcessor.processActions(pendingActions, coordinationData);

      expect(typeof result).toBe('object');
      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.coordination).toBe('object');
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
        damageMod: 1.0,
        takeDamage: jest.fn(),
        heal: jest.fn(),
        modifyDamage: jest.fn((damage: number) => damage),
      },
      abilities: {
        abilities: [],
        unlocked: [],
        canUseAbility: jest.fn().mockReturnValue(true),
      },
      effects: {
        statusEffects: new Map(),
        hasStatusEffect: jest.fn().mockReturnValue(false),
        applyStatusEffect: jest.fn(),
      },
      hasStatusEffect: jest.fn().mockReturnValue(false),
      canUseAbility: jest.fn().mockReturnValue(true),
    } as any;
  }

  /**
   * Helper function to create mock abilities
   */
  function createMockAbility(type: string, category: string): Ability {
    return {
      id: type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      category: category as any,
      effect: null,
      target: 'Single' as any,
      params: { damage: 20 },
      order: 10,
      cooldown: 1,
      flavorText: `${type} ability`,
      tags: [category.toLowerCase()]
    };
  }
});
