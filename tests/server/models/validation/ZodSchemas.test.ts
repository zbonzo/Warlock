/**
 * @fileoverview Tests for ZodSchemas
 * Comprehensive test suite for Zod validation schemas and type definitions
 */

import { z } from 'zod';
import {
  BaseSchemas,
  PlayerSchemas,
  ActionSchemas,
  GameSchemas,
  SocketSchemas,
  ConfigSchemas,
  // Type imports
  PlayerClass,
  PlayerRace,
  PlayerRole,
  GamePhase,
  PlayerStatus,
  AbilityTarget,
  EffectType,
  Player,
  PlayerStats,
  Ability,
  StatusEffect,
  PlayerAction,
  AbilityAction,
  ValidationResult,
  CommandResult,
  Monster,
  GamePhaseData,
  GameRules,
  GameState,
  JoinGameData,
  SubmitActionData,
  GameUpdateData,
  ErrorMessageData,
  ServerConfig,
  GameConfig
} from '../../../../server/models/validation/ZodSchemas';

describe('ZodSchemas', () => {
  describe('BaseSchemas', () => {
    describe('playerId', () => {
      it('should validate valid player IDs', () => {
        expect(BaseSchemas.playerId.safeParse('player1').success).toBe(true);
        expect(BaseSchemas.playerId.safeParse('user-123').success).toBe(true);
        expect(BaseSchemas.playerId.safeParse('a').success).toBe(true);
      });

      it('should reject invalid player IDs', () => {
        expect(BaseSchemas.playerId.safeParse('').success).toBe(false);
        expect(BaseSchemas.playerId.safeParse('a'.repeat(51)).success).toBe(false);
        expect(BaseSchemas.playerId.safeParse(123).success).toBe(false);
      });
    });

    describe('gameCode', () => {
      it('should validate valid game codes', () => {
        expect(BaseSchemas.gameCode.safeParse('ABC123').success).toBe(true);
        expect(BaseSchemas.gameCode.safeParse('XYZ789').success).toBe(true);
        expect(BaseSchemas.gameCode.safeParse('123456').success).toBe(true);
      });

      it('should reject invalid game codes', () => {
        expect(BaseSchemas.gameCode.safeParse('abc123').success).toBe(false); // lowercase
        expect(BaseSchemas.gameCode.safeParse('ABC12').success).toBe(false); // too short
        expect(BaseSchemas.gameCode.safeParse('ABC1234').success).toBe(false); // too long
        expect(BaseSchemas.gameCode.safeParse('ABC-12').success).toBe(false); // invalid character
      });
    });

    describe('timestamp', () => {
      it('should validate datetime strings', () => {
        const isoString = new Date().toISOString();
        expect(BaseSchemas.timestamp.safeParse(isoString).success).toBe(true);
      });

      it('should validate Date objects', () => {
        const date = new Date();
        expect(BaseSchemas.timestamp.safeParse(date).success).toBe(true);
      });

      it('should reject invalid timestamps', () => {
        expect(BaseSchemas.timestamp.safeParse('invalid-date').success).toBe(false);
        expect(BaseSchemas.timestamp.safeParse(123456789).success).toBe(false);
      });
    });

    describe('healthPoints', () => {
      it('should validate valid health values', () => {
        expect(BaseSchemas.healthPoints.safeParse(0).success).toBe(true);
        expect(BaseSchemas.healthPoints.safeParse(50).success).toBe(true);
        expect(BaseSchemas.healthPoints.safeParse(100).success).toBe(true);
      });

      it('should reject invalid health values', () => {
        expect(BaseSchemas.healthPoints.safeParse(-1).success).toBe(false);
        expect(BaseSchemas.healthPoints.safeParse(101).success).toBe(false);
        expect(BaseSchemas.healthPoints.safeParse(50.5).success).toBe(false);
      });
    });

    describe('enums', () => {
      it('should validate player classes', () => {
        expect(BaseSchemas.playerClass.safeParse('Paladin').success).toBe(true);
        expect(BaseSchemas.playerClass.safeParse('Knight').success).toBe(true);
        expect(BaseSchemas.playerClass.safeParse('Archer').success).toBe(true);
        expect(BaseSchemas.playerClass.safeParse('Wizard').success).toBe(true);
        expect(BaseSchemas.playerClass.safeParse('InvalidClass').success).toBe(false);
      });

      it('should validate player races', () => {
        expect(BaseSchemas.playerRace.safeParse('Human').success).toBe(true);
        expect(BaseSchemas.playerRace.safeParse('Elf').success).toBe(true);
        expect(BaseSchemas.playerRace.safeParse('Dwarf').success).toBe(true);
        expect(BaseSchemas.playerRace.safeParse('Halfling').success).toBe(true);
        expect(BaseSchemas.playerRace.safeParse('Orc').success).toBe(false);
      });

      it('should validate player roles', () => {
        expect(BaseSchemas.playerRole.safeParse('Good').success).toBe(true);
        expect(BaseSchemas.playerRole.safeParse('Evil').success).toBe(true);
        expect(BaseSchemas.playerRole.safeParse('Warlock').success).toBe(true);
        expect(BaseSchemas.playerRole.safeParse('Neutral').success).toBe(false);
      });

      it('should validate game phases', () => {
        expect(BaseSchemas.gamePhase.safeParse('setup').success).toBe(true);
        expect(BaseSchemas.gamePhase.safeParse('day').success).toBe(true);
        expect(BaseSchemas.gamePhase.safeParse('night').success).toBe(true);
        expect(BaseSchemas.gamePhase.safeParse('voting').success).toBe(true);
        expect(BaseSchemas.gamePhase.safeParse('ended').success).toBe(true);
        expect(BaseSchemas.gamePhase.safeParse('invalid').success).toBe(false);
      });
    });

    describe('position', () => {
      it('should validate valid positions', () => {
        expect(BaseSchemas.position.safeParse({ x: 0, y: 0 }).success).toBe(true);
        expect(BaseSchemas.position.safeParse({ x: 5, y: 10 }).success).toBe(true);
      });

      it('should accept undefined position', () => {
        expect(BaseSchemas.position.safeParse(undefined).success).toBe(true);
      });

      it('should reject invalid positions', () => {
        expect(BaseSchemas.position.safeParse({ x: -1, y: 0 }).success).toBe(false);
        expect(BaseSchemas.position.safeParse({ x: 0, y: 11 }).success).toBe(false);
        expect(BaseSchemas.position.safeParse({ x: 5.5, y: 0 }).success).toBe(false);
      });
    });

    describe('actionResult', () => {
      it('should validate action results', () => {
        expect(BaseSchemas.actionResult.safeParse({ success: true }).success).toBe(true);
        expect(BaseSchemas.actionResult.safeParse({
          success: false,
          reason: 'Invalid action',
          data: { code: 'INVALID' }
        }).success).toBe(true);
      });
    });
  });

  describe('PlayerSchemas', () => {
    describe('playerStats', () => {
      it('should validate valid player stats', () => {
        const validStats = {
          hp: 80,
          maxHp: 100,
          level: 5,
          experience: 1250,
          gold: 500,
          attackPower: 25,
          defensePower: 15,
          magicPower: 30,
          luck: 50
        };

        expect(PlayerSchemas.playerStats.safeParse(validStats).success).toBe(true);
      });

      it('should reject invalid player stats', () => {
        expect(PlayerSchemas.playerStats.safeParse({
          hp: -10, // invalid
          maxHp: 100,
          level: 5,
          experience: 1250,
          gold: 500,
          attackPower: 25,
          defensePower: 15,
          magicPower: 30,
          luck: 50
        }).success).toBe(false);

        expect(PlayerSchemas.playerStats.safeParse({
          hp: 80,
          maxHp: 100,
          level: 0, // invalid
          experience: 1250,
          gold: 500,
          attackPower: 25,
          defensePower: 15,
          magicPower: 30,
          luck: 50
        }).success).toBe(false);
      });
    });

    describe('ability', () => {
      it('should validate valid abilities', () => {
        const validAbility = {
          id: 'fireball',
          name: 'Fireball',
          description: 'A powerful fire spell',
          type: 'class' as const,
          target: 'player' as const,
          cooldown: 3,
          currentCooldown: 0,
          usesRemaining: 5,
          unlocked: true,
          requirements: {
            level: 3,
            class: 'Wizard' as const
          }
        };

        expect(PlayerSchemas.ability.safeParse(validAbility).success).toBe(true);
      });

      it('should validate abilities without optional fields', () => {
        const minimalAbility = {
          id: 'heal',
          name: 'Heal',
          description: 'Basic healing spell',
          type: 'racial' as const,
          target: 'self' as const,
          cooldown: 0,
          currentCooldown: 0,
          unlocked: false
        };

        expect(PlayerSchemas.ability.safeParse(minimalAbility).success).toBe(true);
      });
    });

    describe('statusEffect', () => {
      it('should validate valid status effects', () => {
        const validEffect = {
          id: 'poison-123',
          name: 'Poison',
          description: 'Deals damage over time',
          type: 'debuff' as const,
          duration: 5,
          remainingDuration: 3,
          stackable: true,
          stacks: 2,
          modifiers: {
            hp: -5,
            immunity: ['fire']
          }
        };

        expect(PlayerSchemas.statusEffect.safeParse(validEffect).success).toBe(true);
      });

      it('should allow permanent effects (duration -1)', () => {
        const permanentEffect = {
          id: 'blessing-456',
          name: 'Blessing',
          description: 'Permanent stat boost',
          type: 'buff' as const,
          duration: -1,
          remainingDuration: -1,
          modifiers: {
            attackPower: 5
          }
        };

        expect(PlayerSchemas.statusEffect.safeParse(permanentEffect).success).toBe(true);
      });
    });

    describe('player', () => {
      it('should validate complete player object', () => {
        const validPlayer = {
          id: 'player1',
          name: 'John',
          class: 'Wizard' as const,
          race: 'Human' as const,
          role: 'Good' as const,
          status: 'alive' as const,
          stats: {
            hp: 80,
            maxHp: 100,
            level: 5,
            experience: 1250,
            gold: 500,
            attackPower: 25,
            defensePower: 15,
            magicPower: 30,
            luck: 50
          },
          abilities: [],
          statusEffects: [],
          actionThisRound: false,
          isReady: true,
          socketId: 'socket123'
        };

        const result = PlayerSchemas.player.safeParse(validPlayer);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('ActionSchemas', () => {
    describe('playerAction', () => {
      it('should validate valid player actions', () => {
        const validAction = {
          playerId: 'player1',
          actionType: 'cast_spell',
          targetId: 'player2',
          actionData: { spellId: 'fireball' },
          timestamp: new Date().toISOString(),
          round: 3,
          turn: 1
        };

        expect(ActionSchemas.playerAction.safeParse(validAction).success).toBe(true);
      });

      it('should validate minimal player actions', () => {
        const minimalAction = {
          playerId: 'player1',
          actionType: 'wait',
          timestamp: new Date().toISOString()
        };

        expect(ActionSchemas.playerAction.safeParse(minimalAction).success).toBe(true);
      });
    });

    describe('abilityAction', () => {
      it('should validate ability actions', () => {
        const validAbilityAction = {
          playerId: 'player1',
          actionType: 'ability' as const,
          abilityId: 'fireball',
          targetId: 'monster1',
          coordinationInfo: {
            coordinated: true,
            partnerId: 'player2',
            timing: 'simultaneous' as const
          },
          timestamp: new Date().toISOString()
        };

        expect(ActionSchemas.abilityAction.safeParse(validAbilityAction).success).toBe(true);
      });
    });

    describe('validationResult', () => {
      it('should validate validation results', () => {
        const result = {
          valid: true,
          errors: [],
          warnings: ['Minor issue detected'],
          score: 85,
          metadata: { source: 'automated' }
        };

        expect(ActionSchemas.validationResult.safeParse(result).success).toBe(true);
      });
    });

    describe('commandResult', () => {
      it('should validate command results', () => {
        const result = {
          success: true,
          data: { playerId: 'player1' },
          errors: [],
          warnings: [],
          events: [{ type: 'player_joined' }],
          metadata: { timestamp: Date.now() }
        };

        expect(ActionSchemas.commandResult.safeParse(result).success).toBe(true);
      });

      it('should use default values', () => {
        const minimalResult = { success: false };
        const parsed = ActionSchemas.commandResult.parse(minimalResult);

        expect(parsed.errors).toEqual([]);
        expect(parsed.warnings).toEqual([]);
        expect(parsed.events).toEqual([]);
      });
    });
  });

  describe('GameSchemas', () => {
    describe('monster', () => {
      it('should validate monster objects', () => {
        const validMonster = {
          id: 'dragon1',
          name: 'Ancient Dragon',
          hp: 95,
          maxHp: 100,
          level: 15,
          attackPower: 45,
          defensePower: 30,
          abilities: ['fire_breath', 'claw_swipe'],
          statusEffects: [],
          isAlive: true,
          metadata: { type: 'boss' }
        };

        expect(GameSchemas.monster.safeParse(validMonster).success).toBe(true);
      });
    });

    describe('gamePhase', () => {
      it('should validate game phase objects', () => {
        const validPhase = {
          current: 'day' as const,
          round: 5,
          turn: 2,
          timeLimit: 300,
          startTime: new Date().toISOString(),
          actionsSubmitted: { player1: true, player2: false },
          canSubmitActions: true
        };

        expect(GameSchemas.gamePhase.safeParse(validPhase).success).toBe(true);
      });

      it('should use default values', () => {
        const minimalPhase = {
          current: 'setup' as const,
          round: 1,
          turn: 1
        };

        const parsed = GameSchemas.gamePhase.parse(minimalPhase);
        expect(parsed.actionsSubmitted).toEqual({});
        expect(parsed.canSubmitActions).toBe(true);
      });
    });

    describe('gameRules', () => {
      it('should validate game rules', () => {
        const validRules = {
          maxPlayers: 8,
          minPlayers: 4,
          maxRounds: 20,
          turnTimeLimit: 120,
          warlockCount: 2,
          allowSpectators: true,
          allowLateJoin: false,
          difficultyModifier: 1.5
        };

        expect(GameSchemas.gameRules.safeParse(validRules).success).toBe(true);
      });

      it('should use default values', () => {
        const minimalRules = {
          maxPlayers: 6,
          minPlayers: 3,
          maxRounds: 15,
          turnTimeLimit: 60,
          warlockCount: 1
        };

        const parsed = GameSchemas.gameRules.parse(minimalRules);
        expect(parsed.allowSpectators).toBe(false);
        expect(parsed.allowLateJoin).toBe(false);
        expect(parsed.difficultyModifier).toBe(1.0);
      });

      it('should validate rule constraints', () => {
        expect(GameSchemas.gameRules.safeParse({
          maxPlayers: 2, // too few
          minPlayers: 3,
          maxRounds: 15,
          turnTimeLimit: 60,
          warlockCount: 1
        }).success).toBe(false);

        expect(GameSchemas.gameRules.safeParse({
          maxPlayers: 6,
          minPlayers: 3,
          maxRounds: 15,
          turnTimeLimit: 20, // too short
          warlockCount: 1
        }).success).toBe(false);
      });
    });

    describe('gameState', () => {
      it('should validate complete game state (lazy evaluation)', () => {
        const validGameState = {
          gameCode: 'ABC123',
          players: {},
          phase: {
            current: 'day' as const,
            round: 1,
            turn: 1
          },
          rules: {
            maxPlayers: 6,
            minPlayers: 3,
            maxRounds: 15,
            turnTimeLimit: 60,
            warlockCount: 1
          },
          isActive: true,
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };

        const result = GameSchemas.gameState.safeParse(validGameState);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('SocketSchemas', () => {
    describe('joinGame', () => {
      it('should validate join game events', () => {
        const validJoinData = {
          gameCode: 'ABC123',
          playerName: 'John',
          playerClass: 'Wizard' as const,
          playerRace: 'Human' as const
        };

        expect(SocketSchemas.joinGame.safeParse(validJoinData).success).toBe(true);
      });

      it('should validate name length constraints', () => {
        expect(SocketSchemas.joinGame.safeParse({
          gameCode: 'ABC123',
          playerName: 'A'.repeat(31), // too long
          playerClass: 'Wizard' as const,
          playerRace: 'Human' as const
        }).success).toBe(false);

        expect(SocketSchemas.joinGame.safeParse({
          gameCode: 'ABC123',
          playerName: '', // too short
          playerClass: 'Wizard' as const,
          playerRace: 'Human' as const
        }).success).toBe(false);
      });
    });

    describe('submitAction', () => {
      it('should validate submit action events', () => {
        const validActionData = {
          actionType: 'cast_spell',
          targetId: 'player2',
          abilityId: 'fireball',
          actionData: { power: 5 }
        };

        expect(SocketSchemas.submitAction.safeParse(validActionData).success).toBe(true);
      });

      it('should validate minimal action data', () => {
        const minimalActionData = {
          actionType: 'wait'
        };

        expect(SocketSchemas.submitAction.safeParse(minimalActionData).success).toBe(true);
      });
    });

    describe('gameUpdate', () => {
      it('should validate game update events (lazy evaluation)', () => {
        const validUpdate = {
          type: 'player_joined',
          message: 'Player joined the game',
          data: { playerId: 'player1' }
        };

        const result = SocketSchemas.gameUpdate.safeParse(validUpdate);
        expect(result.success).toBe(true);
      });
    });

    describe('errorMessage', () => {
      it('should validate error messages', () => {
        const validError = {
          type: 'error' as const,
          message: 'Invalid action',
          code: 'INVALID_ACTION',
          details: { actionType: 'unknown' }
        };

        expect(SocketSchemas.errorMessage.safeParse(validError).success).toBe(true);
      });

      it('should require error type literal', () => {
        expect(SocketSchemas.errorMessage.safeParse({
          type: 'warning', // wrong type
          message: 'Test message'
        }).success).toBe(false);
      });
    });
  });

  describe('ConfigSchemas', () => {
    describe('serverConfig', () => {
      it('should validate server configuration', () => {
        const validConfig = {
          port: 3000,
          host: 'localhost',
          cors: {
            origin: ['http://localhost:3000'],
            credentials: true
          },
          rateLimit: {
            windowMs: 15000,
            max: 100,
            message: 'Too many requests'
          },
          logging: {
            level: 'info' as const,
            format: 'json' as const
          }
        };

        expect(ConfigSchemas.serverConfig.safeParse(validConfig).success).toBe(true);
      });

      it('should validate CORS configurations', () => {
        // Array origin
        expect(ConfigSchemas.serverConfig.safeParse({
          port: 3000,
          host: 'localhost',
          cors: { origin: ['http://localhost:3000'] },
          logging: { level: 'info' }
        }).success).toBe(true);

        // String origin
        expect(ConfigSchemas.serverConfig.safeParse({
          port: 3000,
          host: 'localhost',
          cors: { origin: 'http://localhost:3000' },
          logging: { level: 'info' }
        }).success).toBe(true);

        // Boolean origin
        expect(ConfigSchemas.serverConfig.safeParse({
          port: 3000,
          host: 'localhost',
          cors: { origin: true },
          logging: { level: 'info' }
        }).success).toBe(true);
      });

      it('should use default values', () => {
        const config = {
          port: 3000,
          host: 'localhost',
          cors: { origin: '*' },
          logging: { level: 'info' as const }
        };

        const parsed = ConfigSchemas.serverConfig.parse(config);
        expect(parsed.cors.credentials).toBe(true);
        expect(parsed.logging.format).toBe('simple');
      });

      it('should validate port range', () => {
        expect(ConfigSchemas.serverConfig.safeParse({
          port: 999, // too low
          host: 'localhost',
          cors: { origin: '*' },
          logging: { level: 'info' }
        }).success).toBe(false);

        expect(ConfigSchemas.serverConfig.safeParse({
          port: 65536, // too high
          host: 'localhost',
          cors: { origin: '*' },
          logging: { level: 'info' }
        }).success).toBe(false);
      });
    });

    describe('gameConfig', () => {
      it('should validate game configuration (lazy evaluation)', () => {
        const validConfig = {
          defaultRules: {
            maxPlayers: 8,
            minPlayers: 4,
            maxRounds: 20,
            turnTimeLimit: 120,
            warlockCount: 2
          },
          abilityConfigs: {},
          classConfigs: {},
          raceConfigs: {}
        };

        const result = ConfigSchemas.gameConfig.safeParse(validConfig);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Type Exports', () => {
    it('should export correct types', () => {
      // Test that types can be used (compilation test)
      const playerClass: PlayerClass = 'Wizard';
      const playerRace: PlayerRace = 'Human';
      const playerRole: PlayerRole = 'Good';
      const gamePhase: GamePhase = 'day';
      const playerStatus: PlayerStatus = 'alive';
      const abilityTarget: AbilityTarget = 'player';
      const effectType: EffectType = 'buff';

      expect(playerClass).toBe('Wizard');
      expect(playerRace).toBe('Human');
      expect(playerRole).toBe('Good');
      expect(gamePhase).toBe('day');
      expect(playerStatus).toBe('alive');
      expect(abilityTarget).toBe('player');
      expect(effectType).toBe('buff');
    });

    it('should infer complex types correctly', () => {
      // Test complex type inference
      const playerStats: PlayerStats = {
        hp: 80,
        maxHp: 100,
        level: 5,
        experience: 1250,
        gold: 500,
        attackPower: 25,
        defensePower: 15,
        magicPower: 30,
        luck: 50
      };

      const ability: Ability = {
        id: 'test',
        name: 'Test Ability',
        description: 'Test description',
        type: 'class',
        target: 'self',
        cooldown: 0,
        currentCooldown: 0,
        unlocked: true
      };

      expect(playerStats.hp).toBe(80);
      expect(ability.name).toBe('Test Ability');
    });
  });

  describe('Schema Relationships and Lazy Evaluation', () => {
    it('should handle circular references with lazy schemas', () => {
      // Test that lazy schemas work properly
      const gameState: Partial<GameState> = {
        gameCode: 'ABC123',
        players: {
          'player1': {
            id: 'player1',
            name: 'John',
            class: 'Wizard',
            race: 'Human',
            role: 'Good',
            status: 'alive',
            stats: {
              hp: 80,
              maxHp: 100,
              level: 5,
              experience: 1250,
              gold: 500,
              attackPower: 25,
              defensePower: 15,
              magicPower: 30,
              luck: 50
            },
            abilities: [],
            statusEffects: []
          }
        }
      };

      expect(gameState.gameCode).toBe('ABC123');
      expect(gameState.players?.player1.name).toBe('John');
    });

    it('should validate nested schemas correctly', () => {
      const complexData = {
        gameState: {
          gameCode: 'XYZ789',
          players: {
            'player1': {
              id: 'player1',
              name: 'Alice',
              class: 'Paladin' as const,
              race: 'Human' as const,
              role: 'Good' as const,
              status: 'alive' as const,
              stats: {
                hp: 95,
                maxHp: 100,
                level: 8,
                experience: 2500,
                gold: 1000,
                attackPower: 35,
                defensePower: 40,
                magicPower: 20,
                luck: 75
              },
              abilities: [{
                id: 'divine_strike',
                name: 'Divine Strike',
                description: 'Holy damage attack',
                type: 'class' as const,
                target: 'monster' as const,
                cooldown: 2,
                currentCooldown: 0,
                unlocked: true
              }],
              statusEffects: [{
                id: 'blessing-1',
                name: 'Divine Blessing',
                description: 'Increased damage',
                type: 'buff' as const,
                duration: 3,
                remainingDuration: 2,
                modifiers: {
                  attackPower: 10
                }
              }]
            }
          },
          phase: {
            current: 'day' as const,
            round: 3,
            turn: 1
          },
          rules: {
            maxPlayers: 6,
            minPlayers: 3,
            maxRounds: 15,
            turnTimeLimit: 90,
            warlockCount: 1
          },
          isActive: true,
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
      };

      // This tests the complex nested structure with lazy evaluation
      expect(() => {
        const validated = GameSchemas.gameState.parse(complexData.gameState);
        expect(validated.players.player1.name).toBe('Alice');
        expect(validated.players.player1.abilities[0].name).toBe('Divine Strike');
        expect(validated.players.player1.statusEffects[0].name).toBe('Divine Blessing');
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle null and undefined values appropriately', () => {
      expect(BaseSchemas.playerId.safeParse(null).success).toBe(false);
      expect(BaseSchemas.playerId.safeParse(undefined).success).toBe(false);
      expect(BaseSchemas.position.safeParse(undefined).success).toBe(true); // Optional field
    });

    it('should handle empty objects and arrays', () => {
      expect(ActionSchemas.commandResult.safeParse({
        success: true,
        data: {},
        errors: [],
        warnings: [],
        events: []
      }).success).toBe(true);
    });

    it('should validate boundary values correctly', () => {
      // Test exact boundary values
      expect(BaseSchemas.healthPoints.safeParse(0).success).toBe(true);
      expect(BaseSchemas.healthPoints.safeParse(100).success).toBe(true);
      expect(BaseSchemas.round.safeParse(1).success).toBe(true);
      expect(BaseSchemas.round.safeParse(100).success).toBe(true);
    });

    it('should handle large nested structures', () => {
      const largePlayer = {
        id: 'player1',
        name: 'Test Player',
        class: 'Wizard' as const,
        race: 'Human' as const,
        role: 'Good' as const,
        status: 'alive' as const,
        stats: {
          hp: 80, maxHp: 100, level: 5, experience: 1250,
          gold: 500, attackPower: 25, defensePower: 15,
          magicPower: 30, luck: 50
        },
        abilities: Array(10).fill({
          id: 'test-ability',
          name: 'Test Ability',
          description: 'Test',
          type: 'class' as const,
          target: 'self' as const,
          cooldown: 0,
          currentCooldown: 0,
          unlocked: true
        }),
        statusEffects: Array(5).fill({
          id: 'test-effect',
          name: 'Test Effect',
          description: 'Test',
          type: 'buff' as const,
          duration: 3,
          remainingDuration: 2
        })
      };

      expect(PlayerSchemas.player.safeParse(largePlayer).success).toBe(true);
    });
  });
});
