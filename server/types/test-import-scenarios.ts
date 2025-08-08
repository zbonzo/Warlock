/**
 * Test various import scenarios for type generation
 * Ensures types can be imported from JavaScript files
 */

import { Player, GameState, isPlayer } from './generated.js';
import { PlayerSchemas } from '../models/validation/ZodSchemas.js';
import { secureRandomInt } from '../utils/secureRandom.js';
// Zod import not needed in this test file

// Test 1: Using Zod schema directly for validation
const validatePlayer = (data: unknown): Player | null => {
  const result = PlayerSchemas.player.safeParse(data);
  if (result.success) {
    return result.data;
  }
  /* eslint-disable-next-line no-console */
  console.error('Validation errors:', result.error.errors);
  return null;
};

// Test 2: Type inference from Zod schema - test compilation only

// Test 3: Using type guard
const checkPlayerType = (obj: any): void => {
  if (isPlayer(obj)) {
    /* eslint-disable-next-line no-console */
    console.log(`Player ${obj.name} is valid`);
    // TypeScript knows obj is Player type here
    // Type validation successful
  } else {
    /* eslint-disable-next-line no-console */
    console.log('Not a valid player object');
  }
};

// Test 4: Mixed JS/TS scenario - importing from JS file
// This would simulate importing from existing JS code
type MockJSImport = {
  playerId: string;
  data: unknown;
};

const processJSData = (jsData: MockJSImport): Player | null => {
  // Use type guard to validate JS data
  if (isPlayer(jsData.data)) {
    return jsData.data;
  }
  return null;
};

// Test 5: Creating typed functions
const createNewPlayer = (
  name: string,
  playerClass: Player['class'],
  race: Player['race']
): Player => {
  const newPlayer: Player = {
    id: `player-${secureRandomInt(1000, 9999)}`,
    name,
    class: playerClass,
    race,
    role: 'Good',
    status: 'alive',
    stats: {
      hp: 100,
      maxHp: 100,
      level: 1,
      experience: 0,
      gold: 100,
      attackPower: 20,
      defensePower: 20,
      magicPower: 20,
      luck: 10
    },
    abilities: [],
    statusEffects: [],
    actionThisRound: false,
    isReady: false
  };

  return newPlayer;
};

// Test 6: Array operations with types
const filterAlivePlayers = (players: Player[]): Player[] => {
  return players.filter(p => p.status === 'alive');
};

const getPlayersByRole = (
  gameState: GameState,
  role: Player['role']
): Player[] => {
  return Object.values(gameState.players).filter((p: Player) => p.role === role);
};

// Test compilation
/* eslint-disable-next-line no-console */
console.log('✅ Import scenario tests compiled successfully!');

export {
  validatePlayer,
  checkPlayerType,
  processJSData,
  createNewPlayer,
  filterAlivePlayers,
  getPlayersByRole
};
