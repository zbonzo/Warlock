# MonsterController

A system that manages the monster entity, handling its state, behavior, attack patterns, and level progression.

## Overview

The `MonsterController` centralizes all monster-related logic:
- Manages monster health and damage
- Selects attack targets based on player status
- Handles monster aging and increasing difficulty
- Manages monster death and respawn between levels

## Usage

```javascript
// Create a monster controller
const monsterController = new MonsterController(
  monsterState,
  players,
  statusEffectManager,
  racialAbilitySystem,
  gameStateUtils
);

// Get current monster state
const state = monsterController.getState();

// Monster takes damage
monsterController.takeDamage(30, attackingPlayer, eventLog);

// Monster attacks a random player
monsterController.attack(eventLog, combatSystem);

// Handle monster death and respawn
const { newLevel, monsterState } = monsterController.handleDeathAndRespawn(
  currentLevel,
  eventLog
);
```

## Key Components

### Properties
- `monster` - Monster state object with hp, maxHp, baseDmg, and age
- `players` - Map of all player objects
- `statusEffectManager` - For checking player status effects
- `gameStateUtils` - For target selection and state queries

### Methods
- `getState()` - Get current monster state
- `ageMonster()` - Increase monster's age, making it more aggressive
- `takeDamage(amount, attacker, log)` - Apply damage to the monster
- `attack(log, combatSystem)` - Monster attacks a player
- `handleDeathAndRespawn(currentLevel, log)` - Handle monster death and respawn
- `isDead()` - Check if monster is dead

## Monster Progression

The monster scales in difficulty in two ways:
1. **Age Progression**: Each round, the monster's age increases, causing its attacks to deal more damage: `baseDmg * (age + 1)`
2. **Level Progression**: When the monster dies, the game advances to the next level, and a new monster spawns with increased health: `100 + (level - 1) * 50`

## Target Selection

The monster prioritizes targets in this order:
1. Player with the lowest HP who is not invisible
2. If no visible targets, it will select the player with the highest HP (even if invisible)
3. If no valid targets at all, the monster will not attack that round