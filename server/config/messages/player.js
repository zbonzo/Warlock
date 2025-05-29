/**
 * @fileoverview Player system messages
 * Messages for player actions, validation, state changes, and feedback
 */

module.exports = {
  // Action validation messages
  validation: {
    actionAlreadySubmitted:
      'You have already submitted an action for this round.',
    deadPlayersCannotAct: 'Dead players cannot perform actions.',
    actionSubmissionFailed: 'Action submission failed.',
    invalidActionType: 'Invalid action type.',
    abilityNotAvailable: 'Ability is not available.',
    abilityOnCooldown: 'Ability is on cooldown for {turns} more turn(s).',
    noTargetSpecified: 'No target specified.',
    invalidTarget: 'Invalid target specified.',
    targetNoLongerValid: 'Selected target is no longer alive or valid.',
    monsterNotValidTarget: 'Monster is no longer a valid target.',
    targetNotAliveOrValid: 'Player target is no longer alive or valid.',
  },

  // Action submission messages
  submission: {
    actionSubmitted: 'Action submitted successfully.',
    actionSubmissionProgress:
      'Action submission progress: {submitted}/{total} players submitted.',
    allActionsSubmitted: 'All actions submitted, processing round.',
    waitingForOtherPlayers:
      'Waiting for other players to submit their actions.',
    submissionSuccessful: 'Your action has been recorded.',
    submissionFailed: 'Failed to submit action. Please try again.',
  },

  // Player state messages
  state: {
    playerJoined: '{playerName} joined the game.',
    playerLeft:
      '{playerName} wandered into the forest to discover that there are many more monsters and they were very much unequipped',
    playerDisconnected:
      '{playerName} wandered into the forest to discover that there are many more monsters and they were very much unequipped.',
    playerReconnected: '{playerName} has reconnected.',
    hostChanged: 'Game host changed to {playerName}.',

    // Character selection
    characterSelected: 'Character selected successfully.',
    raceSelected: 'Race selected: {race}.',
    classSelected: 'Class selected: {class}.',

    // Ready states
    playerReady: '{playerName} is ready.',
    playerNotReady: '{playerName} is not ready.',
    allPlayersReady: 'All players are ready! Host can start the game.',
    waitingForPlayers: 'Waiting for more players to join...',
  },

  // Action processing messages
  processing: {
    actionProcessing: 'Processing your action...',
    actionProcessed: 'Action processed successfully.',
    actionFailed: 'Action failed to process.',
    actionCancelled: 'Action was cancelled.',
    actionInvalidated: 'Action was invalidated: {reason}.',
    actionExpired: 'Action has expired.',
  },

  // Ability cooldown messages
  cooldowns: {
    abilityCooledDown: '{abilityName} is ready to use again.',
    cooldownRemaining:
      '{abilityName} has {turns} turn(s) remaining on cooldown.',
    cooldownExpired: 'Cooldown expired for {abilityName}.',
    noCooldownActive: 'No cooldown active for {abilityName}.',
    cooldownActive: 'Cooldown is active for {abilityName}.',
  },

  // Player status and feedback
  status: {
    healthFull: 'You are at full health.',
    healthLow: 'Your health is low!',
    healthCritical: 'Your health is critical!',
    armorActive: 'You have {armor} armor active.',
    statusEffectsActive: 'You have {count} status effect(s) active.',
    noStatusEffects: 'You have no active status effects.',
  },

  // Level up and progression
  progression: {
    levelUp: 'You have reached level {level}!',
    newAbilitiesUnlocked: 'New abilities unlocked at level {level}!',
    statsIncreased: 'Your stats have increased!',
    maxHpIncreased: 'Maximum HP increased by {amount}!',
    damageIncreased: 'Damage increased by {percent}%!',
    fullyHealed: 'You have been fully healed!',
  },

  // Class-specific messages
  classEffects: {
    bloodFrenzyActive:
      'Blood Frenzy is active - damage increases as health decreases.',
    unstoppableRageActive:
      'Unstoppable Rage is active for {turns} more turn(s).',
    unstoppableRageEnded:
      'Unstoppable Rage has ended - you take {damage} exhaustion damage.',
    spiritGuardActive:
      'Spirit Guard is protecting you for {turns} more turn(s).',
    sanctuaryActive: 'Sanctuary of Truth is active for {turns} more turn(s).',
  },

  // Stone Armor (Dwarf racial) messages
  stoneArmor: {
    armorIntact: 'Your Stone Armor is intact with {value} armor value.',
    armorDegraded: 'Your Stone Armor has degraded to {value} armor value.',
    armorDestroyed: 'Your Stone Armor has been completely destroyed!',
    armorWeakened: 'Your Stone Armor weakens from the damage.',
    negativeArmor:
      'Your broken Stone Armor causes you to take {percent}% more damage.',
  },

  // Action validation states
  actionStates: {
    actionValid: 'Action is valid and ready.',
    actionInvalid: 'Action is invalid: {reason}.',
    actionPending: 'Action is pending validation.',
    actionWaitingForTarget: 'Waiting for target selection.',
    actionReadyToExecute: 'Action is ready to execute.',
  },

  // Error recovery messages
  recovery: {
    actionReset: 'Your action has been reset.',
    stateRecovered: 'Player state has been recovered.',
    syncComplete: 'Player synchronization complete.',
    connectionRestored: 'Connection restored successfully.',
    retryAction: 'Please retry your action.',
  },

  // Private player notifications
  private: {
    yourTurn: "It's your turn to act.",
    waitingForYourAction: 'Waiting for your action.',
    actionNeeded: 'Please select an action.',
    targetNeeded: 'Please select a target.',
    confirmAction: 'Please confirm your action.',
    roundStarting: 'New round is starting.',
    roundEnding: 'Round is ending.',
    gameStarting: 'Game is starting!',
    gameEnding: 'Game is ending.',
  },
};
