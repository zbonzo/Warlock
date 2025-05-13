/**
 * @fileoverview Racial ability configuration data
 * Defines abilities for each playable race
 */

/**
 * Racial abilities configuration
 * 
 * Each race has a unique racial ability that provides additional strategic options
 * 
 * Properties:
 * - type: Unique identifier for the ability
 * - name: Display name of the ability
 * - description: Detailed explanation of what the ability does
 * - usageLimit: How many times the ability can be used (perGame, perRound)
 * - maxUses: Number of times the ability can be used per game/round
 * - cooldown: Rounds before ability can be used again (0 = no cooldown)
 * - effect: The primary effect of the ability
 * - target: Who can be targeted (Self, Single, Multi)
 * - params: Additional parameters for the ability
 */

/**
 * Race abilities mapped by race name
 * @type {Object}
 */
const racialAbilities = {
  Human: {
    type: 'adaptability',
    name: 'Adaptability',
    description: 'Change one of your class abilities to another of the same level for the remainder of the game',
    usageLimit: 'perGame',
    maxUses: 1,
    cooldown: 0,
    effect: 'changeAbility',
    target: 'Self',
    params: {}
  },
  
  Dwarf: {
    type: 'stoneResolve',
    name: 'Stone Resolve',
    description: 'Gain immunity to the next damage you would take',
    usageLimit: 'perGame',
    maxUses: 1,
    cooldown: 0,
    effect: 'immuneNextDamage',
    target: 'Self',
    params: {}
  },
  
  Elf: {
    type: 'keenSenses',
    name: 'Keen Senses',
    description: 'Your next attack reveals if your target is a Warlock',
    usageLimit: 'perGame',
    maxUses: 1,
    cooldown: 0,
    effect: 'revealWarlock',
    target: 'Single',
    params: {}
  },
  
  Orc: {
    type: 'bloodRage',
    name: 'Blood Rage',
    description: 'Double the damage of your next attack, but take 10 damage yourself',
    usageLimit: 'perGame',
    maxUses: 1,
    cooldown: 0,
    effect: 'doubleDamage',
    target: 'Self',
    params: { selfDamage: 10 }
  },
  
  Satyr: {
    type: 'forestsGrace',
    name: 'Forest\'s Grace',
    description: 'Apply a healing-over-time effect to yourself for 3 rounds',
    usageLimit: 'perRound',
    maxUses: 1,
    cooldown: 4,
    effect: 'healOverTime',
    target: 'Self',
    params: { amount: 5, turns: 3 }
  },
  
  Skeleton: {
    type: 'undying',
    name: 'Undying',
    description: 'Return to 1 HP the first time you would die',
    usageLimit: 'perGame',
    maxUses: 1,
    cooldown: 0,
    effect: 'resurrect',
    target: 'Self',
    params: { resurrectedHp: 1 }
  }
};

module.exports = racialAbilities;