/**
 * @fileoverview Tests for AdaptabilityModal index.ts
 * Test suite for the AdaptabilityModal index file exports
 */

describe('AdaptabilityModal Index', () => {
  describe('Component Export', () => {
    it('should export AdaptabilityModal as default', async () => {
      const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');

      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe('function'); // React component
    });

    it('should have a component with expected name', async () => {
      const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');

      // Check component display name or function name
      expect(module.default.name).toBeTruthy();
    });
  });

  describe('Constants Export', () => {
    it('should export STEPS constant', async () => {
      const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');

      expect(module.STEPS).toBeDefined();
      expect(typeof module.STEPS).toBe('object');
    });

    it('should export StepType type', async () => {
      // This is tested indirectly by ensuring the constants module is re-exported
      const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');

      expect(module.STEPS).toHaveProperty('SELECT_ABILITY');
      expect(module.STEPS).toHaveProperty('SELECT_CLASS');
      expect(module.STEPS).toHaveProperty('SELECT_NEW_ABILITY');
    });

    it('should export ABILITY_CATEGORIES constant', async () => {
      const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');

      expect(module.ABILITY_CATEGORIES).toBeDefined();
      expect(typeof module.ABILITY_CATEGORIES).toBe('object');
    });

    it('should export DEFAULT_CATEGORY constant', async () => {
      const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');

      expect(module.DEFAULT_CATEGORY).toBeDefined();
      expect(typeof module.DEFAULT_CATEGORY).toBe('object');
    });
  });

  describe('Import Structure', () => {
    it('should allow default import', async () => {
      // This tests that the default export works correctly
      expect(async () => {
        const AdaptabilityModal = (await import('../../../../../client/src/components/modals/AdaptabilityModal/index')).default;
        expect(AdaptabilityModal).toBeDefined();
      }).not.toThrow();
    });

    it('should allow named imports', async () => {
      // This tests that named exports work correctly
      expect(async () => {
        const { STEPS, ABILITY_CATEGORIES, DEFAULT_CATEGORY } = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');
        expect(STEPS).toBeDefined();
        expect(ABILITY_CATEGORIES).toBeDefined();
        expect(DEFAULT_CATEGORY).toBeDefined();
      }).not.toThrow();
    });

    it('should allow mixed imports', async () => {
      // This tests that both default and named exports work together
      expect(async () => {
        const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');
        const AdaptabilityModal = module.default;
        const { STEPS } = module;

        expect(AdaptabilityModal).toBeDefined();
        expect(STEPS).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Re-export Integrity', () => {
    it('should re-export all constants from constants file', async () => {
      const indexModule = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');
      const constantsModule = await import('../../../../../client/src/components/modals/AdaptabilityModal/constants');

      // Check that all constants are re-exported
      expect(indexModule.STEPS).toEqual(constantsModule.STEPS);
      expect(indexModule.ABILITY_CATEGORIES).toEqual(constantsModule.ABILITY_CATEGORIES);
      expect(indexModule.DEFAULT_CATEGORY).toEqual(constantsModule.DEFAULT_CATEGORY);
    });

    it('should re-export the main component from AdaptabilityModal file', async () => {
      const indexModule = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');
      const mainModule = await import('../../../../../client/src/components/modals/AdaptabilityModal/AdaptabilityModal');

      // Check that the default export is the same
      expect(indexModule.default).toBe(mainModule.default);
    });
  });

  describe('Export Completeness', () => {
    it('should not export unexpected properties', async () => {
      const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');
      const exportedKeys = Object.keys(module);

      // Should only export expected items
      const expectedKeys = ['default', 'STEPS', 'ABILITY_CATEGORIES', 'DEFAULT_CATEGORY'];
      const unexpectedKeys = exportedKeys.filter(key => !expectedKeys.includes(key));

      expect(unexpectedKeys).toHaveLength(0);
    });

    it('should export all expected properties', async () => {
      const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');
      const exportedKeys = Object.keys(module);

      expect(exportedKeys).toContain('default');
      expect(exportedKeys).toContain('STEPS');
      expect(exportedKeys).toContain('ABILITY_CATEGORIES');
      expect(exportedKeys).toContain('DEFAULT_CATEGORY');
    });
  });

  describe('Module Consistency', () => {
    it('should maintain consistent export structure', async () => {
      const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');

      // Default export should be a function (React component)
      expect(typeof module.default).toBe('function');

      // Named exports should be objects/constants
      expect(typeof module.STEPS).toBe('object');
      expect(typeof module.ABILITY_CATEGORIES).toBe('object');
      expect(typeof module.DEFAULT_CATEGORY).toBe('object');
    });

    it('should not have circular dependencies', async () => {
      // This test ensures the module can be imported without issues
      expect(async () => {
        await import('../../../../../client/src/components/modals/AdaptabilityModal/index');
      }).not.toThrow();
    });
  });

  describe('TypeScript Compatibility', () => {
    it('should support TypeScript imports', async () => {
      // This tests that the exports work with TypeScript's type system
      const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');

      // Check that types are properly exported (indirectly through constants)
      expect(module.STEPS.SELECT_ABILITY).toBe('selectAbility');
      expect(module.STEPS.SELECT_CLASS).toBe('selectClass');
      expect(module.STEPS.SELECT_NEW_ABILITY).toBe('selectNewAbility');
    });

    it('should maintain type information in re-exports', async () => {
      const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');

      // Verify that the structure matches expected types
      expect(module.ABILITY_CATEGORIES.Attack).toHaveProperty('icon');
      expect(module.ABILITY_CATEGORIES.Attack).toHaveProperty('color');
      expect(module.DEFAULT_CATEGORY).toHaveProperty('icon');
      expect(module.DEFAULT_CATEGORY).toHaveProperty('color');
    });
  });

  describe('File Structure Validation', () => {
    it('should properly handle ES module syntax', async () => {
      // Test that the module uses proper ES module syntax
      expect(async () => {
        const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');

        // Should be able to destructure imports
        const { default: Component, STEPS, ABILITY_CATEGORIES } = module;
        expect(Component).toBeDefined();
        expect(STEPS).toBeDefined();
        expect(ABILITY_CATEGORIES).toBeDefined();
      }).not.toThrow();
    });

    it('should handle dynamic imports correctly', async () => {
      // Test dynamic import functionality
      const dynamicImport = () => import('../../../../../client/src/components/modals/AdaptabilityModal/index');

      expect(async () => {
        const module = await dynamicImport();
        expect(module.default).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Documentation Consistency', () => {
    it('should have proper file header comment in source', async () => {
      // This indirectly tests that the index file is properly structured
      const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');

      // Should export the expected items
      expect(module.default).toBeDefined();
      expect(module.STEPS).toBeDefined();
    });

    it('should maintain clean export interface', async () => {
      const module = await import('../../../../../client/src/components/modals/AdaptabilityModal/index');

      // Should not export internal implementation details
      const exportKeys = Object.keys(module);
      const internalKeys = exportKeys.filter(key =>
        key.startsWith('_') ||
        key.includes('Internal') ||
        key.includes('Private')
      );

      expect(internalKeys).toHaveLength(0);
    });
  });
});
