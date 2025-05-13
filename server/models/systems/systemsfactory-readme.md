# SystemsFactory

A factory class that creates and properly wires all game subsystems with their dependencies.

## Overview

The `SystemsFactory` centralizes the creation of all game systems, ensuring proper dependency injection and initialization. This pattern makes it easier to test individual systems and maintain the complex relationships between them.

## Usage

```javascript
// Create all game systems with proper dependencies
const players = new Map(); // Player collection
const monster = { hp: 100, maxHp: 100, baseDmg: 10, age: 0 }; // Monster state

const systems = SystemsFactory.createSystems(players, monster);

// Access individual systems
const { 
  gameStateUtils, 
  statusEffectManager,
  warlockSystem,
  combatSystem,
  // etc.
} = systems;
```

## Systems Created

The factory creates and wires together these systems:

- `gameStateUtils` - Utility functions for game state
- `statusEffectManager` - Handles status effects like poison, stun, etc.
- `warlockSystem` - Manages warlock conversion and tracking
- `racialAbilitySystem` - Processes racial ability effects
- `monsterController` - Controls monster behavior and state
- `combatSystem` - Handles damage calculation and combat resolution
- `abilityRegistry` - Registry of all ability handlers

## Dependencies

Each system is initialized with its required dependencies in the correct order. For example:
- `statusEffectManager` depends on `gameStateUtils`
- `combatSystem` depends on multiple other systems
- `abilityRegistry` is connected with all other systems