/**
 * @fileoverview Core game messages (updated with audit findings)
 * Centralizes all error messages, success messages, and core game event text
 */

/**
 * Error messages for validation and game state issues
 */
const errors = {
  // Game validation errors
  gameNotFound: 'Game not found. Check the code and try again.',
  gameCodeInvalid: 'Invalid game code format. Please enter a 4-digit code.',
  gameFull: 'Game is full ({maxPlayers} players max).',
  gameStarted: 'Cannot join a game that has already started.',
  gameNotStarted: 'Game has not started yet.',
  gameTimeout: 'Game ended due to inactivity.',

  playerNameRequired: 'Name is required',
  playerNameTooShort: 'Name must be at least 2 characters long',
  playerNameTooLong: 'Name must be 20 characters or less',
  playerNameNoLettersNumbers: 'Name must contain at least one letter or number',
  playerNameInvalidChars:
    "Name can only contain letters (including accented), numbers, spaces, hyphens (-), and apostrophes (').",
  playerNameUnsafeChars: 'Name contains unsafe characters',
  playerNameWhitespace: 'Name cannot start or end with spaces',
  playerNameMultipleSpaces: 'Name cannot contain multiple consecutive spaces',
  playerNameOnlyPunctuation: 'Name must contain at least one letter or number',
  playerNameReserved:
    '"{playerName}" is a reserved game term. Please choose a different name.',
  playerNameProblematicTerms:
    'Name contains problematic terms. Please choose a different name.',
  playerNameTaken:
    'The name "{playerName}" is already taken. Please choose a different name.',

  // Action validation errors
  actionNotAOE:
    '{actionType} is not an AOE ability but "multi" target was specified.',

  // Player validation errors
  playerNotFound: 'Player not found in this game.',
  playerExists: 'You are already in this game.',
  playerNotInGame: 'You are not a player in this game.',
  playerDead: 'Cannot perform action while dead.',
  playerStunned: 'You are stunned and cannot act.',
  invalidPlayerName:
    'Invalid player name. Please use 1-20 alphanumeric characters.',

  // Permission errors
  notHost: 'Only the host can perform this action.',
  notEnoughPlayers: 'Need at least {minPlayers} players to start a game.',
  allPlayersNotReady: 'All players must select a character before starting.',

  // Action validation errors
  invalidAction: 'Invalid action type.',
  invalidTarget: 'Invalid target.',
  targetDead: 'Cannot target a dead player.',
  targetInvisible: 'Cannot target an invisible player.',
  alreadyActed: 'You have already acted this round.',
  actionOnCooldown: '{abilityName} is on cooldown for {turns} more turn(s).',

  // Character selection errors
  invalidRace: 'Invalid race selection.',
  invalidClass: 'Invalid class selection.',
  invalidCombination: 'Invalid race and class combination.',

  // Racial ability errors
  noRacialAbility: 'You do not have a racial ability.',
  racialAbilityUsed: 'You have already used your racial ability.',
  racialAbilityOnCooldown:
    'Your racial ability is on cooldown for {turns} more turn(s).',
  noUsesLeft: 'No uses left for {abilityName} ability.',

  // Artisan Adaptability specific
  adaptabilityFailed: 'Failed to use Adaptability ability.',
  abilityNotFound: 'Original ability not found.',
  abilityNotUnlocked: 'Ability not unlocked at this level.',

  // Server errors
  serverBusy: 'Server is too busy right now. Please try again later.',
  unexpectedError: 'An unexpected error occurred. Please try again.',
  reconnectionFailed: 'Failed to reconnect to game.',

  // Rate limiting
  rateLimited: 'Too many requests. Please slow down.',
  cooldownActive: 'Please wait before trying again.',

  // NEW: GameController.js audit items (1-13)
  nameCheckUnavailable: 'Unable to check name availability. Please try again.',
  gameOrStateInvalid: 'Game not found or invalid state',
  abilityOnCooldownPlural:
    'Ability "{abilityName}" is on cooldown for {turns} more turn{s}',
  abilityNotFoundForPlayer: 'You don\'t have the ability "{abilityName}"',
  abilityUnavailableNow: 'Cannot use ability "{abilityName}" right now',
  targetInvalidOrDead: 'Selected target is no longer alive or valid',
  monsterInvalidTarget: 'Monster is no longer a valid target',
  actionAlreadySubmitted: 'You have already submitted an action for this round',
  actionSubmitFailed: 'Failed to submit action. Please try again.',
  actionProcessingError: 'An error occurred while processing your action',

  // NEW: GameController.js audit items (28-37)
  missingGameCodeOrPlayerName: 'Missing game code or player name.',
  invalidPlayerNameLength: 'Invalid player name. Please use 1-20 characters.',
  gameFullWithCount: 'Game is full ({maxPlayers} players max).',
  alreadyInThisGame: 'You are already in this game.',
  couldNotJoinGame: 'Could not join game.',
  createGameFailedServerBusy: 'Failed to create game. Server may be busy.',
  joinCreatedGameFailed: 'Failed to join created game.',
  startNewGameFailed: 'Failed to start new game. Please try again.',

  // NEW: gameService.js audit items
  serverTooBusy: 'Server is too busy right now. Please try again later.',

  // NEW: Player.js audit items (1-13)
  playerDeadCannotAct: 'Dead players cannot perform actions',
  playerActionAlreadySubmittedThisRound: 'Action already submitted this round',
  playerAbilityNotAvailable: "Ability '{abilityName}' is not available",
  playerAbilityOnCooldownDetailed:
    "Ability '{abilityName}' is on cooldown for {turns} more turns",
  playerNoTargetSpecified: 'No target specified',
  playerNoActionSubmittedForValidation: 'No action submitted',
  playerAbilityNoLongerAvailable:
    "Ability '{abilityName}' is no longer available",
  playerAbilityNowOnCooldown:
    "Ability '{abilityName}' is now on cooldown ({turns} turns)",
  playerMonsterInvalidTarget: 'Monster is no longer a valid target',
  playerTargetInvalidOrDead: 'Player target is no longer alive or valid',
};

/**
 * Success messages for completed actions
 */
const success = {
  // Game management
  gameCreated: 'Game created successfully.',
  gameJoined: 'Successfully joined the game.',
  gameStarted: 'Game has started!',

  // Character selection
  characterSelected: 'Character selected successfully.',

  // Actions
  actionPerformed: 'Action performed successfully.',
  racialAbilityUsed: 'Racial ability used successfully.',
  adaptabilityTriggered: 'Adaptability ability triggered.',
  adaptabilityComplete: 'Ability replacement successful.',

  // Reconnection
  reconnected: 'Successfully reconnected to game.',

  // Game progression
  levelUp: 'The party has advanced to level {level}!',
  newAbilitiesUnlocked: 'You gained access to new abilities at level {level}!',
  bonusesApplied:
    'Level {level} bonuses: Fully healed! Max HP increased by {hpIncrease}! Damage increased by 25%!',

  // NEW: GameController.js audit items
  actionSubmitted: 'Action submitted successfully',
  joinedReplayGame: 'Successfully joined replay game {gameCode}',
};

/**
 * Game event messages for the event log
 */
const events = {
  // Monster events
  monsterAttacks: 'The Monster attacks!',
  monsterDefeated: 'The Monster has been defeated!',
  monsterRespawns: 'A new Monster appears with {hp} HP!',
  monsterNoTarget: 'The Monster looks around but finds no targets.',
  monsterSwipesAtShadows: 'The Monster swipes at shadows.',

  // Player actions
  playerAttacks: '{playerName} uses {abilityName} on {targetName}.',
  playerHealed: '{playerName} was healed for {amount} health.',
  playerTakesDamage: '{playerName} was attacked and lost {damage} health.',
  playerDies: '{playerName} has fallen.',
  playerResurrected: '{playerName} avoided death through {abilityName}!',

  // Status effects
  playerPoisoned:
    '{playerName} is poisoned for {damage} damage over {turns} turns.',
  playerProtected:
    '{playerName} is protected with {armor} armor for {turns} turn(s).',
  playerInvisible: '{playerName} becomes invisible for {turns} turn(s).',
  playerStunned: '{playerName} is stunned for {turns} turn(s).',

  // Warlock events
  playerCorrupted: 'Another hero has been corrupted!',
  warlockRevealed: '{playerName} IS a Warlock!',
  notWarlock: '{playerName} is NOT a Warlock.',

  // Racial abilities
  humanAdaptability: '{playerName} uses Adaptability to replace one ability.',
  elfKeenSenses: '{playerName} uses Keen Senses to study {targetName} closely.',
  orcBloodRage:
    '{playerName} enters a Blood Rage, taking {damage} damage but doubling their next attack!',
  satyrForestsGrace:
    "{playerName} calls upon Forest's Grace, gaining healing over time.",
  dwarfStoneArmor:
    "{playerName}'s Stone Armor cracks and weakens! ({oldValue} → {newValue})",
  skeletonUndying: "{playerName}'s Undying ability is already active.",

  // Stone Armor specific
  stoneArmorDestroyed:
    "{playerName}'s Stone Armor is completely shattered! They now take increased damage!",
  stoneArmorDegraded: "{playerName}'s Stone Armor weakens from the attack!",

  // Game progression
  levelUp: 'The party has advanced to level {level}!',
  nextRound: 'Round {round} begins!',
  gameEnding: 'Game ending...',

  // Player connection
  playerJoined: '{playerName} joined the game.',
  playerLeft:
    '{playerName} wandered into the forest to discover that there are many more monsters and they were very much unequipped',
  playerDisconnected: '{playerName} temporarily disconnected.',
  playerReconnected: '{playerName} has reconnected.',
  hostChanged: 'Game host changed to {playerName}.',

  // NEW: GameController.js audit items
  warlockChosenSingle: 'A Warlock has been chosen and walks among you.',

  // NEW: gameService.js audit items
  playerLeftAllWarlocksGone:
    '{playerName} left the game. All Warlocks are gone.',
  playerLeftSimple: '{playerName} left the game.',

  // NEW: Player.js audit items (18-22)
  unstoppableRageEnded:
    "{playerName}'s Unstoppable Rage ends, causing {actualDamage} exhaustion damage!",
  spiritGuardFaded: "{playerName}'s Spirit Guard fades away.",
  sanctuaryFaded: "{playerName}'s Sanctuary of Truth fades away.",

  // NEW: CombatSystem.js event messages
  kinfolkLifebondPublic:
    "{playerName}'s Life Bond with the monster heals them for {healAmount} HP.",
  warlockDetectionPenaltyAttacker:
    '{targetName} takes +{penalty}% damage from recent detection!',
  coordinatedAttackDamage:
    'Coordinated attack! {playerCount} players target {targetName} for +{bonusPercent}% damage!',
  vulnerableDamageTaken:
    '{targetName} is VULNERABLE and takes {increasePercent}% more damage! ({oldDamage} → {newDamage})',
  unstoppableRageReduction:
    "{targetName}'s Unstoppable Rage reduces damage by {reductionPercent}%! ({oldDamage} → {newDamage})",
  coordinatedHealing:
    'Coordinated healing! {playerCount} players heal {targetName} for +{bonusPercent}% healing!',
  playerAttackedWithArmor:
    '{targetName} was attacked for {actualDamage} damage ({damageAmount} reduced by {reductionPercent}% armor).',
  playerAttackedNoArmor:
    '{targetName} was attacked and lost {actualDamage} health.',
  coordinatedMonsterAssault:
    'Coordinated assault! {playerCount} players attack the Monster for +{bonusPercent}% damage!',
  undyingActivated:
    '{playerName} refuses to stay down! Undying ability activated.',
  moonbeamRevealsCorrupted:
    "{targetName}'s desperate Moonbeam reveals that {attackerName} IS corrupted!",
  moonbeamRevealsPure:
    "{targetName}'s Moonbeam reveals that {attackerName} is pure.",
  spiritGuardCounter:
    "{targetName}'s vengeful spirits strike back at {attackerName} for {damage} damage!",
  spiritsRevealWarlock: 'The spirits reveal that {attackerName} IS a Warlock!',
  sanctuaryPunishesWarlock:
    "{targetName}'s Sanctuary reveals and punishes the Warlock {attackerName} for {damage} damage!",
  stoneResolveAbsorbed:
    "{targetName}'s Stone Resolve absorbed all damage from an attack!",
};

/**
 * Private messages sent only to specific players
 */
const privateMessages = {
  // Combat
  youAttacked:
    'You attacked {targetName} for {damage} damage (initial {initialDamage}, reduced by {reduction}% from armor).',
  youWereAttacked:
    '{attackerName} attacked you for {damage} damage, reduced by {reduction}% from your armor.',
  youHealed: 'You healed {targetName} for {amount} health.',
  youWereHealed: '{healerName} healed you for {amount} health.',

  // Status effects
  youArePoisoned: 'You are poisoned for {damage} damage over {turns} turns.',
  youAreProtected: 'You are protected with {armor} armor for {turns} turn(s).',
  youAreInvisible: 'You become invisible for {turns} turn(s).',
  youAreStunned: 'You are stunned for {turns} turn(s).',

  // Warlock-specific
  youCorrupted: 'You corrupted {targetName}.',
  youWereCorrupted: 'You were corrupted.',
  attemptToHealWarlock:
    'You attempted to heal {targetName} (a Warlock), but healed yourself for {amount} HP instead.',
  warlockRejectedHealing: 'You rejected the healing from {healerName}.',

  // Abilities
  abilityOnCooldown: '{abilityName} is on cooldown for {turns} more turn(s).',
  racialAbilityReady: 'Your racial ability is ready to use again.',
  noUsesLeft: 'No uses left for your racial ability.',

  // Game state
  youAreHost: 'You are the host of this game.',
  gameWaitingForPlayers: 'Waiting for more players to join...',
  allPlayersReady: 'All players are ready! Host can start the game.',

  // Adaptability specific
  chooseAbilityToReplace: 'Choose an ability to replace with Adaptability.',
  adaptabilityChooseFrom: 'Choose a new ability from {className}:',

  // NEW: CombatSystem.js private messages
  warlockDetectionPenaltyDamage:
    'Detection penalty increases damage by {penalty}%! ({oldDamage} → {newDamage})',
  comebackArmorBonus: 'Comeback mechanics grant you +{armorBonus} armor!',
  comebackHealingBonus:
    'Comeback mechanics boost your healing by {bonusPercent}%!',
  comebackDamageBonus:
    'Comeback mechanics boost your damage by {bonusPercent}%!',
  comebackCorruptionResistance:
    'Comeback mechanics grant you {resistancePercent}% corruption resistance!',
  detectionPenaltyEnded: 'Detection penalties have worn off.',
  attackedWithArmor:
    '{attackerName} attacked you for {actualDamage} damage ({damageAmount} base, reduced by {reductionPercent}% from your {effectiveArmor} armor).',
  attackedNoArmor: '{attackerName} attacked you for {actualDamage} damage.',
  stoneArmorDegraded:
    'Your Stone Armor degrades from {oldValue} to {newValue}!',
  stoneArmorDestroyed:
    'Your Stone Armor is destroyed! You now take {damageIncreasePercent}% more damage!',
  moonbeamDetectedWarlock:
    'Your Moonbeam detected that {attackerName} is a Warlock!',
  moonbeamConfirmedPure:
    'Your Moonbeam confirmed that {attackerName} is not a Warlock.',
  spiritGuardStrikesYou:
    "{targetName}'s Spirit Guard strikes you for {damage} damage!",
  yourSpiritsRevealWarlock:
    'Your spirits reveal that {attackerName} is a Warlock!',
  yourStoneResolveAbsorbed:
    'Your Stone Resolve absorbed all damage from {attackerName}!',
  killedBy: 'You were killed by {attackerName}.',
  undyingSavedYou: 'Your Undying ability saved you from death!',
  kinfolkLifebondPrivate:
    'Your Life Bond with the monster heals you for {healAmount} HP.',
  healingBlockedTarget: 'Your healing has no effect on {targetName}.',
  healedByPlayer: 'You are healed for {actualHeal} HP by {healerName}.',
};

/**
 * Win condition messages
 */
const winConditions = {
  goodWins: 'Good triumphs! All Warlocks have been defeated.',
  evilWins: 'Evil reigns! The Warlocks have taken control.',
  gameEnded: 'Game ended.',
  noWinner: 'Game continues...',
};

module.exports = {
  errors,
  success,
  events,
  privateMessages,
  winConditions,
};
