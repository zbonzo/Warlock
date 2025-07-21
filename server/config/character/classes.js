/**
 * @fileoverview Refactored class configuration with ability references
 * Classes now reference abilities by ID instead of embedding them
 */

const { getAbility } = require('./abilities');

/**
 * Available player classes
 * @type {Array<string>}
 */
const availableClasses = [
  'Alchemist',
  'Assassin',
  'Barbarian',
  'Druid',
  'Gunslinger',
  'Oracle',
  'Priest',
  'Pyromancer',
  'Shaman',
  'Tracker',
  'Warrior',
  'Wizard',
];

/**
 * Class category groupings
 * @type {Object}
 */
const classCategories = {
  Melee: ['Warrior', 'Assassin', 'Alchemist', 'Barbarian'],
  Caster: ['Pyromancer', 'Wizard', 'Priest', 'Oracle', 'Shaman', 'Druid'],
  Ranged: ['Gunslinger', 'Tracker'],
};

/**
 * Base attributes for each class
 * These modify the player's base stats
 * @type {Object}
 */
const classAttributes = {
  Warrior: {
    hpModifier: 1.1,
    armorModifier: 1.5,
    damageModifier: 1.0,
    description: 'Tank class with high health and armor, focused on protection.',
  },
  Pyromancer: {
    hpModifier: 1.0,
    armorModifier: 1.0,
    damageModifier: 1.6,
    description: 'Fire-based caster with high damage output and area effects.',
  },
  Wizard: {
    hpModifier: 1.1,
    armorModifier: 1.3,
    damageModifier: 1.3,
    description: 'Versatile spellcaster with powerful arcane abilities.',
  },
  Assassin: {
    hpModifier: 1.0,
    armorModifier: 1.1,
    damageModifier: 1.5,
    description: 'Stealth-focused class with high single-target damage.',
  },
  Alchemist: {
    hpModifier: 1.2,
    armorModifier: 1.2,
    damageModifier: 1.3,
    description: 'Agile fighter with invisibility abilities and poison attacks.',
  },
  Priest: {
    hpModifier: 1.3,
    armorModifier: 1.4,
    damageModifier: 1.0,
    description: 'Healing-focused class with support abilities.',
  },
  Oracle: {
    hpModifier: 1.1,
    armorModifier: 1.5,
    damageModifier: 1.0,
    description: 'Divination-focused class that can reveal warlocks and manipulate fate.',
  },
  Barbarian: {
    hpModifier: 1.0,
    armorModifier: 1.0,
    damageModifier: 1.6,
    description: 'Barbarian has axe. Barbarian use axe.',
  },
  Shaman: {
    hpModifier: 1.1,
    armorModifier: 1.4,
    damageModifier: 1.2,
    description: 'Elemental caster with healing and lightning abilities.',
  },
  Gunslinger: {
    hpModifier: 1.0,
    armorModifier: 1.2,
    damageModifier: 1.5,
    description: 'Ranged specialist with high damage and evasion abilities.',
  },
  Tracker: {
    hpModifier: 1.2,
    armorModifier: 1.2,
    damageModifier: 1.3,
    description: 'Skilled hunter with traps and precise attacks.',
  },
  Druid: {
    hpModifier: 1.4,
    armorModifier: 1.3,
    damageModifier: 1.0,
    description: 'Nature-focused class with healing and crowd control.',
  },
};

/**
 * Class ability progression - References abilities by ID
 * Each class has exactly 4 abilities that unlock at levels 1-4
 * Format: { level1: 'abilityId', level2: 'abilityId', level3: 'abilityId', level4: 'abilityId' }
 */
const classAbilityProgression = {
  Warrior: {
    level1: 'attack',         // Slash - Basic reliable damage
    level2: 'shieldWall',     // Shield Wall - Heavy armor
    level3: 'bandage',        // Bandage - Self heal
    level4: 'battleCry',      // Battle Cry - Group protection
  },

  Pyromancer: {
    level1: 'fireball',       // Fireball - Fire + DOT
    level2: 'pyroblast',      // Pyroblast - High damage + detection
    level3: 'cauterize',      // Cauterize - Fire-based self heal
    level4: 'infernoBlast',   // Inferno Blast - AOE fire
  },

  Wizard: {
    level1: 'magicMissile',   // Magic Missile - Reliable arcane damage
    level2: 'arcaneShield',   // Arcane Shield - Magical protection
    level3: 'arcaneBarrage',  // Arcane Barrage - Multi-hit
    level4: 'meteorShower',   // Meteor Shower - Ultimate AOE
  },

  Assassin: {
    level1: 'backstab',       // Backstab - High single-target damage
    level2: 'shadowVeil',     // Shadow Veil - Stealth protection
    level3: 'twinStrike',     // Twin Strike - Dual blade attack
    level4: 'deathMark',      // Death Mark - Multi-target execute
  },

  Alchemist: {
    level1: 'poisonStrike',   // Poison Strike - Poison damage
    level2: 'smokeBomb',      // Smoke Bomb - Escape mechanism
    level3: 'shiv',           // Shiv - Bleed attack
    level4: 'poisonTrap',     // Poison Trap - Defensive utility
  },

  Priest: {
    level1: 'holyBolt',       // Holy Bolt - Divine damage
    level2: 'swiftMend',      // Swift Mend - Quick heal
    level3: 'heal',           // Heal - Powerful healing
    level4: 'divineShield',   // Divine Shield - Protect others
  },

  Oracle: {
    level1: 'psychicBolt',    // Psychic Bolt - Mental damage
    level2: 'fatesEye',       // Eye of Fate - Warlock detection
    level3: 'spiritGuard',    // Spirit Guard - Damage reduction
    level4: 'sanctuaryOfTruth', // Sanctuary - Group protection
  },

  Barbarian: {
    level1: 'recklessStrike', // Reckless Strike - High risk/reward
    level2: 'relentlessFury', // Relentless Fury - Passive scaling
    level3: 'thirstyBlade',   // Thirsty Blade - Lifesteal
    level4: 'sweepingStrike', // Sweeping Strike - AOE melee
  },

  Shaman: {
    level1: 'lightningBolt',  // Lightning Bolt - Nature magic
    level2: 'totemShield',    // Totemic Barrier - Protection
    level3: 'ancestralHeal',  // Ancestral Heal - HoT healing
    level4: 'chainLightning', // Chain Lightning - AOE lightning
  },

  Gunslinger: {
    level1: 'pistolShot',     // Pistol Shot - Quick ranged damage
    level2: 'smokeScreen',    // Smoke Screen - Tactical stealth
    level3: 'aimedShot',      // Aimed Shot - Precise + vulnerability
    level4: 'ricochetRound',  // Ricochet Round - AOE gunplay
  },

  Tracker: {
    level1: 'preciseShot',    // Precise Shot - Accurate ranged
    level2: 'camouflage',     // Camouflage - Long stealth
    level3: 'barbedArrow',    // Barbed Arrow - Bleed ranged
    level4: 'controlMonster', // Control Animal - Monster manipulation
  },

  Druid: {
    level1: 'clawSwipe',      // Claw Swipe - Natural weapon
    level2: 'barkskin',       // Barkskin - Natural armor
    level3: 'rejuvenation',   // Rejuvenation - Nature healing
    level4: 'entangle',       // Entangling Roots - Crowd control
  },
};

/**
 * Get class abilities by level
 * @param {string} className - Name of the class
 * @param {number} maxLevel - Maximum level to get abilities for (1-4)
 * @returns {Array<Object>} Array of ability objects with unlockAt property
 */
function getClassAbilities(className, maxLevel = 4) {
  const progression = classAbilityProgression[className];
  if (!progression) {
    return [];
  }

  const abilities = [];
  for (let level = 1; level <= Math.min(maxLevel, 4); level++) {
    const abilityId = progression[`level${level}`];
    if (abilityId) {
      const ability = getAbility(abilityId);
      if (ability) {
        abilities.push({
          ...ability,
          unlockAt: level,
          type: ability.id // Maintain compatibility with existing code
        });
      }
    }
  }

  return abilities;
}

/**
 * Get all abilities for a class (levels 1-4)
 * @param {string} className - Name of the class
 * @returns {Array<Object>} Array of all class abilities
 */
function getAllClassAbilities(className) {
  return getClassAbilities(className, 4);
}

/**
 * Get ability IDs for a class by level
 * @param {string} className - Name of the class
 * @param {number} level - Specific level (1-4)
 * @returns {string|null} Ability ID for that level
 */
function getClassAbilityForLevel(className, level) {
  const progression = classAbilityProgression[className];
  if (!progression || level < 1 || level > 4) {
    return null;
  }
  return progression[`level${level}`] || null;
}

/**
 * Validate that all referenced abilities exist
 * @returns {Object} Validation result with any missing abilities
 */
function validateClassAbilities() {
  const missing = [];
  const warnings = [];

  for (const [className, progression] of Object.entries(classAbilityProgression)) {
    for (let level = 1; level <= 4; level++) {
      const abilityId = progression[`level${level}`];
      if (!abilityId) {
        warnings.push(`${className} missing ability for level ${level}`);
        continue;
      }
      
      const ability = getAbility(abilityId);
      if (!ability) {
        missing.push(`${className} level ${level}: ability '${abilityId}' not found`);
      }
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
}

module.exports = {
  availableClasses,
  classCategories,
  classAttributes,
  classAbilityProgression,
  
  // Helper functions
  getClassAbilities,
  getAllClassAbilities,
  getClassAbilityForLevel,
  validateClassAbilities,
  
  // Legacy compatibility - will be removed in future version
  get classAbilities() {
    console.warn('classAbilities is deprecated. Use getClassAbilities() instead.');
    const legacy = {};
    for (const className of availableClasses) {
      legacy[className] = getAllClassAbilities(className);
    }
    return legacy;
  }
};