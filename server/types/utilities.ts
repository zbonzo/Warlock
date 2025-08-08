/**
 * @fileoverview Utilities re-export file
 *
 * This file has been refactored to use focused utility modules.
 * All utilities have been moved to server/types/utilities/ directory:
 *
 * - core-types.ts: Basic TypeScript utility types
 * - brand-types.ts: Branded types for type safety
 * - validation-types.ts: Validation and API response types
 * - type-guards.ts: Runtime type checking functions
 * - assertions.ts: Assertion functions that throw on type mismatches
 * - game-state-types.ts: Game-specific discriminated union types
 * - game-state-guards.ts: Type guards for game state types
 * - event-types.ts: Event system types and payloads
 * - performance-types.ts: Performance utility interfaces
 * - performance-utils.ts: Performance utility implementations
 *
 * This approach provides better code organization, easier maintenance,
 * and improved development experience.
 */

// Re-export everything from the utilities module
export * from './utilities/index.js';
