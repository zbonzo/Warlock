/**
 * @fileoverview Centralized log messages for structured logging (updated with audit findings)
 * Maps event keys to human-readable message templates.
 */
module.exports = {
  // Info-level logs are for normal application flow and key events.
  info: {
    ServerStarted: 'Game server running on port {port}',
    PlayerConnected: 'Player connected: {socketId}',
    PlayerDisconnected: 'Player disconnected: {socketId}',
    ConfigApiRequest: 'Config API: Basic configuration requested',

    // Game Flow
    GameCreated: 'Game created with code {gameCode} by {playerName}',
    GameStarted:
      'Game started with {warlockCount} warlocks for {playerCount} players',
    GameEnded: 'Game ended. Winner: {winner}',
    GameEndedAllPlayersLeft: 'Game {gameCode} ended. All players left.',
    GameTimedOut: 'Game {gameCode} timed out after inactivity',
    PlayerJoinedGame: 'Player {playerName} joined game {gameCode}',
    PlayerReconnected: 'Player {playerName} reconnected to game {gameCode}',
    PlayerSelectedCharacter:
      'Player {socketId} selected {race} {className} in game {gameCode}',
    PlayerUnlockedAbilities:
      'Player {playerName} unlocked abilities: {abilities}',
    PlayerTimedOutOrLeft:
      'Player {playerName} timed out or left game {gameCode}',
    PlayerAttemptingPlayAgain:
      'Player {playerName} is attempting to play again in game {oldGameCode}',

    // MOVED FROM DEBUG: Player actions that should be visible at info level
    PlayerSubmittedActionInGameRoom:
      'Player {playerName} submitted action: {actionType} -> {targetId}',
    PlayerPerformedAction:
      'Player {playerName} ({socketId}) performed {actionType} on {targetId} in game {gameCode}',
    ActionSubmissionProgress:
      'Action submission progress: {submittedCount}/{totalCount} players submitted in game {gameCode}',
    AllActionsSubmitted:
      'All actions submitted, processing round for game {gameCode}',

    PlayerSelectedAdaptabilityAbility:
      'Player {playerName} selected ability {abilityName} from {className}',
    PlayerUsedRacialAbility:
      'Player {socketId} used racial ability {racialAbilityType} on {targetId} in game {gameCode}',

    // Socket Action Success (from errorHandler)
    SocketActionSuccess: 'Socket action succeeded: {action}',

    // NEW: GameController.js audit items
    ForceCleanedGame:
      'Force cleaned up game {gameCode} (had game: {hasGame}, had timer: {hasTimer})',
    ReplayGameCreatedWithCode: 'Created replay game with code {gameCode}',
    PlayerReadyNextRound:
      'Player {socketId} clicked ready for next round in game {gameCode}',
    ResumeByMajority: 'Game {gameCode}: Resuming next round by majority vote',
    CreatingReplayGame: '{playerName} creating replay game {gameCode}',
    AdaptabilitySuccess:
      'Successfully replaced {oldAbilityType} with {newAbilityType} for player {playerName}',
  },

  // Warn-level logs indicate potential issues that don't break functionality.
  warn: {
    InvalidGameCodeFormat:
      'Invalid game code format: {gameCode} from {socketId}',
    PlayerNotInGameValidation:
      'Player not in game: {socketId} in game {gameCode}',
    GameNotFoundValidation:
      'Game not found during validation: {gameCode} from {socketId}',
    InvalidRaceClassCombination:
      'Invalid race/class combination: {race}/{className} for player {playerName}',
    UndyingSetupFailed: 'UNDYING SETUP FAILED for {playerName}, fixing...',
    UnknownAbilityType:
      'Unknown ability type: {actionType} requested by player {playerName}',
    UnregisteredAbility:
      'Ability not registered: {abilityType} for class {className}',
    NonAoeAbilityWithMultiTarget:
      'Player {playerName} tried to use non-AOE ability {actionType} with multi-target',
    UnknownRacialAbilityType:
      'Unknown racial ability type: {racialAbilityType} from actor {actorId}',
    UnknownStatusEffectApply:
      'Unknown effect {effectName} could not be applied to {playerName}',
    EnvConfigLoadFailed:
      'Failed to load environment configuration for {environment}: {error}',

    // Socket Action Known Errors (from errorHandler)
    SocketActionKnownError:
      'A known error occurred during socket action: {action}',

    // NEW: GameController.js audit items
    AdaptabilityUseFailed: 'Failed to use Adaptability for player {playerName}',
  },

  // Error-level logs are for critical failures that break functionality.
  error: {
    NameAvailabilityCheckError:
      'Error checking name availability for player {playerName} in game {gameCode}',
    PlayerNextReadyError:
      'Error in handlePlayerNextReady for game {gameCode}: {errorDetails}',
    PlayAgainError: 'Error in handlePlayAgain for game {oldGameCode}',
    PlayerDisconnectError:
      'Error during player disconnect for socket {socketId}',
    FailedToSendErrorMessage:
      'Failed to send error message to socket after action {originalAction}',

    // Socket Action Unexpected Errors (from errorHandler)
    SocketActionUnexpectedError:
      'An unexpected error occurred during socket action: {action}',

    // NEW: GameController.js audit items
    HandlePerformActionError:
      'Error in handlePerformAction for game {gameCode}: {errorDetails}',
    AdaptabilityOldAbilityNotFound:
      'Old ability {oldAbilityType} not found for player {playerName}',
    AdaptabilityClassNotFound:
      'Class {className} not found in abilities config',
    AdaptabilityNewAbilityNotFound:
      'Ability {newAbilityType} at level {level} not found for class {className}',
    GetClassAbilitiesError: 'Error getting abilities: {errorMessage}',
  },

  // Debug-level logs are for detailed, verbose information useful for development.
  debug: {
    // Player Action Lifecycle - these are very detailed and should stay in debug
    PlayerActionSubmitAttempt:
      'Player action submission attempt by {playerName}: {status}',
    PlayerActionSubmittedSuccessfully:
      'Player {playerName} successfully submitted action: {actionType} -> {targetId}',
    PlayerActionInvalidated: 'Invalidating action for {playerName}: {reason}',
    PlayerActionSubmissionCleared: 'Cleared action submission for {playerName}',
    ActionSubmissionFailedInGameRoom:
      'Action submission failed for {playerName} in GameRoom: {reason}',

    // Cooldowns & Abilities
    AbilityOnCooldownAttempt:
      "Player {playerName} tried to use {actionType} but it's on cooldown for {cooldown} more turns",
    PlayerAbilityOnCooldown:
      'Player {playerName} ability {abilityType} on cooldown for {turnsRemaining} turns',
    PlayerCooldownsExpired:
      'Player {playerName}: Cooldowns expired for {abilityNames}',

    // Character & Game Setup
    RockhewnStoneArmorStart:
      'Rockhewn {playerName} starts with Stone Armor: {armorValue} armor',
    TotalEffectiveArmor:
      'Total effective armor for {playerName}: {effectiveArmor}',
    LichSetupStart: '=== Lich SETUP for {playerName} ===',
    PlayerUsedAdaptability:
      'Player {playerName} ({socketId}) is using Artisan Adaptability',
    PlayerUsedRacialAbilityLog:
      'Player {playerName} uses racial ability {racialAbilityType}',

    // Warlock System
    WarlockRoundTrackingReset:
      'Resetting warlock corruption tracking for new round.',
    WarlockDetectionPenaltiesExpired:
      'Detection penalties expired for {count} players',
    WarlockCorruptionCooldownsExpired:
      'Corruption cooldowns expired for {count} players',
    WarlockDetected:
      'Marked warlock {warlockName} as detected with {penaltyTurns} turn penalty',
    WarlockCorruptionRecorded:
      'Recorded corruption by {actorId}. Round: {roundCount}, Player: {playerCount}, Cooldown: {cooldownTurns}',
    WarlockCountIncreased: 'Warlock count increased to {count}',
    WarlockCountDecreased: 'Warlock count decreased to {count}',
    WarlockCorruptionAttemptDetails:
      'Warlock {actorName} attempts to corrupt {targetName} (Base: {baseChance}, Mod: {modifier}, Final: {finalChance})',

    // Debugging Separators
    EventsLogSeparator: '--- Events Log Separator ({type}) ---',

    // NEW: GameController.js audit items
    AdaptabilityNoUsesLeft: 'Player {playerName} has no Adaptability uses left',
    NextReadySetInitialized: 'Initialized nextReady set for game {gameCode}',
    PlayerAlreadyMarkedReady:
      'Player {socketId} already marked ready for game {gameCode}',
    GetClassAbilities: 'Getting {className} abilities for level {level}',
    FoundClassAbilities:
      'Found {count} abilities for {className} at level {level}',

    // NEW: Player.js audit items
    DeadPlayerActionAttempt:
      'Player {playerName} tried to submit action while dead',
    MultipleActionsAttempt:
      'Player {playerName} tried to submit multiple actions',
    UnavailableAbilityAttempt:
      'Player {playerName} tried to use unavailable ability: {abilityType}',
    StoneArmorDegradation:
      "{playerName}'s Stone Armor degrades from {oldValue} to {newValue}",
    BloodFrenzyDamageIncrease:
      'Blood Frenzy: {playerName} missing {missingHpPercent}% HP, damage increased by {damageIncreasePercent}%',
    UndyingSetup: 'UNDYING SETUP: {playerName} now has Undying effect:',
  },
};
