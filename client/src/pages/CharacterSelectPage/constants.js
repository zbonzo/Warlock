/**
 * Constants for the CharacterSelectPage component
 */

/**
 * Race definitions with icons and attributes
 * @type {Array}
 */
export const RACES = [
  { id: 'Artisan', label: 'Artisan', icon: '👤' },
  { id: 'Rockhewn', label: 'Rockhewn', icon: '🧔‍♂️' },
  { id: 'Crestfallen', label: 'Crestfallen', icon: '🧝' },
  { id: 'Orc', label: 'Orc', icon: '👹' },
  { id: 'Kinfolk', label: 'Kinfolk', icon: '👺' },
  { id: 'Lich', label: 'Lich', icon: '💀' },
];

/**
 * Class definitions with icons and colors
 * @type {Array}
 */
export const CLASSES = [
  { id: 'Warrior', label: 'Warrior', icon: '⚔️', color: '#cd7f32' },
  { id: 'Pyromancer', label: 'Pyromancer', icon: '🔥', color: '#ff4500' },
  { id: 'Wizard', label: 'Wizard', icon: '🧙', color: '#4169e1' },
  { id: 'Assassin', label: 'Assassin', icon: '🗡️', color: '#2f4f4f' },
  { id: 'Alchemist', label: 'Alchemist', icon: '👥', color: '#708090' },
  { id: 'Priest', label: 'Priest', icon: '✝️', color: '#ffd700' },
  { id: 'Oracle', label: 'Oracle', icon: '🔮', color: '#9370db' },
  { id: 'Seer', label: 'Seer', icon: '👁️', color: '#00ced1' },
  { id: 'Shaman', label: 'Shaman', icon: '🌪️', color: '#228b22' },
  { id: 'Gunslinger', label: 'Gunslinger', icon: '💥', color: '#8b4513' },
  { id: 'Tracker', label: 'Tracker', icon: '🏹', color: '#556b2f' },
  { id: 'Druid', label: 'Druid', icon: '🌿', color: '#006400' },
];

/**
 * Mapping of classes to compatible races
 * @type {Object}
 */
export const CLASS_TO_RACES = {
  Warrior: ['Artisan', 'Rockhewn', 'Lich'],
  Pyromancer: ['Rockhewn', 'Lich', 'Orc'],
  Wizard: ['Artisan', 'Crestfallen', 'Lich'],
  Assassin: ['Artisan', 'Crestfallen', 'Lich'],
  Alchemist: ['Artisan', 'Crestfallen', 'Kinfolk'],
  Priest: ['Artisan', 'Rockhewn', 'Lich'],
  Oracle: ['Rockhewn', 'Kinfolk', 'Orc'],
  Seer: ['Crestfallen', 'Kinfolk', 'Orc'],
  Shaman: ['Rockhewn', 'Kinfolk', 'Orc'],
  Gunslinger: ['Artisan', 'Rockhewn', 'Lich'],
  Tracker: ['Crestfallen', 'Kinfolk', 'Orc'],
  Druid: ['Crestfallen', 'Kinfolk', 'Orc'],
};

/**
 * Get the compatible classes for a specific race
 *
 * @param {string} race - Race ID
 * @returns {Array} Array of compatible class IDs
 */
export function getCompatibleClasses(race) {
  return Object.entries(CLASS_TO_RACES)
    .filter(([_, races]) => races.includes(race))
    .map(([classId, _]) => classId);
}

/**
 * Get the compatible races for a specific class
 *
 * @param {string} classId - Class ID
 * @returns {Array} Array of compatible race IDs
 */
export function getCompatibleRaces(classId) {
  return CLASS_TO_RACES[classId] || [];
}

/**
 * Check if a race and class combination is valid
 *
 * @param {string} race - Race ID
 * @param {string} classId - Class ID
 * @returns {boolean} Whether the combination is valid
 */
export function isValidCombination(race, classId) {
  return CLASS_TO_RACES[classId]?.includes(race) || false;
}

