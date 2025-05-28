# StatusEffectManager

A system for managing player status effects, their application, duration, and expiration throughout the game.

## Overview

The `StatusEffectManager` centralizes all status effect logic, providing:

- Consistent effect application and removal
- Standard effect parameters and defaults
- Automated effect processing each round
- Proper log message generation

## Usage

```javascript
// Create a status effect manager
const statusEffectManager = new StatusEffectManager(players, gameStateUtils);

// Apply an effect to a player
statusEffectManager.applyEffect(
  'player1',
  'poison',
  {
    damage: 10,
    turns: 3,
  },
  eventLog
);

// Check if a player has an effect
if (statusEffectManager.hasEffect('player1', 'stunned')) {
  // Player is stunned and cannot act this turn
}

// Get effect data
const protectionData = statusEffectManager.getEffectData('player1', 'shielded');
console.log(
  `Player has ${protectionData.armor} armor for ${protectionData.turns} turns`
);

// Process all timed effects at the end of a round
statusEffectManager.processTimedEffects(eventLog);

// Remove an effect
statusEffectManager.removeEffect('player1', 'invisible', eventLog);
```

## Supported Effects

### Poison

- Deals damage each round
- Parameters: `damage`, `turns`
- Applied by various abilities

### Shielded

- Provides additional armor
- Parameters: `armor`, `turns`
- Applied by shield/barrier abilities

### Invisible

- Prevents being targeted
- Parameters: `turns`
- Applied by stealth abilities

### Stunned

- Prevents action on the next turn
- Parameters: `turns`
- Applied by crowd control abilities

## Key Components

### Properties

- `players` - Map of all player objects
- `gameStateUtils` - Utility functions for game state
- `effectDefinitions` - Default parameters and behavior for each effect type

### Methods

- `applyEffect()` - Apply a status effect to a player
- `removeEffect()` - Remove a status effect from a player
- `hasEffect()` - Check if a player has a specific effect
- `getEffectData()` - Get effect parameters for a player
- `isPlayerStunned()` - Special helper for checking stun status
- `processTimedEffects()` - Process all effects for all players

## Effect Processing

The status effect system processes effects in this order:

1. Decrements turn counters
2. Applies effect results (damage for poison, etc.)
3. Checks if player dies from effects
4. Removes expired effects

## Message Generation

The system generates consistent log messages for effect:

- Application: "Player is poisoned for X damage over Y turns."
- Refreshing: "Player's poison is refreshed for X damage over Y turns."
- Expiration: "The poison affecting Player has worn off."
