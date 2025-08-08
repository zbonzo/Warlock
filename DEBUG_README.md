# Debug Configuration System

A flexible debug logging system has been implemented to help troubleshoot issues with game start, combat, battle modal, and other game functionality.

## Quick Setup

1. **Copy the example environment file:**
   ```bash
   cp .env.debug.example .env
   ```

2. **Edit `.env` to enable the debug features you need:**
   ```bash
   # Master debug toggle
   DEBUG=true
   
   # Enable specific debug categories
   DEBUG_GAME_START=false          # Game start logging (now behind config)
   DEBUG_COMBAT=true               # Combat system logging
   DEBUG_ROUND_RESULTS=true        # Round result processing and modal triggers
   DEBUG_PHASE_TRANSITIONS=true    # Game phase changes
   DEBUG_PLAYER_ACTIONS=true       # Player action submissions
   ```

## Debug Categories

### Available Debug Features:
- `DEBUG_GAME_START` - Detailed logging of game start process (moved from hardcoded console.log)
- `DEBUG_COMBAT` - Combat system processing and round resolution
- `DEBUG_ROUND_RESULTS` - Round result broadcasting and battle modal triggers
- `DEBUG_SOCKET_EVENTS` - Socket event emissions and handling
- `DEBUG_PLAYER_ACTIONS` - Player action submissions and validation
- `DEBUG_STATUS_EFFECTS` - Status effect application and removal
- `DEBUG_ABILITY_EXECUTION` - Ability processing and effects
- `DEBUG_PHASE_TRANSITIONS` - Game phase changes (action ↔ results)
- `DEBUG_VALIDATION` - Input validation and error handling
- `DEBUG_EVENT_BUS` - Internal event system messages

### Log Levels:
- `DEBUG_LEVEL_VERBOSE` - Detailed internal state information
- `DEBUG_LEVEL_INFO` - General flow and status messages
- `DEBUG_LEVEL_WARN` - Warnings and potential issues
- `DEBUG_LEVEL_ERROR` - Errors and failures

## Battle Modal Troubleshooting

The debug system now includes comprehensive logging for battle modal issues:

1. **Enable round results debugging:**
   ```bash
   DEBUG_ROUND_RESULTS=true
   DEBUG_COMBAT=true
   DEBUG_PHASE_TRANSITIONS=true
   ```

2. **Watch the server logs for:**
   - `🎯 All players have submitted actions` - Round processing starts
   - `🛡️ Starting round processing` - Combat system engaged
   - `📢 Broadcasting roundResult event` - Modal trigger sent to client
   - `✅ roundResult event broadcasted` - Confirmation of broadcast

3. **Common issues to check:**
   - No `roundResult` event being broadcast (check combat debug logs)
   - Event being broadcast but not received (check socket connections)
   - Modal data missing or malformed (check round results debug logs)

## Usage in Code

Debug loggers are automatically created and used throughout the system:

```typescript
// Example from GameController
this.debug.info('Game start successful');
this.debug.verbose('Detailed game state:', gameData);
this.debug.error('Game start failed:', error);

// Example from GameRoom
this.combatDebug.info('🎯 All players submitted actions');
this.roundResultsDebug.info('📢 Broadcasting round results');
```

## Disabling Debug

To disable all debug logging:
```bash
DEBUG=false
```

Or remove/rename the `.env` file.

## Performance Notes

- Debug logging has minimal performance impact when disabled
- Verbose logging can generate significant output - use selectively
- Debug logs are separate from production logging and won't affect game analytics