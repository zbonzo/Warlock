# Socket Events Documentation

## Client to Server Events (Client Emits)

### Game Management
- **`createGame`** - Host creates a new game
  - Data: `{ playerName: string }`
  - Location: `client/src/App.tsx:343`

- **`joinGame`** - Player joins an existing game by code  
  - Data: `{ gameCode: string, playerName: string }`
  - Location: `client/src/App.tsx:352`

- **`playAgain`** - Start a new game after completion
  - Data: `{ gameCode: string, playerName: string }`
  - Location: `client/src/pages/EndPage/EndPage.tsx:81`

- **`startGame`** - Host starts the game when ready
  - Data: `{ gameCode: string }`
  - Location: `client/src/App.tsx:380`

- **`reconnectToGame`** - Reconnect to an existing game
  - Data: `{ gameCode: string, playerName: string }`
  - Location: `client/src/App.tsx:385`

### Player Actions
- **`checkNameAvailability`** - Check if player name is available in room
  - Data: `{ gameCode: string, playerName: string }`
  - Location: `client/src/pages/JoinGamePage/JoinGamePage.tsx:127`

- **`selectCharacter`** - Player selects race and class
  - Data: `{ gameCode: string, race: string, className: string }`
  - Location: `client/src/App.tsx:362`

- **`performAction`** - Player performs an action during their turn
  - Data: `{ gameCode: string, actionType: string, targetId: string, bloodRageActive?: boolean, keenSensesActive?: boolean }`
  - Locations: 
    - `client/src/App.tsx:394`
    - `client/src/pages/GamePage/GamePage.tsx:116`

- **`useRacialAbility`** - Player uses a racial ability
  - Data: `{ gameCode: string, targetId: string, abilityType: string }`
  - Locations:
    - `client/src/pages/GamePage/GamePage.tsx:126`
    - `client/src/pages/GamePage/GamePage.tsx:135`

- **`replaceAbility`** - Replace an ability
  - Data: `{ gameCode: string, oldAbilityType: string, newAbilityType: string }`
  - Location: `client/src/pages/GamePage/GamePage.tsx:165`

- **`playerNextReady`** - Player is ready for next round
  - Data: `{ gameCode: string }`
  - Location: Referenced in server handlers

### Artisan Adaptability
- **`getClassAbilities`** - Get available abilities for Artisan Adaptability  
  - Data: `{ gameCode: string, className: string, level?: number }`
  - Location: `client/src/components/modals/AdaptabilityModal/AdaptabilityModal.tsx:226`

- **`adaptabilityReplaceAbility`** - Artisan replaces an ability via Adaptability
  - Data: `{ gameCode: string, oldAbilityType: string, newAbilityType: string, level: number, newClassName: string }`
  - Location: `client/src/components/modals/AdaptabilityModal/AdaptabilityModal.tsx:248`

## Server to Client Events (Server Emits)

### Game State Events
- **`gameCreated`** - Game successfully created
  - Data: `{ gameCode: string, hostName: string }`
  - Location: `server/controllers/GameController.ts:159`

- **`game:joined`** - Player successfully joined game
  - Data: `{ gameCode: string, playerName: string, players: Player[] }`
  - Location: `server/controllers/PlayerController.ts:148`

- **`game:started`** - Game has started
  - Data: `{ gameCode: string, gameState: GameState }`
  - Location: `server/controllers/GameController.ts:262`

- **`game:start_failed`** - Game failed to start
  - Data: `{ message: string }`
  - Location: `server/controllers/GameController.ts:284`

- **`game:ended`** - Game has ended
  - Data: `{ gameCode: string, finalResults: any }`
  - Location: `server/controllers/GameController.ts:446`

- **`game:reconnected`** - Player successfully reconnected
  - Data: `{ gameCode: string, gameState: GameState, playerName: string }`
  - Location: `server/controllers/PlayerController.ts:482`

### Player Events
- **`playerList`** - Updated list of players
  - Data: `{ players: Player[] }`
  - Locations:
    - `server/services/gameService.ts:150`
    - `server/controllers/PlayerController.ts:560`

- **`player:joined`** - Broadcast when a player joins (to other players)
  - Data: `{ playerName: string, gameCode: string }`
  - Location: `server/controllers/PlayerController.ts:155`

- **`player:updated`** - Player data updated
  - Data: `{ player: Player }`
  - Location: `server/controllers/PlayerController.ts:237`

- **`player:action_submitted`** - Player submitted an action (broadcast to others)
  - Data: `{ playerName: string, actionType: string }`
  - Location: `server/controllers/PlayerController.ts:313`

- **`player:disconnected`** - Player disconnected
  - Data: `{ playerName: string }`
  - Location: `server/controllers/PlayerController.ts:386`

- **`player:left`** - Player left the game
  - Data: `{ playerName: string }`
  - Location: `server/controllers/PlayerController.ts:408`

- **`player:reconnected`** - Player reconnected (broadcast to others)
  - Data: `{ playerName: string }`
  - Location: `server/controllers/PlayerController.ts:489`

### Character & Action Events
- **`character:selected`** - Character selection confirmed
  - Data: `{ player: Player }`
  - Location: `server/controllers/PlayerController.ts:231`

- **`action:submitted`** - Action successfully submitted
  - Data: `{ actionType: string, targetId: string }`
  - Locations:
    - `server/controllers/PlayerController.ts:304`
    - `server/models/events/SocketEventRouter.ts:543`

- **`action:error`** - Action submission failed
  - Data: `{ message: string }`
  - Location: `server/controllers/PlayerController.ts:328`

### Game Round Events
- **`roundResult`** - Results of a game round
  - Data: Round result data
  - Locations:
    - `server/services/gameService.ts:195`
    - `server/services/gameService.ts:278`
    - `server/services/gameService.ts:315`

- **`gamePhaseUpdate`** - Game phase changed
  - Data: `{ phase: string, gameState: GameState }`
  - Location: `server/services/gameService.ts:201`

- **`levelUp`** - Player leveled up
  - Data: `{ playerId: string, newLevel: number }`
  - Location: `server/services/gameService.ts:208`

- **`trophyAwarded`** - Trophy awarded to player
  - Data: Trophy award data
  - Locations:
    - `server/services/gameService.ts:231`
    - `server/services/gameService.ts:290`
    - `server/services/gameService.ts:327`

### Validation & Response Events
- **`nameCheckResponse`** - Response to name availability check
  - Data: `{ available: boolean, message?: string }`
  - Locations:
    - `server/controllers/GameController.ts:596`
    - `server/controllers/GameController.ts:609`
    - `server/controllers/GameController.ts:614`
    - `server/controllers/GameController.ts:626`
    - `server/models/events/SocketEventRouter.ts:273`

- **`classAbilitiesResponse`** - Response with class abilities for Adaptability
  - Data: `{ abilities: Ability[] }`
  - Location: `server/models/events/SocketEventRouter.ts:285`

### Artisan Adaptability Events
- **`adaptabilityChooseAbility`** - Prompt Artisan to choose ability replacement
  - Data: Ability selection data
  - Location: Referenced in client handlers

- **`adaptabilityComplete`** - Adaptability process completed
  - Data: Completion data
  - Location: Referenced in client handlers

### Error Events
- **`errorMessage`** - General error message
  - Data: `{ message: string }`
  - Locations: Multiple throughout server controllers and middleware

- **`validationError`** - Validation failed
  - Data: `{ message: string, field?: string }`
  - Locations: 
    - `server/middleware/socketValidation.ts:101`
    - `server/middleware/socketValidation.ts:131`
    - `server/middleware/socketValidation.ts:274`

- **`error`** - Generic error
  - Data: `{ message: string }`
  - Location: `server/models/validation/ValidationMiddleware.ts:178`

## Client Socket Listeners

### Connection Events
- **`connect`** - Socket connected
  - Location: `client/src/hooks/useSocket.ts:112`

- **`disconnect`** - Socket disconnected
  - Location: `client/src/hooks/useSocket.ts:119`

- **`connect_error`** - Connection error
  - Location: `client/src/hooks/useSocket.ts:127`

- **`reconnect_attempt`** - Reconnection attempt
  - Location: `client/src/hooks/useSocket.ts:132`

- **`reconnect`** - Successfully reconnected
  - Location: `client/src/hooks/useSocket.ts:136`

- **`reconnect_error`** - Reconnection error
  - Location: `client/src/hooks/useSocket.ts:141`

- **`reconnect_failed`** - Reconnection failed
  - Location: `client/src/hooks/useSocket.ts:145`

### Game Events
- **`nameCheckResponse`** - Response to name availability check
  - Location: `client/src/pages/JoinGamePage/JoinGamePage.tsx:110`

- **`errorMessage`** - Error message from server
  - Location: `client/src/pages/JoinGamePage/JoinGamePage.tsx:111`

- **`playerDisconnected`** - Another player disconnected
  - Location: `client/src/pages/GamePage/hooks/useGameEvents.ts:78`

- **`roundResult`** - Round results received
  - Location: `client/src/pages/GamePage/hooks/useGameEvents.ts:144`

- **`trophyAwarded`** - Trophy awarded notification
  - Location: `client/src/pages/GamePage/hooks/useGameEvents.ts:170`

- **`resumeGame`** - Game resumed
  - Location: `client/src/pages/GamePage/hooks/useGameEvents.ts:209`

- **`gameStateUpdate`** - Game state updated
  - Location: `client/src/pages/GamePage/hooks/useGameEvents.ts:210`

- **`adaptabilityChooseAbility`** - Artisan needs to choose ability
  - Locations:
    - `client/src/pages/GamePage/hooks/useGameEvents.ts:256`
    - `client/src/components/modals/AdaptabilityModal/AdaptabilityModal.tsx:170`

- **`classAbilitiesResponse`** - Available class abilities received
  - Location: `client/src/components/modals/AdaptabilityModal/AdaptabilityModal.tsx:171`

- **`adaptabilityComplete`** - Adaptability process completed
  - Location: `client/src/components/modals/AdaptabilityModal/AdaptabilityModal.tsx:172`

## Server Socket Handlers

### Core Handlers
- **`createGame`** - Handle game creation
  - Location: `server/server.ts:295`

- **`joinGame`** - Handle player joining
  - Location: `server/server.ts:307`

- **`playAgain`** - Handle play again request
  - Location: `server/server.ts:319`

- **`checkNameAvailability`** - Handle name availability check
  - Location: `server/server.ts:329`

- **`selectCharacter`** - Handle character selection
  - Location: `server/server.ts:345`

- **`startGame`** - Handle game start
  - Location: `server/server.ts:362`

- **`reconnectToGame`** - Handle reconnection
  - Location: `server/server.ts:372`

- **`performAction`** - Handle player action
  - Location: `server/server.ts:405`

- **`useRacialAbility`** - Handle racial ability usage
  - Location: `server/server.ts:427`

- **`adaptabilityReplaceAbility`** - Handle Artisan ability replacement
  - Location: `server/server.ts:444`

- **`getClassAbilities`** - Handle class abilities request
  - Location: `server/server.ts:463`

- **`playerNextReady`** - Handle player ready for next round
  - Location: `server/server.ts:480`

- **`disconnect`** - Handle player disconnection
  - Locations:
    - `server/server.ts:491`
    - `server/models/events/SocketEventRouter.ts:142`