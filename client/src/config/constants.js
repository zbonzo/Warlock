/**
 * client/src/config/constants.js
 * Client-specific constants that don't require server synchronization
 */

// Socket URL based on environment
export const SOCKET_URL = (() => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  // In development with different ports for client (3000) and server (3001)
  if (process.env.NODE_ENV === 'development') {
    // Special case: If running on localhost with Webpack dev server
    if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      // Force IPv4 to avoid IPv6 connection issues
      return `${protocol === 'wss:' ? 'https:' : 'http:'}//127.0.0.1:3001`;
    }
    // Otherwise, assume server is on same machine but different port
    return `${protocol === 'wss:' ? 'https:' : 'http:'}//${window.location.hostname}:3001`;
  }

  // In production, assume same origin
  return window.location.origin;
})();

// API base URL - FIXED FOR PRODUCTION
export const API_URL = (() => {
  // If explicitly set via environment variable, use that
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // In development, use the hostname from the browser
  if (process.env.NODE_ENV === 'development') {
    // Use the current hostname but with port 3001 for the API
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // Force IPv4 for localhost to avoid IPv6 connection issues
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//127.0.0.1:3001/api`;
    }
    
    return `${protocol}//${hostname}:3001/api`;
  }

  // In production, use relative URL (same origin via nginx proxy)
  return '/api';
})();

// Game phases - defines the different screens in the application
export const GAME_PHASES = {
  JOIN: 'join', // Initial join/create game screen
  CHARACTER_SELECT: 'charSelect', // Race/class selection screen
  LOBBY: 'lobby', // Waiting for players and game start
  GAME: 'game', // Active gameplay
  END: 'end', // Game results
};

// Game action phases during gameplay
export const ACTION_PHASES = {
  ACTION: 'action', // Player selects and submits actions
  RESULTS: 'results', // Round results are displayed
};

// Status effect types
export const STATUS_EFFECTS = {
  POISON: 'poison',
  SHIELDED: 'shielded',
  INVISIBLE: 'invisible',
  STUNNED: 'stunned',
};

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
    AVAILABLE_MODES: ['light', 'dark', 'colorblind'],
  },

  // Display settings
  DISPLAY: {
    MAX_PLAYERS_PER_PAGE: 10,
    LOG_ENTRIES_PER_PAGE: 20,
  },
};

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
};

// Local storage keys
export const STORAGE_KEYS = {
  LAST_GAME_CODE: 'lastGameCode',
  LAST_PLAYER_NAME: 'lastPlayerName',
  TUTORIAL_SEEN: 'tutorialSeen',
  THEME_PREFERENCE: 'themePreference',
};

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

