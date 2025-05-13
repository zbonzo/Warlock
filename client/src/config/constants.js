/**
 * Application-wide constants and configuration values
 */

// API & Socket
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Game configuration
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 20;
export const DEFAULT_MONSTER_HP = 100;
export const DEFAULT_MONSTER_DAMAGE = 10;

// Game phases
export const GAME_PHASES = {
  JOIN: 'join',
  CHARACTER_SELECT: 'charSelect',
  LOBBY: 'lobby',
  GAME: 'game',
  END: 'end'
};

// Action phases
export const ACTION_PHASES = {
  ACTION: 'action',
  RESULTS: 'results'
};

// Random player names to choose from
export const RANDOM_NAMES = [
  'Astra', 'Bolt', 'Cinder', 'Drake', 'Echo',
  'Frost', 'Gale', 'Havoc', 'Indigo', 'Jinx',
  'Knight', 'Lyric', 'Mist', 'Nebula', 'Onyx',
  'Phoenix', 'Quartz', 'Raven', 'Storm', 'Torch',
  'Umbra', 'Vortex', 'Willow', 'Xenon', 'Yelena',
  'Zephyr', 'Ash', 'Blaze', 'Cosmos', 'Dash',
  'Ember', 'Flint', 'Ghost', 'Hex', 'Ivy',
  'Jester', 'Kairos', 'Luna', 'Mirage', 'Nimbus'
];

// Races and classes mapping
export const CLASS_TO_RACES = {
  Warrior: ['Human', 'Dwarf', 'Skeleton'],
  Pyromancer: ['Dwarf', 'Skeleton', 'Orc'],
  Wizard: ['Human', 'Elf', 'Skeleton'],
  Assassin: ['Human', 'Elf', 'Skeleton'],
  Rogue: ['Human', 'Elf', 'Satyr'],
  Priest: ['Human', 'Dwarf', 'Skeleton'],
  Oracle: ['Dwarf', 'Satyr', 'Orc'],
  Seer: ['Elf', 'Satyr', 'Orc'],
  Shaman: ['Dwarf', 'Satyr', 'Orc'],
  Gunslinger: ['Human', 'Dwarf', 'Skeleton'],
  Tracker: ['Elf', 'Satyr', 'Orc'],
  Druid: ['Elf', 'Satyr', 'Orc']
};

// Derive races to classes mapping
export const RACE_TO_CLASSES = Object.entries(CLASS_TO_RACES).reduce((acc, [cls, races]) => {
  races.forEach(r => {
    acc[r] = acc[r] || [];
    acc[r].push(cls);
  });
  return acc;
}, {});

// Race colors
export const RACE_COLORS = {
  Human: '#4169E1',    // Royal Blue
  Dwarf: '#8B4513',    // Saddle Brown
  Elf: '#228B22',      // Forest Green
  Orc: '#8B0000',      // Dark Red
  Satyr: '#9932CC',    // Dark Orchid
  Skeleton: '#36454F'  // Charcoal
};

// Class colors
export const CLASS_COLORS = {
  Warrior: '#cd7f32',      // Bronze
  Pyromancer: '#ff4500',   // Red-Orange
  Wizard: '#4169e1',       // Royal Blue
  Assassin: '#2f4f4f',     // Dark Slate Gray
  Rogue: '#708090',        // Slate Gray
  Priest: '#ffd700',       // Gold
  Oracle: '#9370db',       // Medium Purple
  Seer: '#00ced1',         // Dark Turquoise
  Shaman: '#228b22',       // Forest Green
  Gunslinger: '#8b4513',   // Saddle Brown
  Tracker: '#556b2f',      // Dark Olive Green
  Druid: '#006400'         // Dark Green
};