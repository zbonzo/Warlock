/**
 * @fileoverview Class configuration and abilities
 * Consolidated class definitions and class abilities
 */

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
  Melee: ['Warrior', 'Assassin', 'Alchemist', 'Barbarian'], // Added Barbarian to Melee
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
    hpModifier: 1.1, // More HP
    armorModifier: 1.5, // More armor
    damageModifier: 1.0, // Slightly increased damage
    description:
      'Tank class with high health and armor, focused on protection.',
  },
  Pyromancer: {
    hpModifier: 1.0, // Less HP
    armorModifier: 1.0, // No armor bonus
    damageModifier: 1.6, // High damage
    description: 'Fire-based caster with high damage output and area effects.',
  },
  Wizard: {
    hpModifier: 1.1, // Low HP
    armorModifier: 1.3, // Some magical protection
    damageModifier: 1.3, // Higher damage
    description: 'Versatile spellcaster with powerful arcane abilities.',
  },
  Assassin: {
    hpModifier: 1.0, // Less HP
    armorModifier: 1.1, // No armor bonus
    damageModifier: 1.5, // Very high damage
    description: 'Stealth-focused class with high single-target damage.',
  },
  Alchemist: {
    hpModifier: 1.2, // Standard HP
    armorModifier: 1.2, // No armor bonus
    damageModifier: 1.3, // Higher damage
    description:
      'Agile fighter with invisibility abilities and poison attacks.',
  },
  Priest: {
    hpModifier: 1.3, // Standard HP
    armorModifier: 1.4, // Some divine protection
    damageModifier: 1.0, // Low damage
    description: 'Healing-focused class with support abilities.',
  },
  Oracle: {
    hpModifier: 1.1, // Less HP
    armorModifier: 1.5, // Some divine protection
    damageModifier: 1.0, // Low damage
    description:
      'Divination-focused class that can reveal warlocks and manipulate fate.',
  },
  Barbarian: {
    hpModifier: 1.0, // High HP
    armorModifier: 1.0, // No armor bonus
    damageModifier: 1.6, // High damage
    description: 'Barbarian has axe. Barbarian use axe.',
  },
  Shaman: {
    hpModifier: 1.1, // Standard HP
    armorModifier: 1.4, // Some spiritual protection
    damageModifier: 1.2, // Standard damage
    description: 'Elemental caster with healing and lightning abilities.',
  },
  Gunslinger: {
    hpModifier: 1.0, // Less HP
    armorModifier: 1.2, // No armor bonus
    damageModifier: 1.5, // High damage
    description: 'Ranged specialist with high damage and evasion abilities.',
  },
  Tracker: {
    hpModifier: 1.2, // Standard HP
    armorModifier: 1.2, // No armor bonus
    damageModifier: 1.3, // Slightly increased damage
    description: 'Skilled hunter with traps and precise attacks.',
  },
  Druid: {
    hpModifier: 1.4, // More HP
    armorModifier: 1.3, // Some natural protection
    damageModifier: 1.0, // Slightly decreased damage
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
      params: { damage: 28 }, // Solid, reliable damage - the baseline
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
      params: { armor: 8, duration: 1 }, // Heavy tank armor
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
      params: { amount: 35 }, // Field medic training
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
      params: { armor: 4, duration: 1 }, // Strong group protection
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
      effect: 'poison',
      target: 'Single',
      params: { damage: 22, poison: { damage: 22, turns: 1 } },
      unlockAt: 1,
      order: 1010,
      cooldown: 0,
      flavorText: 'Hurl a searing sphere of raw fire, hungry for combustion.',
    },
    {
      type: 'cauterize',
      name: 'Cauterize',
      category: 'Heal',
      effect: null,
      target: 'Self',
      params: { amount: 35 }, // Painful but effective
      unlockAt: 3,
      order: 10000,
      cooldown: 2,
      flavorText: 'Use your fire to cauterize wounds and keep fighting.',
    },
    {
      type: 'pyroblast',
      name: 'Pyroblast',
      category: 'Attack',
      effect: 'poison_detect', // or 'burn_detect'
      target: 'Single',
      params: {
        damage: 45,
        poison: { damage: 18, turns: 3 }, // Representing superheated burns
        detectChance: 1.0,
      },
      unlockAt: 2,
      order: 1100,
      cooldown: 4,
      flavorText:
        'Burn your enemies skin to the bone, causing lingering, superheated burns and revealing any corruption inside.',
    },
    {
      type: 'infernoBlast',
      name: 'Inferno Blast',
      category: 'Special',
      effect: 'poison',
      target: 'Multi',
      params: { damage: 25, poison: { damage: 10, turns: 3 } },
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
      params: { damage: 75 }, // High damage but unlocked later
      unlockAt: 3,
      order: 1011,
      cooldown: 2,
      flavorText:
        'Conjure bolts of pure arcane energy that unerringly seek their target.',
    },
    {
      type: 'arcaneShield',
      name: 'Arcane Shield',
      category: 'Defense',
      effect: 'shielded',
      target: 'Self',
      params: { armor: 5, duration: 1 }, // Moderate magical protection
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
      params: { hits: 8, damagePerHit: 8, hitChance: 0.8 }, // 19.2 expected damage - weak but available early
      unlockAt: 1,
      order: 1025,
      cooldown: 0,
      flavorText: 'Unleash a rapid volley of arcane bolts at a single enemy.',
    },
    {
      type: 'meteorShower',
      name: 'Meteor Shower',
      category: 'Special',
      effect: null,
      target: 'Multi',
      params: { damage: 50 },
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
      params: { damage: 32 }, // High damage but fragile class
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
      params: { duration: 3 },
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
      params: { damage: 25, hits: 2 },
      unlockAt: 3,
      order: 1035,
      cooldown: 1,
      flavorText: 'Two swift, debilitating strikes aimed at vulnerable points.',
    },
    {
      type: 'deathMark',
      name: 'Death Mark',
      category: 'Special',
      effect: 'poisonAndInvisible',
      target: 'Single',
      params: {
        poison: { damage: 35, turns: 3 },
        selfInvisible: { duration: 1 },
      },
      unlockAt: 4,
      order: 140,
      cooldown: 2,
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
      params: { damage: 18, poison: { damage: 12, turns: 2 } }, // Low initial but good poison - 42 total
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
      params: { damage: 50, vulnerable: { damageIncrease: 25, turns: 3 } },
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
      effect: 'poisonAndVulnerable',
      target: 'Multi',
      params: {
        poison: { damage: 15, turns: 4 },
        vulnerable: { damageIncrease: 30, turns: 4 },
        hitChance: 0.75,
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
      params: { damage: 20 }, // Weakest attack - priest is support focused
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
      params: { amount: 50 }, // Good emergency healing
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
      params: { amount: 120 }, // Powerful dedicated healing
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
      params: { armor: 5, duration: 2 }, // Strong group protection, longer duration
      unlockAt: 4,
      order: 51,
      cooldown: 0,
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
      params: { damage: 24 }, // Moderate damage, utility focused
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
      params: { selfDamageOnFailure: 'instant_death' },
      unlockAt: 2,
      order: 100,
      cooldown: 0,
      flavorText:
        'Peer through the veil of deception, but the truth comes at a cost.',
    },
    {
      type: 'spiritGuard',
      name: 'Spirit Guard',
      category: 'Defense',
      effect: 'shielded',
      target: 'Self',
      params: { armor: 3, counterDamage: 50, duration: 1 }, // Light armor but punishes attackers
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
      params: { amount: 30, counterDamage: 100, autoDetect: true }, // Better healing for Oracle
      unlockAt: 4,
      order: 2,
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
      params: { damage: 50, selfDamage: 25 },
      unlockAt: 1,
      order: 1000,
      cooldown: 0,
      flavorText:
        'Strike with reckless abandon, trading safety for overwhelming power.',
    },
    {
      type: 'relentlessFury',
      name: 'Relentless Fury',
      category: 'Special',
      effect: 'passive',
      target: 'Self',
      params: {
        damagePerLevel: 0.1, // 3% per level
        vulnerabilityPerLevel: 0.1, // 3% more damage taken per level
      },
      unlockAt: 2,
      order: 5,
      cooldown: 0,
      flavorText:
        'Each battle intensifies your rage, increasing damage dealt and taken.',
    },
    {
      type: 'thirstyBlade',
      name: 'Thirsty Blade',
      category: 'Special',
      effect: 'passive',
      target: 'Self',
      params: {
        lifeSteal: 0.15, // 15% life steal
        initialDuration: 4,
        refreshOnKill: true,
      },
      unlockAt: 3,
      order: 7,
      cooldown: 0,
      flavorText: 'Your blade thirsts for blood, healing you when you draw it.',
    },
    {
      type: 'sweepingStrike',
      name: 'Sweeping Strike',
      category: 'Special',
      effect: 'passive',
      target: 'Self',
      params: {
        bonusTargets: 2,
        stunChance: 0.1,
        stunDuration: 1,
      },
      unlockAt: 4,
      order: 8,
      cooldown: 0,
      flavorText:
        'Your mighty swings cleave through multiple foes with devastating force.  Possibly yourself.',
    },
  ],
  Shaman: [
    {
      type: 'lightningBolt',
      name: 'Lightning Bolt',
      category: 'Attack',
      effect: null,
      target: 'Single',
      params: { damage: 25 }, // High damage, elemental theme
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
      params: { armor: 4, duration: 1 }, // Solid spiritual protection
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
      params: { amount: 100 }, // Strong but not as powerful as Priest
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
      params: { damage: 50 },
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
      params: { damage: 26 }, // Reliable ranged damage
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
      params: { damage: 85 },
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
      params: { damage: 35, hits: 5, hitChance: 0.6 },
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
      params: { damage: 29 }, // Slightly higher than baseline for precision
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
      effect: 'poison_detect', // New combined effect type
      target: 'Single',
      params: {
        damage: 50,
        poison: { damage: 15, turns: 3 },
        detectChance: 1.0,
      },
      unlockAt: 3,
      order: 1090,
      cooldown: 4,
      flavorText:
        'Fire an arrow that tears flesh, revealing the true nature of the target',
    },
    {
      type: 'controlMonster',
      name: 'Control Monster',
      category: 'Special',
      effect: 'monsterControl',
      target: 'Single',
      params: {
        damageBoost: 5,
        forcedAttack: true,
      },
      unlockAt: 4,
      order: 100,
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
      params: { damage: 23 }, // Lower damage but executes very early
      unlockAt: 1,
      order: 5, // Very early execution - can interrupt enemy actions
      cooldown: 0,
      flavorText: 'Lash out with the ferocity of a wild beast, claws bared.',
    },
    {
      type: 'barkskin',
      name: 'Barkskin',
      category: 'Defense',
      effect: 'shielded',
      target: 'Self',
      params: { armor: 3, duration: 1 }, // Natural but moderate protection
      unlockAt: 2,
      order: 21,
      cooldown: 3,
      flavorText: 'Your skin toughens, becoming as resilient as ancient wood.',
    },
    {
      type: 'rejuvenation',
      name: 'Rejuvenation',
      category: 'Heal',
      effect: 'healingOverTime',
      target: 'Multi',
      params: {
        amount: 250,
        turns: 3,
      },
      unlockAt: 3,
      order: 10110,
      cooldown: 5,
      flavorText:
        'Infuse your allies with the restorative energies of nature itself, healing them over time.',
    },
    {
      type: 'entangle',
      name: 'Entangling Roots',
      category: 'Special',
      effect: 'stunned',
      target: 'Multi',
      params: { chance: 0.5, duration: 2 },
      unlockAt: 4,
      order: 130,
      cooldown: 5,
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
