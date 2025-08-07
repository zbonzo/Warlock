/**
 * @fileoverview Centralized ability definitions
 * All abilities are defined here and referenced by classes
 */

import type { Ability, AbilitiesMap } from '../schemas/ability.schema.js';

/**
 * Master ability registry containing all abilities in the game
 * Abilities can be referenced by their ID from classes or other systems
 * 
 * Structure:
 * - id: Unique identifier (same as type)
 * - name: Display name
 * - category: Attack, Defense, Heal, or Special
 * - effect: Status effect applied (if any)
 * - target: Single, Self, or Multi
 * - params: Parameters for the ability
 * - order: Execution order (lower = earlier)
 * - cooldown: Rounds before reuse
 * - flavorText: Description text
 * - tags: For filtering/categorization
 */
const abilities: AbilitiesMap = {
  // ========== ATTACK ABILITIES ==========
  
  // Basic Attacks
  attack: {
    id: 'attack',
    name: 'Slash',
    category: 'Attack',
    effect: null,
    target: 'Single',
    params: { damage: 28 },
    order: 1000,
    cooldown: 0,
    flavorText: 'A swift and decisive blow, honed by countless battles.',
    tags: ['basic', 'melee', 'physical'],
    buttonText: {
      ready: 'Draw Blade',
      submitted: 'Strike Ready'
    }
  },

  fireball: {
    id: 'fireball',
    name: 'Fireball',
    category: 'Attack',
    effect: 'poison',
    target: 'Single',
    params: { damage: 22, poison: { damage: 22, turns: 1 } },
    order: 1010,
    cooldown: 0,
    flavorText: 'A blazing orb that ignites and continues burning your foe.',
    tags: ['ranged', 'fire', 'damage-over-time'],
    buttonText: {
      ready: 'Ignite',
      submitted: 'Flames Ready'
    }
  },

  lightning: {
    id: 'lightning',
    name: 'Lightning Strike',
    category: 'Attack',
    effect: null,
    target: 'Single',
    params: { damage: 30 },
    order: 1020,
    cooldown: 0,
    flavorText: 'Channel the fury of the storm into a devastating electrical attack.',
    tags: ['ranged', 'lightning', 'instant'],
    buttonText: {
      ready: 'Channel Storm',
      submitted: 'Lightning Ready'
    }
  },

  arcaneBlast: {
    id: 'arcaneBlast',
    name: 'Arcane Blast',
    category: 'Attack',
    effect: null,
    target: 'Single',
    params: { damage: 26 },
    order: 1030,
    cooldown: 0,
    flavorText: 'Pure magical energy tears through reality to strike your target.',
    tags: ['ranged', 'arcane', 'magical'],
    buttonText: {
      ready: 'Weave Magic',
      submitted: 'Arcane Ready'
    }
  },

  // Multi-target Attacks
  blizzard: {
    id: 'blizzard',
    name: 'Blizzard',
    category: 'Attack',
    effect: null,
    target: 'Multi',
    params: { damage: 18 },
    order: 1040,
    cooldown: 0,
    flavorText: 'Summon a devastating ice storm that engulfs all enemies.',
    tags: ['area', 'ice', 'multi-target'],
    buttonText: {
      ready: 'Freeze All',
      submitted: 'Blizzard Ready'
    }
  },

  earthquake: {
    id: 'earthquake',
    name: 'Earthquake',
    category: 'Attack',
    effect: null,
    target: 'Multi',
    params: { damage: 16 },
    order: 1050,
    cooldown: 0,
    flavorText: 'Shake the very foundations of the earth beneath your enemies.',
    tags: ['area', 'earth', 'multi-target'],
    buttonText: {
      ready: 'Shake Earth',
      submitted: 'Quake Ready'
    }
  },

  meteor: {
    id: 'meteor',
    name: 'Meteor',
    category: 'Attack',
    effect: null,
    target: 'Multi',
    params: { damage: 20 },
    order: 1060,
    cooldown: 0,
    flavorText: 'Call down celestial devastation upon all who oppose you.',
    tags: ['area', 'fire', 'multi-target', 'celestial'],
    buttonText: {
      ready: 'Call Meteor',
      submitted: 'Meteor Ready'
    }
  },

  // Damage over Time Attacks
  inferno: {
    id: 'inferno',
    name: 'Inferno',
    category: 'Attack',
    effect: 'poison',
    target: 'Single',
    params: { damage: 18, poison: { damage: 18, turns: 2 } },
    order: 1070,
    cooldown: 0,
    flavorText: 'Engulf your target in flames that burn long after the initial strike.',
    tags: ['fire', 'damage-over-time', 'persistent'],
    buttonText: {
      ready: 'Engulf',
      submitted: 'Inferno Ready'
    }
  },

  poisonDart: {
    id: 'poisonDart',
    name: 'Poison Dart',
    category: 'Attack',
    effect: 'poison',
    target: 'Single',
    params: { damage: 12, poison: { damage: 20, turns: 2 } },
    order: 1080,
    cooldown: 0,
    flavorText: 'A precisely aimed dart coated with deadly toxin.',
    tags: ['ranged', 'poison', 'damage-over-time'],
    buttonText: {
      ready: 'Aim Dart',
      submitted: 'Poison Ready'
    }
  },

  acidSplash: {
    id: 'acidSplash',
    name: 'Acid Splash',
    category: 'Attack',
    effect: 'poison',
    target: 'Single',
    params: { damage: 15, poison: { damage: 15, turns: 3 } },
    order: 1090,
    cooldown: 0,
    flavorText: 'Corrosive acid that eats away at flesh and armor alike.',
    tags: ['acid', 'damage-over-time', 'corrosive'],
    buttonText: {
      ready: 'Splash Acid',
      submitted: 'Acid Ready'
    }
  },

  // Bleed Attacks
  bloodBlade: {
    id: 'bloodBlade',
    name: 'Blood Blade',
    category: 'Attack',
    effect: 'bleed',
    target: 'Single',
    params: { damage: 18, bleed: { damage: 16, turns: 2 } },
    order: 1100,
    cooldown: 0,
    flavorText: 'A vicious cut that leaves wounds that refuse to heal.',
    tags: ['melee', 'bleed', 'damage-over-time'],
    buttonText: {
      ready: 'Draw Blood',
      submitted: 'Blade Ready'
    }
  },

  lacerate: {
    id: 'lacerate',
    name: 'Lacerate',
    category: 'Attack',
    effect: 'bleed',
    target: 'Single',
    params: { damage: 20, bleed: { damage: 12, turns: 3 } },
    order: 1110,
    cooldown: 0,
    flavorText: 'Tear through flesh with surgical precision.',
    tags: ['melee', 'bleed', 'precise'],
    buttonText: {
      ready: 'Slice Deep',
      submitted: 'Lacerate Ready'
    }
  },

  // Vulnerability Attacks
  weakenStrike: {
    id: 'weakenStrike',
    name: 'Weaken Strike',
    category: 'Attack',
    effect: 'vulnerable',
    target: 'Single',
    params: { damage: 20, vulnerability: { damageIncrease: 1.5, turns: 2 } },
    order: 1120,
    cooldown: 0,
    flavorText: 'Strike vital points to leave your enemy exposed to further attacks.',
    tags: ['debuff', 'tactical', 'vulnerability'],
    buttonText: {
      ready: 'Target Weakness',
      submitted: 'Weaken Ready'
    }
  },

  // ========== DEFENSE ABILITIES ==========

  // Shields and Barriers
  shield: {
    id: 'shield',
    name: 'Shield',
    category: 'Defense',
    effect: 'shielded',
    target: 'Self',
    params: { absorption: 20, duration: 3 },
    order: 50,
    cooldown: 0,
    flavorText: 'Conjure a protective barrier of pure energy around yourself.',
    tags: ['protection', 'defensive', 'self'],
    buttonText: {
      ready: 'Raise Shield',
      submitted: 'Shield Ready'
    }
  },

  barrier: {
    id: 'barrier',
    name: 'Barrier',
    category: 'Defense',
    effect: 'shielded',
    target: 'Self',
    params: { absorption: 30, duration: 2 },
    order: 60,
    cooldown: 0,
    flavorText: 'Create a powerful but temporary magical barrier.',
    tags: ['protection', 'magical', 'temporary'],
    buttonText: {
      ready: 'Cast Barrier',
      submitted: 'Barrier Ready'
    }
  },

  ironSkin: {
    id: 'ironSkin',
    name: 'Iron Skin',
    category: 'Defense',
    effect: 'shielded',
    target: 'Self',
    params: { absorption: 15, duration: 4 },
    order: 70,
    cooldown: 0,
    flavorText: 'Your skin becomes as hard as steel, deflecting incoming blows.',
    tags: ['protection', 'physical', 'duration'],
    buttonText: {
      ready: 'Harden Skin',
      submitted: 'Iron Ready'
    }
  },

  // Invisibility and Evasion
  invisibility: {
    id: 'invisibility',
    name: 'Invisibility',
    category: 'Defense',
    effect: 'invisible',
    target: 'Self',
    params: { duration: 2 },
    order: 80,
    cooldown: 3,
    flavorText: 'Bend light around yourself to become completely invisible.',
    tags: ['stealth', 'evasion', 'magical'],
    buttonText: {
      ready: 'Fade Away',
      submitted: 'Invisible'
    }
  },

  shadowStep: {
    id: 'shadowStep',
    name: 'Shadow Step',
    category: 'Defense',
    effect: 'invisible',
    target: 'Self',
    params: { duration: 1 },
    order: 90,
    cooldown: 2,
    flavorText: 'Step through shadows to avoid the next attack.',
    tags: ['stealth', 'shadow', 'mobility'],
    buttonText: {
      ready: 'Step Shadows',
      submitted: 'Shadow Ready'
    }
  },

  // Special Defenses
  spiritGuard: {
    id: 'spiritGuard',
    name: 'Spirit Guard',
    category: 'Defense',
    effect: 'spiritGuard',
    target: 'Self',
    params: { duration: 3 },
    order: 100,
    cooldown: 4,
    flavorText: 'Ancestral spirits protect you from harm.',
    tags: ['spiritual', 'protection', 'ancestral'],
    buttonText: {
      ready: 'Call Spirits',
      submitted: 'Spirits Ready'
    }
  },

  sanctuary: {
    id: 'sanctuary',
    name: 'Sanctuary',
    category: 'Defense',
    effect: 'sanctuary',
    target: 'Self',
    params: { duration: 2 },
    order: 110,
    cooldown: 5,
    flavorText: 'Create a sacred space where violence cannot touch you.',
    tags: ['sacred', 'protection', 'immunity'],
    buttonText: {
      ready: 'Sacred Ground',
      submitted: 'Sanctuary Ready'
    }
  },

  // ========== HEAL ABILITIES ==========

  // Basic Healing
  heal: {
    id: 'heal',
    name: 'Heal',
    category: 'Heal',
    effect: null,
    target: 'Self',
    params: { healing: 25 },
    order: 200,
    cooldown: 0,
    flavorText: 'Channel healing energy to mend your wounds.',
    tags: ['restoration', 'self-healing', 'basic'],
    buttonText: {
      ready: 'Channel Heal',
      submitted: 'Healing Ready'
    }
  },

  majorHeal: {
    id: 'majorHeal',
    name: 'Major Heal',
    category: 'Heal',
    effect: null,
    target: 'Self',
    params: { healing: 40 },
    order: 210,
    cooldown: 0,
    flavorText: 'A powerful surge of restorative magic.',
    tags: ['restoration', 'powerful', 'self-healing'],
    buttonText: {
      ready: 'Major Healing',
      submitted: 'Major Heal Ready'
    }
  },

  // Healing over Time
  regeneration: {
    id: 'regeneration',
    name: 'Regeneration',
    category: 'Heal',
    effect: 'healingOverTime',
    target: 'Self',
    params: { healing: { amount: 15, turns: 3 } },
    order: 220,
    cooldown: 0,
    flavorText: 'Your body naturally heals over time.',
    tags: ['restoration', 'healing-over-time', 'natural'],
    buttonText: {
      ready: 'Regenerate',
      submitted: 'Regen Ready'
    }
  },

  vitality: {
    id: 'vitality',
    name: 'Vitality',
    category: 'Heal',
    effect: 'healingOverTime',
    target: 'Self',
    params: { healing: { amount: 12, turns: 4 } },
    order: 230,
    cooldown: 0,
    flavorText: 'Feel your life force slowly but steadily return.',
    tags: ['restoration', 'healing-over-time', 'vitality'],
    buttonText: {
      ready: 'Boost Vitality',
      submitted: 'Vitality Ready'
    }
  },

  // ========== SPECIAL ABILITIES ==========

  // Control and Manipulation
  stun: {
    id: 'stun',
    name: 'Stun',
    category: 'Special',
    effect: 'stun',
    target: 'Single',
    params: { duration: 1 },
    order: 300,
    cooldown: 3,
    flavorText: 'Overwhelm your enemy, leaving them unable to act.',
    tags: ['control', 'disable', 'tactical'],
    buttonText: {
      ready: 'Overwhelm',
      submitted: 'Stun Ready'
    }
  },

  deathMark: {
    id: 'deathMark',
    name: 'Death Mark',
    category: 'Special',
    effect: 'deathMark',
    target: 'Single',
    params: { duration: 3, damageMultiplier: 2 },
    order: 310,
    cooldown: 4,
    flavorText: 'Mark your enemy for death - all damage against them is doubled.',
    tags: ['curse', 'damage-amplifier', 'marking'],
    buttonText: {
      ready: 'Mark Death',
      submitted: 'Mark Ready'
    }
  },

  // Life Manipulation
  lifesteal: {
    id: 'lifesteal',
    name: 'Life Steal',
    category: 'Special',
    effect: 'lifesteal',
    target: 'Self',
    params: { lifeSteal: 0.15, duration: 3 },
    order: 150,
    cooldown: 0,
    flavorText: 'Your weapon thirsts for blood and rewards you with vitality.',
    tags: ['lifesteal', 'sustained', 'barbarian'],
    buttonText: {
      ready: 'Blood Pact',
      submitted: 'Blade Hungers'
    }
  },

  controlMonster: {
    id: 'controlMonster',
    name: 'Control Animal',
    category: 'Special',
    effect: 'controlMonster',
    target: 'Self',
    params: { skipChance: 0.5 },
    order: 250,
    cooldown: 6,
    flavorText: 'Bend the beast\'s will to your own, if only briefly.',
    tags: ['control', 'monster', 'druid'],
    buttonText: {
      ready: 'Tame Beast',
      submitted: 'Will Bent'
    }
  },

  entangle: {
    id: 'entangle',
    name: 'Entangle',
    category: 'Special',
    effect: 'stun',
    target: 'Single',
    params: { duration: 2 },
    order: 320,
    cooldown: 4,
    flavorText: 'Thorny vines burst from the ground to restrain your foe.',
    tags: ['nature', 'control', 'disable'],
    buttonText: {
      ready: 'Grow Vines',
      submitted: 'Entangle Ready'
    }
  },

  // Utility and Information
  reveal: {
    id: 'reveal',
    name: 'Reveal',
    category: 'Special',
    effect: 'reveal',
    target: 'Single',
    params: { duration: 2 },
    order: 330,
    cooldown: 3,
    flavorText: 'See through deception and reveal hidden truths.',
    tags: ['detection', 'utility', 'information'],
    buttonText: {
      ready: 'See Truth',
      submitted: 'Reveal Ready'
    }
  },

  // Traps and Area Control
  poisonTrap: {
    id: 'poisonTrap',
    name: 'Poison Trap',
    category: 'Special',
    effect: 'poisonTrap',
    target: 'Self',
    params: { damage: 25, duration: 3 },
    order: 340,
    cooldown: 4,
    flavorText: 'Set a deadly trap that poisons anyone who attacks you.',
    tags: ['trap', 'poison', 'retaliation'],
    buttonText: {
      ready: 'Set Trap',
      submitted: 'Trap Ready'
    }
  },

  // Rage and Berserker Abilities
  rage: {
    id: 'rage',
    name: 'Rage',
    category: 'Special',
    effect: 'rage',
    target: 'Self',
    params: { damageBonus: 1.5, duration: 3 },
    order: 350,
    cooldown: 5,
    flavorText: 'Enter a berserker rage, increasing your damage but making you reckless.',
    tags: ['rage', 'damage-boost', 'berserker'],
    buttonText: {
      ready: 'Enter Rage',
      submitted: 'Rage Ready'
    }
  },

  // Mobility and Positioning
  teleport: {
    id: 'teleport',
    name: 'Teleport',
    category: 'Special',
    effect: 'teleport',
    target: 'Self',
    params: { duration: 1 },
    order: 360,
    cooldown: 3,
    flavorText: 'Instantly transport yourself to safety.',
    tags: ['mobility', 'escape', 'magical'],
    buttonText: {
      ready: 'Teleport',
      submitted: 'Teleport Ready'
    }
  },

  // Deception and Misdirection
  decoy: {
    id: 'decoy',
    name: 'Decoy',
    category: 'Special',
    effect: 'decoy',
    target: 'Self',
    params: { duration: 2 },
    order: 370,
    cooldown: 4,
    flavorText: 'Create an illusory double to confuse your enemies.',
    tags: ['illusion', 'deception', 'misdirection'],
    buttonText: {
      ready: 'Cast Decoy',
      submitted: 'Decoy Ready'
    }
  },

  // Dark Magic
  soulburn: {
    id: 'soulburn',
    name: 'Soulburn',
    category: 'Special',
    effect: 'soulburn',
    target: 'Single',
    params: { damage: 30, duration: 2 },
    order: 380,
    cooldown: 5,
    flavorText: 'Ignite your enemy\'s very soul with dark fire.',
    tags: ['dark-magic', 'soul', 'damage-over-time'],
    buttonText: {
      ready: 'Burn Soul',
      submitted: 'Soulburn Ready'
    }
  },

  // Time Manipulation
  timeManipulation: {
    id: 'timeManipulation',
    name: 'Time Warp',
    category: 'Special',
    effect: 'timeManipulation',
    target: 'Self',
    params: { duration: 1, extraTurn: true },
    order: 390,
    cooldown: 6,
    flavorText: 'Bend the flow of time to gain an extra moment of action.',
    tags: ['time', 'manipulation', 'extra-turn'],
    buttonText: {
      ready: 'Warp Time',
      submitted: 'Time Ready'
    }
  }
};

/**
 * Get a specific ability by ID
 */
export function getAbility(abilityId: string): Ability | null {
  return abilities[abilityId] || null;
}

/**
 * Get all abilities as an array
 */
export function getAbilities(): Ability[] {
  return Object.values(abilities);
}

/**
 * Get abilities filtered by tag
 */
export function getAbilitiesByTag(tag: string): Ability[] {
  return getAbilities().filter(ability => ability.tags.includes(tag));
}

/**
 * Get abilities filtered by category
 */
export function getAbilitiesByCategory(category: Ability['category']): Ability[] {
  return getAbilities().filter(ability => ability.category === category);
}

/**
 * Get all ability IDs
 */
export function getAllAbilityIds(): string[] {
  return Object.keys(abilities);
}

/**
 * Get button text for a specific ability
 */
export function getAbilityButtonText(abilityId: string): { ready: string; submitted: string } | null {
  const ability = getAbility(abilityId);
  return ability?.buttonText || null;
}

export { abilities };
export type { Ability, AbilitiesMap };