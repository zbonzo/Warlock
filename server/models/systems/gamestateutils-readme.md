# GameStateUtils

A utility class providing common operations on the game state and player collection to avoid duplication and ensure consistency.

## Overview

The `GameStateUtils` class centralizes helper functions for:
- Finding and filtering players
- Selecting targets
- Checking win conditions
- Getting player statistics
- Grouping players by attributes

## Usage

```javascript
// Create a GameStateUtils instance
const gameStateUtils = new GameStateUtils(players);

// Get all alive players
const alivePlayers = gameStateUtils.getAlivePlayers();

// Find a random target for an ability
const target = gameStateUtils.getRandomTarget({
  actorId: 'player1',
  excludeIds: ['player2'],
  includeMonster: true,
  monsterRef: monster
});

// Check if the game has a winner
const winner = gameStateUtils.checkWinConditions(numWarlocks, aliveCount);

// Find the player with lowest HP
const lowestHpPlayer = gameStateUtils.getLowestHpPlayer();

// Group players by race
const raceGroups = gameStateUtils.getPlayerGroups('race');
```

## Key Components

### Properties
- `players` - Map of all player objects

### Methods
- `getAlivePlayers()` - Get all currently alive players
- `isPlayerAlive(playerId)` - Check if a player is alive
- `getRandomTarget(options)` - Get a random target for an ability
- `checkWinConditions(numWarlocks, aliveCount)` - Check for game winner
- `countPlayersWithEffect(effectName)` - Count players with a status effect
- `getLowestHpPlayer(includeInvisible)` - Get player with lowest HP
- `getHighestHpPlayer(includeInvisible)` - Get player with highest HP
- `getPlayersSortedBy(property, ascending, includeInvisible)` - Sort players by property
- `allPlayersHave(players, property, value)` - Check if all players have same property value
- `getPlayerGroups(property)` - Group players by property

## Random Target Selection

The `getRandomTarget` method provides flexible targeting with these options:
- `actorId` - ID of the actor (usually excluded from targets)
- `excludeIds` - Additional IDs to exclude from targets
- `includeMonster` - Whether to include monster as a potential target
- `monsterRef` - Monster state reference (required if includeMonster is true)
- `onlyPlayers` - Whether to only select player targets

The method handles edge cases such as:
- No valid targets available
- All potential targets are invisible
- Falling back to self-targeting when appropriate
- Falling back to monster targeting when appropriate

## Win Conditions

The `checkWinConditions` method determines if the game has a winner:
- Returns `'Good'` when no warlocks remain and some players are alive
- Returns `'Evil'` when all remaining players are warlocks
- Returns `null` when the game is still in progress

## Player Grouping and Statistics

The class provides methods for analyzing player groups and statistics:
- Grouping players by common attributes (race, class, etc.)
- Sorting players by numeric properties (hp, armor, etc.)
- Finding players with minimum or maximum values
- Counting players with specific status effects
- Checking if a group of players shares a common property