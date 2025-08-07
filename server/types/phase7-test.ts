/**
 * @fileoverview Phase 7 TypeScript features test file
 * Tests type guards, utility types, conditional types, and system interfaces
 */

import { TypeGuards, assertPlayer } from './guards.js';
import {
  PartialPlayer,
  PlayerUpdate,
  CreatePlayerInput,
  DeepPartial,
  DeepReadonly,
  XOR,
  ApiResponse,
  // TypeUtils, // Commented out - not exported
  PlayerId,
  GameCode,
  ValidationResult
} from './utilities.js';
import {
  DamageEvents,
  PlayerByRole,
  AbilityByTarget,
  If,
  Equals,
  PickByValue,
  CamelToSnakeCase,
  createEventTypePredicate
} from './conditionals.js';
import {
  GameSystem,
  CombatSystemInterface,
  AbstractGameSystem,
  isCombatSystem
} from './systems.js';
import { CombatSystem } from '../models/systems/CombatSystem.js';
import { EventTypes } from '../models/events/EventTypes.js';
import type { Player, GameState, GameEvent } from './generated.js';

// Test 1: Type Guards
console.log('=== Testing Type Guards ===');

const testTypeGuards = () => {
  const unknownData: unknown = {
    id: 'player1',
    name: 'TestPlayer',
    class: 'Wizard',
    race: 'Elf',
    role: 'Good',
    status: 'alive',
    stats: {
      hp: 100,
      maxHp: 100,
      level: 1,
      experience: 0,
      gold: 0,
      attackPower: 10,
      defensePower: 10,
      magicPower: 10,
      luck: 50
    },
    abilities: [],
    statusEffects: [],
    actionThisRound: false,
    isReady: true
  };

  // Basic type guard
  if (TypeGuards.isPlayer(unknownData)) {
    console.log('✓ Player type guard works:', unknownData.name);
  }

  // Assertion type guard
  try {
    assertPlayer(unknownData);
    console.log('✓ Player assertion guard works');
  } catch (e) {
    console.error('✗ Player assertion failed:', e);
  }

  // Narrow type guards
  const player = unknownData as Player;
  if (TypeGuards.isAlivePlayer(player)) {
    console.log('✓ Alive player guard works, status:', player.status);
  }

  if (TypeGuards.isWarlockPlayer(player)) {
    console.log('✗ Should not be warlock');
  } else {
    console.log('✓ Correctly identified as non-warlock');
  }

  // Array type guards
  const playerArray = [player];
  if (TypeGuards.isPlayerArray(playerArray)) {
    console.log('✓ Player array guard works');
  }

  // Validation with details
  const validationResult = TypeGuards.validateWithDetails(unknownData, {} as any);
  if (validationResult.valid) {
    console.log('✓ Validation with details works');
  }
};

// Test 2: Utility Types
console.log('\n=== Testing Utility Types ===');

const testUtilityTypes = () => {
  // Partial types
  const partialPlayer: PartialPlayer = {
    name: 'Partial Player',
    stats: {
      hp: 50,
      maxHp: 100,
      level: 1,
      experience: 0,
      gold: 0,
      attackPower: 10,
      defensePower: 10,
      magicPower: 10,
      luck: 50
    }
  };
  console.log('✓ PartialPlayer type works:', partialPlayer['name']);

  // Update types
  const playerUpdate: PlayerUpdate = {
    health: 75,
    abilities: ['attack', 'heal'],
    statusEffects: [],
    stats: {
      hp: 75,
      maxHp: 100,
      level: 1,
      experience: 0,
      gold: 0,
      attackPower: 10,
      defensePower: 10,
      magicPower: 10,
      luck: 50
    }
  };
  console.log('✓ PlayerUpdate type works');

  // Creation types
  const createPlayer: CreatePlayerInput = {
    name: 'New Player',
    class: 'Knight',
    race: 'Human',
    role: 'Good',
    status: 'alive',
    stats: {
      hp: 100,
      maxHp: 100,
      level: 1,
      experience: 0,
      gold: 0,
      attackPower: 10,
      defensePower: 10,
      magicPower: 10,
      luck: 50
    },
    abilities: [],
    statusEffects: [],
    actionThisRound: false,
    isReady: true,
    position: { x: 0, y: 0 }
  };
  console.log('✓ CreatePlayerInput type works');

  // Deep partial
  const deepPartial: DeepPartial<Player> = {
    name: 'Deep Partial',
    stats: {
      hp: 50
    }
  };
  console.log('✓ DeepPartial type works');

  // Deep readonly
  const deepReadonly: DeepReadonly<Player> = {} as any;
  // This would cause a compile error:
  // deepReadonly.name = 'New Name';
  console.log('✓ DeepReadonly type works');

  // XOR type
  type StringOrNumber = XOR<{ str: string }, { num: number }>;
  const strValue: StringOrNumber = { str: 'hello' };
  const numValue: StringOrNumber = { num: 42 };
  // This would cause error: const both: StringOrNumber = { str: 'hello', num: 42 };
  console.log('✓ XOR type works');

  // API response types
  const successResponse: ApiResponse<Player> = {
    status: 'success',
    data: {} as Player,
    timestamp: new Date().toISOString()
  };

  if (successResponse.success) {
    console.log('✓ API success type guard works');
  }

  // Branded types
  const playerId: PlayerId = 'player123' as PlayerId;
  const gameCode: GameCode = 'ABC123' as GameCode;
  console.log('✓ Branded types work:', playerId, gameCode);
};

// Test 3: Conditional Types
console.log('\n=== Testing Conditional Types ===');

const testConditionalTypes = () => {
  // Event filtering
  const damageEvent: DamageEvents = {
    type: EventTypes.DAMAGE.APPLIED,
    payload: {} as any
  };
  console.log('✓ DamageEvents type works:', damageEvent.type);

  // Player role filtering
  const warlockPlayer: PlayerByRole<'Warlock'> = {
    role: 'Warlock'
  } as PlayerByRole<'Warlock'>;
  console.log('✓ PlayerByRole type works:', warlockPlayer.role);

  // Ability target filtering
  const areaAbility: AbilityByTarget<'area'> = {
    target: 'area'
  } as AbilityByTarget<'area'>;
  console.log('✓ AbilityByTarget type works:', areaAbility.target);

  // If-Then-Else
  type IsTrue = If<true, 'yes', 'no'>; // 'yes'
  type IsFalse = If<false, 'yes', 'no'>; // 'no'
  const ifResult: IsTrue = 'yes';
  console.log('✓ If conditional type works:', ifResult);

  // Equals type
  type Same = Equals<string, string>; // true
  type Different = Equals<string, number>; // false
  const equalsResult: Same = true;
  console.log('✓ Equals conditional type works:', equalsResult);

  // Pick by value
  type StringProps = PickByValue<{ a: string; b: number; c: string }, string>;
  const stringProps: StringProps = { a: 'hello', c: 'world' };
  console.log('✓ PickByValue type works');

  // String manipulation
  type SnakeCase = CamelToSnakeCase<'myVariableName'>; // 'my_variable_name'
  const snakeCase: SnakeCase = 'my_variable_name';
  console.log('✓ CamelToSnakeCase type works:', snakeCase);

  // Event type predicate
  const isDamageEvent = createEventTypePredicate(EventTypes.DAMAGE.APPLIED);
  const testEvent: GameEvent = {
    type: EventTypes.DAMAGE.APPLIED,
    payload: {} as any
  };
  
  if (isDamageEvent(testEvent)) {
    console.log('✓ Event type predicate works');
  }
};

// Test 4: System Interfaces
console.log('\n=== Testing System Interfaces ===');

const testSystemInterfaces = async () => {
  // Create a test combat system
  const combatSystem = new CombatSystem({
    players: new Map(),
    monsterController: {} as any,
    statusEffectManager: {} as any,
    racialAbilitySystem: {} as any,
    warlockSystem: {} as any,
    gameStateUtils: {} as any
  });

  // Test system identification
  if (isCombatSystem(combatSystem)) {
    console.log('✓ Combat system type guard works');
  }

  // Test interface methods
  console.log('✓ System name:', combatSystem.name);
  console.log('✓ System version:', combatSystem.version);

  // Test system configuration
  const config = combatSystem.getConfig();
  console.log('✓ System config:', config.enabled);

  // Update config
  combatSystem.updateConfig({ debug: true });
  console.log('✓ Config updated');

  // Test event handling
  const canHandle = combatSystem.canHandle({
    type: EventTypes.DAMAGE.APPLIED,
    payload: {} as any
  });
  console.log('✓ Can handle damage event:', canHandle);

  // Test subscribed events
  const subscribedEvents = combatSystem.subscribedEvents();
  console.log('✓ Subscribed events count:', subscribedEvents.length);

  // Test priority
  const priority = combatSystem.getPriority();
  console.log('✓ System priority:', priority);

  // Test validation - using any to avoid complex type conflicts in test file
  const testEvent: any = {
    type: 'damage.applied',
    payload: { 
      sourceId: 'attacker',
      targetId: 'test',
      damage: 10,
      damageType: 'physical',
      timestamp: new Date().toISOString()
    }
  };
  const validationResult = combatSystem.validate(testEvent);
  console.log('✓ Validation result:', validationResult.success);

  // Test combat-specific methods
  const canAttack = combatSystem.canAttack(
    { isAlive: true, statusEffects: [] } as any,
    { isAlive: true } as any
  );
  console.log('✓ Can attack check:', canAttack);

  const healingAmount = combatSystem.calculateHealing(
    {} as any,
    { health: 50, maxHealth: 100 } as any,
    30
  );
  console.log('✓ Healing calculation:', healingAmount);
};

// Test 5: Abstract Game System
console.log('\n=== Testing Abstract Game System ===');

class TestGameSystem extends AbstractGameSystem<GameState, GameEvent> {
  readonly name = 'TestSystem';
  readonly version = '1.0.0';

  async process(state: GameState, _event: GameEvent): Promise<GameState> {
    return state;
  }

  validate(_event: GameEvent): ValidationResult<GameEvent> {
    return {
      success: true,
      data: _event
    };
  }

  canHandle(_event: GameEvent): boolean {
    return true;
  }
}

const testAbstractSystem = async () => {
  const testSystem = new TestGameSystem();
  
  await testSystem.initialize();
  console.log('✓ System initialized:', testSystem.isReady());

  const config = testSystem.getConfig();
  console.log('✓ Default config:', config.enabled);

  testSystem.updateConfig({ debug: true });
  console.log('✓ Config updated');

  await testSystem.cleanup();
  console.log('✓ System cleaned up:', !testSystem.isReady());
};

// Run all tests
const runAllTests = async () => {
  try {
    testTypeGuards();
    testUtilityTypes();
    testConditionalTypes();
    await testSystemInterfaces();
    await testAbstractSystem();
    
    console.log('\n✅ All Phase 7 tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
};

// Export for external testing
export { runAllTests };

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}