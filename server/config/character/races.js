/**
 * @fileoverview Race configuration and abilities
 * Consolidated race definitions, compatibility, and racial abilities
 */

/**
 * Available player races
 * @type {Array<string>}
 */
const availableRaces = ['Artisan', 'Rockhewn', 'Crestfallen', 'Orc', 'Kinfolk', 'Lich'];

/**
 * Base attributes for each race
 * These modify the player's base stats
 * @type {Object}
 */
const raceAttributes = {
  Artisan: {
    hpModifier: 1.3,
    armorModifier: 1.0,
    damageModifier: 1.0,
    compatibleClasses: [
      'Warrior', // Thematic Score: 8 (Adaptable, soldier-like)
      'Assassin', // Thematic Score: 8 (Versatile, can be stealthy)
      'Alchemist', // Thematic Score: 8 (Intellectual, scientific curiosity)
      'Priest', // Thematic Score: 8 (Common spiritualism)
      'Gunslinger', // Thematic Score: 7 (Adaptable to new tech, skilled marksmanship)
      'Druid', // Thematic Score: 8 (Adaptable, can learn arcane arts) - ADDED to balance Wizard class
    ],
    description:
      'Adaptable and versatile, humans can learn abilities from other classes.',
  },
  Rockhewn: {
    hpModifier: 1.3,
    armorModifier: 3.0,
    damageModifier: 0.8,
    compatibleClasses: [
      'Warrior', // Thematic Score: 9 (Sturdy, martial, axe-wielding)
      'Oracle', // Thematic Score: 8 (Ancient knowledge, prophecies from stone)
      'Shaman', // Thematic Score: 8 (Earth connection, ancestral spirits of mountains)
      'Barbarian', // Thematic Score: 9 (Hardy, fierce, unyielding)
      'Pyromancer', // Thematic Score: 8 (Forge fires, molten earth magic)
      'Priest', // Thematic Score: 8 (Devout, traditional)
    ],
    description:
      'Hardy and resilient, dwarves have stone armor that degrades with damage taken.',
  },
  Crestfallen: {
    hpModifier: 1.0,
    armorModifier: 1.0,
    damageModifier: 1.2,
    compatibleClasses: [
      'Assassin', // Thematic Score: 9 (Agile, stealthy, cunning)
      'Alchemist', // Thematic Score: 8 (Nature-attuned, herbalism)
      'Wizard', // Thematic Score: 9 (Inherent magical talent, arcane grace)
      'Tracker', // Thematic Score: 9 (Keen senses, agile, wilderness survival)
      'Druid', // Thematic Score: 10 (Deep connection to nature, guardian of forests)
      'Shaman', // Thematic Score: 8 (Nature spirits, primal magic)
    ],
    description:
      'When wounded (below 50% HP), attacks against you reveal if the attacker is corrupted.',
  },
  Orc: {
    hpModifier: 1.2,
    armorModifier: 1.0,
    damageModifier: 1.6,
    compatibleClasses: [
      'Warrior', // Thematic Score: 10 (Brutal, frontline, iconic warrior)
      'Barbarian', // Thematic Score: 10 (Primal, rage-filled, fierce)
      'Oracle', // Thematic Score: 7 (Primal visions, shamanistic elements)
      'Tracker', // Thematic Score: 8 (Hunter, brutal efficiency)
      'Gunslinger', // Thematic Score: 7 (Brutal efficiency, can be ranged)
      'Pyromancer', // Thematic Score: 9 (Destructive primal magic, fiery temperament)
    ],
    description:
      'Fierce and mighty, orcs can boost their attack power at the cost of health.',
  },
  Kinfolk: {
    hpModifier: 1.0,
    armorModifier: 1.0,
    damageModifier: 1.0,
    compatibleClasses: [
      'Alchemist', // Thematic Score: 9 (Nature-attuned, herbalism, potion crafting)
      'Oracle', // Thematic Score: 9 (Nature's wisdom, prophecy)
      'Shaman', // Thematic Score: 9 (Nature spirits, primal connection)
      'Tracker', // Thematic Score: 9 (Forest dwelling, keen senses)
      'Druid', // Thematic Score: 10 (Deep connection to nature, harmonious)
      'Wizard', // Thematic Score: 7 (Nature magic, less formal than Artisan/Crestfallen wizardry) - ADDED to balance Wizard class
    ],
    description:
      "At the end of each round, heal for 25% of the monster's remaining HP.",
  },
  Lich: {
    hpModifier: 0.9,
    armorModifier: 1.0,
    damageModifier: 2.5,
    compatibleClasses: [
      'Assassin', // Thematic Score: 8 (Silent, unnerving, hard to detect)
      'Priest', // Thematic Score: 6 (Dark priest, necromancy, antithetical to traditional holy themes)
      'Wizard', // Thematic Score: 8 (Dark magic, necromancy)
      'Gunslinger', // Thematic Score: 7 (Unfeeling aim, precise)
      'Barbarian', // Thematic Score: 6 (Undead rage, less primal than living barbarians)
      'Pyromancer', // Thematic Score: 7 (Cold fire, destructive magic, less vital than living pyromancers)
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
  Artisan: {
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

  Rockhewn: {
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
      initialArmor: 8,
      degradationPerHit: 2,
    },
  },

  Crestfallen: {
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

  Kinfolk: {
    type: 'lifeBond',
    name: 'Life Bond',
    description:
      "At the end of each round, heal for 10% of the monster's remaining HP",
    usageLimit: 'passive',
    maxUses: 0,
    cooldown: 0,
    effect: 'lifeBond',
    target: 'Self',
    params: {
      healingPercent: 0.1,
    },
  },

  Lich: {
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

