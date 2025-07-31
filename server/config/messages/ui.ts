/**
 * @fileoverview UI and game flow messages
 * Messages for game management, user interface feedback, and flow control
 */

export default {
  // Game creation and joining
  gameManagement: {
    gameCreated: 'Game created successfully with code {gameCode}.',
    gameJoined: 'Successfully joined game {gameCode}.',
    gameStarted: 'Game has started!',
    gameEnded: 'Game has ended.',
    gameTimeout: 'Game ended due to inactivity.',

    // Host messages
    youAreHost: 'You are the host of this game.',
    hostTransferred: 'Host privileges transferred to {playerName}.',
    onlyHostCanStart: 'Only the host can start the game.',

    // Game state
    waitingToStart: 'Waiting for host to start the game.',
    gameInProgress: 'Game is in progress.',
    gameWaitingForPlayers: 'Waiting for more players to join.',
    gameFull: 'Game is full - no more players can join.',
  },

  // Round and phase management
  roundManagement: {
    roundStarted: 'Round {round} has started.',
    roundEnded: 'Round {round} has ended.',
    nextRoundStarting: 'Next round starting...',
    phaseChanged: 'Game phase changed to {phase}.',
    actionPhase: 'Action phase - submit your actions.',
    resultsPhase: 'Results phase - reviewing round results.',

    // Ready system
    playersReady: '{ready}/{total} players are ready for the next round.',
    majorityReady: 'Majority of players are ready - resuming game.',
    waitingForReady: 'Waiting for players to be ready.',
    youAreReady: 'You are ready for the next round.',
    youMarkedReady: 'You have been marked as ready.',
  },

  // Player feedback and notifications
  feedback: {
    actionConfirmed: 'Your action has been confirmed.',
    targetSelected: 'Target selected: {targetName}.',
    abilitySelected: 'Ability selected: {abilityName}.',
    waitingForOtherPlayers: 'Waiting for other players...',
    processingActions: 'Processing all player actions...',
    calculatingResults: 'Calculating round results...',

    // Success notifications
    operationSuccessful: 'Operation completed successfully.',
    changesSaved: 'Changes have been saved.',
    settingsUpdated: 'Settings updated successfully.',

    // Loading states
    loading: 'Loading...',
    connecting: 'Connecting to game...',
    synchronizing: 'Synchronizing game state...',
    updating: 'Updating...',
  },

  // Error and validation messages
  errors: {
    connectionLost: 'Connection to server lost.',
    gameNotFound: 'Game not found.',
    playerNotFound: 'Player not found.',
    invalidInput: 'Invalid input provided.',
    operationFailed: 'Operation failed - please try again.',
    unknownError: 'An unknown error occurred.',

    // Validation errors
    invalidGameCode: 'Invalid game code format.',
    invalidPlayerName: 'Invalid player name.',
    gameAlreadyStarted: 'Game has already started.',
    gameNotStarted: 'Game has not started yet.',
    notEnoughPlayers: 'Not enough players to start the game.',
  },

  // Reconnection and recovery
  reconnection: {
    reconnecting: 'Attempting to reconnect...',
    reconnected: 'Successfully reconnected to the game.',
    reconnectionFailed: 'Failed to reconnect to the game.',
    connectionStable: 'Connection is stable.',
    connectionUnstable: 'Connection is unstable.',

    // Recovery
    recoveringGameState: 'Recovering game state...',
    stateRecovered: 'Game state recovered successfully.',
    syncInProgress: 'Synchronization in progress...',
    syncComplete: 'Synchronization complete.',
  },

  // Accessibility and help
  accessibility: {
    screenReaderAnnouncement: '{message}',
    helpAvailable: 'Help is available - press H for help.',
    keyboardShortcuts: 'Keyboard shortcuts are available.',

    // Instructions
    selectAction: 'Select an action to perform.',
    selectTarget: 'Select a target for your action.',
    confirmSelection: 'Confirm your selection.',
    waitForTurn: 'Wait for your turn.',
  },

  // Settings and preferences
  settings: {
    themeChanged: 'Theme changed to {theme}.',
    volumeChanged: 'Volume set to {volume}%.',
    notificationsEnabled: 'Notifications enabled.',
    notificationsDisabled: 'Notifications disabled.',
    settingsReset: 'Settings reset to default.',

    // Preferences
    autoReady: 'Auto-ready enabled for faster gameplay.',
    confirmActions: 'Action confirmation enabled.',
    quickActions: 'Quick actions enabled.',
  },

  // Game flow control
  flowControl: {
    pauseGame: 'Game has been paused.',
    resumeGame: 'Game has been resumed.',
    skipPhase: 'Skipping to next phase.',
    fastForward: 'Fast-forwarding through results.',
    slowDown: 'Returning to normal speed.',

    // Time limits
    timeRemaining: '{time} seconds remaining.',
    timeExpired: 'Time has expired.',
    extensionGranted: 'Time extension granted.',
    hurryUp: 'Please make your selection quickly.',
  },

  // Spectator and observer messages
  spectator: {
    spectatorMode: 'You are in spectator mode.',
    observingGame: 'Observing game {gameCode}.',
    cannotParticipate: 'Spectators cannot participate in the game.',
    gameObservation: 'You are observing this game.',
  },

  // Tutorial and onboarding
  tutorial: {
    welcomeMessage: 'Welcome to Warlock! This is your first game.',
    tutorialComplete: 'Tutorial completed successfully.',
    nextStep: 'Next step: {step}.',
    helpHint: 'Hint: {hint}.',
    learnMore: 'Learn more about {topic}.',

    // First-time messages
    firstGame: 'This is your first game - good luck!',
    firstAction: 'Select your first action.',
    firstTarget: 'Choose your first target.',
    firstRound: 'Your first round is beginning.',
  },

  // Advanced features
  advanced: {
    debugModeEnabled: 'Debug mode enabled.',
    developerOptions: 'Developer options are available.',
    advancedSettingsUnlocked: 'Advanced settings unlocked.',
    experimentalFeature: 'This is an experimental feature.',
    betaFeature: 'This feature is in beta.',

    // Analytics and stats
    statsAvailable: 'Game statistics are available.',
    performanceMetrics: 'Performance metrics updated.',
    analyticsRecorded: 'Game analytics recorded.',
  },
} as const;