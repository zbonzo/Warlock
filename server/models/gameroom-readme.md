# GameRoom Class

The central game state manager that coordinates all game systems and processes player actions.

## Overview

The `GameRoom` class represents a single game instance with its own unique code. It manages:
- Player joining, leaving, and character selection
- Game state progression and round processing
- Action handling for both regular and racial abilities
- Coordination between various game systems like combat, monster AI, and warlock mechanics

## Usage

```javascript
// Create a new game room with a unique code
const gameRoom = new GameRoom('ABCD');

// Add players
gameRoom.addPlayer('socket123', 'PlayerName');

// Set player characters
gameRoom.setPlayerClass('socket123', 'Human', 'Warrior');

// Start the game
gameRoom.assignInitialWarlock();
gameRoom.started = true;

// Process actions
gameRoom.addAction('socket123', 'attack', 'targetId');

// Process a game round
const result = gameRoom.processRound();
```

## Key Components

### Properties
- `code` - Unique game room identifier
- `players` - Map of all player objects
- `monster` - Monster stats and state
- `systems` - Game systems created by SystemsFactory
- `round`, `level` - Current game progression
- `pendingActions`, `pendingRacialActions` - Queued player actions

### Methods
- `addPlayer(id, name)` - Add a player to the game
- `removePlayer(id)` - Remove a player from the game
- `setPlayerClass(id, race, class)` - Set a player's race and class
- `assignInitialWarlock()` - Randomly assign the first warlock
- `addAction()`, `addRacialAction()` - Queue player actions
- `processRound()` - Process a complete game round
- `getPlayersInfo()` - Get serialized player data for clients

## Dependencies

- `Player` - Player data model
- `SystemsFactory` - Creates all game subsystems
- `classAbilities`, `racialAbilities` - Game data configuration

## Event Flow

1. Players join and select characters
2. Game starts and assigns an initial warlock
3. Each round:
   - Players submit actions
   - Actions are processed in sequence
   - The monster attacks
   - Status effects are applied/removed
   - Win conditions are checked