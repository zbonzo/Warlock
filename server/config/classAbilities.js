/**
 * @fileoverview Class ability configuration data
 * Defines abilities for each playable class
 */

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
 * - params: Parameters for the ability effect
 * - unlockAt: Level at which this ability becomes available
 * - order: Determines the sequence in which abilities act (lower numbers act first)
 * - - Ultra-fast attacks (1-9): Claw Swipe
 * - - Defensive abilities (10-99): Single Target 10-49, multi Target 50-99
 * - - Special abilities (100-999): Traps/Death Mark
 * - - Attack abilities (1000-9999): Fireball, Lightning Bolt, etc.
 * - - Healing abilities (10000-99999): Bandage, Heal, etc.
 * - cooldown: Cooldown time in seconds (0 for no cooldown)
 * - - Invisibility abilities: 3-5 turns (based on level/power)
 * - - Healing abilities: 2 turns
 * - - Multi-target attacks: 2-3 turns (based on level/power)
 * - - Single target attacks: No cooldown (0)
 * - - Basic defense: No cooldown (0)
 */

/**
 * Class abilities mapped by class name
 * @type {Object}
 */
const classAbilities = {
  Warrior: [
    { type: 'attack',     name: 'Slash',        category: 'Attack',  effect: null,        target: 'Single', params: { damage: 33 }, unlockAt: 1, order: 1000, cooldown: 0 },
    { type: 'shieldWall', name: 'Shield Wall',  category: 'Defense', effect: 'protected', target: 'Self',   params: { armor: 5, duration: 1 }, unlockAt: 2, order: 10, cooldown: 0 },
    { type: 'bandage',    name: 'Bandage',      category: 'Heal',    effect: null,        target: 'Self',   params: { amount: 20 }, unlockAt: 3, order: 10000, cooldown: 2 },
    { type: 'battleCry',  name: 'Battle Cry',   category: 'Special', effect: 'protected', target: 'Multi',  params: { armor: 3, duration: 1 }, unlockAt: 4, order: 50, cooldown: 3 }
  ],
  Pyromancer: [
    { type: 'fireball',     name: 'Fireball',          category: 'Attack',  effect: null,       target: 'Single', params: { damage: 35 }, unlockAt: 1, order: 1010, cooldown: 0 },
    { type: 'flameWard',    name: 'Flame Ward',        category: 'Defense', effect: 'protected', target: 'Self',   params: { armor: 3, duration: 1 }, unlockAt: 2, order: 11, cooldown: 0 },
    { type: 'emberRestore', name: 'Ember Restoration', category: 'Heal',    effect: null,       target: 'Self',   params: { amount: 15 }, unlockAt: 3, order: 10010, cooldown: 2 },
    { type: 'infernoBlast', name: 'Inferno Blast',     category: 'Special', effect: 'poison',    target: 'Multi',  params: { damage: 15, poison: { damage: 5, turns: 2 } }, unlockAt: 4, order: 1530, cooldown: 3 }
  ],
  Wizard: [
    { type: 'fireball',     name: 'Fireball',        category: 'Attack',  effect: null,       target: 'Single', params: { damage: 34 }, unlockAt: 1, order: 1011, cooldown: 0 },
    { type: 'arcaneShield', name: 'Arcane Shield',   category: 'Defense', effect: 'protected', target: 'Self',   params: { armor: 4, duration: 1 }, unlockAt: 2, order: 12, cooldown: 0 },
    { type: 'arcaneMend',   name: 'Arcane Mending',  category: 'Heal',    effect: null,       target: 'Self',   params: { amount: 20 }, unlockAt: 3, order: 10020, cooldown: 2 },
    { type: 'meteorShower', name: 'Meteor Shower',   category: 'Special', effect: null,       target: 'Multi',  params: { damage: 20 }, unlockAt: 4, order: 1500, cooldown: 3 }
  ],
  Assassin: [
    { type: 'backstab',     name: 'Backstab',        category: 'Attack',  effect: null,       target: 'Single', params: { damage: 40 }, unlockAt: 1, order: 1020, cooldown: 0 },
    { type: 'shadowVeil',   name: 'Shadow Veil',     category: 'Defense', effect: 'invisible', target: 'Self',   params: { duration: 1 }, unlockAt: 2, order: 13, cooldown: 4 },
    { type: 'adrenalSurge', name: 'Adrenal Surge',   category: 'Heal',    effect: null,       target: 'Self',   params: { amount: 15 }, unlockAt: 3, order: 10030, cooldown: 2 },
    { type: 'deathMark',    name: 'Death Mark',      category: 'Special', effect: 'poison',    target: 'Single', params: { poison: { damage: 10, turns: 2 } }, unlockAt: 4, order: 140, cooldown: 0 }
  ],
  Rogue: [
    { type: 'poisonStrike', name: 'Poison Strike',   category: 'Attack',  effect: 'poison',   target: 'Single', params: { damage: 20, poison: { damage: 8, turns: 2 } }, unlockAt: 1, order: 1030, cooldown: 0 },
    { type: 'smokeBomb',    name: 'Smoke Bomb',      category: 'Defense', effect: 'invisible', target: 'Self',   params: { duration: 1 }, unlockAt: 2, order: 14, cooldown: 4 },
    { type: 'evasionRest',  name: 'Evasion Rest',    category: 'Heal',    effect: null,       target: 'Self',   params: { amount: 20 }, unlockAt: 3, order: 10040, cooldown: 2 },
    { type: 'shadowstep',   name: 'Shadowstep',      category: 'Special', effect: 'invisible', target: 'Single', params: { duration: 1 }, unlockAt: 4, order: 110, cooldown: 3 }
  ],
  Priest: [
    { type: 'holyBolt',     name: 'Holy Bolt',       category: 'Attack',  effect: null,       target: 'Single', params: { damage: 25 }, unlockAt: 1, order: 1040, cooldown: 0 },
    { type: 'divineGuard',  name: 'Divine Guard',    category: 'Defense', effect: 'protected', target: 'Self',   params: { armor: 4, duration: 1 }, unlockAt: 2, order: 15, cooldown: 0 },
    { type: 'heal',         name: 'Heal',            category: 'Heal',    effect: null,       target: 'Single', params: { amount: 30 }, unlockAt: 3, order: 10050, cooldown: 2 },
    { type: 'divineShield', name: 'Divine Shield',   category: 'Special', effect: 'protected', target: 'Multi',  params: { armor: 2, duration: 1 }, unlockAt: 4, order: 51, cooldown: 3 }
  ],
  Oracle: [
    { type: 'holyBolt',     name: 'Holy Bolt',       category: 'Attack',  effect: null,       target: 'Single', params: { damage: 25 }, unlockAt: 1, order: 1041, cooldown: 0 },
    { type: 'foresight',    name: 'Foresight Shield',category: 'Defense', effect: 'protected', target: 'Self',   params: { armor: 3, duration: 1 }, unlockAt: 4, order: 16, cooldown: 0 },
    { type: 'divineBalm',   name: 'Divine Balm',     category: 'Heal',    effect: null,       target: 'Single', params: { amount: 25 }, unlockAt: 3, order: 10060, cooldown: 2 },
    { type: 'fatesEye',     name: 'Eye of Fate',      category: 'Special', effect: 'detect',    target: 'Single', params: {}, unlockAt: 2, order: 100, cooldown: 0 }
  ],
  Seer: [
    { type: 'psychicBolt',  name: 'Psychic Bolt',    category: 'Attack',  effect: null,       target: 'Single', params: { damage: 28 }, unlockAt: 1, order: 1050, cooldown: 0 },
    { type: 'spiritGuard',  name: 'Spirit Guard',    category: 'Defense', effect: 'protected', target: 'Self',   params: { armor: 3, duration: 1 }, unlockAt: 3, order: 17, cooldown: 0 },
    { type: 'spiritMend',   name: 'Spirit Mend',     category: 'Heal',    effect: null,       target: 'Self',   params: { amount: 20 }, unlockAt: 4, order: 10070, cooldown: 2 },
    { type: 'revealSecret', name: 'Reveal Secret',   category: 'Special', effect: 'detect',    target: 'Single', params: {}, unlockAt: 2, order: 101, cooldown: 0 }
  ],
  Shaman: [
    { type: 'lightningBolt', name: 'Lightning Bolt',  category: 'Attack',  effect: null,       target: 'Single', params: { damage: 30 }, unlockAt: 1, order: 1060, cooldown: 0 },
    { type: 'totemShield',   name: 'Totemic Barrier', category: 'Defense', effect: 'protected', target: 'Self',   params: { armor: 3, duration: 1 }, unlockAt: 2, order: 18, cooldown: 0 },
    { type: 'ancestralHeal', name: 'Ancestral Heal',  category: 'Heal',    effect: null,       target: 'Single', params: { amount: 20 }, unlockAt: 3, order: 10080, cooldown: 2 },
    { type: 'chainLightning',name: 'Chain Lightning', category: 'Special', effect: null,       target: 'Multi',  params: { damage: 18 }, unlockAt: 4, order: 1510, cooldown: 2 }
  ],
  Gunslinger: [
    { type: 'pistolShot',    name: 'Pistol Shot',     category: 'Attack',  effect: null,       target: 'Single', params: { damage: 32 }, unlockAt: 1, order: 1070, cooldown: 0 },
    { type: 'smokeScreen',   name: 'Smoke Screen',    category: 'Defense', effect: 'invisible', target: 'Self',   params: { duration: 1 }, unlockAt: 2, order: 19, cooldown: 4 },
    { type: 'bandolierPatch',name: 'Bandolier Patch', category: 'Heal',    effect: null,       target: 'Self',   params: { amount: 15 }, unlockAt: 3, order: 10090, cooldown: 2 },
    { type: 'ricochetRound', name: 'Ricochet Round',  category: 'Special', effect: null,       target: 'Multi',  params: { damage: 16 }, unlockAt: 4, order: 1520, cooldown: 2 }
  ],
  Tracker: [
    { type: 'preciseShot',   name: 'Precise Shot',    category: 'Attack',  effect: null,       target: 'Single', params: { damage: 33 }, unlockAt: 1, order: 1080, cooldown: 0 },
    { type: 'camouflage',    name: 'Camouflage',      category: 'Defense', effect: 'invisible', target: 'Self',   params: { duration: 1 }, unlockAt: 2, order: 20, cooldown: 4 },
    { type: 'survivalInst',  name: 'Survival Inst.',  category: 'Heal',    effect: null,       target: 'Self',   params: { amount: 15 }, unlockAt: 3, order: 10100, cooldown: 2 },
    { type: 'poisonTrap',    name: 'Poison Trap',     category: 'Special', effect: 'poison',    target: 'Multi',  params: { poison: { damage: 7, turns: 2 } }, unlockAt: 4, order: 120, cooldown: 3 }
  ],
  Druid: [
    { type: 'clawSwipe',     name: 'Claw Swipe',      category: 'Attack',  effect: null,       target: 'Single', params: { damage: 30 }, unlockAt: 1, order: 5, cooldown: 0 },
    { type: 'barkskin',      name: 'Barkskin',        category: 'Defense', effect: 'protected', target: 'Self',   params: { armor: 3, duration: 1 }, unlockAt: 2, order: 21, cooldown: 0 },
    { type: 'rejuvenation',  name: 'Rejuvenation',    category: 'Heal',    effect: null,       target: 'Multi',  params: { amount: 12 }, unlockAt: 3, order: 10110, cooldown: 2 },
    { type: 'entangle',      name: 'Entangling Roots',category: 'Special', effect: 'stunned',   target: 'Multi',  params: { chance: 0.5, duration: 1 }, unlockAt: 4, order: 130, cooldown: 3 }
  ]
};

module.exports = classAbilities;