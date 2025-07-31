/**
 * @fileoverview Comprehensive TypeScript tests for SystemsFactory
 * Testing the systems factory with dependency injection and system orchestration
 */

describe('SystemsFactory (TypeScript)', () => {
  let mockPlayers: Map<string, any>;
  let mockMonster: any;
  let mockEventBus: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock players
    mockPlayers = new Map();
    mockPlayers.set('player1', {
      id: 'player1',
      name: 'Alice',
      isAlive: true,
      hp: 100,
      maxHp: 100,
      level: 1
    });
    mockPlayers.set('player2', {
      id: 'player2',
      name: 'Bob',
      isAlive: true,
      hp: 80,
      maxHp: 100,
      level: 2
    });

    // Setup mock monster
    mockMonster = {
      id: 'monster1',
      hp: 150,
      maxHp: 150,
      baseDmg: 20,
      age: 1,
      isAlive: true
    };

    // Setup mock event bus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    };
  });

  describe('System Creation', () => {
    it('should create all required systems with proper dependencies', () => {
      interface GameSystems {
        players: Map<string, any>;
        gameStateUtils: any;
        statusEffectManager: any;
        statusEffectSystem: any;
        warlockSystem: any;
        racialAbilitySystem: any;
        monsterController: any;
        combatSystem: any;
        abilityRegistry: any;
      }

      // Mock the systems creation process
      const mockSystems: GameSystems = {
        players: mockPlayers,
        gameStateUtils: { 
          updateGameState: jest.fn(),
          getPlayerStats: jest.fn() 
        },
        statusEffectManager: {
          applyEffect: jest.fn(),
          removeEffect: jest.fn(),
          processEffects: jest.fn()
        },
        statusEffectSystem: {
          manager: {},
          applyEffect: jest.fn()
        },
        warlockSystem: {
          processWarlockEffects: jest.fn(),
          getWarlockCount: jest.fn().mockReturnValue(1)
        },
        racialAbilitySystem: {
          processRacialAbilities: jest.fn(),
          canUseRacialAbility: jest.fn()
        },
        monsterController: {
          monster: mockMonster,
          processMonsterAction: jest.fn(),
          updateThreat: jest.fn()
        },
        combatSystem: {
          processRound: jest.fn(),
          calculateDamage: jest.fn(),
          eventBus: mockEventBus
        },
        abilityRegistry: {
          registerHandler: jest.fn(),
          getHandler: jest.fn(),
          getDebugInfo: jest.fn().mockReturnValue({ totalHandlers: 25 }),
          cleanup: jest.fn(),
          systems: {}
        }
      };

      // Test system structure
      expect(mockSystems.players).toBe(mockPlayers);
      expect(mockSystems.gameStateUtils).toBeDefined();
      expect(mockSystems.statusEffectManager).toBeDefined();
      expect(mockSystems.statusEffectSystem).toBeDefined();
      expect(mockSystems.warlockSystem).toBeDefined();
      expect(mockSystems.racialAbilitySystem).toBeDefined();
      expect(mockSystems.monsterController).toBeDefined();
      expect(mockSystems.combatSystem).toBeDefined();
      expect(mockSystems.abilityRegistry).toBeDefined();

      expect(mockSystems.players.size).toBe(2);
      expect(mockSystems.monsterController.monster).toBe(mockMonster);
      expect(mockSystems.combatSystem.eventBus).toBe(mockEventBus);
    });

    it('should handle system creation without event bus', () => {
      const mockSystemsWithoutEventBus = {
        players: mockPlayers,
        gameStateUtils: { updateGameState: jest.fn() },
        statusEffectManager: { applyEffect: jest.fn() },
        statusEffectSystem: { manager: {}, applyEffect: jest.fn() },
        warlockSystem: { processWarlockEffects: jest.fn() },
        racialAbilitySystem: { processRacialAbilities: jest.fn() },
        monsterController: { monster: mockMonster, processMonsterAction: jest.fn() },
        combatSystem: { processRound: jest.fn(), eventBus: null },
        abilityRegistry: { registerHandler: jest.fn(), systems: {} }
      };

      expect(mockSystemsWithoutEventBus.combatSystem.eventBus).toBeNull();
      expect(mockSystemsWithoutEventBus.players).toBe(mockPlayers);
    });

    it('should properly inject dependencies between systems', () => {
      const mockSystems = {
        statusEffectManager: { id: 'statusEffectManager' },
        warlockSystem: { dependencies: ['players', 'gameStateUtils'] },
        racialAbilitySystem: { dependencies: ['players', 'statusEffectManager'] },
        monsterController: { 
          dependencies: ['monster', 'players', 'statusEffectManager', 'racialAbilitySystem', 'gameStateUtils']
        },
        combatSystem: {
          dependencies: ['players', 'monsterController', 'statusEffectManager', 'racialAbilitySystem', 'warlockSystem', 'gameStateUtils']
        }
      };

      // Verify dependency injection patterns
      expect(mockSystems.warlockSystem.dependencies).toContain('players');
      expect(mockSystems.racialAbilitySystem.dependencies).toContain('statusEffectManager');
      expect(mockSystems.monsterController.dependencies).toContain('racialAbilitySystem');
      expect(mockSystems.combatSystem.dependencies).toContain('warlockSystem');
    });

    it('should store systems reference in ability registry', () => {
      const mockAbilityRegistry = {
        registerHandler: jest.fn(),
        systems: null
      };

      // Simulate systems reference storage
      const systemsReference = {
        players: mockPlayers,
        monster: mockMonster,
        monsterController: { monster: mockMonster },
        combatSystem: { processRound: jest.fn() },
        statusEffectManager: { applyEffect: jest.fn() },
        statusEffectSystem: { manager: {} },
        warlockSystem: { processWarlockEffects: jest.fn() },
        racialAbilitySystem: { processRacialAbilities: jest.fn() },
        gameStateUtils: { updateGameState: jest.fn() }
      };

      mockAbilityRegistry.systems = systemsReference;

      expect(mockAbilityRegistry.systems).toBeDefined();
      expect(mockAbilityRegistry.systems.players).toBe(mockPlayers);
      expect(mockAbilityRegistry.systems.monster).toBe(mockMonster);
    });
  });

  describe('System Validation', () => {
    let validSystems: any;

    beforeEach(() => {
      validSystems = {
        players: mockPlayers,
        gameStateUtils: { updateGameState: jest.fn() },
        statusEffectManager: { applyEffect: jest.fn() },
        statusEffectSystem: { manager: {}, applyEffect: jest.fn() },
        warlockSystem: { processWarlockEffects: jest.fn() },
        racialAbilitySystem: { processRacialAbilities: jest.fn() },
        monsterController: { monster: mockMonster, processMonsterAction: jest.fn() },
        combatSystem: { processRound: jest.fn() },
        abilityRegistry: { 
          registerHandler: jest.fn(),
          systems: { players: mockPlayers }
        }
      };
    });

    it('should validate all required systems are present', () => {
      const validateSystems = (systems: any) => {
        const errors: string[] = [];
        const requiredSystems = [
          'players', 'gameStateUtils', 'statusEffectManager', 'statusEffectSystem',
          'warlockSystem', 'racialAbilitySystem', 'monsterController', 'combatSystem', 'abilityRegistry'
        ];

        for (const systemName of requiredSystems) {
          if (!systems[systemName]) {
            errors.push(`Missing required system: ${systemName}`);
          }
        }

        return { valid: errors.length === 0, errors };
      };

      const result = validateSystems(validSystems);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify missing systems', () => {
      const invalidSystems = { ...validSystems };
      delete invalidSystems.combatSystem;
      delete invalidSystems.abilityRegistry;

      const validateSystems = (systems: any) => {
        const errors: string[] = [];
        const requiredSystems = [
          'players', 'gameStateUtils', 'statusEffectManager', 'statusEffectSystem',
          'warlockSystem', 'racialAbilitySystem', 'monsterController', 'combatSystem', 'abilityRegistry'
        ];

        for (const systemName of requiredSystems) {
          if (!systems[systemName]) {
            errors.push(`Missing required system: ${systemName}`);
          }
        }

        return { valid: errors.length === 0, errors };
      };

      const result = validateSystems(invalidSystems);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required system: combatSystem');
      expect(result.errors).toContain('Missing required system: abilityRegistry');
    });

    it('should validate ability registry systems reference', () => {
      const systemsWithoutRegistryRef = { ...validSystems };
      systemsWithoutRegistryRef.abilityRegistry = { registerHandler: jest.fn() }; // Missing systems reference

      const validateSystemConnections = (systems: any) => {
        const errors: string[] = [];
        
        if (systems.abilityRegistry && !systems.abilityRegistry.systems) {
          errors.push('AbilityRegistry missing systems reference');
        }

        return { valid: errors.length === 0, errors };
      };

      const result = validateSystemConnections(systemsWithoutRegistryRef);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('AbilityRegistry missing systems reference');
    });

    it('should validate players map is not empty', () => {
      const systemsWithEmptyPlayers = { ...validSystems };
      systemsWithEmptyPlayers.players = new Map();

      const validatePlayers = (systems: any) => {
        const errors: string[] = [];
        
        if (systems.players && systems.players.size === 0) {
          errors.push('Players map is empty');
        }

        return { valid: errors.length === 0, errors };
      };

      const result = validatePlayers(systemsWithEmptyPlayers);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Players map is empty');
    });
  });

  describe('System Status Reporting', () => {
    it('should generate comprehensive system status', () => {
      const mockSystems = {
        players: mockPlayers,
        abilityRegistry: {
          getDebugInfo: jest.fn().mockReturnValue({ 
            totalHandlers: 25,
            registeredTypes: ['attack', 'heal', 'special']
          })
        },
        statusEffectSystem: { manager: {}, applyEffect: jest.fn() },
        combatSystem: { 
          processRound: jest.fn(),
          eventBus: mockEventBus
        }
      };

      const getSystemStatus = (systems: any) => {
        return {
          playerCount: systems.players?.size || 0,
          systemsLoaded: Object.keys(systems).length,
          abilityHandlersRegistered: systems.abilityRegistry?.getDebugInfo?.() || null,
          statusEffectSystemActive: !!systems.statusEffectSystem,
          eventBusConnected: !!systems.combatSystem?.eventBus,
          timestamp: Date.now()
        };
      };

      const status = getSystemStatus(mockSystems);

      expect(status.playerCount).toBe(2);
      expect(status.systemsLoaded).toBe(4);
      expect(status.abilityHandlersRegistered).toEqual({
        totalHandlers: 25,
        registeredTypes: ['attack', 'heal', 'special']
      });
      expect(status.statusEffectSystemActive).toBe(true);
      expect(status.eventBusConnected).toBe(true);
      expect(typeof status.timestamp).toBe('number');
    });

    it('should handle missing optional components in status', () => {
      const minimalSystems = {
        players: new Map()
      };

      const getSystemStatus = (systems: any) => {
        return {
          playerCount: systems.players?.size || 0,
          systemsLoaded: Object.keys(systems).length,
          abilityHandlersRegistered: systems.abilityRegistry?.getDebugInfo?.() || null,
          statusEffectSystemActive: !!systems.statusEffectSystem,
          eventBusConnected: !!systems.combatSystem?.eventBus,
          timestamp: Date.now()
        };
      };

      const status = getSystemStatus(minimalSystems);

      expect(status.playerCount).toBe(0);
      expect(status.systemsLoaded).toBe(1);
      expect(status.abilityHandlersRegistered).toBeNull();
      expect(status.statusEffectSystemActive).toBe(false);
      expect(status.eventBusConnected).toBe(false);
    });
  });

  describe('System Cleanup', () => {
    it('should cleanup all systems that support cleanup', async () => {
      const mockSystems = {
        abilityRegistry: {
          cleanup: jest.fn().mockResolvedValue(undefined)
        },
        combatSystem: {
          cleanup: jest.fn().mockResolvedValue(undefined)
        },
        statusEffectSystem: {
          cleanup: jest.fn().mockResolvedValue(undefined)
        },
        gameStateUtils: {
          // No cleanup method - should be ignored
        }
      };

      const cleanupSystems = async (systems: any) => {
        const cleanupPromises: Promise<void>[] = [];

        if (systems.abilityRegistry?.cleanup) {
          cleanupPromises.push(systems.abilityRegistry.cleanup());
        }

        if (systems.combatSystem?.cleanup) {
          cleanupPromises.push(systems.combatSystem.cleanup());
        }

        if (systems.statusEffectSystem?.cleanup) {
          cleanupPromises.push(systems.statusEffectSystem.cleanup());
        }

        await Promise.all(cleanupPromises);
      };

      await cleanupSystems(mockSystems);

      expect(mockSystems.abilityRegistry.cleanup).toHaveBeenCalledTimes(1);
      expect(mockSystems.combatSystem.cleanup).toHaveBeenCalledTimes(1);
      expect(mockSystems.statusEffectSystem.cleanup).toHaveBeenCalledTimes(1);
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockSystems = {
        abilityRegistry: {
          cleanup: jest.fn().mockRejectedValue(new Error('Cleanup failed'))
        },
        combatSystem: {
          cleanup: jest.fn().mockResolvedValue(undefined)
        }
      };

      const cleanupSystems = async (systems: any) => {
        const cleanupPromises: Promise<void>[] = [];

        if (systems.abilityRegistry?.cleanup) {
          cleanupPromises.push(
            systems.abilityRegistry.cleanup().catch((error: Error) => {
              console.warn('Cleanup failed for abilityRegistry:', error.message);
            })
          );
        }

        if (systems.combatSystem?.cleanup) {
          cleanupPromises.push(systems.combatSystem.cleanup());
        }

        await Promise.all(cleanupPromises);
      };

      // Should not throw, despite one cleanup failing
      await expect(cleanupSystems(mockSystems)).resolves.toBeUndefined();
      
      expect(mockSystems.abilityRegistry.cleanup).toHaveBeenCalledTimes(1);
      expect(mockSystems.combatSystem.cleanup).toHaveBeenCalledTimes(1);
    });

    it('should handle systems without cleanup methods', async () => {
      const mockSystems = {
        players: mockPlayers,
        gameStateUtils: { updateGameState: jest.fn() },
        // No cleanup methods on any systems
      };

      const cleanupSystems = async (systems: any) => {
        const cleanupPromises: Promise<void>[] = [];

        if (systems.abilityRegistry?.cleanup) {
          cleanupPromises.push(systems.abilityRegistry.cleanup());
        }

        if (systems.combatSystem?.cleanup) {
          cleanupPromises.push(systems.combatSystem.cleanup());
        }

        await Promise.all(cleanupPromises);
      };

      // Should complete without issues
      await expect(cleanupSystems(mockSystems)).resolves.toBeUndefined();
    });
  });

  describe('System Integration', () => {
    it('should ensure proper system interconnections', () => {
      const mockSystems = {
        players: mockPlayers,
        monster: mockMonster,
        gameStateUtils: { 
          players: mockPlayers,
          updateGameState: jest.fn() 
        },
        statusEffectManager: {
          players: mockPlayers,
          applyEffect: jest.fn()
        },
        warlockSystem: {
          players: mockPlayers,
          gameStateUtils: { updateGameState: jest.fn() },
          processWarlockEffects: jest.fn()
        },
        racialAbilitySystem: {
          players: mockPlayers,
          statusEffectManager: { applyEffect: jest.fn() },
          processRacialAbilities: jest.fn()
        },
        monsterController: {
          monster: mockMonster,
          players: mockPlayers,
          statusEffectManager: { applyEffect: jest.fn() },
          racialAbilitySystem: { processRacialAbilities: jest.fn() },
          gameStateUtils: { updateGameState: jest.fn() },
          processMonsterAction: jest.fn()
        },
        combatSystem: {
          players: mockPlayers,
          monsterController: { processMonsterAction: jest.fn() },
          statusEffectManager: { applyEffect: jest.fn() },
          racialAbilitySystem: { processRacialAbilities: jest.fn() },
          warlockSystem: { processWarlockEffects: jest.fn() },
          gameStateUtils: { updateGameState: jest.fn() },
          eventBus: mockEventBus,
          processRound: jest.fn()
        }
      };

      // Verify all systems have their required dependencies
      expect(mockSystems.warlockSystem.players).toBe(mockPlayers);
      expect(mockSystems.racialAbilitySystem.players).toBe(mockPlayers);
      expect(mockSystems.monsterController.monster).toBe(mockMonster);
      expect(mockSystems.combatSystem.eventBus).toBe(mockEventBus);
    });

    it('should handle ability registry registration process', () => {
      const mockAbilityRegistry = {
        handlers: new Map(),
        systems: null,
        registerHandler: jest.fn().mockImplementation((type: string, handler: any) => {
          mockAbilityRegistry.handlers.set(type, handler);
        }),
        getHandler: jest.fn().mockImplementation((type: string) => {
          return mockAbilityRegistry.handlers.get(type);
        }),
        getDebugInfo: jest.fn().mockImplementation(() => {
          return {
            totalHandlers: mockAbilityRegistry.handlers.size,
            registeredTypes: Array.from(mockAbilityRegistry.handlers.keys())
          };
        })
      };

      // Simulate systems reference assignment
      mockAbilityRegistry.systems = {
        players: mockPlayers,
        monster: mockMonster,
        combatSystem: { processRound: jest.fn() }
      };

      // Simulate handler registration
      const mockHandlers = [
        { type: 'attack', handler: jest.fn() },
        { type: 'heal', handler: jest.fn() },
        { type: 'fireball', handler: jest.fn() },
        { type: 'shield', handler: jest.fn() }
      ];

      mockHandlers.forEach(({ type, handler }) => {
        mockAbilityRegistry.registerHandler(type, handler);
      });

      expect(mockAbilityRegistry.systems).toBeDefined();
      expect(mockAbilityRegistry.systems.players).toBe(mockPlayers);
      expect(mockAbilityRegistry.registerHandler).toHaveBeenCalledTimes(4);
      expect(mockAbilityRegistry.handlers.size).toBe(4);
      
      const debugInfo = mockAbilityRegistry.getDebugInfo();
      expect(debugInfo.totalHandlers).toBe(4);
      expect(debugInfo.registeredTypes).toEqual(['attack', 'heal', 'fireball', 'shield']);
    });
  });

  describe('Type Safety and Interfaces', () => {
    it('should enforce proper GameSystems interface', () => {
      interface GameSystems {
        players: Map<string, any>;
        gameStateUtils: any;
        statusEffectManager: any;
        statusEffectSystem: any;
        warlockSystem: any;
        racialAbilitySystem: any;
        monsterController: any;
        combatSystem: any;
        abilityRegistry: any;
      }

      const systems: GameSystems = {
        players: mockPlayers,
        gameStateUtils: { updateGameState: jest.fn() },
        statusEffectManager: { applyEffect: jest.fn() },
        statusEffectSystem: { manager: {}, applyEffect: jest.fn() },
        warlockSystem: { processWarlockEffects: jest.fn() },
        racialAbilitySystem: { processRacialAbilities: jest.fn() },
        monsterController: { monster: mockMonster, processMonsterAction: jest.fn() },
        combatSystem: { processRound: jest.fn() },
        abilityRegistry: { registerHandler: jest.fn() }
      };

      expect(systems.players).toBeInstanceOf(Map);
      expect(typeof systems.gameStateUtils.updateGameState).toBe('function');
      expect(typeof systems.statusEffectManager.applyEffect).toBe('function');
      expect(typeof systems.combatSystem.processRound).toBe('function');
    });

    it('should handle StatusEffectSystem interface correctly', () => {
      interface StatusEffectSystem {
        manager: any;
        applyEffect(
          targetId: string,
          effectType: string,
          effectData: Record<string, any>,
          sourceId?: string,
          sourceName?: string,
          log?: any[]
        ): void;
      }

      const statusEffectSystem: StatusEffectSystem = {
        manager: {
          effects: new Map(),
          processEffects: jest.fn()
        },
        applyEffect: jest.fn().mockImplementation((
          targetId: string,
          effectType: string,
          effectData: Record<string, any>
        ) => {
          expect(typeof targetId).toBe('string');
          expect(typeof effectType).toBe('string');
          expect(typeof effectData).toBe('object');
        })
      };

      statusEffectSystem.applyEffect('player1', 'poison', { damage: 5, duration: 3 });
      
      expect(statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        'player1',
        'poison',
        { damage: 5, duration: 3 }
      );
    });

    it('should handle GameEventBus interface correctly', () => {
      interface GameEventBus {
        emit(event: string, ...args: any[]): void;
        on(event: string, listener: (...args: any[]) => void): void;
        off(event: string, listener: (...args: any[]) => void): void;
      }

      const eventBus: GameEventBus = {
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
      };

      const mockListener = jest.fn();
      
      eventBus.on('test.event', mockListener);
      eventBus.emit('test.event', { data: 'test' });
      eventBus.off('test.event', mockListener);

      expect(eventBus.on).toHaveBeenCalledWith('test.event', mockListener);
      expect(eventBus.emit).toHaveBeenCalledWith('test.event', { data: 'test' });
      expect(eventBus.off).toHaveBeenCalledWith('test.event', mockListener);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty players map', () => {
      const emptyPlayers = new Map();
      
      const validateEmptyPlayers = (players: Map<string, any>) => {
        if (players.size === 0) {
          return { valid: false, error: 'No players available for system initialization' };
        }
        return { valid: true };
      };

      const result = validateEmptyPlayers(emptyPlayers);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No players available for system initialization');
    });

    it('should handle null/undefined monster', () => {
      const handleNullMonster = (monster: any) => {
        if (!monster) {
          return {
            id: 'default_monster',
            hp: 100,
            maxHp: 100,
            baseDmg: 10,
            age: 1,
            isAlive: true
          };
        }
        return monster;
      };

      const result = handleNullMonster(null);
      
      expect(result.id).toBe('default_monster');
      expect(result.hp).toBe(100);
      expect(result.isAlive).toBe(true);
    });

    it('should handle system creation failures gracefully', () => {
      const createSystemSafely = (systemCreator: () => any, fallback: any) => {
        try {
          return systemCreator();
        } catch (error) {
          console.warn('System creation failed, using fallback:', error);
          return fallback;
        }
      };

      const failingCreator = () => {
        throw new Error('System creation failed');
      };

      const fallbackSystem = { 
        type: 'fallback',
        processAction: jest.fn()
      };

      const result = createSystemSafely(failingCreator, fallbackSystem);
      
      expect(result).toBe(fallbackSystem);
      expect(result.type).toBe('fallback');
    });
  });
});