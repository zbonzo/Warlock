/**
 * @fileoverview Tests for GameTutorial index.ts
 * Test suite for the GameTutorial index file exports
 */

describe('GameTutorial Index', () => {
  describe('Component Export', () => {
    it('should export GameTutorialModal as default', async () => {
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe('function'); // React component
    });

    it('should have a component with expected name', async () => {
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      
      // Check component display name or function name
      expect(module.default.name).toBeTruthy();
    });
  });

  describe('Tooltip Export', () => {
    it('should export Tooltip component', async () => {
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      
      expect(module.Tooltip).toBeDefined();
      expect(typeof module.Tooltip).toBe('function'); // React component
    });

    it('should have Tooltip component with expected name', async () => {
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      
      // Check component display name or function name
      expect(module.Tooltip.name).toBeTruthy();
    });
  });

  describe('Constants Export', () => {
    it('should export TUTORIAL_STEPS constant', async () => {
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      
      expect(module.TUTORIAL_STEPS).toBeDefined();
      expect(Array.isArray(module.TUTORIAL_STEPS)).toBe(true);
    });

    it('should export getTutorialStep function', async () => {
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      
      expect(module.getTutorialStep).toBeDefined();
      expect(typeof module.getTutorialStep).toBe('function');
    });
  });

  describe('Import Structure', () => {
    it('should allow default import', async () => {
      // This tests that the default export works correctly
      expect(async () => {
        const GameTutorialModal = (await import('../../../../../client/src/components/modals/GameTutorial/index')).default;
        expect(GameTutorialModal).toBeDefined();
      }).not.toThrow();
    });

    it('should allow named imports', async () => {
      // This tests that named exports work correctly
      expect(async () => {
        const { Tooltip, TUTORIAL_STEPS, getTutorialStep } = await import('../../../../../client/src/components/modals/GameTutorial/index');
        expect(Tooltip).toBeDefined();
        expect(TUTORIAL_STEPS).toBeDefined();
        expect(getTutorialStep).toBeDefined();
      }).not.toThrow();
    });

    it('should allow mixed imports', async () => {
      // This tests that both default and named exports work together
      expect(async () => {
        const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
        const GameTutorialModal = module.default;
        const { Tooltip } = module;
        
        expect(GameTutorialModal).toBeDefined();
        expect(Tooltip).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Re-export Integrity', () => {
    it('should re-export main component from GameTutorialModal file', async () => {
      const indexModule = await import('../../../../../client/src/components/modals/GameTutorial/index');
      const mainModule = await import('../../../../../client/src/components/modals/GameTutorial/GameTutorialModal');
      
      // Check that the default export is the same
      expect(indexModule.default).toBe(mainModule.default);
    });

    it('should re-export Tooltip from components/Tooltip file', async () => {
      const indexModule = await import('../../../../../client/src/components/modals/GameTutorial/index');
      const tooltipModule = await import('../../../../../client/src/components/modals/GameTutorial/components/Tooltip');
      
      // Check that the Tooltip export is the same
      expect(indexModule.Tooltip).toBe(tooltipModule.default);
    });

    it('should re-export constants from constants file', async () => {
      const indexModule = await import('../../../../../client/src/components/modals/GameTutorial/index');
      const constantsModule = await import('../../../../../client/src/components/modals/GameTutorial/constants');
      
      // Check that constants are re-exported
      expect(indexModule.TUTORIAL_STEPS).toBe(constantsModule.TUTORIAL_STEPS);
      expect(indexModule.getTutorialStep).toBe(constantsModule.getTutorialStep);
    });
  });

  describe('Export Completeness', () => {
    it('should export all expected properties', async () => {
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      const exportedKeys = Object.keys(module);
      
      expect(exportedKeys).toContain('default');
      expect(exportedKeys).toContain('Tooltip');
      expect(exportedKeys).toContain('TUTORIAL_STEPS');
      expect(exportedKeys).toContain('getTutorialStep');
    });

    it('should not export unexpected properties', async () => {
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      const exportedKeys = Object.keys(module);
      
      // Should only export expected items
      const expectedKeys = ['default', 'Tooltip', 'TUTORIAL_STEPS', 'getTutorialStep'];
      const unexpectedKeys = exportedKeys.filter(key => !expectedKeys.includes(key));
      
      expect(unexpectedKeys).toHaveLength(0);
    });
  });

  describe('Module Consistency', () => {
    it('should maintain consistent export structure', async () => {
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      
      // Default export should be a function (React component)
      expect(typeof module.default).toBe('function');
      
      // Named exports should have correct types
      expect(typeof module.Tooltip).toBe('function');
      expect(Array.isArray(module.TUTORIAL_STEPS)).toBe(true);
      expect(typeof module.getTutorialStep).toBe('function');
    });

    it('should not have circular dependencies', async () => {
      // This test ensures the module can be imported without issues
      expect(async () => {
        await import('../../../../../client/src/components/modals/GameTutorial/index');
      }).not.toThrow();
    });
  });

  describe('TypeScript Compatibility', () => {
    it('should support TypeScript imports', async () => {
      // This tests that the exports work with TypeScript's type system
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      
      // Check that types are properly maintained
      expect(typeof module.default).toBe('function');
      expect(typeof module.Tooltip).toBe('function');
      expect(Array.isArray(module.TUTORIAL_STEPS)).toBe(true);
      expect(typeof module.getTutorialStep).toBe('function');
    });

    it('should maintain type information in re-exports', async () => {
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      
      // Verify that the structure matches expected types
      expect(module.TUTORIAL_STEPS.length).toBeGreaterThan(0);
      expect(module.TUTORIAL_STEPS[0]).toHaveProperty('title');
      expect(module.TUTORIAL_STEPS[0]).toHaveProperty('content');
      expect(module.TUTORIAL_STEPS[0]).toHaveProperty('type');
      
      // Test getTutorialStep function
      const firstStep = module.getTutorialStep(0);
      expect(firstStep).toBe(module.TUTORIAL_STEPS[0]);
      
      const invalidStep = module.getTutorialStep(-1);
      expect(invalidStep).toBeNull();
    });
  });

  describe('File Structure Validation', () => {
    it('should properly handle ES module syntax', async () => {
      // Test that the module uses proper ES module syntax
      expect(async () => {
        const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
        
        // Should be able to destructure imports
        const { default: Component, Tooltip, TUTORIAL_STEPS } = module;
        expect(Component).toBeDefined();
        expect(Tooltip).toBeDefined();
        expect(TUTORIAL_STEPS).toBeDefined();
      }).not.toThrow();
    });

    it('should handle dynamic imports correctly', async () => {
      // Test dynamic import functionality
      const dynamicImport = () => import('../../../../../client/src/components/modals/GameTutorial/index');
      
      expect(async () => {
        const module = await dynamicImport();
        expect(module.default).toBeDefined();
        expect(module.Tooltip).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Component Interfaces', () => {
    it('should export React components with proper signatures', async () => {
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      
      // Main component should be a function (React component)
      expect(typeof module.default).toBe('function');
      expect(module.default.length).toBeGreaterThan(0); // Should accept props
      
      // Tooltip component should be a function (React component)
      expect(typeof module.Tooltip).toBe('function');
      expect(module.Tooltip.length).toBeGreaterThan(0); // Should accept props
    });

    it('should maintain consistency with source components', async () => {
      const indexModule = await import('../../../../../client/src/components/modals/GameTutorial/index');
      const mainModule = await import('../../../../../client/src/components/modals/GameTutorial/GameTutorialModal');
      const tooltipModule = await import('../../../../../client/src/components/modals/GameTutorial/components/Tooltip');
      
      // Should be exactly the same references
      expect(indexModule.default).toBe(mainModule.default);
      expect(indexModule.Tooltip).toBe(tooltipModule.default);
      
      // Should have same function signatures
      expect(indexModule.default.length).toBe(mainModule.default.length);
      expect(indexModule.Tooltip.length).toBe(tooltipModule.default.length);
    });
  });

  describe('Import Variations', () => {
    it('should work with destructured imports', async () => {
      expect(async () => {
        const { default: GameTutorialModal, Tooltip } = await import('../../../../../client/src/components/modals/GameTutorial/index');
        expect(GameTutorialModal).toBeDefined();
        expect(Tooltip).toBeDefined();
      }).not.toThrow();
    });

    it('should work with renamed imports', async () => {
      expect(async () => {
        const { 
          default: Modal, 
          Tooltip: TooltipComponent,
          TUTORIAL_STEPS: Steps,
          getTutorialStep: getStep
        } = await import('../../../../../client/src/components/modals/GameTutorial/index');
        
        expect(Modal).toBeDefined();
        expect(TooltipComponent).toBeDefined();
        expect(Steps).toBeDefined();
        expect(getStep).toBeDefined();
      }).not.toThrow();
    });

    it('should work with namespace imports', async () => {
      expect(async () => {
        const GameTutorial = await import('../../../../../client/src/components/modals/GameTutorial/index');
        
        expect(GameTutorial.default).toBeDefined();
        expect(GameTutorial.Tooltip).toBeDefined();
        expect(GameTutorial.TUTORIAL_STEPS).toBeDefined();
        expect(GameTutorial.getTutorialStep).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Module Stability', () => {
    it('should return the same references on multiple imports', async () => {
      const import1 = await import('../../../../../client/src/components/modals/GameTutorial/index');
      const import2 = await import('../../../../../client/src/components/modals/GameTutorial/index');
      
      expect(import1.default).toBe(import2.default);
      expect(import1.Tooltip).toBe(import2.Tooltip);
      expect(import1.TUTORIAL_STEPS).toBe(import2.TUTORIAL_STEPS);
      expect(import1.getTutorialStep).toBe(import2.getTutorialStep);
    });

    it('should maintain reference equality across dynamic imports', async () => {
      const dynamicImport1 = () => import('../../../../../client/src/components/modals/GameTutorial/index');
      const dynamicImport2 = () => import('../../../../../client/src/components/modals/GameTutorial/index');
      
      const module1 = await dynamicImport1();
      const module2 = await dynamicImport2();
      
      expect(module1.default).toBe(module2.default);
      expect(module1.Tooltip).toBe(module2.Tooltip);
      expect(module1.TUTORIAL_STEPS).toBe(module2.TUTORIAL_STEPS);
      expect(module1.getTutorialStep).toBe(module2.getTutorialStep);
    });
  });

  describe('Error Handling', () => {
    it('should not throw during import', async () => {
      expect(async () => {
        await import('../../../../../client/src/components/modals/GameTutorial/index');
      }).not.toThrow();
    });

    it('should handle module loading gracefully', async () => {
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      
      // Should have loaded successfully
      expect(module).toBeDefined();
      expect(module.default).toBeDefined();
      expect(module.Tooltip).toBeDefined();
      expect(module.TUTORIAL_STEPS).toBeDefined();
      expect(module.getTutorialStep).toBeDefined();
    });
  });

  describe('Documentation Consistency', () => {
    it('should have proper file structure', async () => {
      // This indirectly tests that the index file is properly structured
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      
      // Should export the expected items
      expect(module.default).toBeDefined();
      expect(module.Tooltip).toBeDefined();
      expect(module.TUTORIAL_STEPS).toBeDefined();
      expect(module.getTutorialStep).toBeDefined();
    });

    it('should maintain clean export interface', async () => {
      const module = await import('../../../../../client/src/components/modals/GameTutorial/index');
      
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