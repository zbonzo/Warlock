/**
 * @fileoverview Centralized ability definitions
 * All abilities are defined here and referenced by classes
 */

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
const abilities = {
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
    tags: ['basic', 'melee', 'physical']
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
    flavorText: 'Conjure a sphere of condensed flame that burns long after impact.',
    tags: ['magic', 'fire', 'dot']
  },

  magicMissile: {
    id: 'magicMissile',
    name: 'Magic Missile',
    category: 'Attack',
    effect: null,
    target: 'Single',
    params: { damage: 32 },
    order: 1030,
    cooldown: 0,
    flavorText: 'Unleash bolts of pure arcane force that never miss their mark.',
    tags: ['magic', 'arcane', 'reliable']
  },

  backstab: {
    id: 'backstab',
    name: 'Backstab',
    category: 'Attack',
    effect: null,
    target: 'Single',
    params: { damage: 35 },
    order: 900,
    cooldown: 0,
    flavorText: 'Strike from the shadows with surgical precision.',
    tags: ['melee', 'stealth', 'critical']
  },

  poisonStrike: {
    id: 'poisonStrike',
    name: 'Poison Strike',
    category: 'Attack',
    effect: 'poison',
    target: 'Single',
    params: { damage: 24, poison: { damage: 20, turns: 2 } },
    order: 1015,
    cooldown: 0,
    flavorText: 'Blade kissed by venom, promising a slow demise.',
    tags: ['melee', 'poison', 'dot']
  },

  holyBolt: {
    id: 'holyBolt',
    name: 'Holy Bolt',
    category: 'Attack',
    effect: null,
    target: 'Single',
    params: { damage: 25 },
    order: 1020,
    cooldown: 0,
    flavorText: 'Divine light given form, burning away corruption.',
    tags: ['magic', 'holy', 'light']
  },

  psychicBolt: {
    id: 'psychicBolt',
    name: 'Psychic Bolt',
    category: 'Attack',
    effect: null,
    target: 'Single',
    params: { damage: 30 },
    order: 1025,
    cooldown: 0,
    flavorText: 'Strike directly at the mind, bypassing physical defenses.',
    tags: ['magic', 'psychic', 'mental']
  },

  recklessStrike: {
    id: 'recklessStrike',
    name: 'Reckless Strike',
    category: 'Attack',
    effect: 'selfDamage',
    target: 'Single',
    params: { damage: 40, selfDamage: 10 },
    order: 1040,
    cooldown: 0,
    flavorText: 'Abandon defense for devastating offense.',
    tags: ['melee', 'berserker', 'risky']
  },

  lightningBolt: {
    id: 'lightningBolt',
    name: 'Lightning Bolt',
    category: 'Attack',
    effect: null,
    target: 'Single',
    params: { damage: 28 },
    order: 1035,
    cooldown: 0,
    flavorText: 'Call down the fury of the storm.',
    tags: ['magic', 'lightning', 'nature']
  },

  pistolShot: {
    id: 'pistolShot',
    name: 'Pistol Shot',
    category: 'Attack',
    effect: null,
    target: 'Single',
    params: { damage: 30 },
    order: 950,
    cooldown: 0,
    flavorText: 'Quick draw, quicker death.',
    tags: ['ranged', 'physical', 'gunslinger']
  },

  preciseShot: {
    id: 'preciseShot',
    name: 'Precise Shot',
    category: 'Attack',
    effect: null,
    target: 'Single',
    params: { damage: 32 },
    order: 990,
    cooldown: 0,
    flavorText: 'One arrow, one kill.',
    tags: ['ranged', 'physical', 'precision']
  },

  clawSwipe: {
    id: 'clawSwipe',
    name: 'Claw Swipe',
    category: 'Attack',
    effect: null,
    target: 'Single',
    params: { damage: 26 },
    order: 980,
    cooldown: 0,
    flavorText: 'Nature\'s fury channeled through sharpened claws.',
    tags: ['melee', 'nature', 'primal']
  },

  // Advanced Attacks
  pyroblast: {
    id: 'pyroblast',
    name: 'Pyroblast',
    category: 'Attack',
    effect: null,
    target: 'Single',
    params: { damage: 50 },
    order: 1500,
    cooldown: 3,
    flavorText: 'Channel the heart of a volcano into a single, devastating blast.',
    tags: ['magic', 'fire', 'ultimate']
  },

  arcaneBarrage: {
    id: 'arcaneBarrage',
    name: 'Arcane Barrage',
    category: 'Attack',
    effect: null,
    target: 'Single',
    params: { damage: 20, hits: 3 },
    order: 1100,
    cooldown: 2,
    flavorText: 'Overwhelm your foe with rapid-fire arcane projectiles.',
    tags: ['magic', 'arcane', 'multi-hit']
  },

  twinStrike: {
    id: 'twinStrike',
    name: 'Twin Strike',
    category: 'Attack',
    effect: null,
    target: 'Single',
    params: { damage: 20, hits: 2 },
    order: 1050,
    cooldown: 1,
    flavorText: 'Two blades moving as one, impossible to defend against.',
    tags: ['melee', 'multi-hit', 'agile']
  },

  shiv: {
    id: 'shiv',
    name: 'Shiv',
    category: 'Attack',
    effect: 'bleed',
    target: 'Single',
    params: { damage: 30, bleed: { damage: 15, turns: 2 } },
    order: 920,
    cooldown: 2,
    flavorText: 'A quick stab that leaves lasting wounds.',
    tags: ['melee', 'bleed', 'dot']
  },

  aimedShot: {
    id: 'aimedShot',
    name: 'Aimed Shot',
    category: 'Attack',
    effect: 'vulnerable',
    target: 'Single',
    params: { damage: 35, vulnerability: { damageIncrease: 25, turns: 2 } },
    order: 1200,
    cooldown: 3,
    flavorText: 'Target weak points to maximize future damage.',
    tags: ['ranged', 'precision', 'debuff']
  },

  barbedArrow: {
    id: 'barbedArrow',
    name: 'Barbed Arrow',
    category: 'Attack',
    effect: 'bleed',
    target: 'Single',
    params: { damage: 25, bleed: { damage: 18, turns: 3 } },
    order: 1060,
    cooldown: 2,
    flavorText: 'Arrows designed to tear on the way out.',
    tags: ['ranged', 'bleed', 'cruel']
  },

  // AOE Attacks
  infernoBlast: {
    id: 'infernoBlast',
    name: 'Inferno Blast',
    category: 'Attack',
    effect: null,
    target: 'Multi',
    params: { damage: 35 },
    order: 1400,
    cooldown: 4,
    flavorText: 'Engulf all enemies in a conflagration of magical fire.',
    tags: ['magic', 'fire', 'aoe']
  },

  meteorShower: {
    id: 'meteorShower',
    name: 'Meteor Shower',
    category: 'Attack',
    effect: null,
    target: 'Multi',
    params: { damage: 40 },
    order: 1600,
    cooldown: 5,
    flavorText: 'Call down celestial destruction upon your enemies.',
    tags: ['magic', 'arcane', 'aoe', 'ultimate']
  },

  deathMark: {
    id: 'deathMark',
    name: 'Death Mark',
    category: 'Attack',
    effect: 'deathMark',
    target: 'Multi',
    params: { damage: 30, deathMarkDamage: 50 },
    order: 1300,
    cooldown: 5,
    flavorText: 'Mark enemies for death. The weak shall perish.',
    tags: ['assassination', 'execute', 'aoe']
  },

  chainLightning: {
    id: 'chainLightning',
    name: 'Chain Lightning',
    category: 'Attack',
    effect: null,
    target: 'Multi',
    params: { damage: 35 },
    order: 1350,
    cooldown: 4,
    flavorText: 'Lightning arcs between foes with deadly precision.',
    tags: ['magic', 'lightning', 'aoe']
  },

  ricochetRound: {
    id: 'ricochetRound',
    name: 'Ricochet Round',
    category: 'Attack',
    effect: null,
    target: 'Multi',
    params: { damage: 25 },
    order: 1150,
    cooldown: 3,
    flavorText: 'One bullet, multiple targets. Geometry is deadly.',
    tags: ['ranged', 'gunslinger', 'clever']
  },

  sweepingStrike: {
    id: 'sweepingStrike',
    name: 'Sweeping Strike',
    category: 'Special',
    effect: 'stun',
    target: 'Single',
    params: { damage: 35, bonusTargets: 1, stunChance: 0.25, stunDuration: 1 },
    order: 1250,
    cooldown: 4,
    flavorText: 'A wide arc that devastates multiple foes.',
    tags: ['melee', 'aoe', 'control']
  },

  // ========== DEFENSE ABILITIES ==========

  shieldWall: {
    id: 'shieldWall',
    name: 'Shield Wall',
    category: 'Defense',
    effect: 'shielded',
    target: 'Self',
    params: { armor: 8, duration: 1 },
    order: 10,
    cooldown: 0,
    flavorText: 'Brace for impact, becoming an unmovable bastion for your allies.',
    tags: ['physical', 'armor', 'tank']
  },

  arcaneShield: {
    id: 'arcaneShield',
    name: 'Arcane Shield',
    category: 'Defense',
    effect: 'shielded',
    target: 'Self',
    params: { armor: 6, duration: 2 },
    order: 15,
    cooldown: 1,
    flavorText: 'Weave raw magic into a protective barrier.',
    tags: ['magic', 'armor', 'sustained']
  },

  shadowVeil: {
    id: 'shadowVeil',
    name: 'Shadow Veil',
    category: 'Defense',
    effect: 'invisible',
    target: 'Self',
    params: { duration: 2 },
    order: 5,
    cooldown: 3,
    flavorText: 'Become one with the shadows, unseen and untouchable.',
    tags: ['stealth', 'evasion', 'shadow']
  },

  smokeBomb: {
    id: 'smokeBomb',
    name: 'Smoke Bomb',
    category: 'Defense',
    effect: 'invisible',
    target: 'Self',
    params: { duration: 1 },
    order: 20,
    cooldown: 2,
    flavorText: 'Vanish in a cloud of alchemical smoke.',
    tags: ['stealth', 'escape', 'alchemy']
  },

  divineShield: {
    id: 'divineShield',
    name: 'Divine Shield',
    category: 'Defense',
    effect: 'shielded',
    target: 'Single',
    params: { armor: 10, duration: 2 },
    order: 25,
    cooldown: 4,
    flavorText: 'Grant divine protection to those who need it most.',
    tags: ['holy', 'protection', 'support']
  },

  spiritGuard: {
    id: 'spiritGuard',
    name: 'Spirit Guard',
    category: 'Defense',
    effect: 'spiritGuard',
    target: 'Self',
    params: { damageReduction: 0.5, duration: 2 },
    order: 30,
    cooldown: 3,
    flavorText: 'Ancestral spirits protect you from harm.',
    tags: ['spiritual', 'damage-reduction', 'oracle']
  },

  totemShield: {
    id: 'totemShield',
    name: 'Totemic Barrier',
    category: 'Defense',
    effect: 'shielded',
    target: 'Single',
    params: { armor: 7, duration: 2 },
    order: 35,
    cooldown: 2,
    flavorText: 'Protective totems ward off incoming attacks.',
    tags: ['nature', 'totem', 'shaman']
  },

  smokeScreen: {
    id: 'smokeScreen',
    name: 'Smoke Screen',
    category: 'Defense',
    effect: 'invisible',
    target: 'Single',
    params: { duration: 2 },
    order: 40,
    cooldown: 3,
    flavorText: 'Cover an ally\'s escape with a wall of smoke.',
    tags: ['tactical', 'support', 'gunslinger']
  },

  camouflage: {
    id: 'camouflage',
    name: 'Camouflage',
    category: 'Defense',
    effect: 'invisible',
    target: 'Self',
    params: { duration: 3 },
    order: 45,
    cooldown: 4,
    flavorText: 'Blend perfectly with your surroundings.',
    tags: ['nature', 'stealth', 'hunter']
  },

  barkskin: {
    id: 'barkskin',
    name: 'Barkskin',
    category: 'Defense',
    effect: 'shielded',
    target: 'Self',
    params: { armor: 5, duration: 3 },
    order: 50,
    cooldown: 2,
    flavorText: 'Your skin becomes as tough as ancient bark.',
    tags: ['nature', 'druid', 'sustained']
  },

  // ========== HEAL ABILITIES ==========

  bandage: {
    id: 'bandage',
    name: 'Bandage',
    category: 'Heal',
    effect: null,
    target: 'Self',
    params: { amount: 35 },
    order: 10000,
    cooldown: 2,
    flavorText: 'A moment of respite to tend to wounds and fight on.',
    tags: ['physical', 'self-care', 'basic']
  },

  cauterize: {
    id: 'cauterize',
    name: 'Cauterize',
    category: 'Heal',
    effect: null,
    target: 'Self',
    params: { amount: 40 },
    order: 10100,
    cooldown: 2,
    flavorText: 'Burn wounds closed with searing flame. Painful but effective.',
    tags: ['fire', 'emergency', 'pyromancer']
  },

  swiftMend: {
    id: 'swiftMend',
    name: 'Swift Mend',
    category: 'Heal',
    effect: null,
    target: 'Single',
    params: { amount: 35 },
    order: 10200,
    cooldown: 1,
    flavorText: 'Channel holy light to rapidly close wounds.',
    tags: ['holy', 'quick', 'efficient']
  },

  heal: {
    id: 'heal',
    name: 'Heal',
    category: 'Heal',
    effect: null,
    target: 'Single',
    params: { amount: 50 },
    order: 10300,
    cooldown: 2,
    flavorText: 'Restore an ally with divine grace.',
    tags: ['holy', 'powerful', 'priest']
  },

  ancestralHeal: {
    id: 'ancestralHeal',
    name: 'Ancestral Heal',
    category: 'Heal',
    effect: 'healingOverTime',
    target: 'Single',
    params: { amount: 30, hot: { amount: 20, turns: 2 } },
    order: 10400,
    cooldown: 3,
    flavorText: 'Call upon ancestral spirits to mend wounds over time.',
    tags: ['spiritual', 'hot', 'shaman']
  },

  rejuvenation: {
    id: 'rejuvenation',
    name: 'Rejuvenation',
    category: 'Heal',
    effect: 'healingOverTime',
    target: 'Single',
    params: { amount: 25, hot: { amount: 15, turns: 3 } },
    order: 10500,
    cooldown: 2,
    flavorText: 'Nature\'s blessing slowly restores vitality.',
    tags: ['nature', 'hot', 'druid']
  },

  // ========== SPECIAL ABILITIES ==========

  battleCry: {
    id: 'battleCry',
    name: 'Battle Cry',
    category: 'Special',
    effect: 'shielded',
    target: 'Multi',
    params: { armor: 4, duration: 1 },
    order: 50,
    cooldown: 3,
    flavorText: 'A deafening roar that steels the resolve of your comrades.',
    tags: ['leadership', 'aoe-buff', 'warrior']
  },

  poisonTrap: {
    id: 'poisonTrap',
    name: 'Poison Trap',
    category: 'Special',
    effect: 'poisonTrap',
    target: 'Self',
    params: { damage: 20, duration: 2 },
    order: 200,
    cooldown: 3,
    flavorText: 'Set a hidden trap that poisons attackers.',
    tags: ['trap', 'poison', 'defensive']
  },

  fatesEye: {
    id: 'fatesEye',
    name: 'Eye of Fate',
    category: 'Special',
    effect: 'reveal',
    target: 'Single',
    params: { duration: 2 },
    order: 100,
    cooldown: 4,
    flavorText: 'Pierce the veil and reveal hidden truths.',
    tags: ['divination', 'anti-warlock', 'oracle']
  },

  sanctuaryOfTruth: {
    id: 'sanctuaryOfTruth',
    name: 'Sanctuary of Truth',
    category: 'Special',
    effect: 'sanctuary',
    target: 'Multi',
    params: { damageReduction: 0.3, duration: 2 },
    order: 300,
    cooldown: 5,
    flavorText: 'Create a sacred space where violence is diminished.',
    tags: ['holy', 'aoe-buff', 'ultimate']
  },

  relentlessFury: {
    id: 'relentlessFury',
    name: 'Relentless Fury',
    category: 'Special',
    effect: 'passive',
    target: 'Self',
    params: { damagePerLevel: 0.03, vulnerabilityPerLevel: 0.03 },
    order: 0,
    cooldown: 0,
    flavorText: 'Grow stronger with each level, but at a cost.',
    tags: ['passive', 'scaling', 'barbarian']
  },

  thirstyBlade: {
    id: 'thirstyBlade',
    name: 'Thirsty Blade',
    category: 'Special',
    effect: 'lifesteal',
    target: 'Self',
    params: { lifeSteal: 0.15, duration: 3 },
    order: 150,
    cooldown: 0,
    flavorText: 'Your weapon thirsts for blood and rewards you with vitality.',
    tags: ['lifesteal', 'sustained', 'barbarian']
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
    tags: ['control', 'monster', 'druid']
  },

  entangle: {
    id: 'entangle',
    name: 'Entangling Roots',
    category: 'Special',
    effect: 'stun',
    target: 'Multi',
    params: { stunDuration: 1, maxTargets: 3, chance: 0.8 },
    order: 400,
    cooldown: 5,
    flavorText: 'Roots burst from the earth to bind your enemies.',
    tags: ['nature', 'control', 'aoe']
  },

  // ========== UNUSED/SPECIAL ACCESS ABILITIES ==========
  // These abilities are not assigned to any class by default
  // They can be accessed through Adaptability or special events

  bloodFrenzy: {
    id: 'bloodFrenzy',
    name: 'Blood Frenzy',
    category: 'Special',
    effect: 'passive',
    target: 'Self',
    params: { damageIncreasePerHpMissing: 0.01 },
    order: 0,
    cooldown: 0,
    flavorText: 'The closer to death, the deadlier you become.',
    tags: ['passive', 'berserker', 'hidden']
  },

  unstoppableRage: {
    id: 'unstoppableRage',
    name: 'Unstoppable Rage',
    category: 'Special',
    effect: 'rage',
    target: 'Self',
    params: { damageBoost: 1.5, damageResistance: 0.3, duration: 3, selfDamagePercent: 0.25 },
    order: 500,
    cooldown: 6,
    flavorText: 'Enter a berserk state. Powerful but dangerous.',
    tags: ['ultimate', 'risky', 'hidden']
  },

  shadowStep: {
    id: 'shadowStep',
    name: 'Shadow Step',
    category: 'Defense',
    effect: 'teleport',
    target: 'Single',
    params: { swapPositions: true },
    order: 60,
    cooldown: 4,
    flavorText: 'Step through shadows to confuse your enemies.',
    tags: ['mobility', 'tactical', 'hidden']
  },

  mirrorImage: {
    id: 'mirrorImage',
    name: 'Mirror Image',
    category: 'Defense',
    effect: 'decoy',
    target: 'Self',
    params: { duration: 2, copyCount: 2 },
    order: 70,
    cooldown: 5,
    flavorText: 'Create illusory duplicates to confuse attackers.',
    tags: ['illusion', 'defense', 'hidden']
  },

  soulBurn: {
    id: 'soulBurn',
    name: 'Soul Burn',
    category: 'Attack',
    effect: 'soulburn',
    target: 'Single',
    params: { damage: 40, maxHpDamage: 0.1 },
    order: 1700,
    cooldown: 5,
    flavorText: 'Burn away a portion of the target\'s very essence.',
    tags: ['dark', 'percentage', 'hidden']
  },

  timeWarp: {
    id: 'timeWarp',
    name: 'Time Warp',
    category: 'Special',
    effect: 'timeManipulation',
    target: 'Single',
    params: { cooldownReduction: 2 },
    order: 600,
    cooldown: 6,
    flavorText: 'Manipulate time to hasten ability recovery.',
    tags: ['time', 'support', 'hidden']
  }
};

/**
 * Get ability by ID
 * @param {string} abilityId - The ability ID to retrieve
 * @returns {Object|null} The ability object or null if not found
 */
function getAbility(abilityId) {
  return abilities[abilityId] || null;
}

/**
 * Get multiple abilities by IDs
 * @param {Array<string>} abilityIds - Array of ability IDs
 * @returns {Array<Object>} Array of ability objects
 */
function getAbilities(abilityIds) {
  return abilityIds.map(id => getAbility(id)).filter(ability => ability !== null);
}

/**
 * Get abilities by tag
 * @param {string} tag - Tag to filter by
 * @returns {Array<Object>} Array of abilities with the specified tag
 */
function getAbilitiesByTag(tag) {
  return Object.values(abilities).filter(ability => 
    ability.tags && ability.tags.includes(tag)
  );
}

/**
 * Get abilities by category
 * @param {string} category - Category to filter by (Attack, Defense, Heal, Special)
 * @returns {Array<Object>} Array of abilities in the specified category
 */
function getAbilitiesByCategory(category) {
  return Object.values(abilities).filter(ability => ability.category === category);
}

/**
 * Get all ability IDs
 * @returns {Array<string>} Array of all ability IDs
 */
function getAllAbilityIds() {
  return Object.keys(abilities);
}

module.exports = {
  abilities,
  getAbility,
  getAbilities,
  getAbilitiesByTag,
  getAbilitiesByCategory,
  getAllAbilityIds
};