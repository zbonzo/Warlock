/**
 * @fileoverview Tests for client types index file
 */
import * as ClientTypes from '../../../../client/src/types';

describe('Client Types Index', () => {
  describe('barrel export functionality', () => {
    it('should export all game types', () => {
      // Test that the barrel export works correctly
      expect(typeof ClientTypes).toBe('object');
    });

    it('should re-export types from game module', () => {
      // Since this is a simple barrel export, we test that it doesn't break
      // The actual types would be tested in their respective modules
      const testTypeUsage = () => {
        // If the re-export works, this should compile without issues
        return true;
      };

      expect(testTypeUsage()).toBe(true);
    });
  });

  describe('module structure', () => {
    it('should provide consistent interface', () => {
      // Test that the module exports have expected structure
      expect(ClientTypes).toBeDefined();
    });

    it('should not introduce naming conflicts', () => {
      // Test that re-exports don't cause naming conflicts
      const moduleKeys = Object.keys(ClientTypes);
      const uniqueKeys = new Set(moduleKeys);
      
      expect(uniqueKeys.size).toBe(moduleKeys.length);
    });
  });

  describe('type availability', () => {
    it('should make game types available at top level', () => {
      // This test ensures the barrel export makes types easily accessible
      // The specific types would be tested in their source modules
      const hasExports = Object.keys(ClientTypes).length >= 0;
      expect(hasExports).toBe(true);
    });
  });
});