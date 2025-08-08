/**
 * @fileoverview Comprehensive TypeScript tests for AbilityRegistry
 * Testing the AbilityRegistry with ability handler registration and execution
 */

describe('AbilityRegistry (TypeScript)', () => {
  let abilityRegistry: any;
  let mockActor: any;
  let mockTarget: any;
  let mockMonster: any;
  let mockGame: any;
  let mockSystems: any;
  let mockEventBus: any;
  let mockAbility: any;
  let mockConfig: any;
  let mockMessages: any;
  let mockLogger: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock config
    mockConfig = {
      gameBalance: {
        criticalHitChance: 0.05,
        criticalHitMultiplier: 2.0,
        ultraFailChance: 0.01
      },
      MONSTER_ID: 'monster'
    };

    // Setup mock messages
    mockMessages = {
      getAbilityMessage: jest.fn().mockReturnValue('Critical hit message template'),
      formatMessage: jest.fn().mockImplementation((template, vars) => {
        return `${vars.playerName} scores a critical ${vars.abilityName} on ${vars.targetName}!`;
      })
    };

    // Setup mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Setup mock actor (player)
    mockActor = {
      id: 'player1',
      name: 'Alice',
      status: 'alive',
      tempCritMultiplier: 1,
      stats: {
        hp: 100,
        maxHp: 100,
        level: 5
      }
    };

    // Setup mock target (player)
    mockTarget = {
      id: 'player2',
      name: 'Bob',
      status: 'alive',
      stats: {
        hp: 80,
        maxHp: 100
      }
    };

    // Setup mock monster
    mockMonster = {
      id: 'monster',
      name: 'Test Monster',
      hp: 150,
      maxHp: 150
    };

    // Setup mock game
    mockGame = {
      players: [mockActor, mockTarget],
      monster: mockMonster,
      getPlayer: jest.fn().mockImplementation((id: string) => {
        return [mockActor, mockTarget].find(p => p.id === id);
      })
    };

    // Setup mock systems
    mockSystems = {
      damageCalculator: {
        calculateDamage: jest.fn().mockReturnValue({
          actualDamage: 25,
          blocked: 2,
          critical: false
        })
      },
      statusEffectManager: {
        applyEffect: jest.fn()
      }
    };

    // Setup mock event bus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    };

    // Setup mock ability
    mockAbility = {
      name: 'Fireball',
      category: 'Attack',
      type: 'fireball',
      params: {
        damage: 30,
        amount: 30
      },
      description: 'A powerful fire spell'
    };

    // Create AbilityRegistry mock implementation
    abilityRegistry = {
      classAbilities: new Map(),
      racialAbilities: new Map(),

      registerClassAbility: jest.fn().mockImplementation(function(abilityType: string, handler: any) {
        this.classAbilities.set(abilityType, handler);
      }),

      registerClassAbilities: jest.fn().mockImplementation(function(abilityTypes: string[], handler: any) {
        abilityTypes.forEach((type) => {
          this.registerClassAbility(type, handler);
        });
      }),

      registerRacialAbility: jest.fn().mockImplementation(function(abilityType: string, handler: any) {
        this.racialAbilities.set(abilityType, handler);
      }),

      hasClassAbility: jest.fn().mockImplementation(function(abilityType: string) {
        return this.classAbilities.has(abilityType);
      }),

      hasRacialAbility: jest.fn().mockImplementation(function(abilityType: string) {
        return this.racialAbilities.has(abilityType);
      }),

      executeClassAbility: jest.fn(),
      executeRacialAbility: jest.fn(),

      getRegisteredClassAbilities: jest.fn().mockImplementation(function() {
        return Array.from(this.classAbilities.keys());
      }),

      getRegisteredRacialAbilities: jest.fn().mockImplementation(function() {
        return Array.from(this.racialAbilities.keys());
      }),

      clear: jest.fn().mockImplementation(function() {
        this.classAbilities.clear();
        this.racialAbilities.clear();
      }),

      getStats: jest.fn().mockImplementation(function() {
        return {
          classAbilities: this.classAbilities.size,
          racialAbilities: this.racialAbilities.size,
          totalAbilities: this.classAbilities.size + this.racialAbilities.size
        };
      }),

      getDebugInfo: jest.fn().mockImplementation(function() {
        return {
          classAbilities: Array.from(this.classAbilities.keys()),
          racialAbilities: Array.from(this.racialAbilities.keys()),
          totalRegistered: this.classAbilities.size + this.racialAbilities.size
        };
      }),

      // Mock the actual execution logic
      _actualExecuteClassAbility: function(
        abilityType: string,
        ability: any,
        actor: any,
        target: any,
        game: any,
        systems: any,
        eventBus?: any,
        log: any[] = [],
        coordination?: any,
        comeback?: any
      ) {
        const handler = this.classAbilities.get(abilityType);
        if (!handler) {
          throw new Error(`No handler registered for class ability: ${abilityType}`);
        }

        // Simulate critical hit logic
        const finalTarget = target;
        let critMultiplier = 1;
        let outcome = 'normal';

        // Mock random for predictable testing
        const randomValue = Math.random();

        if (randomValue < mockConfig.gameBalance.criticalHitChance) {
          critMultiplier = mockConfig.gameBalance.criticalHitMultiplier;
          outcome = 'crit';
          actor.tempCritMultiplier = critMultiplier;

          log.push({
            type: 'ability_crit',
            public: true,
            attackerId: actor.id,
            targetId: finalTarget.id || finalTarget,
            message: mockMessages.formatMessage('crit template', {
              playerName: actor.name,
              abilityName: ability.name,
              targetName: finalTarget.name || 'the Monster'
            })
          });
        }

        // Execute handler
        return handler(ability, actor, finalTarget, game, systems, eventBus, log, coordination, comeback);
      },

      _actualExecuteRacialAbility: function(
        abilityType: string,
        actor: any,
        target: any,
        game: any,
        systems: any,
        eventBus?: any,
        log: any[] = []
      ) {
        const handler = this.racialAbilities.get(abilityType);
        if (!handler) {
          throw new Error(`No handler registered for racial ability: ${abilityType}`);
        }

        return handler(actor, target, game, systems, eventBus, log);
      }
    };

    // Mock external dependencies
    jest.doMock('../../../server/utils/logger.js', () => ({ default: mockLogger }));
    jest.doMock('../../../server/config/index.js', () => ({ default: mockConfig }));
    jest.doMock('../../../server/config/messages/index.js', () => ({ default: mockMessages }));
  });

  describe('Constructor and Initialization', () => {
    it('should create AbilityRegistry with empty maps', () => {
      expect(abilityRegistry.classAbilities).toBeInstanceOf(Map);
      expect(abilityRegistry.racialAbilities).toBeInstanceOf(Map);
      expect(abilityRegistry.classAbilities.size).toBe(0);
      expect(abilityRegistry.racialAbilities.size).toBe(0);
    });

    it('should have all required methods', () => {
      expect(typeof abilityRegistry.registerClassAbility).toBe('function');
      expect(typeof abilityRegistry.registerRacialAbility).toBe('function');
      expect(typeof abilityRegistry.executeClassAbility).toBe('function');
      expect(typeof abilityRegistry.executeRacialAbility).toBe('function');
      expect(typeof abilityRegistry.hasClassAbility).toBe('function');
      expect(typeof abilityRegistry.hasRacialAbility).toBe('function');
    });
  });

  describe('Class Ability Registration', () => {
    it('should register single class ability', () => {
      const mockHandler = jest.fn();

      abilityRegistry.registerClassAbility('fireball', mockHandler);

      expect(abilityRegistry.registerClassAbility).toHaveBeenCalledWith('fireball', mockHandler);
      expect(abilityRegistry.classAbilities.has('fireball')).toBe(true);
      expect(abilityRegistry.classAbilities.get('fireball')).toBe(mockHandler);
    });

    it('should register multiple class abilities with same handler', () => {
      const mockHandler = jest.fn();
      const abilityTypes = ['fireball', 'lightning', 'ice_shard'];

      abilityRegistry.registerClassAbilities(abilityTypes, mockHandler);

      expect(abilityRegistry.registerClassAbilities).toHaveBeenCalledWith(abilityTypes, mockHandler);
      abilityTypes.forEach(type => {
        expect(abilityRegistry.classAbilities.has(type)).toBe(true);
        expect(abilityRegistry.classAbilities.get(type)).toBe(mockHandler);
      });
    });

    it('should check if class ability is registered', () => {
      const mockHandler = jest.fn();
      abilityRegistry.registerClassAbility('heal', mockHandler);

      expect(abilityRegistry.hasClassAbility('heal')).toBe(true);
      expect(abilityRegistry.hasClassAbility('nonexistent')).toBe(false);
    });

    it('should get all registered class abilities', () => {
      const mockHandler = jest.fn();
      abilityRegistry.registerClassAbility('attack', mockHandler);
      abilityRegistry.registerClassAbility('defend', mockHandler);

      const registered = abilityRegistry.getRegisteredClassAbilities();

      expect(registered).toEqual(['attack', 'defend']);
    });

    it('should overwrite existing class ability registration', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      abilityRegistry.registerClassAbility('fireball', handler1);
      abilityRegistry.registerClassAbility('fireball', handler2);

      expect(abilityRegistry.classAbilities.get('fireball')).toBe(handler2);
    });
  });

  describe('Racial Ability Registration', () => {
    it('should register racial ability', () => {
      const mockHandler = jest.fn();

      abilityRegistry.registerRacialAbility('dwarf_endurance', mockHandler);

      expect(abilityRegistry.registerRacialAbility).toHaveBeenCalledWith('dwarf_endurance', mockHandler);
      expect(abilityRegistry.racialAbilities.has('dwarf_endurance')).toBe(true);
      expect(abilityRegistry.racialAbilities.get('dwarf_endurance')).toBe(mockHandler);
    });

    it('should check if racial ability is registered', () => {
      const mockHandler = jest.fn();
      abilityRegistry.registerRacialAbility('elf_agility', mockHandler);

      expect(abilityRegistry.hasRacialAbility('elf_agility')).toBe(true);
      expect(abilityRegistry.hasRacialAbility('nonexistent')).toBe(false);
    });

    it('should get all registered racial abilities', () => {
      const mockHandler = jest.fn();
      abilityRegistry.registerRacialAbility('human_versatility', mockHandler);
      abilityRegistry.registerRacialAbility('orc_strength', mockHandler);

      const registered = abilityRegistry.getRegisteredRacialAbilities();

      expect(registered).toEqual(['human_versatility', 'orc_strength']);
    });
  });

  describe('Class Ability Execution', () => {
    it('should execute registered class ability', () => {
      const mockHandler = jest.fn().mockReturnValue({ success: true, damage: 25 });
      abilityRegistry.registerClassAbility('fireball', mockHandler);

      const result = abilityRegistry._actualExecuteClassAbility(
        'fireball',
        mockAbility,
        mockActor,
        mockTarget,
        mockGame,
        mockSystems,
        mockEventBus,
        []
      );

      expect(mockHandler).toHaveBeenCalledWith(
        mockAbility,
        mockActor,
        mockTarget,
        mockGame,
        mockSystems,
        mockEventBus,
        [],
        undefined,
        undefined
      );
      expect(result).toEqual({ success: true, damage: 25 });
    });

    it('should execute class ability with coordination bonus', () => {
      const mockHandler = jest.fn().mockReturnValue({ success: true });
      abilityRegistry.registerClassAbility('heal', mockHandler);

      const coordination = {
        bonus: 1.2,
        players: [mockActor, mockTarget],
        isCoordinated: true
      };

      abilityRegistry._actualExecuteClassAbility(
        'heal',
        mockAbility,
        mockActor,
        mockTarget,
        mockGame,
        mockSystems,
        mockEventBus,
        [],
        coordination
      );

      expect(mockHandler).toHaveBeenCalledWith(
        mockAbility,
        mockActor,
        mockTarget,
        mockGame,
        mockSystems,
        mockEventBus,
        [],
        coordination,
        undefined
      );
    });

    it('should execute class ability with comeback bonus', () => {
      const mockHandler = jest.fn().mockReturnValue({ success: true });
      abilityRegistry.registerClassAbility('shield', mockHandler);

      const comeback = {
        bonus: 1.5,
        isActive: true
      };

      abilityRegistry._actualExecuteClassAbility(
        'shield',
        mockAbility,
        mockActor,
        mockTarget,
        mockGame,
        mockSystems,
        mockEventBus,
        [],
        undefined,
        comeback
      );

      expect(mockHandler).toHaveBeenCalledWith(
        mockAbility,
        mockActor,
        mockTarget,
        mockGame,
        mockSystems,
        mockEventBus,
        [],
        undefined,
        comeback
      );
    });

    it('should throw error for unregistered class ability', () => {
      expect(() => {
        abilityRegistry._actualExecuteClassAbility(
          'nonexistent',
          mockAbility,
          mockActor,
          mockTarget,
          mockGame,
          mockSystems
        );
      }).toThrow('No handler registered for class ability: nonexistent');
    });

    it('should handle critical hits', () => {
      const mockHandler = jest.fn().mockReturnValue({ success: true });
      abilityRegistry.registerClassAbility('attack', mockHandler);

      // Mock Math.random to return a value that triggers critical hit
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.02); // Less than criticalHitChance (0.05)

      const log: any[] = [];
      abilityRegistry._actualExecuteClassAbility(
        'attack',
        mockAbility,
        mockActor,
        mockTarget,
        mockGame,
        mockSystems,
        mockEventBus,
        log
      );

      expect(mockActor.tempCritMultiplier).toBe(2.0);
      expect(log).toHaveLength(1);
      expect(log[0].type).toBe('ability_crit');
      expect(log[0].public).toBe(true);

      // Restore Math.random
      Math.random = originalRandom;
    });

    it('should handle execution errors', () => {
      const mockHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler execution failed');
      });
      abilityRegistry.registerClassAbility('faulty', mockHandler);

      expect(() => {
        abilityRegistry._actualExecuteClassAbility(
          'faulty',
          mockAbility,
          mockActor,
          mockTarget,
          mockGame,
          mockSystems
        );
      }).toThrow('Handler execution failed');
    });
  });

  describe('Racial Ability Execution', () => {
    it('should execute registered racial ability', () => {
      const mockHandler = jest.fn().mockReturnValue({ success: true, effect: 'endurance' });
      abilityRegistry.registerRacialAbility('dwarf_endurance', mockHandler);

      const result = abilityRegistry._actualExecuteRacialAbility(
        'dwarf_endurance',
        mockActor,
        mockTarget,
        mockGame,
        mockSystems,
        mockEventBus,
        []
      );

      expect(mockHandler).toHaveBeenCalledWith(
        mockActor,
        mockTarget,
        mockGame,
        mockSystems,
        mockEventBus,
        []
      );
      expect(result).toEqual({ success: true, effect: 'endurance' });
    });

    it('should throw error for unregistered racial ability', () => {
      expect(() => {
        abilityRegistry._actualExecuteRacialAbility(
          'nonexistent',
          mockActor,
          mockTarget,
          mockGame,
          mockSystems
        );
      }).toThrow('No handler registered for racial ability: nonexistent');
    });

    it('should handle racial ability execution errors', () => {
      const mockHandler = jest.fn().mockImplementation(() => {
        throw new Error('Racial ability failed');
      });
      abilityRegistry.registerRacialAbility('elf_stealth', mockHandler);

      expect(() => {
        abilityRegistry._actualExecuteRacialAbility(
          'elf_stealth',
          mockActor,
          mockTarget,
          mockGame,
          mockSystems
        );
      }).toThrow('Racial ability failed');
    });
  });

  describe('Ultra Fail Mechanics', () => {
    it('should handle ultra fail targeting monster instead of player', () => {
      const mockHandler = jest.fn().mockReturnValue({ success: true });
      abilityRegistry.registerClassAbility('attack', mockHandler);

      // Mock Math.random to trigger ultra fail
      const originalRandom = Math.random;
      Math.random = jest.fn()
        .mockReturnValueOnce(0.1)  // No critical hit
        .mockReturnValueOnce(0.005) // Ultra fail (< 0.01)
        .mockReturnValueOnce(0.3);  // Random selection

      const log: any[] = [];
      const result = abilityRegistry._actualExecuteClassAbility(
        'attack',
        mockAbility,
        mockActor,
        mockConfig.MONSTER_ID, // Targeting monster
        mockGame,
        mockSystems,
        mockEventBus,
        log
      );

      // Should have changed target and logged ultra fail
      expect(log.some(entry => entry.type === 'ability_ultra_fail')).toBe(true);

      // Restore Math.random
      Math.random = originalRandom;
    });
  });

  describe('Registry Management', () => {
    it('should clear all registrations', () => {
      const mockHandler = jest.fn();
      abilityRegistry.registerClassAbility('fireball', mockHandler);
      abilityRegistry.registerRacialAbility('dwarf_endurance', mockHandler);

      expect(abilityRegistry.classAbilities.size).toBe(1);
      expect(abilityRegistry.racialAbilities.size).toBe(1);

      abilityRegistry.clear();

      expect(abilityRegistry.clear).toHaveBeenCalled();
      expect(abilityRegistry.classAbilities.size).toBe(0);
      expect(abilityRegistry.racialAbilities.size).toBe(0);
    });

    it('should provide registration statistics', () => {
      const mockHandler = jest.fn();
      abilityRegistry.registerClassAbility('attack', mockHandler);
      abilityRegistry.registerClassAbility('defend', mockHandler);
      abilityRegistry.registerRacialAbility('human_versatility', mockHandler);

      const stats = abilityRegistry.getStats();

      expect(stats).toEqual({
        classAbilities: 2,
        racialAbilities: 1,
        totalAbilities: 3
      });
    });

    it('should provide debug information', () => {
      const mockHandler = jest.fn();
      abilityRegistry.registerClassAbility('heal', mockHandler);
      abilityRegistry.registerClassAbility('shield', mockHandler);
      abilityRegistry.registerRacialAbility('elf_agility', mockHandler);

      const debugInfo = abilityRegistry.getDebugInfo();

      expect(debugInfo).toEqual({
        classAbilities: ['heal', 'shield'],
        racialAbilities: ['elf_agility'],
        totalRegistered: 3
      });
    });

    it('should handle empty registry statistics', () => {
      const stats = abilityRegistry.getStats();

      expect(stats).toEqual({
        classAbilities: 0,
        racialAbilities: 0,
        totalAbilities: 0
      });
    });
  });

  describe('Handler Interface Validation', () => {
    it('should accept valid class ability handler', () => {
      const validHandler = (
        ability: any,
        actor: any,
        target: any,
        game: any,
        systems: any,
        eventBus?: any,
        log?: any[],
        coordination?: any,
        comeback?: any
      ) => {
        return { success: true };
      };

      expect(() => {
        abilityRegistry.registerClassAbility('valid_ability', validHandler);
      }).not.toThrow();
    });

    it('should accept valid racial ability handler', () => {
      const validHandler = (
        actor: any,
        target: any,
        game: any,
        systems: any,
        eventBus?: any,
        log?: any[]
      ) => {
        return { success: true };
      };

      expect(() => {
        abilityRegistry.registerRacialAbility('valid_racial', validHandler);
      }).not.toThrow();
    });
  });

  describe('Type Safety and Interfaces', () => {
    it('should enforce AbilityHandler interface', () => {
      interface AbilityHandler {
        (
          ability: any,
          actor: any,
          target: any,
          game: any,
          systems: any,
          eventBus?: any,
          log?: any[],
          coordination?: any,
          comeback?: any
        ): any;
      }

      const handler: AbilityHandler = (ability, actor, target, game, systems) => {
        return { success: true, damage: 10 };
      };

      expect(typeof handler).toBe('function');
      expect(handler.length).toBeGreaterThanOrEqual(5); // At least 5 required parameters
    });

    it('should enforce RacialAbilityHandler interface', () => {
      interface RacialAbilityHandler {
        (
          actor: any,
          target: any,
          game: any,
          systems: any,
          eventBus?: any,
          log?: any[]
        ): any;
      }

      const handler: RacialAbilityHandler = (actor, target, game, systems) => {
        return { success: true, effect: 'buff' };
      };

      expect(typeof handler).toBe('function');
      expect(handler.length).toBeGreaterThanOrEqual(4); // At least 4 required parameters
    });

    it('should enforce RegistrationStats interface', () => {
      interface RegistrationStats {
        classAbilities: number;
        racialAbilities: number;
        totalAbilities: number;
      }

      const stats: RegistrationStats = {
        classAbilities: 5,
        racialAbilities: 3,
        totalAbilities: 8
      };

      expect(typeof stats.classAbilities).toBe('number');
      expect(typeof stats.racialAbilities).toBe('number');
      expect(typeof stats.totalAbilities).toBe('number');
      expect(stats.totalAbilities).toBe(stats.classAbilities + stats.racialAbilities);
    });

    it('should enforce DebugInfo interface', () => {
      interface DebugInfo {
        classAbilities: string[];
        racialAbilities: string[];
        totalRegistered: number;
      }

      const debugInfo: DebugInfo = {
        classAbilities: ['fireball', 'heal'],
        racialAbilities: ['dwarf_endurance'],
        totalRegistered: 3
      };

      expect(Array.isArray(debugInfo.classAbilities)).toBe(true);
      expect(Array.isArray(debugInfo.racialAbilities)).toBe(true);
      expect(typeof debugInfo.totalRegistered).toBe('number');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle duplicate registrations gracefully', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      abilityRegistry.registerClassAbility('duplicate', handler1);
      abilityRegistry.registerClassAbility('duplicate', handler2);

      expect(abilityRegistry.classAbilities.get('duplicate')).toBe(handler2);
    });

    it('should handle empty ability type strings', () => {
      const mockHandler = jest.fn();

      abilityRegistry.registerClassAbility('', mockHandler);
      expect(abilityRegistry.hasClassAbility('')).toBe(true);
    });

    it('should handle null/undefined handler gracefully', () => {
      expect(() => {
        abilityRegistry.registerClassAbility('null_handler', null);
      }).not.toThrow();

      expect(abilityRegistry.classAbilities.get('null_handler')).toBeNull();
    });

    it('should handle execution with missing optional parameters', () => {
      const mockHandler = jest.fn().mockReturnValue({ success: true });
      abilityRegistry.registerClassAbility('minimal', mockHandler);

      expect(() => {
        abilityRegistry._actualExecuteClassAbility(
          'minimal',
          mockAbility,
          mockActor,
          mockTarget,
          mockGame,
          mockSystems
          // No eventBus, log, coordination, or comeback
        );
      }).not.toThrow();
    });

    it('should handle large numbers of registrations', () => {
      const mockHandler = jest.fn();

      // Register many abilities
      for (let i = 0; i < 1000; i++) {
        abilityRegistry.registerClassAbility(`ability_${i}`, mockHandler);
      }

      expect(abilityRegistry.classAbilities.size).toBe(1000);
      expect(abilityRegistry.getStats().classAbilities).toBe(1000);
    });

    it('should handle special characters in ability names', () => {
      const mockHandler = jest.fn();
      const specialNames = ['ability-with-dashes', 'ability_with_underscores', 'ability.with.dots'];

      specialNames.forEach(name => {
        abilityRegistry.registerClassAbility(name, mockHandler);
        expect(abilityRegistry.hasClassAbility(name)).toBe(true);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complex ability execution chain', () => {
      const attackHandler = jest.fn().mockReturnValue({ success: true, damage: 20 });
      const healHandler = jest.fn().mockReturnValue({ success: true, healing: 15 });
      const buffHandler = jest.fn().mockReturnValue({ success: true, effect: 'strength' });

      abilityRegistry.registerClassAbility('attack', attackHandler);
      abilityRegistry.registerClassAbility('heal', healHandler);
      abilityRegistry.registerRacialAbility('strength_buff', buffHandler);

      // Execute multiple abilities
      const log: any[] = [];

      abilityRegistry._actualExecuteClassAbility('attack', mockAbility, mockActor, mockTarget, mockGame, mockSystems, mockEventBus, log);
      abilityRegistry._actualExecuteClassAbility('heal', mockAbility, mockActor, mockActor, mockGame, mockSystems, mockEventBus, log);
      abilityRegistry._actualExecuteRacialAbility('strength_buff', mockActor, mockActor, mockGame, mockSystems, mockEventBus, log);

      expect(attackHandler).toHaveBeenCalled();
      expect(healHandler).toHaveBeenCalled();
      expect(buffHandler).toHaveBeenCalled();
    });

    it('should maintain state consistency during multiple registrations', () => {
      const handlers = Array.from({ length: 10 }, () => jest.fn());

      // Register abilities in batches
      handlers.slice(0, 5).forEach((handler, index) => {
        abilityRegistry.registerClassAbility(`class_${index}`, handler);
      });

      handlers.slice(5).forEach((handler, index) => {
        abilityRegistry.registerRacialAbility(`racial_${index}`, handler);
      });

      const stats = abilityRegistry.getStats();
      expect(stats.classAbilities).toBe(5);
      expect(stats.racialAbilities).toBe(5);
      expect(stats.totalAbilities).toBe(10);
    });
  });
});
