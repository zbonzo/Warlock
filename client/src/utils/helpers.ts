/**
 * @fileoverview Utility helper functions for the application
 * Common functions used across multiple components
 */
import { RANDOM_NAMES } from '../pages/JoinGamePage/constants';
import { CLASS_TO_RACES } from '../pages/CharacterSelectPage/constants';
import { PlayerClass, PlayerRace } from '../types/shared';

/**
 * Generate a random game code
 */
export function generateRandomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Generate a random player name
 */
export function generateRandomName(): string {
  const randomIndex = Math.floor(Math.random() * RANDOM_NAMES.length);
  return RANDOM_NAMES[randomIndex] || '';
}

/**
 * Check if a race and class combination is valid
 */
export function isValidRaceClassCombo(race: PlayerRace | string, cls: PlayerClass | string): boolean {
  if (!race || !cls) return false;

  // Check if this race is available for the selected class
  const clsString = String(cls);
  const raceString = String(race);
  const racesList = CLASS_TO_RACES[clsString];
  if (racesList && Array.isArray(racesList) && racesList.includes(raceString)) {
    return true;
  }

  return false;
}

/**
 * Format health as a percentage for progress bars
 */
export function getHealthPercentage(current: number, max: number): number {
  if (!current || !max) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

/**
 * Get appropriate color based on health percentage
 */
export function getHealthColor(percentage: number): string {
  if (percentage < 25) return '#e84855'; // danger
  if (percentage < 50) return '#ff7b25'; // warning
  return '#2cb978'; // good
}

/**
 * Determines CSS class for event based on content
 */
export function getEventClass(event: string): string {
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
 */
export function isMobileDevice(): boolean {
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
 */
export function getInitials(name: string): string {
  if (!name) return '';

  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return name.charAt(0).toUpperCase();
  }

  return ((parts[0]?.charAt(0) || '') + (parts[parts.length - 1]?.charAt(0) || '')).toUpperCase();
}

/**
 * Delay execution for specified time
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse<T = any>(json: string, fallback: T = {} as T): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('JSON Parse Error:', error);
    return fallback;
  }
}
