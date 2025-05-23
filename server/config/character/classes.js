/**
 * @fileoverview Class configuration and abilities
 * Consolidated class definitions and class abilities
 */

/**
 * Available player classes
 * @type {Array<string>}
 */
const availableClasses = [
  'Warrior',
  'Pyromancer',
  'Wizard',
  'Assassin',
  'Alchemist',
  'Priest',
  'Oracle',
  'Barbarian', // New class added
  'Shaman',
  'Gunslinger',
  'Tracker',
  'Druid',
  // 'Seer', // Removed from active classes but kept in abilities for reference
];

/**
 * Class category groupings
 * @type {Object}
 */
const classCategories = {
  Melee: ['Warrior', 'Assassin', 'Alchemist', 'Barbarian'], // Added Barbarian to Melee
  Caster: ['Pyromancer', 'Wizard', 'Priest', 'Oracle', 'Shaman', 'Druid'], // Removed Seer
  Ranged: ['Gunslinger', 'Tracker'],
};

/**
 * Base attributes for each class
 * These modify the player's base stats
 * @type {Object}
 */
const classAttributes = {
  Warrior: {
    hpModifier: 1.2, // More HP
    armorModifier: 2.5, // More armor
    damageModifier: 1.1, // Slightly increased damage
    description:
      'Tank class with high health and armor, focused on protection.',
  },
  Pyromancer: {
    hpModifier: 0.9, // Less HP
    armorModifier: 1.0, // No armor bonus
    damageModifier: 1.3, // High damage
    description: 'Fire-based caster with high damage output and area effects.',
  },
  Wizard: {
    hpModifier: 0.8, // Low HP
    armorModifier: 1.5, // Some magical protection
    damageModifier: 1.2, // Higher damage
    description: 'Versatile spellcaster with powerful arcane abilities.',
  },
  Assassin: {
    hpModifier: 0.9, // Less HP
    armorModifier: 1.0, // No armor bonus
    damageModifier: 1.4, // Very high damage
    description: 'Stealth-focused class with high single-target damage.',
  },
  Alchemist: {
    hpModifier: 1.0, // Standard HP
    armorModifier: 1.0, // No armor bonus
    damageModifier: 1.2, // Higher damage
    description:
      'Agile fighter with invisibility abilities and poison attacks.',
  },
  Priest: {
    hpModifier: 1.0, // Standard HP
    armorModifier: 1.5, // Some divine protection
    damageModifier: 0.8, // Low damage
    description: 'Healing-focused class with support abilities.',
  },
  Oracle: {
    hpModifier: 0.9, // Less HP
    armorModifier: 1.5, // Some divine protection
    damageModifier: 0.9, // Low damage
    description:
      'Divination-focused class that can reveal warlocks and manipulate fate.',
  },
  Barbarian: {
    hpModifier: 1.3, // High HP
    armorModifier: 1.0, // No armor bonus
    damageModifier: 1.3, // High damage
    description: 'Savage warrior who trades safety for overwhelming offense.',
  },
  // Seer: { // Kept for reference
  //   hpModifier: 0.9, // Less HP
  //   armorModifier: 0.0, // No armor bonus
  //   damageModifier: 1.0, // Standard damage
  //   description: 'Psychic class with detection abilities.',
  // },
  Shaman: {
    hpModifier: 1.0, // Standard HP
    armorModifier: 1.5, // Some spiritual protection
    damageModifier: 1.0, // Standard damage
    description: 'Elemental caster with healing and lightning abilities.',
  },
  Gunslinger: {
    hpModifier: 0.9, // Less HP
    armorModifier: 1.0, // No armor bonus
    damageModifier: 1.3, // High damage
    description: 'Ranged specialist with high damage and evasion abilities.',
  },
  Tracker: {
    hpModifier: 1.0, // Standard HP
    armorModifier: 1.0, // No armor bonus
    damageModifier: 1.1, // Slightly increased damage
    description: 'Skilled hunter with traps and precise attacks.',
  },
  Druid: {
    hpModifier: 1.1, // More HP
    armorModifier: 1.5, // Some natural protection
    damageModifier: 0.9, // Slightly decreased damage
    description: 'Nature-focused class with healing and crowd control.',
  },
};

/**
 * Class abilities configuration with balanced damage values
 *
 * Monster has 100 HP (increasing by 50 per level)
 * Monster should die in ~3 hits on average (33-34 damage per hit)
 * Players should take minimum 5 hits to die (20 damage per hit max)
 *
 * Note: These base values will be modified by race and class damage multipliers
 *
 * Properties:
 * - type: Unique identifier for the ability
 * - name: Display name of the ability
 * - category: Attack, Defense, Heal, or Special
 * - effect: Status effect applied (if any)
 * - target: Single, Self, or Multi
 * - params: Parameters for the ability effect (vulnerability, hits, etc.)
 * - flavorText: Description of the ability
 * - unlockAt: Level at which this ability becomes available
 * - order: Determines the sequence in which abilities act (lower numbers act first)
 * - cooldown: Cooldown time in rounds (0 for no cooldown)
 */
const classAbilities = {
  Warrior: [
    {
      type: 'attack',
      name: 'Slash',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { damage: 33 },
      unlockAt: 1,
      order: 1000,
      cooldown: 0,
      flavorText: 'A swift and decisive blow, honed by countless battles.',
    },
    {
      type: 'shieldWall',
      name: 'Shield Wall',
      category: 'Defense',
      effect: 'shielded',
      target: 'Self',
      params: { armor: 5, duration: 1 },
      unlockAt: 2,
      order: 10,
      cooldown: 0,
      flavorText:
        'Brace for impact, becoming an unmovable bastion for your allies.',
    },
    {
      type: 'bandage',
      name: 'Bandage',
      category: 'Heal',
      effect: null,
      target: 'Self',
      params: { amount: 20 },
      unlockAt: 3,
      order: 10000,
      cooldown: 2,
      flavorText: 'A moment of respite to tend to wounds and fight on.',
    },
    {
      type: 'battleCry',
      name: 'Battle Cry',
      category: 'Special',
      effect: 'shielded',
      target: 'Multi',
      params: { armor: 3, duration: 1 },
      unlockAt: 4,
      order: 50,
      cooldown: 3,
      flavorText: 'A deafening roar that steels the resolve of your comrades.',
    },
  ],
  Pyromancer: [
    {
      type: 'fireball',
      name: 'Fireball',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { damage: 35 },
      unlockAt: 1,
      order: 1010,
      cooldown: 0,
      flavorText: 'Hurl a searing sphere of raw fire, hungry for combustion.',
    },
    {
      type: 'flameWard',
      name: 'Flame Ward',
      category: 'Defense',
      effect: 'shielded',
      target: 'Self',
      params: { armor: 3, duration: 1 },
      unlockAt: 2,
      order: 11,
      cooldown: 0,
      flavorText:
        'Envelop yourself in a shimmering shield of protective flames.',
    },
    {
      type: 'combustion',
      name: 'Combustion',
      category: 'Attack',
      effect: 'poison',
      target: 'Single',
      params: { damage: 20, poison: { damage: 8, turns: 2 } },
      unlockAt: 3,
      order: 1015,
      cooldown: 2,
      flavorText: 'Ignite your foe, causing lingering, superheated burns.',
    },
    {
      type: 'infernoBlast',
      name: 'Inferno Blast',
      category: 'Special',
      effect: 'poison',
      target: 'Multi',
      params: { damage: 15, poison: { damage: 5, turns: 2 } },
      unlockAt: 4,
      order: 1530,
      cooldown: 3,
      flavorText:
        'Unleash a torrent of fire that clings and chars, leaving a toxic aftermath.',
    },
  ],
  Wizard: [
    {
      type: 'magicMissile',
      name: 'Magic Missile',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { damage: 34 },
      unlockAt: 3,
      order: 1011,
      cooldown: 0,
      flavorText:
        'Conjure bolts of pure arcane energy that unerringly seek their target.',
    },
    {
      type: 'arcaneShield',
      name: 'Arcane Shield',
      category: 'Defense',
      effect: 'shielded',
      target: 'Self',
      params: { armor: 4, duration: 1 },
      unlockAt: 2,
      order: 12,
      cooldown: 0,
      flavorText:
        'Weave a barrier of shimmering magic to deflect incoming harm.',
    },
    {
      type: 'arcaneBarrage',
      name: 'Arcane Barrage',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { hits: 3, damagePerHit: 12, hitChance: 0.8 },
      unlockAt: 1,
      order: 1025,
      cooldown: 0,
      flavorText:
        'Unleash a rapid volley of three arcane bolts at a single enemy.',
    },
    {
      type: 'meteorShower',
      name: 'Meteor Shower',
      category: 'Special',
      effect: null,
      target: 'Multi',
      params: { damage: 20 },
      unlockAt: 4,
      order: 1500,
      cooldown: 3,
      flavorText:
        'Call down a devastating rain of celestial bodies upon your foes.',
    },
  ],
  Assassin: [
    {
      type: 'backstab',
      name: 'Backstab',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { damage: 40 },
      unlockAt: 1,
      order: 1020,
      cooldown: 0,
      flavorText:
        'Exploit a momentary weakness with a precisely aimed, lethal strike.',
    },
    {
      type: 'shadowVeil',
      name: 'Shadow Veil',
      category: 'Defense',
      effect: 'invisible',
      target: 'Self',
      params: { duration: 1 },
      unlockAt: 2,
      order: 13,
      cooldown: 4,
      flavorText: 'Melt into the darkness, becoming an unseen predator.',
    },
    {
      type: 'twinStrike',
      name: 'Twin Strike',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { damage: 18, hits: 2 },
      unlockAt: 3,
      order: 1035,
      cooldown: 1,
      flavorText: 'Two swift, debilitating strikes aimed at vulnerable points.',
    },
    {
      type: 'deathMark',
      name: 'Death Mark',
      category: 'Special',
      effect: 'poisonAndInvisible', // New combined effect
      target: 'Single',
      params: {
        poison: { damage: 15, turns: 3 }, // Higher damage, longer duration
        selfInvisible: { duration: 1 }, // Make caster invisible
      },
      unlockAt: 4,
      order: 140,
      cooldown: 2, // Add cooldown since it's now more powerful
      flavorText:
        'Mark your target for death with a lethal curse, then vanish into the shadows to watch them suffer.',
    },
  ],
  Alchemist: [
    {
      type: 'poisonStrike',
      name: 'Poison Strike',
      category: 'Attack',
      effect: 'poison',
      target: 'Single',
      params: { damage: 20, poison: { damage: 8, turns: 2 } },
      unlockAt: 1,
      order: 1030,
      cooldown: 0,
      flavorText:
        'A quick jab with a venom-laced blade, the toxin doing its silent work.',
    },
    {
      type: 'smokeBomb',
      name: 'Smoke Bomb',
      category: 'Defense',
      effect: 'invisible',
      target: 'Self',
      params: { duration: 1 },
      unlockAt: 2,
      order: 14,
      cooldown: 4,
      flavorText:
        'Disappear in a cloud of disorienting smoke, evading your pursuers.',
    },
    {
      type: 'shiv',
      name: 'Shiv',
      category: 'Attack',
      effect: 'vulnerable',
      target: 'Single',
      params: { damage: 25, vulnerable: { damageIncrease: 25, turns: 3 } },
      unlockAt: 3,
      order: 1045,
      cooldown: 2,
      flavorText:
        'A sharp, unexpected thrust that can leave an opponent exposed.',
    },
    {
      type: 'poisonTrap',
      name: 'Poison Trap',
      category: 'Special',
      effect: 'poisonAndVulnerable', // New combined effect
      target: 'Multi',
      params: {
        poison: { damage: 8, turns: 2 },
        vulnerable: { damageIncrease: 30, turns: 2 },
        hitChance: 0.75, // 75% chance to affect each target
      },
      unlockAt: 4,
      order: 120,
      cooldown: 3,
      flavorText:
        'Lay multiple hidden traps that poison and weaken your enemies, making them vulnerable to further attacks.',
    },
  ],
  Priest: [
    {
      type: 'holyBolt',
      name: 'Holy Bolt',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { damage: 25 },
      unlockAt: 1,
      order: 1040,
      cooldown: 0,
      flavorText: 'Smite the wicked with a bolt of searing divine light.',
    },
    {
      type: 'swiftMend',
      name: 'Swift Mend',
      category: 'Heal',
      effect: null,
      target: 'Single',
      params: { amount: 15 },
      unlockAt: 2,
      order: 100,
      cooldown: 0,
      flavorText:
        'A quick prayer and a touch of grace to rapidly bind minor wounds.',
    },
    {
      type: 'heal',
      name: 'Heal',
      category: 'Heal',
      effect: null,
      target: 'Single',
      params: { amount: 30 },
      unlockAt: 3,
      order: 10050,
      cooldown: 2,
      flavorText:
        'Channel sacred energy to mend grievous wounds and restore faith.',
    },
    {
      type: 'divineShield',
      name: 'Divine Shield',
      category: 'Special',
      effect: 'shielded',
      target: 'Multi',
      params: { armor: 2, duration: 1 },
      unlockAt: 4,
      order: 51,
      cooldown: 3,
      flavorText:
        'Extend a shield of holy power to all nearby allies, a beacon of hope.',
    },
  ],
  Oracle: [
    {
      type: 'psychicBolt',
      name: 'Psychic Bolt',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { damage: 28 },
      unlockAt: 1,
      order: 1050,
      cooldown: 0,
      flavorText: 'Assault the mind with a focused blast of pure mental force.',
    },
    {
      type: 'fatesEye',
      name: 'Eye of Fate',
      category: 'Special',
      effect: 'detect',
      target: 'Single',
      params: { selfDamageOnFailure: 10 },
      unlockAt: 2,
      order: 100,
      cooldown: 3,
      flavorText:
        'Peer through the veil of deception, but the truth comes at a cost.',
    },
    {
      type: 'spiritGuard',
      name: 'Spirit Guard',
      category: 'Defense',
      effect: 'shielded',
      target: 'Self',
      params: { armor: 2, counterDamage: 15, duration: 1 },
      unlockAt: 3,
      order: 17,
      cooldown: 3,
      flavorText:
        'Summon vengeful spirits that punish those who dare attack you.',
    },
    {
      type: 'sanctuaryOfTruth',
      name: 'Sanctuary of Truth',
      category: 'Heal',
      effect: 'detect',
      target: 'Self',
      params: { amount: 20, counterDamage: 10, autoDetect: true },
      unlockAt: 4,
      order: 10070,
      cooldown: 3,
      flavorText:
        'Create a sacred space that heals you and exposes attackers as warlocks.',
    },
  ],
  Barbarian: [
    {
      type: 'recklessStrike',
      name: 'Reckless Strike',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { damage: 40, selfDamage: 5 },
      unlockAt: 1,
      order: 1000,
      cooldown: 0,
      flavorText:
        'Strike with reckless abandon, trading safety for overwhelming power.',
    },
    {
      type: 'primalRoar',
      name: 'Primal Roar',
      category: 'Special',
      effect: 'weakened',
      target: 'Single',
      params: { damageReduction: 0.25, duration: 1 },
      unlockAt: 2,
      order: 120,
      cooldown: 0,
      flavorText:
        "Let out a terrifying roar that weakens your enemy's resolve.",
    },
    {
      type: 'bloodFrenzy',
      name: 'Blood Frenzy',
      category: 'Special',
      effect: 'passive',
      target: 'Self',
      params: { damageIncreasePerHpMissing: 0.01 },
      unlockAt: 3,
      order: 5,
      cooldown: 0,
      flavorText: 'The closer to death you get, the more dangerous you become.',
    },
    {
      type: 'unstoppableRage',
      name: 'Unstoppable Rage',
      category: 'Special',
      effect: 'enraged',
      target: 'Self',
      params: {
        damageBoost: 1.5,
        damageResistance: 0.3,
        duration: 2,
        effectEnds: { selfDamagePercent: 0.25 },
      },
      unlockAt: 4,
      order: 8,
      cooldown: 4,
      flavorText:
        'Enter an unstoppable rage that makes you incredibly dangerous, but at a terrible cost.',
    },
  ],
  // Seer: [ // Kept for reference - can be uncommented to re-add to the game
  //   {
  //     type: 'psychicBolt',
  //     name: 'Psychic Bolt',
  //     category: 'Attack',
  //     effect: null,
  //     target: 'Single',
  //     params: { damage: 28 },
  //     unlockAt: 1,
  //     order: 1050,
  //     cooldown: 0,
  //     flavorText: 'Assault the mind with a focused blast of pure mental force.',
  //   },
  //   {
  //     type: 'spiritGuard',
  //     name: 'Spirit Guard',
  //     category: 'Defense',
  //     effect: 'shielded',
  //     target: 'Self',
  //     params: { armor: 3, duration: 1 },
  //     unlockAt: 3,
  //     order: 17,
  //     cooldown: 0,
  //     flavorText: 'Summon protective spirits to ward off incoming attacks.',
  //   },
  //   {
  //     type: 'spiritMend',
  //     name: 'Spirit Mend',
  //     category: 'Heal',
  //     effect: null,
  //     target: 'Self',
  //     params: { amount: 20 },
  //     unlockAt: 4,
  //     order: 10070,
  //     cooldown: 2,
  //     flavorText: 'Channel soothing spiritual energy to repair your own form.',
  //   },
  //   {
  //     type: 'revealSecret',
  //     name: 'Reveal Secret',
  //     category: 'Special',
  //     effect: 'detect',
  //     target: 'Single',
  //     params: {},
  //     unlockAt: 2,
  //     order: 101,
  //     cooldown: 4,
  //     flavorText: "Uncover hidden truths and expose the enemy's deceptions.",
  //   },
  // ],
  Shaman: [
    {
      type: 'lightningBolt',
      name: 'Lightning Bolt',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { damage: 30 },
      unlockAt: 1,
      order: 1060,
      cooldown: 0,
      flavorText:
        'Call down the fury of the storm in a crackling bolt of lightning.',
    },
    {
      type: 'totemShield',
      name: 'Totemic Barrier',
      category: 'Defense',
      effect: 'shielded',
      target: 'Self',
      params: { armor: 3, duration: 1 },
      unlockAt: 2,
      order: 18,
      cooldown: 0,
      flavorText:
        'Erect a spiritual totem that shields you with ancestral power.',
    },
    {
      type: 'ancestralHeal',
      name: 'Ancestral Heal',
      category: 'Heal',
      effect: null,
      target: 'Single',
      params: { amount: 20 },
      unlockAt: 3,
      order: 10080,
      cooldown: 2,
      flavorText:
        'Invoke the wisdom of the ancestors to restore a chosen ally.',
    },
    {
      type: 'chainLightning',
      name: 'Chain Lightning',
      category: 'Special',
      effect: null,
      target: 'Multi',
      params: { damage: 18 },
      unlockAt: 4,
      order: 1510,
      cooldown: 2,
      flavorText: 'Unleash a fork of lightning that leaps from foe to foe.',
    },
  ],
  Gunslinger: [
    {
      type: 'pistolShot',
      name: 'Pistol Shot',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { damage: 32 },
      unlockAt: 1,
      order: 1070,
      cooldown: 0,
      flavorText:
        'A quick draw and a well-aimed shot from your trusty sidearm.',
    },
    {
      type: 'smokeScreen',
      name: 'Smoke Screen',
      category: 'Defense',
      effect: 'invisible',
      target: 'Self',
      params: { duration: 1 },
      unlockAt: 2,
      order: 19,
      cooldown: 4,
      flavorText:
        'Create a thick cloud of smoke to obscure your position and make a quick escape.',
    },
    {
      type: 'aimedShot',
      name: 'Aimed Shot',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { damage: 45 },
      unlockAt: 3,
      order: 12000,
      cooldown: 3,
      flavorText: 'Take careful aim for a devastating, armor-piercing shot.',
    },
    {
      type: 'ricochetRound',
      name: 'Ricochet Round',
      category: 'Special',
      effect: null,
      target: 'Multi',
      params: { damage: 16 },
      unlockAt: 4,
      order: 1520,
      cooldown: 2,
      flavorText:
        'Fire a specially crafted bullet that bounces between multiple targets.',
    },
  ],
  Tracker: [
    {
      type: 'preciseShot',
      name: 'Precise Shot',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { damage: 33 },
      unlockAt: 1,
      order: 1080,
      cooldown: 0,
      flavorText:
        'Take a moment to aim, then release a shot that strikes a vital point.',
    },
    {
      type: 'camouflage',
      name: 'Camouflage',
      category: 'Defense',
      effect: 'invisible',
      target: 'Self',
      params: { duration: 1 },
      unlockAt: 2,
      order: 20,
      cooldown: 4,
      flavorText:
        'Blend seamlessly into your surroundings, becoming nearly impossible to spot.',
    },
    {
      type: 'barbedArrow',
      name: 'Barbed Arrow',
      category: 'Attack',
      effect: 'poison',
      target: 'Single',
      params: { damage: 22, poison: { damage: 6, turns: 3 } },
      unlockAt: 3,
      order: 1090,
      cooldown: 2,
      flavorText:
        'Fire an arrow that tears flesh and causes a persistent bleed.',
    },
    {
      type: 'controlMonster',
      name: 'Control Monster',
      category: 'Special',
      effect: 'monsterControl',
      target: 'Single', // Target who the monster will attack
      params: {
        damageBoost: 1.5, // 50% more damage
        forcedAttack: true,
      },
      unlockAt: 4,
      order: 100, // High priority to execute before monster normally acts
      cooldown: 4,
      flavorText:
        'Use your knowledge of beast behavior to command the monster, forcing it to attack your chosen target with enhanced ferocity.',
    },
  ],
  Druid: [
    {
      type: 'clawSwipe',
      name: 'Claw Swipe',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { damage: 30 },
      unlockAt: 1,
      order: 5,
      cooldown: 0,
      flavorText: 'Lash out with the ferocity of a wild beast, claws bared.',
    },
    {
      type: 'barkskin',
      name: 'Barkskin',
      category: 'Defense',
      effect: 'shielded',
      target: 'Self',
      params: { armor: 3, duration: 1 },
      unlockAt: 2,
      order: 21,
      cooldown: 0,
      flavorText: 'Your skin toughens, becoming as resilient as ancient wood.',
    },
    {
      type: 'rejuvenation',
      name: 'Rejuvenation',
      category: 'Heal',
      effect: null,
      target: 'Multi',
      params: { amount: 12 },
      unlockAt: 3,
      order: 10110,
      cooldown: 2,
      flavorText:
        'Infuse your allies with the restorative energies of nature itself.',
    },
    {
      type: 'entangle',
      name: 'Entangling Roots',
      category: 'Special',
      effect: 'stunned',
      target: 'Multi',
      params: { chance: 0.5, duration: 1 },
      unlockAt: 4,
      order: 130,
      cooldown: 3,
      flavorText:
        'Summon grasping roots from the earth to bind and hinder your enemies.',
    },
  ],
};

/**
 * Get abilities for a specific class
 * @param {string} className - Class name
 * @returns {Array} Array of abilities for the class
 */
function getClassAbilities(className) {
  return classAbilities[className] || [];
}

/**
 * Get specific abilities by level
 * @param {string} className - Class name
 * @param {number} level - Level to filter by
 * @returns {Array} Array of abilities unlocked at the specified level
 */
function getClassAbilitiesByLevel(className, level) {
  return getClassAbilities(className).filter(
    (ability) => ability.unlockAt === level
  );
}

module.exports = {
  availableClasses,
  classCategories,
  classAttributes,
  classAbilities,
  getClassAbilities,
  getClassAbilitiesByLevel,
};
