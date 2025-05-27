/**
 * @fileoverview Race configuration and abilities
 * Consolidated race definitions, compatibility, and racial abilities
 */

/**
 * Available player races
 * @type {Array<string>}
 */
const availableRaces = ['Human', 'Dwarf', 'Elf', 'Orc', 'Satyr', 'Skeleton'];

/**
 * Base attributes for each race
 * These modify the player's base stats
 * @type {Object}
 */
const raceAttributes = {
  Human: {
    hpModifier: 1.3, // Standard HP
    armorModifier: 1.0, // No armor bonus
    damageModifier: 1.0, // Standard damage
    compatibleClasses: [
      'Warrior',
      'Wizard',
      'Assassin',
      'Alchemist',
      'Priest',
      'Gunslinger',
      'Barbarian', // Added Barbarian
    ],
    description:
      'Adaptable and versatile, humans can learn abilities from other classes.',
  },
  Dwarf: {
    hpModifier: 1.5, // More HP
    armorModifier: 5.0, // Significant armor bonus
    damageModifier: 0.9, // Slightly reduced damage
    compatibleClasses: [
      'Warrior',
      'Pyromancer',
      'Priest',
      'Oracle',
      'Shaman',
      'Gunslinger',
      'Barbarian', // Added Barbarian
    ],
    description:
      'Hardy and resilient, dwarves have stone armor that degrades with damage taken.',
  },
  Elf: {
    hpModifier: 1.0, // Less HP
    armorModifier: 1.0, // No armor bonus
    damageModifier: 1.2, // Increased damage
    compatibleClasses: [
      'Wizard',
      'Assassin',
      'Alchemist',
      'Tracker',
      'Druid',
      // Removed Seer
    ],
    description:
      'When wounded (below 50% HP), attacks against you reveal if the attacker is corrupted.',
  },
  Orc: {
    hpModifier: 1.2, // More HP
    armorModifier: 1.0, // No armor bonus
    damageModifier: 1.6, // Significantly increased damage
    compatibleClasses: [
      'Pyromancer',
      'Oracle',
      'Shaman',
      'Tracker',
      'Druid',
      'Barbarian', // Added Barbarian
      // Removed Seer
    ],
    description:
      'Fierce and mighty, orcs can boost their attack power at the cost of health.',
  },
  Satyr: {
    hpModifier: 1.3, // Standard HP
    armorModifier: 1.0, // No armor bonus
    damageModifier: 1.2, // Standard damage
    compatibleClasses: [
      'Alchemist',
      'Oracle',
      'Shaman',
      'Tracker',
      'Druid',
      // Removed Seer
    ],
    description:
      "At the end of each round, heal for 25% of the monster's remaining HP.",
  },
  Skeleton: {
    hpModifier: 0.8, // Less HP
    armorModifier: 0.8, // No armor bonus
    damageModifier: 2.0, // Glass Cannon damage
    compatibleClasses: [
      'Warrior',
      'Pyromancer',
      'Wizard',
      'Assassin',
      'Priest',
      'Gunslinger',
      'Barbarian', // Added Barbarian
    ],
    description:
      'Undead and resilient, skeletons can return to life once after being defeated.',
  },
};

/**
 * Racial abilities for each race
 * @type {Object}
 */
const racialAbilities = {
  Human: {
    type: 'adaptability',
    name: 'Adaptability',
    description:
      'Change one of your class abilities to another of the same level for the remainder of the game',
    usageLimit: 'perGame',
    maxUses: 1,
    cooldown: 0,
    effect: 'changeAbility',
    target: 'Self',
    params: {},
  },

  Dwarf: {
    type: 'stoneArmor',
    name: 'Stone Armor',
    description:
      'Start with 10 armor that degrades by 1 with each hit taken. Can go negative for increased vulnerability.',
    usageLimit: 'passive', // Passive ability, always active
    maxUses: 0,
    cooldown: 0,
    effect: 'stoneArmor',
    target: 'Self',
    params: {
      initialArmor: 10,
      degradationPerHit: 1,
    },
  },

  Elf: {
    type: 'moonbeam',
    name: 'Moonbeam',
    description:
      'When wounded (below 50% HP), attacks against you reveal if the attacker is corrupted',
    usageLimit: 'passive', // Passive ability, always active when conditions are met
    maxUses: 0,
    cooldown: 0,
    effect: 'moonbeam',
    target: 'Self',
    params: {
      healthThreshold: 0.5, // Triggers when below 50% HP
    },
  },

  Orc: {
    type: 'bloodRage',
    name: 'Blood Rage',
    description:
      'Double the damage of your next attack, but take 10 damage yourself',
    usageLimit: 'perGame',
    maxUses: 1,
    cooldown: 0,
    effect: 'doubleDamage',
    target: 'Self',
    params: { selfDamage: 10 },
  },

  Satyr: {
    type: 'lifeBond',
    name: 'Life Bond',
    description:
      "At the end of each round, heal for 25% of the monster's remaining HP",
    usageLimit: 'passive', // Passive ability, always active
    maxUses: 0,
    cooldown: 0,
    effect: 'lifeBond',
    target: 'Self',
    params: {
      healingPercent: 0.25, // 25% of monster's current HP
    },
  },

  Skeleton: {
    type: 'undying',
    name: 'Undying',
    description: 'Return to 1 HP the first time you would die',
    usageLimit: 'perGame',
    maxUses: 1,
    cooldown: 0,
    effect: 'resurrect',
    target: 'Self',
    params: { resurrectedHp: 1 },
  },
};

/**
 * Build a reverse mapping of class to compatible races
 * @returns {Object} Class to races mapping
 */
function buildClassRaceCompatibility() {
  const mapping = {};

  for (const [race, attributes] of Object.entries(raceAttributes)) {
    for (const className of attributes.compatibleClasses) {
      if (!mapping[className]) {
        mapping[className] = [];
      }
      mapping[className].push(race);
    }
  }

  return mapping;
}

/**
 * Check if a race-class combination is valid
 * @param {string} race - Race to check
 * @param {string} className - Class to check
 * @returns {boolean} Whether the combination is valid
 */
function isValidCombination(race, className) {
  return raceAttributes[race]?.compatibleClasses.includes(className) || false;
}

/**
 * Get the racial ability for a race
 * @param {string} race - Race name
 * @returns {Object|null} Racial ability or null if not found
 */
function getRacialAbility(race) {
  return racialAbilities[race] || null;
}

// Generate the class-to-race compatibility mapping once at load time
const classRaceCompatibility = buildClassRaceCompatibility();

module.exports = {
  availableRaces,
  raceAttributes,
  racialAbilities,
  classRaceCompatibility,
  isValidCombination,
  getRacialAbility,
};
