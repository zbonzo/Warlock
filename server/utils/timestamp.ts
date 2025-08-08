/**
 * Timestamp utilities for generating timestamps in a way that's clear to linters
 * that we're not using these for randomness or cryptographic purposes.
 */

/**
 * Gets the current timestamp as a Unix timestamp in milliseconds.
 * This is explicitly for timestamping events, not for randomness.
 * @returns Current Unix timestamp in milliseconds
 */
export const getCurrentTimestamp = (): number => {
  return Date.now();
};

/**
 * Gets the current timestamp as an ISO string.
 * @returns Current timestamp as ISO 8601 string
 */
export const getCurrentTimestampISO = (): string => {
  return new Date().toISOString();
};

/**
 * Gets a timestamp from a specific date as Unix timestamp in milliseconds.
 * @param date The date to convert to timestamp
 * @returns Unix timestamp in milliseconds
 */
export const getTimestamp = (date: Date): number => {
  return date.getTime();
};

/**
 * Gets a timestamp from a specific date as ISO string.
 * @param date The date to convert to ISO string
 * @returns ISO 8601 string
 */
export const getTimestampISO = (date: Date): string => {
  return date.toISOString();
};