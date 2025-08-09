/**
 * @fileoverview Secure random number generator utilities
 * Provides cryptographically secure random number generation for sensitive operations
 */

import { randomInt, randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure random integer between min (inclusive) and max (exclusive)
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @returns Secure random integer
 */
export function secureRandomInt(min: number, max: number): number {
  if (min >= max) {
    throw new Error('min must be less than max');
  }

  return randomInt(min, max);
}

/**
 * Generate a cryptographically secure random float between 0 (inclusive) and 1 (exclusive)
 * @returns Secure random float
 */
export function secureRandomFloat(): number {
  // Generate 4 random bytes and convert to float
  const buffer = randomBytes(4);
  const uint32 = buffer.readUInt32BE(0);

  // Convert to float between 0 and 1
  return uint32 / (0xFFFFFFFF + 1);
}

/**
 * Generate a cryptographically secure random array element
 * @param array - Array to select from
 * @returns Random element from array
 */
export function secureRandomChoice<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot choose from empty array');
  }

  const randomIndex = secureRandomInt(0, array.length);
  // Array element access using secure random index
  // eslint-disable-next-line security/detect-object-injection -- randomIndex is cryptographically secure random number
  return array[randomIndex]!;
}

/**
 * Generate a cryptographically secure 4-digit game code
 * @returns 4-digit string
 */
export function secureGameCode(): string {
  // Generate number between 1000-9999 inclusive
  return secureRandomInt(1000, 10000).toString();
}

/**
 * Shuffle array using Fisher-Yates algorithm with secure randomness
 * @param array - Array to shuffle (modifies in place)
 * @returns Shuffled array
 */
export function secureShuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = secureRandomInt(0, i + 1);
    // Array element swapping for Fisher-Yates shuffle algorithm
    // eslint-disable-next-line security/detect-object-injection -- i and j are loop counters/secure random indices
    [array[i], array[j]] = [array[j]!, array[i]!];
  }
  return array;
}

/**
 * Generate a cryptographically secure unique identifier
 * @param prefix - Optional prefix for the ID
 * @param length - Length of random part (default: 12)
 * @returns Secure unique identifier
 */
export function secureId(prefix?: string, length: number = 12): string {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += secureRandomChoice(characters.split(''));
  }

  return prefix ? `${prefix}_${result}` : result;
}
