/**
 * @fileoverview Balance configuration for races and classes
 * Defines base stats and modifiers for player characters
 */

/**
 * Base stats configuration for races and classes
 * 
 * HP: Base hitpoints for the race/class
 * armor: Natural armor (damage reduction percentage = armor * 0.1)
 * hpMod: HP modifier multiplier (applied to the base class HP)
 * armorMod: Additional armor on top of base armor
 * damageMod: Damage modifier multiplier (affects all attack abilities)
 */

/**
 * Base HP values for classes
 * @type {Object}
 */
const CLASS_BASE_STATS = {
  Warrior: {
    hp: 100,
    armor: 1,
    damageMod: 1.0,
    description: "Tanky melee fighters with high HP"
  },
  Pyromancer: {
    hp: 80,
    armor: 0,
    damageMod: 1.2,
    description: "High damage fire specialists"
  },
  Wizard: {
    hp: 70,
    armor: 0,
    damageMod: 1.1,
    description: "Versatile magic users with AOE spells"
  },
  Assassin: {
    hp: 70,
    armor: 0,
    damageMod: 1.3,
    description: "Highest single-target damage with low HP"
  },
  Rogue: {
    hp: 80,
    armor: 0,
    damageMod: 1.0,
    description: "Stealthy fighters with poison attacks"
  },
  Priest: {
    hp: 70,
    armor: 0,
    damageMod: 0.8,
    description: "Healers with protective abilities"
  },
  Oracle: {
    hp: 75,
    armor: 0,
    damageMod: 0.9,
    description: "Prophetic spellcasters with protective abilities"
  },
  Seer: {
    hp: 70,
    armor: 0,
    damageMod: 0.9,
    description: "Mystic support with detection abilities"
  },
  Shaman: {
    hp: 80,
    armor: 0,
    damageMod: 1.0,
    description: "Versatile tribal casters with AOE abilities"
  },
  Gunslinger: {
    hp: 75,
    armor: 0,
    damageMod: 1.1,
    description: "Ranged fighters with multi-target capabilities"
  },
  Tracker: {
    hp: 85,
    armor: 0,
    damageMod: 0.9,
    description: "Nature-attuned hunters with stealth abilities"
  },
  Druid: {
    hp: 85,
    armor: 0,
    damageMod: 0.9,
    description: "Nature spellcasters with healing and control"
  }
};

/**
 * Race bonuses/modifiers
 * @type {Object}
 */
const RACE_MODIFIERS = {
  Human: {
    hpMod: 1.1,     // +10% HP
    armorMod: 3,    // No armor bonus
    damageMod: 1.1, // +10% damage
    description: "Versatile and adaptable with bonuses to HP and damage"
  },
  Dwarf: {
    hpMod: .2,     // Standard HP
    armorMod: 3,    // +2 armor
    damageMod: 1.0, // Standard damage
    description: "Stone Armor provides high defense but degrades with each hit"
  },
  Elf: {
    hpMod: 0.9,     // -10% HP
    armorMod: 3,    // No armor bonus
    damageMod: 1.2, // +20% damage
    description: "Naturally agile and powerful, but less sturdy"
  },
  Orc: {
    hpMod: 1.2,     // +20% HP
    armorMod: 3,    // No armor bonus 
    damageMod: 1.0, // Standard damage
    description: "Naturally tough with high HP"
  },
  Satyr: {
    hpMod: 1.0,     // Standard HP
    armorMod: 3,    // No armor bonus
    damageMod: 1.1, // +10% damage
    description: "Nimble forest dwellers with damage bonuses"
  },
  Skeleton: {
    hpMod: 0.8,     // -20% HP
    armorMod: 4,    // +1 armor
    damageMod: 1.1, // +10% damage
    description: "Undead with low HP but natural armor and damage"
  }
};

/**
 * Calculate final stats for a race+class combination
 * @param {string} race - Race name
 * @param {string} className - Class name
 * @returns {Object|null} Calculated stats or null if invalid combination
 */
function calculateStats(race, className) {
  if (!RACE_MODIFIERS[race] || !CLASS_BASE_STATS[className]) {
    return null;
  }

  const raceModifiers = RACE_MODIFIERS[race];
  const classBase = CLASS_BASE_STATS[className];
  
  return {
    maxHp: Math.floor(classBase.hp * raceModifiers.hpMod),
    armor: classBase.armor + raceModifiers.armorMod,
    damageMod: parseFloat((classBase.damageMod * raceModifiers.damageMod).toFixed(2))
  };
}

module.exports = {
  CLASS_BASE_STATS,
  RACE_MODIFIERS,
  calculateStats
};