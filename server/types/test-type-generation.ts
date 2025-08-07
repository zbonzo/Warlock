/**
 * Test file to verify Phase 2 type generation from Zod schemas
 * This file tests that all generated types work correctly
 */

import { 
  Player, 
  GameState, 
  PlayerClass, 
  PlayerRace,
  PlayerRole,
  Ability,
  StatusEffect,
  Monster,
  GamePhase,
  PlayerAction,
  isPlayer,
  isGameState,
  isValidAction,
  CreatePlayerInput,
  EventType,
  EventPayload,
  DeepPartial
} from './generated.js';

// Test 1: Basic type usage
const testPlayer: Player = {
  id: 'player-123',
  name: 'TestPlayer',
  class: 'Wizard',
  race: 'Elf',
  role: 'Good',
  status: 'alive',
  stats: {
    hp: 80,
    maxHp: 100,
    level: 5,
    experience: 1200,
    gold: 500,
    attackPower: 25,
    defensePower: 20,
    magicPower: 40,
    luck: 15
  },
  abilities: [{
    id: 'fireball',
    name: 'Fireball',
    description: 'Launches a powerful fireball',
    type: 'class',
    target: 'player',
    cooldown: 3,
    currentCooldown: 0,
    unlocked: true
  }],
  statusEffects: [],
  actionThisRound: false,
  isReady: true
};

// Test 2: Enum type checking
const playerClass: PlayerClass = 'Paladin';
const playerRace: PlayerRace = 'Human';
const playerRole: PlayerRole = 'Evil';
const gamePhase: GamePhase = 'night';

// Test 3: Complex nested types
const gameState: GameState = {
  gameCode: 'ABC123',
  players: {
    'player-1': testPlayer
  },
  phase: {
    current: 'setup',
    round: 1,
    turn: 1,
    canSubmitActions: true,
    actionsSubmitted: {}
  },
  rules: {
    maxPlayers: 8,
    minPlayers: 4,
    maxRounds: 20,
    turnTimeLimit: 120,
    warlockCount: 2,
    allowSpectators: false,
    allowLateJoin: false,
    difficultyModifier: 1.0
  },
  isActive: true,
  created: new Date().toISOString(),
  lastUpdated: new Date().toISOString()
};

// Test 4: Type guards
console.log('Testing type guards:');
console.log('isPlayer(testPlayer):', isPlayer(testPlayer));
console.log('isPlayer({})):', isPlayer({}));
console.log('isGameState(gameState):', isGameState(gameState));
console.log('isGameState(null):', isGameState(null));

// Test 5: Action types
const playerAction: PlayerAction = {
  playerId: 'player-123',
  actionType: 'ability',
  targetId: 'player-456',
  timestamp: new Date().toISOString(),
  round: 5,
  turn: 2
};

console.log('isValidAction(playerAction):', isValidAction(playerAction));

// Test 6: Event types with discriminated unions
const damageEvent: EventPayload<'damage.applied'> = {
  targetId: 'player-456',
  sourceId: 'player-123',
  damage: 25,
  damageType: 'magical',
  timestamp: new Date().toISOString()
};

// Test 7: Partial types
const playerUpdate: Partial<Player> = {
  status: 'dead',
  stats: {
    hp: 0,
    maxHp: 100,
    level: 5,
    experience: 1200,
    gold: 500,
    attackPower: 25,
    defensePower: 20,
    magicPower: 40,
    luck: 15
  }
};

// Test 8: Create input types (without auto-generated fields)
const createPlayerInput: CreatePlayerInput = {
  name: 'NewPlayer',
  class: 'Knight',
  race: 'Dwarf',
  role: 'Good',
  status: 'alive',
  stats: {
    hp: 100,
    maxHp: 100,
    level: 1,
    experience: 0,
    gold: 100,
    attackPower: 30,
    defensePower: 35,
    magicPower: 10,
    luck: 20
  },
  abilities: [],
  statusEffects: []
};

// Test 9: Deep partial utility type
const deepPartialGameState: DeepPartial<GameState> = {
  phase: {
    current: 'day',
    round: 5
  },
  players: {
    'player-1': {
      stats: {
        hp: 50
      }
    }
  }
};

// Test 10: Status effect with complex modifiers
const statusEffect: StatusEffect = {
  id: 'burning',
  name: 'Burning',
  description: 'Taking fire damage over time',
  type: 'debuff',
  duration: 3,
  remainingDuration: 3,
  stackable: true,
  stacks: 2,
  modifiers: {
    hp: -5,
    defensePower: -10,
    immunity: ['freeze'],
    vulnerability: ['water']
  }
};

// Test 11: Monster type
const monster: Monster = {
  id: 'monster-1',
  name: 'Ancient Dragon',
  hp: 500,
  maxHp: 500,
  level: 10,
  attackPower: 50,
  defensePower: 40,
  abilities: ['firebreath', 'tailswipe', 'roar'],
  statusEffects: [],
  isAlive: true,
  metadata: {
    element: 'fire',
    difficulty: 'legendary'
  }
};

// Test compilation success indicator
console.log('\n✅ All type tests compiled successfully!');
console.log('Types are properly generated from Zod schemas.');

// Export for verification
export {
  testPlayer,
  gameState,
  playerAction,
  damageEvent,
  playerUpdate,
  createPlayerInput,
  deepPartialGameState,
  statusEffect,
  monster
};