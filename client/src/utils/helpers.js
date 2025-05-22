/**
 * @fileoverview Utility helper functions for the application
 * Common functions used across multiple components
 */
import {
  RANDOM_NAMES,
  RACE_TO_CLASSES,
  CLASS_TO_RACES,
} from '../config/constants';

/**
 * Generate a random game code
 *
 * @returns {string} 4-digit game code
 */
export function generateRandomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Generate a random player name
 *
 * @returns {string} Random name from predefined list
 */
export function generateRandomName() {
  const randomIndex = Math.floor(Math.random() * RANDOM_NAMES.length);
  return RANDOM_NAMES[randomIndex];
}

/**
 * Check if a race and class combination is valid
 *
 * @param {string} race - Race name
 * @param {string} cls - Class name
 * @returns {boolean} Whether the combination is valid
 */
export function isValidRaceClassCombo(race, cls) {
  if (!race || !cls) return false;

  // Check if this class is available for the selected race
  if (RACE_TO_CLASSES[race] && RACE_TO_CLASSES[race].includes(cls)) {
    return true;
  }

  // Check if this race is available for the selected class
  if (CLASS_TO_RACES[cls] && CLASS_TO_RACES[cls].includes(race)) {
    return true;
  }

  return false;
}

/**
 * Format health as a percentage for progress bars
 *
 * @param {number} current - Current health
 * @param {number} max - Maximum health
 * @returns {number} Percentage between 0 and 100
 */
export function getHealthPercentage(current, max) {
  if (!current || !max) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

/**
 * Get appropriate color based on health percentage
 *
 * @param {number} percentage - Health percentage
 * @returns {string} CSS color value
 */
export function getHealthColor(percentage) {
  if (percentage < 25) return '#e84855'; // danger
  if (percentage < 50) return '#ff7b25'; // warning
  return '#2cb978'; // good
}

/**
 * Determines CSS class for event based on content
 *
 * @param {string} event - Event message
 * @returns {string} CSS class name
 */
export function getEventClass(event) {
  if (!event) return '';

  if (event.includes('Warlock')) return 'warlock-event';
  if (event.includes('attacked') || event.includes('damage'))
    return 'attack-event';
  if (event.includes('healed') || event.includes('healing'))
    return 'heal-event';
  if (event.includes('shielded') || event.includes('shield'))
    return 'defense-event';
  if (event.includes('Monster')) return 'monster-event';
  if (event.includes('fallen') || event.includes('died')) return 'death-event';
  if (event.includes('level up')) return 'level-event';

  return '';
}

/**
 * Determine if client is on a mobile device
 *
 * @returns {boolean} Whether the client is on mobile
 */
export function isMobileDevice() {
  return (
    typeof window !== 'undefined' &&
    (window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ))
  );
}

/**
 * Get initials from a name
 *
 * @param {string} name - Full name
 * @returns {string} Initials (1-2 characters)
 */
export function getInitials(name) {
  if (!name) return '';

  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return name.charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Delay execution for specified time
 *
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safely parse JSON with fallback
 *
 * @param {string} json - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
export function safeJsonParse(json, fallback = {}) {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('JSON Parse Error:', error);
    return fallback;
  }
}
