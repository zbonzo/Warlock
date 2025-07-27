/**
 * @fileoverview Tests for Zod validation implementation
 * Verifies runtime validation functionality
 * Part of Phase 3 refactoring - Runtime Validation with Zod
 */
const { ValidationMiddleware, schemas } = require('../../models/validation/ValidationMiddleware');
const { SocketValidationMiddleware } = require('../../middleware/socketValidation');

describe('Zod Validation Implementation', () => {
  let validator;
  let socketValidator;

  beforeEach(() => {
    validator = new ValidationMiddleware();
    socketValidator = new SocketValidationMiddleware();
  });

  describe('Base Schema Validation', () => {
    test('should validate valid player ID', () => {
      const result = validator.validate('player123', schemas.BaseSchemas.playerId);
      expect(result.success).toBe(true);
      expect(result.data).toBe('player123');
    });

    test('should reject invalid player ID', () => {
      const result = validator.validate('', schemas.BaseSchemas.playerId);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('String must contain at least 1 character(s)');
    });

    test('should validate valid game code', () => {
      const result = validator.validate('ABC123', schemas.BaseSchemas.gameCode);
      expect(result.success).toBe(true);
      expect(result.data).toBe('ABC123');
    });

    test('should reject invalid game code', () => {
      const result = validator.validate('abc123', schemas.BaseSchemas.gameCode);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate valid player class', () => {
      const result = validator.validate('Paladin', schemas.BaseSchemas.playerClass);
      expect(result.success).toBe(true);
      expect(result.data).toBe('Paladin');
    });

    test('should reject invalid player class', () => {
      const result = validator.validate('InvalidClass', schemas.BaseSchemas.playerClass);
      expect(result.success).toBe(false);
    });
  });

  describe('Player Action Validation', () => {
    test('should validate valid player action', () => {
      const actionData = {
        playerId: 'player123',
        actionType: 'attack',
        targetId: 'player456',
        actionData: { damage: 10 },
        timestamp: new Date().toISOString()
      };

      const result = validator.validatePlayerAction(actionData);
      expect(result.success).toBe(true);
      expect(result.data.playerId).toBe('player123');
    });

    test('should reject invalid player action missing required fields', () => {
      const actionData = {
        actionType: 'attack',
        // Missing playerId
        targetId: 'player456'
      };

      const result = validator.validatePlayerAction(actionData);
      expect(result.success).toBe(false);
      expect(result.errors.some(err => err.includes('playerId'))).toBe(true);
    });

    test('should reject player action with invalid timestamp', () => {
      const actionData = {
        playerId: 'player123',
        actionType: 'attack',
        timestamp: 'invalid-date'
      };

      const result = validator.validatePlayerAction(actionData);
      expect(result.success).toBe(false);
    });
  });

  describe('Ability Action Validation', () => {
    test('should validate valid ability action', () => {
      const abilityData = {
        playerId: 'player123',
        actionType: 'ability',
        abilityId: 'fireball',
        targetId: 'player456',
        timestamp: new Date().toISOString()
      };

      const result = validator.validateAbilityAction(abilityData);
      expect(result.success).toBe(true);
      expect(result.data.abilityId).toBe('fireball');
    });

    test('should reject ability action without ability ID', () => {
      const abilityData = {
        playerId: 'player123',
        actionType: 'ability',
        // Missing abilityId
        timestamp: new Date().toISOString()
      };

      const result = validator.validateAbilityAction(abilityData);
      expect(result.success).toBe(false);
      expect(result.errors.some(err => err.includes('abilityId'))).toBe(true);
    });
  });

  describe('Player Schema Validation', () => {
    test('should validate complete player object', () => {
      const playerData = {
        id: 'player123',
        name: 'TestPlayer',
        class: 'Paladin',
        race: 'Human',
        role: 'Good',
        status: 'alive',
        stats: {
          hp: 100,
          maxHp: 100,
          level: 1,
          experience: 0,
          gold: 100,
          attackPower: 10,
          defensePower: 10,
          magicPower: 5,
          luck: 50
        },
        abilities: [],
        statusEffects: [],
        actionThisRound: false,
        isReady: false
      };

      const result = validator.validatePlayer(playerData);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('TestPlayer');
    });

    test('should reject player with invalid stats', () => {
      const playerData = {
        id: 'player123',
        name: 'TestPlayer',
        class: 'Paladin',
        race: 'Human',
        role: 'Good',
        status: 'alive',
        stats: {
          hp: -10, // Invalid negative HP
          maxHp: 100,
          level: 1,
          experience: 0,
          gold: 100,
          attackPower: 10,
          defensePower: 10,
          magicPower: 5,
          luck: 50
        },
        abilities: [],
        statusEffects: [],
        actionThisRound: false,
        isReady: false
      };

      const result = validator.validatePlayer(playerData);
      expect(result.success).toBe(false);
      expect(result.errors.some(err => err.includes('hp'))).toBe(true);
    });
  });

  describe('Socket Validation', () => {
    test('should validate join game socket data', () => {
      const joinData = {
        gameCode: 'ABC123',
        playerName: 'TestPlayer',
        playerClass: 'Paladin',
        playerRace: 'Human'
      };

      const result = validator.validateJoinGame(joinData);
      expect(result.success).toBe(true);
      expect(result.data.gameCode).toBe('ABC123');
    });

    test('should reject invalid join game data', () => {
      const joinData = {
        gameCode: 'invalid', // Wrong format
        playerName: 'TestPlayer'
      };

      const result = validator.validateJoinGame(joinData);
      expect(result.success).toBe(false);
    });

    test('should validate submit action socket data', () => {
      const actionData = {
        actionType: 'attack',
        targetId: 'player456',
        abilityId: 'slash'
      };

      const result = validator.validateSubmitAction(actionData);
      expect(result.success).toBe(true);
      expect(result.data.actionType).toBe('attack');
    });
  });

  describe('Validation Middleware Integration', () => {
    test('should handle validation errors gracefully', () => {
      const invalidData = {
        invalidField: 'value'
      };

      const result = validator.validatePlayerAction(invalidData);
      expect(result.success).toBe(false);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should provide detailed error information', () => {
      const invalidData = {
        playerId: '', // Too short
        actionType: 123, // Wrong type
        timestamp: 'invalid'
      };

      const result = validator.validatePlayerAction(invalidData);
      expect(result.success).toBe(false);
      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
    });
  });

  describe('Schema Compatibility', () => {
    test('should handle optional fields correctly', () => {
      const minimalData = {
        playerId: 'player123',
        actionType: 'attack',
        timestamp: new Date().toISOString()
      };

      const result = validator.validatePlayerAction(minimalData);
      expect(result.success).toBe(true);
    });

    test('should validate nested objects', () => {
      const abilityData = {
        id: 'fireball',
        name: 'Fireball',
        description: 'A powerful fire spell',
        type: 'class',
        target: 'player',
        cooldown: 3,
        currentCooldown: 0,
        unlocked: true
      };

      const result = validator.validate(abilityData, schemas.PlayerSchemas.ability);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Fireball');
    });
  });
});

describe('Command Integration with Zod', () => {
  const PlayerActionCommand = require('../../models/commands/PlayerActionCommand');

  test('should validate command construction parameters', () => {
    expect(() => {
      new PlayerActionCommand('player123', 'attack', {
        targetId: 'player456',
        priority: 5
      });
    }).not.toThrow();
  });

  test('should reject invalid command construction parameters', () => {
    expect(() => {
      new PlayerActionCommand('', 'attack'); // Invalid player ID
    }).toThrow();
  });

  test('should validate command as player action', () => {
    const command = new PlayerActionCommand('player123', 'attack', {
      targetId: 'player456'
    });

    const result = command.validateAsPlayerAction();
    expect(result.success).toBe(true);
  });

  test('should validate ability command', () => {
    const command = new PlayerActionCommand('player123', 'ability', {
      abilityId: 'fireball',
      targetId: 'player456'
    });

    const abilityResult = command.validateAsAbilityAction();
    expect(abilityResult).not.toBeNull();
    expect(abilityResult.success).toBe(true);
  });
});