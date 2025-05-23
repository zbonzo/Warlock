# Warlock Game Server

A Node.js/Socket.IO server for the multiplayer Warlock game, featuring real-time gameplay, character abilities, status effects, and game state management.

## Architecture Overview

The server follows a modular architecture with clear separation of concerns:

```
server/
├── config/           # Game configuration and balance
├── controllers/      # Socket event handlers
├── middleware/       # Validation and request processing
├── models/           # Game entities and business logic
├── services/         # High-level game services
├── utils/            # Utility functions and helpers
├── shared/           # Shared validation logic
└── routes/           # REST API endpoints
```

## Core Components

### 🎮 Entry Points

#### `index.js`

Main entry point that registers module aliases and starts the server.

#### `server.js`

Express and Socket.IO server setup with:

- CORS configuration
- Socket event handlers
- Rate limiting
- Error handling
- Health check endpoints

### ⚙️ Configuration (`config/`)

#### `index.js`

Central configuration loader that combines all config modules and applies environment overrides.

#### `gameBalance.js`

Core game balance settings including:

- Monster scaling (HP, damage progression)
- Player stats (armor reduction, level bonuses)
- Warlock conversion mechanics
- Combat timing and orders
- Helper functions for calculations

#### `messages.js`

Centralized message templates for:

- Error messages (validation, game state, permissions)
- Success messages (actions completed)
- Event messages (combat, status effects, game progression)
- Private messages (player-specific notifications)
- Win condition messages

#### `statusEffects.js`

Status effect definitions and behavior:

- Effect defaults (poison, shielded, invisible, stunned, etc.)
- Processing order and timing
- Message templates for each effect
- Helper functions for effect management

#### Character Configuration

##### `character/races.js`

- Available races and their stat modifiers
- Race-class compatibility mappings
- Racial abilities (Adaptability, Keen Senses, Blood Rage, etc.)
- Validation helpers

##### `character/classes.js`

- Available classes and their stat modifiers
- Class abilities by level with damage values
- Ability categorization (Attack, Defense, Heal, Special)
- Unlock progression and cooldowns

##### `character/playerSettings.js`

- Base player stats and progression
- Reconnection and death settings
- Default values and limits

#### Environment Configuration

##### `environments/development.js`

Development-specific settings with relaxed timeouts and increased logging.

##### `environments/production.js`

Production settings with strict rate limiting and performance optimizations.

##### `environments/test.js`

Test environment with minimal timeouts and deterministic behavior.

### 🎯 Controllers (`controllers/`)

#### `GameController.js`

Handles core game mechanics:

- `handleCreateGame()` - Create new game rooms
- `handleStartGame()` - Initialize gameplay
- `handlePerformAction()` - Process player actions
- `handleRacialAbility()` - Handle racial ability usage
- `handleAdaptabilityReplace()` - Human racial ability implementation
- `handlePlayerNextReady()` - Round progression voting

#### `playerController.js`

Manages player lifecycle:

- `handlePlayerJoin()` - Player joining games
- `handleSelectCharacter()` - Race/class selection
- `handlePlayerDisconnect()` - Disconnect handling with reconnection support
- `handlePlayerReconnection()` - Reconnection logic

#### `MonsterController.js`

Manages the monster entity:

- State management (HP, damage, age)
- Target selection algorithms
- Attack execution with damage calculation
- Death/respawn and level progression
- Integration with combat system

### 🛡️ Middleware (`middleware/`)

#### `validation.js`

Input validation and sanitization:

- `validateGame()` - Game existence and format
- `validatePlayer()` - Player membership validation
- `validateGameState()` - Game phase validation
- `validateHost()` - Host permission checks
- `validateAction()` - Action validity with cooldown checks

### 🏗️ Models (`models/`)

#### `GameRoom.js`

Central game state manager:

- Player management (add, remove, character selection)
- Action queuing and validation with cooldown support
- Round processing coordination
- Win condition checking
- System integration and coordination

#### `Player.js`

Player entity with comprehensive state management:

- Basic stats (HP, armor, damage modifiers)
- Status effect tracking and processing
- Ability cooldown management
- Racial ability state and effects
- Combat calculations (damage, healing, armor)
- Class effect processing (Blood Frenzy, Unstoppable Rage)

#### `AbilityRegistry.js`

Centralized ability handler registry:

- Class and racial ability registration
- Handler execution with error handling
- Dynamic ability discovery
- Debug information and statistics

#### Systems (`models/systems/`)

##### `SystemsFactory.js`

Factory for creating and wiring all game systems with proper dependencies.

##### `CombatSystem.js`

Combat mechanics and damage processing:

- Player and monster damage application
- Death and resurrection handling
- Area-of-effect abilities (damage and healing)
- Armor calculations and vulnerability
- Counter-attack mechanics (Spirit Guard, Sanctuary)

##### `StatusEffectManager.js`

Status effect lifecycle management:

- Effect application with proper timing
- Round-based processing and countdown
- Effect stacking and refresh logic
- Poison damage and armor degradation
- Message generation for all effects

##### `WarlockSystem.js`

Warlock mechanics and conversion:

- Initial warlock assignment
- Conversion chance calculations
- Warlock count tracking
- Win condition evaluation
- Random and targeted conversion logic

##### `RacialAbilitySystem.js`

Racial ability processing:

- Ability validation and queuing
- Cooldown and usage tracking
- Healing over time effects (Satyr)
- End-of-round effect processing

##### `GameStateUtils.js`

Game state utility functions:

- Player filtering and targeting
- Win condition checking
- Statistical queries (lowest HP, groups, etc.)
- Random target selection with invisibility handling
- Ability replacement (Human Adaptability)

##### `MonsterController.js`

Monster AI and behavior:

- Intelligent target selection
- Damage scaling with age
- Level progression and respawn
- Attack pattern coordination

#### Ability Handlers (`models/systems/abilityHandlers/`)

##### `index.js`

Entry point that registers all ability handlers and validates coverage.

##### `attackAbilities.js`

Damage-dealing abilities:

- Basic attacks with damage calculation
- Poison attacks (Death Mark, Poison Strike)
- Multi-hit abilities (Arcane Barrage)
- Area damage (Meteor Shower, Inferno Blast)
- Special attacks (Reckless Strike with self-damage)

##### `defenseAbilities.js`

Protective abilities:

- Shield effects (Shield Wall, Battle Cry)
- Invisibility (Shadow Veil, Smoke Bomb)
- Multi-target protection
- Status effect application

##### `healAbilities.js`

Healing abilities:

- Single-target healing with warlock rejection
- Multi-target healing (Rejuvenation)
- Healing modifier calculations
- Warlock-specific healing behavior

##### `specialAbilities.js`

Utility and special abilities:

- Detection abilities (Eye of Fate)
- Status infliction (Primal Roar, Entangle)
- Barbarian abilities (Blood Frenzy, Unstoppable Rage)
- Oracle abilities (Spirit Guard, Sanctuary of Truth)
- Monster control (Control Monster)

##### `racialAbilities.js`

Race-specific abilities:

- Human Adaptability with UI integration
- Elf Keen Senses with next-attack flagging
- Orc Blood Rage with damage doubling
- Satyr Forest's Grace with healing over time
- Skeleton Undying with resurrection logic

##### `abilityRegistryUtils.js`

Utility functions for dynamic ability registration:

- Category-based registration
- Effect and target filtering
- Criteria-based matching
- Pattern matching and debugging

### 🔧 Services (`services/`)

#### `gameService.js`

High-level game management:

- Game creation and cleanup
- Timeout management
- Round processing orchestration
- Player list broadcasting
- Win condition checking
- Reconnection support

#### `PlayerSessionManager.js`

Player session and reconnection management:

- Session tracking across disconnections
- Socket ID mapping and updates
- Automatic cleanup of expired sessions
- Reconnection window enforcement

### 🛠️ Utilities (`utils/`)

#### `errorHandler.js`

Centralized error handling:

- Standardized error types and creation
- Socket error handling wrapper
- User-friendly error messages
- Logging integration

#### `logger.js`

Logging utility with:

- Multiple log levels (ERROR, WARN, INFO, DEBUG)
- Environment-based level control
- Consistent formatting with timestamps

### 🔗 Shared (`shared/`)

#### `gameChecks.js`

Reusable validation logic:

- Combined game state validation
- Host and player permission checks
- Consistent error handling

### 🌐 Routes (`routes/`)

#### `configRoutes.js`

REST API for game configuration:

- `/api/config` - Basic server settings
- `/api/config/races` - Race information
- `/api/config/classes` - Class information
- `/api/config/compatibility` - Race-class mappings
- `/api/config/abilities/:className` - Class abilities
- `/api/config/racial-abilities` - Racial abilities

### 📋 Configuration Files

#### `babel.config.js`

Babel configuration for ES6+ support and module aliases.

#### `jest.config.js`

Jest testing configuration with:

- Module path mapping
- Coverage settings
- Test environment setup

#### `package.json`

Dependencies and scripts:

- Socket.IO for real-time communication
- Express for REST API
- Babel for modern JavaScript
- Jest for testing

## Key Features

### 🎲 Game Mechanics

- **Real-time multiplayer** with Socket.IO
- **Character system** with races, classes, and abilities
- **Status effects** with proper timing and stacking
- **Ability cooldowns** to prevent spam
- **Monster scaling** that increases difficulty over time
- **Warlock conversion** with dynamic probability

### 🔄 State Management

- **Centralized game state** in GameRoom
- **System coordination** through SystemsFactory
- **Event-driven architecture** with proper logging
- **Reconnection support** with session management

### ⚖️ Balance System

- **Configurable damage values** for all abilities
- **Armor reduction calculations** with diminishing returns
- **Level progression** with stat increases
- **Win condition balancing** based on player ratios

### 🛡️ Error Handling

- **Comprehensive validation** at all entry points
- **User-friendly error messages** with proper categorization
- **Graceful failure handling** with logging
- **Rate limiting** to prevent abuse

### 🧪 Testing Support

- **Modular architecture** for easy unit testing
- **Dependency injection** through SystemsFactory
- **Test-specific configuration** with deterministic behavior
- **Mock-friendly design** with clear interfaces

## Development Workflow

1. **Configuration** - Modify balance and game rules in `config/`
2. **Abilities** - Add new abilities in `abilityHandlers/`
3. **Features** - Implement new systems in `models/systems/`
4. **API** - Extend REST endpoints in `routes/`
5. **Testing** - Write tests with Jest configuration

## Environment Variables

- `NODE_ENV` - Environment (development/production/test)
- `PORT` - Server port (default: 3001)
- `LOG_LEVEL` - Logging verbosity (ERROR/WARN/INFO/DEBUG)
- `GAME_TIMEOUT_MINUTES` - Game timeout in minutes

## Module Aliases

The server uses module aliases for clean imports:

- `@config` - Configuration modules
- `@controllers` - Socket event handlers
- `@middleware` - Validation middleware
- `@models` - Game entities and systems
- `@services` - High-level services
- `@utils` - Utility functions
- `@shared` - Shared validation logic

This architecture provides a scalable, maintainable foundation for the multiplayer Warlock game with comprehensive feature support and robust error handling.
