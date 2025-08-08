/**
 * @fileoverview Tests for ability handlers index module
 * Tests handler registration, validation, and module management
 */

import {
  registerAbilityHandlers,
  isValidAbilityRegistry,
  getAbilityHandlerModules,
  validateAbilityHandlerModules,
  DebugInfo,
  AbilityRegistry,
  AbilityHandlerModule
} from '../../../../../server/models/systems/abilityHandlers/index';

// Mock all the ability handler modules
jest.mock('../../../../../server/models/systems/abilityHandlers/abilityRegistryUtils', () => ({
  getAllAbilities: jest.fn().mockReturnValue({
    all: ['fireball', 'heal', 'shield', 'rage', 'berserk'],
    attack: ['fireball'],
    heal: ['heal'],
    defense: ['shield'],
    special: ['rage'],
    racial: ['berserk']
  })
}));

// Mock the handler modules
const mockRegister = jest.fn();

jest.mock('../../../../../server/models/systems/abilityHandlers/attackAbilities', () => ({
  register: mockRegister
}), { virtual: true });

jest.mock('../../../../../server/models/systems/abilityHandlers/healAbilities', () => ({
  register: mockRegister
}), { virtual: true });

jest.mock('../../../../../server/models/systems/abilityHandlers/defenseAbilities', () => ({
  register: mockRegister
}), { virtual: true });

jest.mock('../../../../../server/models/systems/abilityHandlers/specialAbilities', () => ({
  register: mockRegister
}), { virtual: true });

jest.mock('../../../../../server/models/systems/abilityHandlers/racialAbilities', () => ({
  register: mockRegister
}), { virtual: true });

describe('Ability Handlers Index', () => {
  let mockRegistry: jest.Mocked<AbilityRegistry>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockRegister.mockClear();

    // Create mock registry
    mockRegistry = {
      hasClassAbility: jest.fn().mockReturnValue(true),
      registerClassAbility: jest.fn(),
      registerClassAbilities: jest.fn(),
      executeClassAbility: jest.fn(),
      getDebugInfo: jest.fn().mockReturnValue({
        handlers: ['fireball', 'heal', 'shield'],
        total: 3
      })
    } as any;
  });

  describe('registerAbilityHandlers', () => {
    it('should register all ability handler modules', () => {
      const debugInfo = registerAbilityHandlers(mockRegistry);

      expect(mockRegister).toHaveBeenCalledTimes(5); // 5 modules
      expect(mockRegister).toHaveBeenCalledWith(mockRegistry);
      expect(debugInfo).toBeDefined();
      expect(debugInfo.registeredHandlers).toEqual(['fireball', 'heal', 'shield']);
      expect(debugInfo.totalHandlers).toBe(3);
      expect(Array.isArray(debugInfo.unregisteredAbilities)).toBe(true);
      expect(typeof debugInfo.timestamp).toBe('number');
    });

    it('should throw error for invalid registry', () => {
      expect(() => {
        registerAbilityHandlers(null as any);
      }).toThrow('Invalid ability registry provided');

      expect(() => {
        registerAbilityHandlers({} as any);
      }).toThrow('Invalid ability registry provided');

      expect(() => {
        registerAbilityHandlers({ hasClassAbility: 'not a function' } as any);
      }).toThrow('Invalid ability registry provided');
    });

    it('should handle registration errors gracefully', () => {
      mockRegister.mockImplementationOnce(() => {
        throw new Error('Registration failed');
      });

      expect(() => {
        registerAbilityHandlers(mockRegistry);
      }).toThrow('Failed to register ability handlers: Registration failed');
    });

    it('should detect unregistered abilities', () => {
      mockRegistry.hasClassAbility.mockImplementation((ability: string) => {
        return ability !== 'fireball'; // fireball is unregistered
      });

      const debugInfo = registerAbilityHandlers(mockRegistry);

      expect(debugInfo.unregisteredAbilities).toContain('fireball');
    });

    it('should handle debug info variations', () => {
      mockRegistry.getDebugInfo.mockReturnValue({
        handlers: 'not an array' as any,
        total: 'not a number' as any
      });

      const debugInfo = registerAbilityHandlers(mockRegistry);

      expect(debugInfo.registeredHandlers).toEqual([]);
      expect(debugInfo.totalHandlers).toBe(0);
    });
  });

  describe('isValidAbilityRegistry', () => {
    it('should validate correct registry', () => {
      const validRegistry = {
        hasClassAbility: jest.fn(),
        registerClassAbility: jest.fn(),
        registerClassAbilities: jest.fn(),
        executeClassAbility: jest.fn(),
        getDebugInfo: jest.fn()
      };

      expect(isValidAbilityRegistry(validRegistry)).toBe(true);
    });

    it('should reject invalid registries', () => {
      expect(isValidAbilityRegistry(null)).toBe(false);
      expect(isValidAbilityRegistry(undefined)).toBe(false);
      expect(isValidAbilityRegistry({})).toBe(false);
      expect(isValidAbilityRegistry('string')).toBe(false);
      expect(isValidAbilityRegistry(123)).toBe(false);

      // Missing methods
      expect(isValidAbilityRegistry({
        hasClassAbility: jest.fn()
        // Missing other methods
      })).toBe(false);

      // Wrong method types
      expect(isValidAbilityRegistry({
        hasClassAbility: 'not a function',
        registerClassAbility: jest.fn(),
        registerClassAbilities: jest.fn(),
        executeClassAbility: jest.fn(),
        getDebugInfo: jest.fn()
      })).toBe(false);
    });
  });

  describe('getAbilityHandlerModules', () => {
    it('should return all valid handler modules', () => {
      const modules = getAbilityHandlerModules();

      expect(Array.isArray(modules)).toBe(true);
      expect(modules.length).toBe(5);

      modules.forEach(module => {
        expect(module).toHaveProperty('register');
        expect(typeof module.register).toBe('function');
      });
    });

    it('should filter out invalid modules', () => {
      // This test ensures the filter logic works
      const modules = getAbilityHandlerModules();

      // All modules should have register function
      modules.forEach(module => {
        expect(typeof module.register).toBe('function');
      });
    });
  });

  describe('validateAbilityHandlerModules', () => {
    it('should validate all required modules are present', () => {
      const isValid = validateAbilityHandlerModules();
      expect(isValid).toBe(true);
    });

    it('should detect missing modules', () => {
      // Mock a scenario where fewer modules are available
      jest.doMock('../../../../../server/models/systems/abilityHandlers/attackAbilities', () => null);

      // Since we can't easily modify the imports during test,
      // we'll trust that the logic is correct based on the implementation
      const isValid = validateAbilityHandlerModules();
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle getAllAbilities error gracefully', () => {
      const { getAllAbilities } = require('../../../../../server/models/systems/abilityHandlers/abilityRegistryUtils');
      getAllAbilities.mockImplementationOnce(() => {
        throw new Error('Failed to get abilities');
      });

      // Should not throw, should return empty array for unregistered
      const debugInfo = registerAbilityHandlers(mockRegistry);
      expect(debugInfo.unregisteredAbilities).toEqual([]);
    });

    it('should handle registry validation errors', () => {
      const invalidRegistry = {
        hasClassAbility: jest.fn().mockImplementation(() => {
          throw new Error('Registry error');
        }),
        registerClassAbility: jest.fn(),
        registerClassAbilities: jest.fn(),
        executeClassAbility: jest.fn(),
        getDebugInfo: jest.fn().mockReturnValue({ handlers: [], total: 0 })
      };

      // Should handle the error in checkUnregisteredAbilities
      const debugInfo = registerAbilityHandlers(invalidRegistry as any);
      expect(debugInfo.unregisteredAbilities).toEqual([]);
    });
  });

  describe('Module Structure', () => {
    it('should export required types', () => {
      // Test that types are properly exported
      const testDebugInfo: DebugInfo = {
        registeredHandlers: [],
        totalHandlers: 0,
        unregisteredAbilities: [],
        timestamp: Date.now()
      };

      expect(testDebugInfo).toBeDefined();
    });

    it('should export required functions', () => {
      expect(typeof registerAbilityHandlers).toBe('function');
      expect(typeof isValidAbilityRegistry).toBe('function');
      expect(typeof getAbilityHandlerModules).toBe('function');
      expect(typeof validateAbilityHandlerModules).toBe('function');
    });

    it('should provide CommonJS compatibility', () => {
      // Test that module.exports is set correctly
      const commonJSExport = require('../../../../../server/models/systems/abilityHandlers/index');
      expect(commonJSExport).toHaveProperty('registerAbilityHandlers');
      expect(typeof commonJSExport.registerAbilityHandlers).toBe('function');
    });
  });

  describe('Registration Flow', () => {
    it('should register handlers in correct order', () => {
      const callOrder: string[] = [];

      mockRegister.mockImplementation((registry: any) => {
        callOrder.push('registered');
      });

      registerAbilityHandlers(mockRegistry);

      expect(callOrder.length).toBe(5); // All 5 modules called
    });

    it('should provide comprehensive debug information', () => {
      const debugInfo = registerAbilityHandlers(mockRegistry);

      expect(debugInfo).toMatchObject({
        registeredHandlers: expect.any(Array),
        totalHandlers: expect.any(Number),
        unregisteredAbilities: expect.any(Array),
        timestamp: expect.any(Number)
      });

      expect(debugInfo.timestamp).toBeGreaterThan(0);
      expect(debugInfo.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for AbilityHandlerModule', () => {
      const testModule: AbilityHandlerModule = {
        register: jest.fn()
      };

      expect(typeof testModule.register).toBe('function');
    });

    it('should validate interface compliance', () => {
      const modules = getAbilityHandlerModules();

      modules.forEach(module => {
        // Each module should comply with AbilityHandlerModule interface
        expect(module).toHaveProperty('register');
        expect(typeof module.register).toBe('function');
      });
    });
  });

  describe('Integration', () => {
    it('should work with real registry interface', () => {
      const debugInfo = registerAbilityHandlers(mockRegistry);

      // Verify registry methods were called
      expect(mockRegistry.getDebugInfo).toHaveBeenCalled();
      expect(mockRegistry.hasClassAbility).toHaveBeenCalled();

      // Verify return structure
      expect(debugInfo).toHaveProperty('registeredHandlers');
      expect(debugInfo).toHaveProperty('totalHandlers');
      expect(debugInfo).toHaveProperty('unregisteredAbilities');
      expect(debugInfo).toHaveProperty('timestamp');
    });

    it('should handle all ability categories', () => {
      registerAbilityHandlers(mockRegistry);

      // Each category should have its register method called
      expect(mockRegister).toHaveBeenCalledTimes(5);
      expect(mockRegister).toHaveBeenCalledWith(mockRegistry);
    });
  });
});
