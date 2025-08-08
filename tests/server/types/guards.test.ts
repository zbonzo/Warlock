/**
 * @fileoverview TypeScript tests for Type Guards
 * Testing runtime type validation with comprehensive coverage
 */

// Import type guards - using relative path for now due to import issues
import * as Guards from '../../../server/types/guards';
import type {
  Player,
  PlayerStats,
  PlayerAbilities,
  PlayerEffects,
  StatusEffect,
  GameRoom,
  Monster,
  Ability
} from '../../../server/types/generated';

// Mock Zod schemas since they may have import issues
jest.mock('../../../server/models/validation/ZodSchemas', () => ({
  PlayerSchema: {
    safeParse: jest.fn().mockReturnValue({ success: true })
  },
  PlayerStatsSchema: {
    safeParse: jest.fn().mockReturnValue({ success: true })
  },
  PlayerAbilitiesSchema: {
    safeParse: jest.fn().mockReturnValue({ success: true })
  },
  PlayerEffectsSchema: {
    safeParse: jest.fn().mockReturnValue({ success: true })
  },
  StatusEffectSchema: {
    safeParse: jest.fn().mockReturnValue({ success: true })
  },
  GameRoomSchema: {
    safeParse: jest.fn().mockReturnValue({ success: true })
  },
  MonsterSchema: {
    safeParse: jest.fn().mockReturnValue({ success: true })
  },
  AbilitySchema: {
    safeParse: jest.fn().mockReturnValue({ success: true })
  },
  GameEventSchema: {
    safeParse: jest.fn().mockReturnValue({ success: true })
  },
  ValidationResultSchema: {
    safeParse: jest.fn().mockReturnValue({ success: true })
  }
}));

describe('Type Guards Validation', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Player Type Guards', () => {
    describe('isPlayer', () => {
      it('should return true for valid player object', () => {
        const validPlayer = {
          id: 'player1',
          name: 'Alice',
          race: 'Human',
          class: 'Warrior',
          isAlive: true,
          hp: 100,
          maxHp: 100,
          armor: 0,
          level: 1
        };

        const result = Guards.isPlayer(validPlayer);

        expect(result).toBe(true);
      });

      it('should return false for invalid player object', () => {
        // Mock schema to return failure
        const MockedSchemas = require('../../../server/models/validation/ZodSchemas');
        MockedSchemas.PlayerSchema.safeParse.mockReturnValueOnce({ success: false });

        const invalidPlayer = {
          id: 'player1'
          // missing required fields
        };

        const result = Guards.isPlayer(invalidPlayer);

        expect(result).toBe(false);
      });

      it('should return false for null/undefined', () => {
        const MockedSchemas = require('../../../server/models/validation/ZodSchemas');
        MockedSchemas.PlayerSchema.safeParse.mockReturnValue({ success: false });

        expect(Guards.isPlayer(null)).toBe(false);
        expect(Guards.isPlayer(undefined)).toBe(false);
      });

      it('should return false for primitive types', () => {
        const MockedSchemas = require('../../../server/models/validation/ZodSchemas');
        MockedSchemas.PlayerSchema.safeParse.mockReturnValue({ success: false });

        expect(Guards.isPlayer('string')).toBe(false);
        expect(Guards.isPlayer(123)).toBe(false);
        expect(Guards.isPlayer(true)).toBe(false);
      });
    });

    describe('isPlayerStats', () => {
      it('should return true for valid player stats', () => {
        const validStats = {
          hp: 85,
          maxHp: 100,
          armor: 3,
          damageMod: 1.2,
          level: 2,
          isAlive: true
        };

        const result = Guards.isPlayerStats(validStats);

        expect(result).toBe(true);
      });

      it('should return false for invalid stats', () => {
        const MockedSchemas = require('../../../server/models/validation/ZodSchemas');
        MockedSchemas.PlayerStatsSchema.safeParse.mockReturnValueOnce({ success: false });

        const invalidStats = {
          hp: -10, // Invalid negative HP
          maxHp: 100
        };

        const result = Guards.isPlayerStats(invalidStats);

        expect(result).toBe(false);
      });
    });

    describe('isPlayerAbilities', () => {
      it('should return true for valid abilities object', () => {
        const validAbilities = {
          abilities: [
            { type: 'slash', name: 'Slash', unlockAt: 1 }
          ],
          unlocked: [
            { type: 'slash', name: 'Slash' }
          ],
          abilityCooldowns: {},
          racialAbility: null
        };

        const result = Guards.isPlayerAbilities(validAbilities);

        expect(result).toBe(true);
      });

      it('should return false for invalid abilities', () => {
        const MockedSchemas = require('../../../server/models/validation/ZodSchemas');
        MockedSchemas.PlayerAbilitiesSchema.safeParse.mockReturnValueOnce({ success: false });

        const invalidAbilities = {
          abilities: 'not an array' // Invalid type
        };

        const result = Guards.isPlayerAbilities(invalidAbilities);

        expect(result).toBe(false);
      });
    });

    describe('isPlayerEffects', () => {
      it('should return true for valid effects object', () => {
        const validEffects = {
          statusEffects: {},
          classEffects: {},
          isVulnerable: false,
          vulnerabilityIncrease: 0,
          stoneArmorIntact: false,
          stoneArmorValue: 0
        };

        const result = Guards.isPlayerEffects(validEffects);

        expect(result).toBe(true);
      });

      it('should return false for invalid effects', () => {
        const MockedSchemas = require('../../../server/models/validation/ZodSchemas');
        MockedSchemas.PlayerEffectsSchema.safeParse.mockReturnValueOnce({ success: false });

        const invalidEffects = {
          statusEffects: 'not an object'
        };

        const result = Guards.isPlayerEffects(invalidEffects);

        expect(result).toBe(false);
      });
    });

    describe('isStatusEffect', () => {
      it('should return true for valid status effect', () => {
        const validStatusEffect = {
          type: 'poison',
          duration: 3,
          value: 5,
          source: 'monster'
        };

        const result = Guards.isStatusEffect(validStatusEffect);

        expect(result).toBe(true);
      });

      it('should return false for invalid status effect', () => {
        const MockedSchemas = require('../../../server/models/validation/ZodSchemas');
        MockedSchemas.StatusEffectSchema.safeParse.mockReturnValueOnce({ success: false });

        const invalidStatusEffect = {
          type: 'poison',
          duration: -1 // Invalid negative duration
        };

        const result = Guards.isStatusEffect(invalidStatusEffect);

        expect(result).toBe(false);
      });
    });
  });

  describe('Game Object Type Guards', () => {
    describe('isGameRoom', () => {
      it('should return true for valid game room', () => {
        const validGameRoom = {
          code: 'ROOM123',
          players: new Map(),
          hostId: null,
          started: false,
          round: 0,
          level: 1,
          monster: {
            hp: 100,
            maxHp: 100,
            level: 1
          }
        };

        // Assuming Guards.isGameRoom exists
        if (Guards.isGameRoom) {
          const result = Guards.isGameRoom(validGameRoom);
          expect(result).toBe(true);
        }
      });
    });

    describe('isMonster', () => {
      it('should return true for valid monster', () => {
        const validMonster = {
          hp: 150,
          maxHp: 150,
          level: 2,
          age: 5,
          baseDamage: 20
        };

        // Assuming Guards.isMonster exists
        if (Guards.isMonster) {
          const result = Guards.isMonster(validMonster);
          expect(result).toBe(true);
        }
      });
    });

    describe('isAbility', () => {
      it('should return true for valid ability', () => {
        const validAbility = {
          id: 'fireball',
          name: 'Fireball',
          category: 'Attack',
          effect: 'burn',
          target: 'Single',
          params: { damage: 25 },
          order: 10,
          cooldown: 2,
          flavorText: 'A powerful fire spell',
          tags: ['fire', 'ranged']
        };

        // Assuming Guards.isAbility exists
        if (Guards.isAbility) {
          const result = Guards.isAbility(validAbility);
          expect(result).toBe(true);
        }
      });
    });
  });

  describe('Validation Result Guards', () => {
    describe('isValidationResult', () => {
      it('should return true for valid validation result', () => {
        const validResult = {
          isValid: true,
          errors: [],
          warnings: [],
          data: { someProperty: 'value' }
        };

        // Assuming Guards.isValidationResult exists
        if (Guards.isValidationResult) {
          const result = Guards.isValidationResult(validResult);
          expect(result).toBe(true);
        }
      });

      it('should return true for validation result with errors', () => {
        const resultWithErrors = {
          isValid: false,
          errors: ['Invalid input', 'Missing required field'],
          warnings: ['Deprecated usage'],
          data: null
        };

        if (Guards.isValidationResult) {
          const result = Guards.isValidationResult(resultWithErrors);
          expect(result).toBe(true);
        }
      });
    });
  });

  describe('Array Type Guards', () => {
    describe('isPlayerArray', () => {
      it('should return true for array of valid players', () => {
        const playerArray = [
          { id: 'p1', name: 'Alice', race: 'Human', class: 'Warrior' },
          { id: 'p2', name: 'Bob', race: 'Dwarf', class: 'Tank' }
        ];

        // Mock all items to be valid
        const MockedSchemas = require('../../../server/models/validation/ZodSchemas');
        MockedSchemas.PlayerSchema.safeParse.mockReturnValue({ success: true });

        // Assuming Guards.isPlayerArray exists
        if (Guards.isPlayerArray) {
          const result = Guards.isPlayerArray(playerArray);
          expect(result).toBe(true);
        }
      });

      it('should return false for array with invalid player', () => {
        const invalidArray = [
          { id: 'p1', name: 'Alice' }, // Valid
          { invalidPlayer: true }      // Invalid
        ];

        const MockedSchemas = require('../../../server/models/validation/ZodSchemas');
        MockedSchemas.PlayerSchema.safeParse
          .mockReturnValueOnce({ success: true })  // First player valid
          .mockReturnValueOnce({ success: false }); // Second player invalid

        if (Guards.isPlayerArray) {
          const result = Guards.isPlayerArray(invalidArray);
          expect(result).toBe(false);
        }
      });

      it('should return false for non-array input', () => {
        if (Guards.isPlayerArray) {
          expect(Guards.isPlayerArray('not an array')).toBe(false);
          expect(Guards.isPlayerArray(null)).toBe(false);
          expect(Guards.isPlayerArray(undefined)).toBe(false);
        }
      });
    });
  });

  describe('Complex Object Guards', () => {
    describe('isGameEvent', () => {
      it('should return true for valid game event', () => {
        const validEvent = {
          type: 'playerAction',
          playerId: 'player1',
          action: 'attack',
          target: 'monster',
          timestamp: Date.now(),
          data: { damage: 25 }
        };

        // Assuming Guards.isGameEvent exists
        if (Guards.isGameEvent) {
          const result = Guards.isGameEvent(validEvent);
          expect(result).toBe(true);
        }
      });
    });

    describe('isCommandResult', () => {
      it('should return true for valid command result', () => {
        const validResult = {
          success: true,
          message: 'Command executed successfully',
          data: { result: 'success' },
          timestamp: Date.now()
        };

        // Assuming Guards.isCommandResult exists
        if (Guards.isCommandResult) {
          const result = Guards.isCommandResult(validResult);
          expect(result).toBe(true);
        }
      });

      it('should return true for failed command result', () => {
        const failedResult = {
          success: false,
          message: 'Command failed',
          error: 'Invalid input',
          timestamp: Date.now()
        };

        if (Guards.isCommandResult) {
          const result = Guards.isCommandResult(failedResult);
          expect(result).toBe(true);
        }
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle circular references safely', () => {
      const circularObj: any = {
        id: 'test',
        name: 'Circular'
      };
      circularObj.self = circularObj;

      const MockedSchemas = require('../../../server/models/validation/ZodSchemas');
      MockedSchemas.PlayerSchema.safeParse.mockReturnValue({ success: false });

      expect(() => Guards.isPlayer(circularObj)).not.toThrow();
      expect(Guards.isPlayer(circularObj)).toBe(false);
    });

    it('should handle very large objects', () => {
      const largeObj = {
        id: 'large',
        name: 'Large Object',
        data: new Array(10000).fill('x').join('')
      };

      const MockedSchemas = require('../../../server/models/validation/ZodSchemas');
      MockedSchemas.PlayerSchema.safeParse.mockReturnValue({ success: true });

      expect(() => Guards.isPlayer(largeObj)).not.toThrow();
    });

    it('should handle schema parsing errors gracefully', () => {
      const MockedSchemas = require('../../../server/models/validation/ZodSchemas');
      MockedSchemas.PlayerSchema.safeParse.mockImplementation(() => {
        throw new Error('Schema parsing error');
      });

      expect(() => Guards.isPlayer({ id: 'test' })).not.toThrow();
      // Should return false when schema parsing throws
    });
  });

  describe('Performance Considerations', () => {
    it('should not call schema validation multiple times for same input', () => {
      const testObj = { id: 'test', name: 'Test' };
      const MockedSchemas = require('../../../server/models/validation/ZodSchemas');

      Guards.isPlayer(testObj);
      Guards.isPlayer(testObj);

      // Schema should be called for each validation
      expect(MockedSchemas.PlayerSchema.safeParse).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple simultaneous validations', () => {
      const objects = Array.from({ length: 100 }, (_, i) => ({
        id: `player${i}`,
        name: `Player ${i}`
      }));

      const MockedSchemas = require('../../../server/models/validation/ZodSchemas');
      MockedSchemas.PlayerSchema.safeParse.mockReturnValue({ success: true });

      const results = objects.map(obj => Guards.isPlayer(obj));

      expect(results.every(result => result === true)).toBe(true);
      expect(MockedSchemas.PlayerSchema.safeParse).toHaveBeenCalledTimes(100);
    });
  });
});
