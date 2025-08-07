/**
 * client/src/config/constants.ts
 * Client-specific constants that don't require server synchronization
 */

// Socket URL based on environment
export const SOCKET_URL = (() => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  // In development with different ports for client (4000) and server (4001)
  if (process.env['NODE_ENV'] === 'development') {
    // Always use the current hostname with port 4001 for the socket server
    return `${protocol === 'wss:' ? 'https:' : 'http:'}//${window.location.hostname}:4001`;
  }

  // In production, assume same origin
  return window.location.origin;
})();

// API base URL - FIXED FOR PRODUCTION
export const API_URL = (() => {
  // If explicitly set via environment variable, use that
  if (process.env['REACT_APP_API_URL']) {
    return process.env['REACT_APP_API_URL'];
  }

  // In development, use the hostname from the browser
  if (process.env['NODE_ENV'] === 'development') {
    // Use the current hostname but with port 4001 for the API
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // Always use the current hostname with port 4001
    return `${protocol}//${hostname}:4001/api`;
  }

  // In production, use relative URL (same origin via nginx proxy)
  return '/api';
})();

// Game phases - defines the different screens in the application
export const GAME_PHASES = {
  JOIN: 'join',
  CHARACTER_SELECT: 'charSelect',
  LOBBY: 'lobby',
  GAME: 'game',
  END: 'end',
} as const;

// Game action phases during gameplay
export const ACTION_PHASES = {
  ACTION: 'action',
  RESULTS: 'results',
} as const;

// Status effect types
export const STATUS_EFFECTS = {
  POISON: 'poison',
  SHIELDED: 'shielded',
  INVISIBLE: 'invisible',
  STUNNED: 'stunned',
} as const;

// UI constants
export const UI = {
  // Animation settings
  ANIMATION: {
    DURATION: {
      FAST: 150,
      MEDIUM: 300,
      SLOW: 500,
    },
    EASING: 'ease-in-out',
  },

  // Layout breakpoints
  BREAKPOINTS: {
    MOBILE: 480,
    TABLET: 768,
    DESKTOP: 1024,
    LARGE: 1440,
  },

  // Default theme settings
  THEME: {
    DEFAULT_MODE: 'light',
    AVAILABLE_MODES: ['light', 'dark', 'colorblind'] as const,
  },

  // Display settings
  DISPLAY: {
    MAX_PLAYERS_PER_PAGE: 10,
    LOG_ENTRIES_PER_PAGE: 20,
  },
} as const;

// Class and race icons (these are UI-specific and don't need to be fetched)
export const ICONS = {
  RACES: {
    Artisan: '/images/races/artisan.png',
    Rockhewn: '/images/races/rockhewn.png',
    Lich: '/images/races/lich.png',
    Orc: '/images/races/orc.png',
    Crestfallen: '/images/races/crestfallen.png',
    Kinfolk: '/images/races/kinfolk.png',
  },

  CLASSES: {
    Warrior: '/images/classes/warrior.png',
    Pyromancer: '/images/classes/pyromancer.png',
    Wizard: '/images/classes/wizard.png',
    Assassin: '/images/classes/assassin.png',
    Alchemist: '/images/classes/alchemist.png',
    Priest: '/images/classes/priest.png',
    Oracle: '/images/classes/oracle.png',
    Barbarian: '/images/classes/barbarian.png',
    Shaman: '/images/classes/shaman.png',
    Gunslinger: '/images/classes/gunslinger.png',
    Tracker: '/images/classes/tracker.png',
    Druid: '/images/classes/druid.png',
  },

  ABILITIES: {
    attack: '⚔️',
    heal: '💚',
    defense: '🛡️',
    special: '✨',
  },

  STATUS: {
    poison: '☠️',
    shielded: '🛡️',
    invisible: '👻',
    stunned: '⚡',
  },
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  LAST_GAME_CODE: 'lastGameCode',
  LAST_PLAYER_NAME: 'lastPlayerName',
  TUTORIAL_SEEN: 'tutorialSeen',
  THEME_PREFERENCE: 'themePreference',
} as const;

// Type helpers
export type GamePhase = typeof GAME_PHASES[keyof typeof GAME_PHASES];
export type ActionPhase = typeof ACTION_PHASES[keyof typeof ACTION_PHASES];
export type StatusEffect = typeof STATUS_EFFECTS[keyof typeof STATUS_EFFECTS];
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// Export all constants
export default {
  SOCKET_URL,
  API_URL,
  GAME_PHASES,
  ACTION_PHASES,
  STATUS_EFFECTS,
  UI,
  ICONS,
  STORAGE_KEYS,
};