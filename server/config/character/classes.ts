/**
 * @fileoverview Refactored class configuration with ability references
 * Classes now reference abilities by ID instead of embedding them
 */

import { getAbility } from './abilities.js';
import type { Ability } from '../schemas/ability.schema.js';
import type { ClassesConfig, ClassAttributes, AbilityProgression, ClassCategory } from '../schemas/class.schema.js';

/**
 * Available player classes
 */
const availableClasses: string[] = [
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
 */
const classCategories: Record<ClassCategory, string[]> = {
  Melee: ['Warrior', 'Assassin', 'Alchemist', 'Barbarian'],
  Caster: ['Pyromancer', 'Wizard', 'Priest', 'Oracle', 'Shaman', 'Druid'],
  Ranged: ['Gunslinger', 'Tracker'],
};

/**
 * Base attributes for each class
 * These modify the player's base stats
 */
const classAttributes: Record<string, ClassAttributes> = {
  Warrior: {
    hpModifier: 1.1,
    armorModifier: 1.5,
    damageModifier: 1.0,
    description: 'Tank class with high health and armor, focused on protection.',
  },
  Pyromancer: {
    hpModifier: 1.0,
    armorModifier: 1.0,
    damageModifier: 1.3,
    description: 'Fire specialist with high damage and burning effects.',
  },
  Wizard: {
    hpModifier: 0.9,
    armorModifier: 0.8,
    damageModifier: 1.4,
    description: 'Arcane spellcaster with powerful magical abilities.',
  },
  Assassin: {
    hpModifier: 0.8,
    armorModifier: 0.9,
    damageModifier: 1.6,
    description: 'High damage dealer with stealth and critical strikes.',
  },
  Priest: {
    hpModifier: 1.2,
    armorModifier: 1.1,
    damageModifier: 0.9,
    description: 'Support class focused on healing and protection.',
  },
  Barbarian: {
    hpModifier: 1.3,
    armorModifier: 1.2,
    damageModifier: 1.2,
    description: 'Berserker with high health and rage-based abilities.',
  },
  Shaman: {
    hpModifier: 1.1,
    armorModifier: 1.0,
    damageModifier: 1.1,
    description: 'Spiritual healer with elemental magic and totems.',
  },
  Oracle: {
    hpModifier: 0.9,
    armorModifier: 0.8,
    damageModifier: 1.2,
    description: 'Mystic with foresight abilities and divine magic.',
  },
  Alchemist: {
    hpModifier: 1.0,
    armorModifier: 1.0,
    damageModifier: 1.1,
    description: 'Versatile support with potions and chemical warfare.',
  },
  Gunslinger: {
    hpModifier: 0.9,
    armorModifier: 0.9,
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
const classAbilityProgression: Record<string, AbilityProgression> = {
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

  Priest: {
    level1: 'heal',           // Heal - Basic restoration
    level2: 'holyShield',     // Holy Shield - Divine protection
    level3: 'massHeal',       // Mass Heal - Group healing
    level4: 'divineBlessing', // Divine Blessing - Ultimate protection
  },

  Barbarian: {
    level1: 'rage',           // Rage - Damage boost + vulnerability
    level2: 'bloodthirst',    // Bloodthirst - Lifesteal attack
    level3: 'intimidate',     // Intimidate - Fear/stun effect
    level4: 'berserkerFury',  // Berserker Fury - Ultimate rage
  },

  Shaman: {
    level1: 'lightningBolt',  // Lightning Bolt - Elemental damage
    level2: 'earthShield',    // Earth Shield - Nature protection
    level3: 'spiritLink',     // Spirit Link - Damage sharing
    level4: 'chainLightning', // Chain Lightning - Multi-target
  },

  Oracle: {
    level1: 'foresight',      // Foresight - Dodge/evasion boost
    level2: 'divination',     // Divination - Information gathering
    level3: 'timeWarp',       // Time Warp - Action manipulation
    level4: 'prophecy',       // Prophecy - Ultimate prediction
  },

  Alchemist: {
    level1: 'acidSplash',     // Acid Splash - DOT damage
    level2: 'healingPotion',  // Healing Potion - Self restoration
    level3: 'poisonBomb',     // Poison Bomb - AOE poison
    level4: 'transmutation',  // Transmutation - Resource manipulation
  },

  Gunslinger: {
    level1: 'quickDraw',      // Quick Draw - Fast ranged attack
    level2: 'ricochet',       // Ricochet - Bouncing shot
    level3: 'fanning',        // Fanning - Multiple shots
    level4: 'deadEye',        // Dead Eye - Perfect accuracy shot
  },

  Tracker: {
    level1: 'huntersMark',    // Hunter's Mark - Target marking
    level2: 'trap',           // Trap - Area control
    level3: 'animalCompanion', // Animal Companion - Pet summon
    level4: 'masterHunter',   // Master Hunter - Ultimate tracking
  },

  Druid: {
    level1: 'entangle',       // Entangle - Nature crowd control
    level2: 'barkskin',       // Barkskin - Natural armor
    level3: 'regeneration',   // Regeneration - Healing over time
    level4: 'shapeshift',     // Shapeshift - Form transformation
  },
};

interface ValidationResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Get all abilities for a specific class as ability objects
 */
export function getClassAbilities(className: string): Ability[] {
  const progression = classAbilityProgression[className];
  if (!progression) {
    console.warn(`No ability progression found for class: ${className}`);
    return [];
  }

  const abilities: Ability[] = [];
  const levels = ['level1', 'level2', 'level3', 'level4'] as const;

  for (const level of levels) {
    const abilityId = progression[level];
    const ability = getAbility(abilityId);
    if (ability) {
      abilities.push(ability);
    } else {
      console.warn(`Ability '${abilityId}' not found for class '${className}' at ${level}`);
    }
  }

  return abilities;
}

/**
 * Get all abilities for a class with their unlock levels
 */
export function getAllClassAbilities(className: string): Array<{ ability: Ability; unlockAt: number }> {
  const progression = classAbilityProgression[className];
  if (!progression) {
    return [];
  }

  const result: Array<{ ability: Ability; unlockAt: number }> = [];
  const levels = [
    { key: 'level1' as const, unlockAt: 1 },
    { key: 'level2' as const, unlockAt: 2 },
    { key: 'level3' as const, unlockAt: 3 },
    { key: 'level4' as const, unlockAt: 4 },
  ];

  for (const { key, unlockAt } of levels) {
    const abilityId = progression[key];
    const ability = getAbility(abilityId);
    if (ability) {
      result.push({ ability, unlockAt });
    }
  }

  return result;
}

/**
 * Get specific ability for a class at a given level
 */
export function getClassAbilityForLevel(className: string, level: number): Ability | null {
  const progression = classAbilityProgression[className];
  if (!progression) {
    return null;
  }

  const levelKey = `level${level}` as keyof AbilityProgression;
  const abilityId = progression[levelKey];

  if (!abilityId) {
    return null;
  }

  return getAbility(abilityId);
}

/**
 * Validate that all class abilities exist in the abilities registry
 */
export function validateClassAbilities(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const className of availableClasses) {
    const progression = classAbilityProgression[className];
    if (!progression) {
      missing.push(`Missing ability progression for class: ${className}`);
      continue;
    }

    const levels = ['level1', 'level2', 'level3', 'level4'] as const;
    for (const level of levels) {
      const abilityId = progression[level];
      if (!abilityId) {
        missing.push(`Missing ability ID for class ${className} at ${level}`);
        continue;
      }

      const ability = getAbility(abilityId);
      if (!ability) {
        missing.push(`Ability '${abilityId}' not found for class '${className}' at ${level}`);
      }
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
}

export {
  availableClasses,
  classCategories,
  classAttributes,
  classAbilityProgression,
};

export type {
  ClassesConfig,
  ClassAttributes,
  AbilityProgression,
  ClassCategory,
  ValidationResult,
};
