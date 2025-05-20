/**
 * @fileoverview User messages configuration
 * Centralizes all error messages, success messages, and game event text
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
  
  // Player validation errors
  playerNotFound: 'Player not found in this game.',
  playerExists: 'You are already in this game.',
  playerNotInGame: 'You are not a player in this game.',
  playerDead: 'Cannot perform action while dead.',
  playerStunned: 'You are stunned and cannot act.',
  invalidPlayerName: 'Invalid player name. Please use 1-20 alphanumeric characters.',
  
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
  racialAbilityOnCooldown: 'Your racial ability is on cooldown for {turns} more turn(s).',
  noUsesLeft: 'No uses left for {abilityName} ability.',
  
  // Human Adaptability specific
  adaptabilityFailed: 'Failed to use Adaptability ability.',
  abilityNotFound: 'Original ability not found.',
  abilityNotUnlocked: 'Ability not unlocked at this level.',
  
  // Server errors
  serverBusy: 'Server is too busy right now. Please try again later.',
  unexpectedError: 'An unexpected error occurred. Please try again.',
  reconnectionFailed: 'Failed to reconnect to game.',
  
  // Rate limiting
  rateLimited: 'Too many requests. Please slow down.',
  cooldownActive: 'Please wait before trying again.'
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
  bonusesApplied: 'Level {level} bonuses: Fully healed! Max HP increased by {hpIncrease}! Damage increased by 25%!'
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
  playerPoisoned: '{playerName} is poisoned for {damage} damage over {turns} turns.',
  playerProtected: '{playerName} is protected with {armor} armor for {turns} turn(s).',
  playerInvisible: '{playerName} becomes invisible for {turns} turn(s).',
  playerStunned: '{playerName} is stunned for {turns} turn(s).',
  
  // Warlock events
  playerCorrupted: 'Another hero has been corrupted!',
  warlockRevealed: '{playerName} IS a Warlock!',
  notWarlock: '{playerName} is NOT a Warlock.',
  
  // Racial abilities
  humanAdaptability: '{playerName} uses Adaptability to replace one ability.',
  elfKeenSenses: '{playerName} uses Keen Senses to study {targetName} closely.',
  orcBloodRage: '{playerName} enters a Blood Rage, taking {damage} damage but doubling their next attack!',
  satyrForestsGrace: '{playerName} calls upon Forest\'s Grace, gaining healing over time.',
  dwarfStoneArmor: '{playerName}\'s Stone Armor cracks and weakens! ({oldValue} → {newValue})',
  skeletonUndying: '{playerName}\'s Undying ability is already active.',
  
  // Stone Armor specific
  stoneArmorDestroyed: '{playerName}\'s Stone Armor is completely shattered! They now take increased damage!',
  stoneArmorDegraded: '{playerName}\'s Stone Armor weakens from the attack!',
  
  // Game progression
  levelUp: 'The party has advanced to level {level}!',
  nextRound: 'Round {round} begins!',
  gameEnding: 'Game ending...',
  
  // Player connection
  playerJoined: '{playerName} joined the game.',
  playerLeft: '{playerName} left the game.',
  playerDisconnected: '{playerName} temporarily disconnected.',
  playerReconnected: '{playerName} has reconnected.',
  hostChanged: 'Game host changed to {playerName}.'
};

/**
 * Private messages sent only to specific players
 */
const private = {
  // Combat
  youAttacked: 'You attacked {targetName} for {damage} damage (initial {initialDamage}, reduced by {reduction}% from armor).',
  youWereAttacked: '{attackerName} attacked you for {damage} damage, reduced by {reduction}% from your armor.',
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
  attemptToHealWarlock: 'You attempted to heal {targetName} (a Warlock), but healed yourself for {amount} HP instead.',
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
  adaptabilityChooseFrom: 'Choose a new ability from {className}:'
};

/**
 * Win condition messages
 */
const winConditions = {
  goodWins: 'Good triumphs! All Warlocks have been defeated.',
  evilWins: 'Evil reigns! The Warlocks have taken control.',
  gameEnded: 'Game ended.',
  noWinner: 'Game continues...'
};

/**
 * Helper function to format messages with placeholders
 * @param {string} template - Message template with {placeholder} syntax
 * @param {Object} data - Data to replace placeholders with
 * @returns {string} Formatted message
 */
function formatMessage(template, data = {}) {
  if (!template) return '';
  
  return template.replace(/{(\w+)}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

/**
 * Helper function to get message by category and key
 * @param {string} category - Message category (errors, success, events, etc.)
 * @param {string} key - Message key
 * @returns {string|null} Message template or null if not found
 */
function getMessage(category, key) {
  const categories = { errors, success, events, private, winConditions };
  return categories[category]?.[key] || null;
}

/**
 * Helper function to get formatted error message
 * @param {string} key - Error key
 * @param {Object} data - Data for placeholders
 * @returns {string} Formatted error message
 */
function getError(key, data = {}) {
  const template = errors[key];
  return template ? formatMessage(template, data) : 'Unknown error occurred.';
}

/**
 * Helper function to get formatted success message
 * @param {string} key - Success key
 * @param {Object} data - Data for placeholders
 * @returns {string} Formatted success message
 */
function getSuccess(key, data = {}) {
  const template = success[key];
  return template ? formatMessage(template, data) : 'Action completed.';
}

/**
 * Helper function to get formatted event message
 * @param {string} key - Event key
 * @param {Object} data - Data for placeholders
 * @returns {string} Formatted event message
 */
function getEvent(key, data = {}) {
  const template = events[key];
  return template ? formatMessage(template, data) : '';
}

module.exports = {
  errors,
  success,
  events,
  private,
  winConditions,
  
  // Helper functions
  formatMessage,
  getMessage,
  getError,
  getSuccess,
  getEvent
};