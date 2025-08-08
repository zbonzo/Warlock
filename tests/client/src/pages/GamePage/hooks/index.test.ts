/**
 * @fileoverview Tests for GamePage hooks barrel export
 */
import * as GamePageHooks from '../../../../../../client/src/pages/GamePage/hooks';

describe('GamePage Hooks Index', () => {
  describe('hook exports', () => {
    it('should export all GamePage hooks', () => {
      // Test that all expected hooks are exported
      expect(GamePageHooks.useActionState).toBeDefined();
      expect(GamePageHooks.useRacialAbilities).toBeDefined();
      expect(GamePageHooks.useModalState).toBeDefined();
      expect(GamePageHooks.useMobileState).toBeDefined();
      expect(GamePageHooks.useGameEvents).toBeDefined();
      expect(GamePageHooks.useCharacterUtils).toBeDefined();
      expect(GamePageHooks.useActionWizard).toBeDefined();
    });

    it('should export functions', () => {
      // Test that all exports are functions (React hooks)
      expect(typeof GamePageHooks.useActionState).toBe('function');
      expect(typeof GamePageHooks.useRacialAbilities).toBe('function');
      expect(typeof GamePageHooks.useModalState).toBe('function');
      expect(typeof GamePageHooks.useMobileState).toBe('function');
      expect(typeof GamePageHooks.useGameEvents).toBe('function');
      expect(typeof GamePageHooks.useCharacterUtils).toBe('function');
      expect(typeof GamePageHooks.useActionWizard).toBe('function');
    });

    it('should have hook naming convention', () => {
      const hookNames = [
        'useActionState',
        'useRacialAbilities',
        'useModalState',
        'useMobileState',
        'useGameEvents',
        'useCharacterUtils',
        'useActionWizard'
      ];

      hookNames.forEach(hookName => {
        expect(hookName).toMatch(/^use[A-Z]/);
        expect(GamePageHooks[hookName as keyof typeof GamePageHooks]).toBeDefined();
      });
    });
  });

  describe('module structure', () => {
    it('should provide clean barrel export interface', () => {
      const exportedKeys = Object.keys(GamePageHooks);

      // All exports should be hooks (start with 'use')
      exportedKeys.forEach(key => {
        expect(key).toMatch(/^use[A-Z]/);
      });

      expect(exportedKeys.length).toBe(7);
    });

    it('should not introduce naming conflicts', () => {
      const exportedKeys = Object.keys(GamePageHooks);
      const uniqueKeys = new Set(exportedKeys);

      expect(uniqueKeys.size).toBe(exportedKeys.length);
    });
  });

  describe('hook organization', () => {
    it('should group related functionality', () => {
      // Test that hooks are logically organized
      const stateHooks = ['useActionState', 'useModalState', 'useMobileState'];
      const utilityHooks = ['useCharacterUtils', 'useGameEvents'];
      const featureHooks = ['useRacialAbilities', 'useActionWizard'];

      [...stateHooks, ...utilityHooks, ...featureHooks].forEach(hookName => {
        expect(GamePageHooks[hookName as keyof typeof GamePageHooks]).toBeDefined();
      });
    });

    it('should provide consistent hook interface', () => {
      // All hooks should be callable functions
      Object.values(GamePageHooks).forEach(hook => {
        expect(typeof hook).toBe('function');
      });
    });
  });

  describe('import/export consistency', () => {
    it('should maintain consistent export names', () => {
      // The export names should match the actual hook names from their modules
      const expectedHooks = [
        'useActionState',
        'useRacialAbilities',
        'useModalState',
        'useMobileState',
        'useGameEvents',
        'useCharacterUtils',
        'useActionWizard'
      ];

      expectedHooks.forEach(hookName => {
        expect(GamePageHooks).toHaveProperty(hookName);
      });
    });

    it('should not export unexpected items', () => {
      const exportedKeys = Object.keys(GamePageHooks);

      // Should only export the expected hooks
      expect(exportedKeys).toEqual([
        'useActionState',
        'useRacialAbilities',
        'useModalState',
        'useMobileState',
        'useGameEvents',
        'useCharacterUtils',
        'useActionWizard'
      ]);
    });
  });
});
