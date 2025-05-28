/**
 * @fileoverview Warlock system messages
 * Messages for corruption, conversion, detection, and warlock mechanics
 */

module.exports = {
  // Corruption and conversion messages
  corruption: {
    playerCorrupted: 'Another hero has been corrupted!',
    playerConverted: 'A hero has fallen to darkness!',
    corruptionSpreads: 'The corruption spreads through the party!',
    darknessWins: 'Darkness claims another soul!',

    // Conversion attempt messages
    conversionAttempted: 'Dark energy swirls around {targetName}...',
    conversionFailed: '{targetName} resists the corrupting influence.',
    conversionSuccess: '{targetName} has been turned to the dark side!',

    // Corruption by source
    warlockInfluence: "{attackerName}'s dark influence affects {targetName}.",
    darkWhispers: "Dark whispers echo in {targetName}'s mind...",
    shadowTouch: 'Shadows reach out to claim {targetName}.',
  },

  // Detection and revelation messages
  detection: {
    warlockRevealed: '{playerName} IS a Warlock!',
    notWarlock: '{playerName} is NOT a Warlock.',
    warlockDetected: '{playerName} has been exposed as a Warlock!',
    innocentRevealed: "{playerName}'s innocence is confirmed.",

    // Detection methods
    magicalDetection: "Magical forces reveal {playerName}'s true nature!",
    divineSight: "Divine sight pierces through {playerName}'s disguise!",
    truthRevealed: 'The truth about {playerName} is revealed!',

    // Detection failure
    detectionFailed: 'The detection attempt reveals nothing.',
    obscuredTruth: "{playerName}'s true nature remains hidden.",
    magicResisted: '{playerName} resists the detection magic.',
  },

  // Warlock win conditions
  victory: {
    warlocksWin: 'Evil reigns! The Warlocks have taken control.',
    goodWins: 'Good triumphs! All Warlocks have been defeated.',
    darknessVictorious: 'Darkness has consumed the world!',
    lightPrevails: 'The light has banished the darkness!',

    // Victory by method
    corruptionComplete: 'The corruption is complete - evil has won!',
    allWarlocksDefeated: 'With the last Warlock fallen, good prevails!',
    majorityCorrupted: 'The corrupted now outnumber the pure!',
  },

  // Warlock abilities and effects
  abilities: {
    corruptingTouch: '{warlockName} reaches out with a corrupting touch...',
    darkMagic: '{warlockName} channels dark magical energies!',
    shadowManipulation: '{warlockName} manipulates the shadows!',
    vileInfluence: "{warlockName}'s vile influence spreads!",

    // Warlock-specific ability results
    corruptionAura: 'An aura of corruption surrounds {warlockName}.',
    darkPower: '{warlockName} draws upon dark powers!',
    evilPresence: 'Evil presence emanates from {warlockName}.',
  },

  // Corruption resistance and immunity
  resistance: {
    corruptionResisted: '{playerName} resists the corruption!',
    purityProtects: "{playerName}'s purity protects them from corruption.",
    willpowerTriumphs: "{playerName}'s willpower overcomes the dark influence.",
    faithShields: "{playerName}'s faith shields them from evil.",

    // Temporary immunity
    recentCorruption:
      '{playerName} is still recovering from recent corruption attempts.',
    corruptionCooldown: '{playerName} cannot be corrupted again so soon.',
    protectedByLight: '{playerName} is temporarily protected by divine light.',
  },

  // Warlock identification and suspicion
  suspicion: {
    suspiciousBehavior: "{playerName}'s behavior seems suspicious...",
    darkAura: 'Something dark seems to surround {playerName}.',
    unnaturalActions: "{playerName}'s actions seem unnatural.",
    hiddenMotives: "{playerName}'s motives are unclear.",

    // False accusations
    falseAccusation: '{playerName} was wrongly suspected of being a Warlock.',
    mistakeRevealed: 'The suspicion about {playerName} was misplaced.',
    innocentAccused: 'An innocent has been accused of corruption.',
  },

  // Private warlock messages
  private: {
    youCorrupted: 'You corrupted {targetName}.',
    youWereCorrupted: 'You were corrupted and are now a Warlock.',
    corruptionFailed: 'Your corruption attempt on {targetName} failed.',
    youAreWarlock:
      'You are a Warlock. Spread corruption and eliminate the good players.',

    // Warlock instructions
    corruptionInstructions: 'Attack other players to attempt corruption.',
    winCondition: 'Convert enough players or eliminate the opposition to win.',
    hiddenIdentity: 'Keep your true nature hidden from the other players.',

    // Corruption attempts
    attemptCorruption: 'Attempting to corrupt {targetName}...',
    corruptionSuccess: 'You successfully corrupted {targetName}!',
    corruptionBlocked: 'Your corruption attempt was blocked.',

    // Detection avoidance
    detectionAvoided: 'You avoided detection.',
    suspicionRaised: 'Your actions may have raised suspicion.',
    identityCompromised: 'Your identity may be compromised.',
  },

  // Warlock system mechanics
  mechanics: {
    corruptionChance: 'Corruption chance: {chance}%',
    corruptionModified: 'Corruption chance modified by {modifier}',
    multipleWarlocks: 'Multiple Warlocks are now active.',
    lastWarlock: '{playerName} is the last remaining Warlock.',

    // Corruption limits and cooldowns
    corruptionLimitReached: 'Maximum corruptions per round reached.',
    corruptionCooldownActive: 'Corruption is on cooldown.',
    corruptionWindowClosed: 'The corruption window has closed.',

    // Balance mechanics
    corruptionScaling: 'Corruption chance scales with Warlock count.',
    balanceAdjustment: 'Game balance adjusts for current player ratio.',
    difficultyIncrease: 'Corruption becomes more difficult with fewer targets.',
  },
};
