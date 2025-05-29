/**
 * @fileoverview Simulation configuration
 * Settings for running game simulations
 */

module.exports = {
  // Default simulation settings
  DEFAULT_GAMES: 10,
  MAX_ROUNDS: 50,

  // Performance settings
  ENABLE_LOGGING: false,
  ENABLE_DETAILED_STATS: false,

  // Game configurations
  FIXED_6_PLAYER_SETUP: [
    { name: 'Warrior', race: 'Human', class: 'Warrior' },
    { name: 'Priest', race: 'Dwarf', class: 'Priest' },
    { name: 'Wizard', race: 'Elf', class: 'Wizard' },
    { name: 'Barbarian', race: 'Orc', class: 'Barbarian' },
    { name: 'Oracle', race: 'Satyr', class: 'Oracle' },
    { name: 'Pyromancer', race: 'Skeleton', class: 'Pyromancer' },
  ],

  // Available races from server config
  AVAILABLE_RACES: ['Human', 'Dwarf', 'Elf', 'Orc', 'Satyr', 'Skeleton'],

  // Available classes from server config
  AVAILABLE_CLASSES: [
    'Warrior',
    'Pyromancer',
    'Wizard',
    'Assassin',
    'Alchemist',
    'Priest',
    'Oracle',
    'Barbarian',
    'Shaman',
    'Gunslinger',
    'Tracker',
    'Druid',
  ],

  // Random game settings (for future use)
  RANDOM_GAME_MIN_PLAYERS: 3,
  RANDOM_GAME_MAX_PLAYERS: 8,

  // Reporting settings
  REPORT_FORMAT: 'console', // 'console' or 'json'
  SAVE_DETAILED_RESULTS: false,
};
