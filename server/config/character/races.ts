/**
 * @fileoverview Race configuration and abilities
 * Consolidated race definitions, compatibility, and racial abilities
 */

import type { RacesConfig, RaceAttributes, RacialAbility, UsageLimit, AbilityTarget } from '../schemas/race.schema.js';

/**
 * Available player races
 */
const availableRaces: string[] = [
  'Artisan',
  'Rockhewn',
  'Lich',
  'Orc',
  'Crestfallen',
  'Kinfolk',
];

/**
 * Base attributes for each race
 * These modify the player's base stats
 */
const raceAttributes: Record<string, RaceAttributes> = {
  Artisan: {
    hpModifier: 1.2,
    armorModifier: 1.2,
    damageModifier: 1.3,
    compatibleClasses: [
      'Warrior', // Thematic Score: 8 (Adaptable, soldier-like)
      'Assassin', // Thematic Score: 8 (Versatile, can be stealthy)
      'Alchemist', // Thematic Score: 8 (Intellectual, scientific curiosity)
      'Priest', // Thematic Score: 8 (Common spiritualism)
      'Gunslinger', // Thematic Score: 7 (Adaptable to new tech, skilled marksmanship)
      'Druid', // Thematic Score: 8 (Adaptable, can learn arcane arts) - ADDED to balance Wizard class
    ],
    description:
      'Adaptable and versatile, artisans can learn abilities from other classes.',
  },
  Rockhewn: {
    hpModifier: 1.1,
    armorModifier: 1.5,
    damageModifier: 1.1,
    compatibleClasses: [
      'Warrior', // Thematic Score: 9 (Sturdy, martial, axe-wielding)
      'Oracle', // Thematic Score: 8 (Ancient knowledge, prophecies from stone)
      'Shaman', // Thematic Score: 8 (Earth connection, ancestral spirits of mountains)
      'Barbarian', // Thematic Score: 9 (Hardy, fierce, unyielding)
      'Pyromancer', // Thematic Score: 8 (Forge fires, molten earth magic)
      'Priest', // Thematic Score: 8 (Devout, traditional)
    ],
    description:
      'Stone-hearted dwarves with exceptional durability and resistance.',
  },
  Lich: {
    hpModifier: 0.8,
    armorModifier: 0.8,
    damageModifier: 1.4,
    compatibleClasses: [
      'Wizard', // Thematic Score: 10 (Perfect match - undead mage)
      'Oracle', // Thematic Score: 9 (Death foresight, ancient knowledge)
      'Shaman', // Thematic Score: 9 (Spirit world connection, death magic)
      'Pyromancer', // Thematic Score: 9 (Destructive primal magic, fiery temperament)
    ],
    description:
      'Undead spellcasters with powerful magic but fragile forms.',
  },
  Orc: {
    hpModifier: 1.3,
    armorModifier: 1.1,
    damageModifier: 1.4,
    compatibleClasses: [
      'Barbarian', // Thematic Score: 10 (Perfect match - savage warrior)
      'Warrior', // Thematic Score: 9 (Strong, martial, aggressive)
      'Gunslinger', // Thematic Score: 7 (Aggressive, can adapt to ranged combat)
      'Assassin', // Thematic Score: 8 (Brutal, can be stealthy hunters)
      'Shaman', // Thematic Score: 8 (Tribal spirituality, primal magic)
    ],
    description:
      'Fierce warriors with incredible strength and battle fury.',
  },
  Crestfallen: {
    hpModifier: 0.9,
    armorModifier: 0.9,
    damageModifier: 1.2,
    compatibleClasses: [
      'Oracle', // Thematic Score: 10 (Perfect match - cursed with foresight)
      'Priest', // Thematic Score: 9 (Seeking redemption, divine connection)
      'Wizard', // Thematic Score: 8 (Studious, seeking answers through magic)
      'Alchemist', // Thematic Score: 8 (Seeking solutions, experimental)
      'Assassin', // Thematic Score: 7 (Shadow affinity, operates alone)
      'Shaman', // Thematic Score: 8 (Spirit connection, seeking guidance)
    ],
    description:
      'Cursed beings who can see through deception but suffer from their fate.',
  },
  Kinfolk: {
    hpModifier: 1.4,
    armorModifier: 1.1,
    damageModifier: 1.0,
    compatibleClasses: [
      'Druid', // Thematic Score: 10 (Perfect match - nature connection)
      'Shaman', // Thematic Score: 9 (Nature spirits, earth connection)
      'Tracker', // Thematic Score: 9 (Nature knowledge, hunting skills)
      'Priest', // Thematic Score: 8 (Healing focus, spiritual)
      'Barbarian', // Thematic Score: 8 (Primal, nature-based fury)
      'Oracle', // Thematic Score: 8 (Nature wisdom, foresight)
    ],
    description:
      'Nature-bonded people who draw strength from the living world around them.',
  },
};

/**
 * Racial abilities for each race
 * Each race gets exactly one unique racial ability
 */
const racialAbilities: Record<string, RacialAbility> = {
  Artisan: {
    type: 'adaptability',
    name: 'Adaptability',
    description:
      'Once per game, copy any ability used by another player in the previous round',
    usageLimit: 'perGame',
    maxUses: 1,
    cooldown: 0,
    effect: 'copyAbility',
    target: 'Self',
    params: {},
  },

  Rockhewn: {
    type: 'stoneArmor',
    name: 'Stone Armor',
    description:
      'Reduce all incoming damage by 3 points (minimum 1 damage taken)',
    usageLimit: 'passive',
    maxUses: 0,
    cooldown: 0,
    effect: 'damageReduction',
    target: 'Self',
    params: {
      reduction: 3,
      minimumDamage: 1,
    },
  },

  Crestfallen: {
    type: 'moonbeam',
    name: 'Moonbeam',
    description:
      'When wounded (below 50% HP), attacks against you reveal if the attacker is corrupted',
    usageLimit: 'passive',
    maxUses: 0,
    cooldown: 0,
    effect: 'moonbeam',
    target: 'Self',
    params: {
      healthThreshold: 0.5,
    },
  },

  Orc: {
    type: 'bloodRage',
    name: 'Blood Rage',
    description:
      'Double the damage of your next attack, but take 10 damage yourself',
    usageLimit: 'perGame',
    maxUses: 3,
    cooldown: 3,
    effect: 'doubleDamage',
    target: 'Self',
    params: { selfDamage: 10 },
  },

  Kinfolk: {
    type: 'lifeBond',
    name: 'Life Bond',
    description:
      "At the end of each round, heal for 5% of the monster's remaining HP",
    usageLimit: 'passive',
    maxUses: 0,
    cooldown: 0,
    effect: 'lifeBond',
    target: 'Self',
    params: {
      healingPercent: 0.05,
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
 */
function buildClassRaceCompatibility(): Record<string, string[]> {
  const mapping: Record<string, string[]> = {};

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
 */
export function isValidCombination(race: string, className: string): boolean {
  return raceAttributes[race]?.compatibleClasses.includes(className) || false;
}

/**
 * Get the racial ability for a race
 */
export function getRacialAbility(race: string): RacialAbility | null {
  return racialAbilities[race] || null;
}

// Generate the class-to-race compatibility mapping once at load time
const classRaceCompatibility = buildClassRaceCompatibility();

export {
  availableRaces,
  raceAttributes,
  racialAbilities,
  classRaceCompatibility,
};

export type {
  RacesConfig,
  RaceAttributes,
  RacialAbility,
  UsageLimit,
  AbilityTarget,
};