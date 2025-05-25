/**
 * Test data fixtures for consistent testing
 */

const players = {
  alice: {
    id: 'player-alice',
    name: 'Alice',
    race: 'Human',
    class: 'Warrior',
    hp: 100,
    maxHp: 100,
    armor: 0,
    damageMod: 1.0,
    isAlive: true,
    isWarlock: false,
    isReady: false,
  },

  bob: {
    id: 'player-bob',
    name: 'Bob',
    race: 'Dwarf',
    class: 'Pyromancer',
    hp: 90,
    maxHp: 90,
    armor: 2,
    damageMod: 1.2,
    isAlive: true,
    isWarlock: false,
    isReady: true,
  },

  charlie: {
    id: 'player-charlie',
    name: 'Charlie',
    race: 'Elf',
    class: 'Assassin',
    hp: 80,
    maxHp: 80,
    armor: 0,
    damageMod: 1.5,
    isAlive: true,
    isWarlock: true,
    isReady: true,
  },
};

const gameRooms = {
  basic: {
    code: 'TEST',
    hostId: 'player-alice',
    started: false,
    round: 0,
    level: 1,
    players: new Map(),
    monster: {
      hp: 100,
      maxHp: 100,
      age: 0,
    },
  },

  inProgress: {
    code: 'PROG',
    hostId: 'player-alice',
    started: true,
    round: 3,
    level: 1,
    players: new Map([
      ['player-alice', players.alice],
      ['player-bob', players.bob],
    ]),
    monster: {
      hp: 60,
      maxHp: 100,
      age: 2,
    },
  },
};

const abilities = {
  slash: {
    type: 'slash',
    name: 'Slash',
    category: 'Attack',
    target: 'Single',
    unlockAt: 1,
    cooldown: 0,
    order: 1000,
    params: { damage: 33 },
  },

  heal: {
    type: 'heal',
    name: 'Heal',
    category: 'Heal',
    target: 'Single',
    unlockAt: 1,
    cooldown: 0,
    order: 50,
    params: { amount: 30 },
  },

  fireball: {
    type: 'fireball',
    name: 'Fireball',
    category: 'Attack',
    target: 'Single',
    unlockAt: 1,
    cooldown: 0,
    order: 1010,
    params: { damage: 35 },
  },
};

const statusEffects = {
  poison: {
    damage: 5,
    turns: 3,
  },

  stunned: {
    turns: 1,
  },

  shielded: {
    armor: 3,
    turns: 2,
  },
};

module.exports = {
  players,
  gameRooms,
  abilities,
  statusEffects,
};
