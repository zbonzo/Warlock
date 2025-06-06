/**
 * @fileoverview Enhanced combat system messages with coordination and comeback mechanics (updated with audit findings)
 * Messages for damage, death, resurrection, armor, and new team balance features
 */

module.exports = {
  // Damage messages
  damage: {
    // Standard damage messages
    playerTakesDamage: '{targetName} takes {damage} damage!',
    playerDamageWithArmor:
      '{targetName} takes {damage} damage ({initial} reduced by {reduction}% armor)!',
    playerDamageReduced:
      "{targetName}'s {armor} armor reduces the blow to {damage} damage!",

    // Vulnerability messages
    vulnerabilityDamage:
      '{targetName} takes {damage} damage (increased by vulnerability)!',
    vulnerabilityAmplified: 'Vulnerability amplifies the damage to {damage}!',
    vulnerabilityEffect: "{targetName}'s weakness causes {damage} damage!",

    // Monster damage
    monsterTakesDamage: 'The Monster takes {damage} damage!',

    // Damage application descriptions
    damageDealt: '{damage} damage is dealt to {targetName}!',
    damageStruck: '{targetName} is struck for {damage} damage!',
  },

  // NEW: Coordination bonus messages
  coordination: {
    damageBonus:
      'Coordinated attack! {playerCount} players target {targetName} for +{bonusPercent}% damage!',
    healingBonus:
      'Coordinated healing! {playerCount} healers restore {targetName} for +{bonusPercent}% healing!',
    monsterAssault:
      'Coordinated assault! {playerCount} players attack the Monster for +{bonusPercent}% damage!',
    teamworkAnnouncement:
      'Teamwork makes the dream work! Coordination bonus activated.',
    coordinationFailed:
      'Attack coordination failed - players targeted different enemies.',
    healingCoordination:
      'Multiple healers focus their efforts on {targetName}!',
  },

  // NEW: Comeback mechanics messages
  comeback: {
    activated:
      '🔥 COMEBACK MECHANICS ACTIVATED! 🔥 The remaining {goodPlayerCount} good players fight with desperate strength!',
    damageBonus:
      'Desperate resolve grants {playerName} +{bonusPercent}% damage!',
    healingBonus:
      "Survival instincts boost {playerName}'s healing by +{bonusPercent}%!",
    armorBonus: 'Determination grants {playerName} +{armorBonus} armor!',
    corruptionResistance:
      '{playerName} resists corruption with {resistancePercent}% resistance!',
    lastStand: 'The final heroes make their last stand against the darkness!',
    hopeDies:
      'With the fall of {playerName}, hope fades from the remaining heroes...',
    hopeRenewed: 'Against all odds, the tide may yet turn!',
  },

  // NEW: Detection penalty messages
  detection: {
    penaltyApplied:
      '{warlockName} has been exposed! They take +{penaltyPercent}% damage and cannot corrupt others this turn.',
    penaltyActive:
      '{warlockName} suffers from recent detection - taking increased damage!',
    corruptionBlocked:
      'Your recent exposure prevents you from corrupting others.',
    penaltyExpired: 'The detection penalties have worn off.',
    warlockWeakened: 'The exposed Warlock {warlockName} appears vulnerable!',

    // Private messages for detected warlocks
    privateDetectionPenalty:
      "You've been detected! You take +{penaltyPercent}% damage and cannot corrupt others this turn.",
    privatePenaltyWarning:
      'Your corruption exposure makes you vulnerable to attacks!',
    privateCorruptionBlocked:
      'Your recent detection prevents you from corrupting others this turn.',
  },

  // Death and resurrection messages
  death: {
    playerDies: '{playerName} has fallen!',
    playerCollapse: '{playerName} collapses to the ground!',
    playerFinalBreath: '{playerName} draws their final breath!',
    playerLightFades: "The light fades from {playerName}'s eyes!",

    // Death by specific causes
    deathByPoison: '{playerName} succumbs to poison.',
    deathByEffects: '{playerName} is overcome by magical effects.',

    // NEW: Death with comeback context
    heroicSacrifice:
      '{playerName} falls heroically, inspiring the remaining good players!',
    warlockEliminated: 'The Warlock {playerName} has been eliminated!',
    lastHeroDies:
      "With {playerName}'s death, the last light of hope is extinguished...",
  },

  resurrection: {
    playerResurrected: '{playerName} refuses to stay down!',
    playerRises: '{playerName} rises from the brink of death!',
    playerDefiesDeath: 'Death cannot claim {playerName} just yet!',
    playerDefiesFate: '{playerName} defies their fate!',

    // Specific resurrection abilities
    undyingActivated: '{playerName} avoided death through Undying!',
    resurrectionByAbility: '{playerName} avoided death through {abilityName}!',

    // NEW: Comeback-themed resurrection
    hopefulReturn:
      '{playerName} returns to continue the fight against darkness!',
    undyingWill:
      'Undying determination brings {playerName} back to the battle!',
  },

  // Armor and protection messages
  armor: {
    // Stone Armor (Rockhewn racial)
    stoneArmorDegrades:
      "{playerName}'s Stone Armor cracks and weakens! ({oldValue} → {newValue})",
    stoneArmorDestroyed:
      "{playerName}'s Stone Armor is completely shattered! They now take increased damage!",
    stoneArmorWeakens: "{playerName}'s Stone Armor weakens from the attack!",

    // General armor messages
    armorAbsorbs: "{playerName}'s armor absorbs some of the damage!",
    armorReducesDamage: 'Armor reduces the damage to {playerName}!',

    // NEW: Comeback armor bonuses
    comebackArmor:
      'Desperate determination grants {playerName} additional armor!',
    lastStandProtection:
      "The final heroes' resolve manifests as protective energy!",
  },

  // Counter-attack messages
  counterAttack: {
    spiritGuardCounter:
      "{defenderName}'s vengeful spirits strike back at {attackerName} for {damage} damage!",
    spiritGuardCounterPrivate:
      "{defenderName}'s Spirit Guard strikes you for {damage} damage!",
    spiritGuardReveal: 'The spirits reveal that {attackerName} IS a Warlock!',
    spiritGuardRevealPrivate:
      'Your spirits reveal that {attackerName} is a Warlock!',

    sanctuaryCounter:
      "{defenderName}'s Sanctuary reveals and punishes the Warlock {attackerName} for {damage} damage!",
    sanctuaryCounterPrivate:
      "{defenderName}'s Sanctuary detects your corruption and punishes you for {damage} damage!",
    sanctuaryReveal:
      "{defenderName}'s Sanctuary detects that {attackerName} is a Warlock and punishes them!",
    sanctuaryNoWarlock:
      "{defenderName}'s Sanctuary detects that {attackerName} is NOT a Warlock.",
    sanctuaryNoWarlockPrivate:
      'Your Sanctuary confirms that {attackerName} is not a Warlock.',

    genericCounter: '{defenderName} strikes back at {attackerName}!',
    counterDamage: 'A counter-attack deals {damage} damage to {attackerName}!',

    // NEW: Detection-based counter attacks
    detectionCounterAttack:
      "{defenderName}'s detection ability strikes back at the exposed Warlock {attackerName}!",
    truthRevealed:
      'The truth is revealed, and {attackerName} pays the price for their deception!',
  },

  // Immunity and special defense messages
  immunity: {
    stoneResolve:
      "{playerName}'s Stone Resolve absorbed all damage from an attack!",
    stoneResolvePrivate:
      'Your Stone Resolve absorbed all damage from {attackerName}!',
    stoneResolveAttacker:
      "{targetName}'s Stone Resolve absorbed all your damage!",

    generalImmunity: '{playerName} is immune to the attack!',
    damageNegated: 'The damage to {playerName} is completely negated!',

    // NEW: Comeback-related immunities
    desperateResolve:
      "{playerName}'s desperate resolve protects them from harm!",
    lastHopeShield: 'The last hope of good protects {playerName} from evil!',
  },

  // Unstoppable Rage messages
  unstoppableRage: {
    damageReduction:
      "{playerName}'s Unstoppable Rage reduces damage by {resistance}%! ({before} → {after})",
    rageEnded:
      "{playerName}'s Unstoppable Rage ends, causing {damage} exhaustion damage!",
    rageFading: "{playerName}'s rage is fading...",

    // NEW: Rage with comeback mechanics
    rageBoosted: "{playerName}'s rage is amplified by desperate circumstances!",
    finalRage: "In their darkest hour, {playerName}'s rage burns brightest!",
  },

  // Moonbeam detection (Crestfallen racial)
  moonbeam: {
    warlockDetected:
      "{targetName}'s desperate Moonbeam reveals that {attackerName} IS corrupted!",
    notWarlockDetected:
      "{targetName}'s Moonbeam reveals that {attackerName} is pure.",
    moonbeamPrivate: 'Your Moonbeam detected that {attackerName} is a Warlock!',
    moonbeamConfirmed:
      'Your Moonbeam confirmed that {attackerName} is not a Warlock.',
    moonbeamExposed: "{targetName}'s Moonbeam exposed your corruption!",
    moonbeamConfirmedPurity: "{targetName}'s Moonbeam confirmed your purity.",

    // NEW: Enhanced moonbeam messages
    moonbeamDesperate:
      "In desperation, {targetName}'s Moonbeam pierces through deception!",
    truthRevealed: 'The moonlight reveals the truth about {attackerName}!',
  },

  // Life Bond (Kinfolk racial)
  lifeBond: {
    healing:
      "{playerName}'s Life Bond with the monster heals them for {amount} HP.",
    healingPrivate:
      'Your Life Bond with the monster heals you for {amount} HP.',

    // NEW: Life Bond with comeback mechanics
    bondStrengthened:
      "{playerName}'s Life Bond grows stronger in desperate times!",
    naturalHealing: 'Nature itself aids {playerName} in their time of need!',
  },

  // NEW: Team coordination status messages
  teamwork: {
    coordinationBuilding: 'Players are coordinating their efforts...',
    teamworkBonus: 'Teamwork grants significant bonuses to damage and healing!',
    communicationKey:
      'Communication and timing are essential for maximum coordination!',
    isolatedPlayer:
      '{playerName} acts alone while others coordinate their efforts.',
    perfectCoordination:
      'Perfect coordination! All players target the same enemy!',
    healingChain:
      'A chain of healing magic flows through the coordinated healers!',
  },

  // NEW: Warlock detection and corruption interaction messages
  warlockInteraction: {
    corruptionResisted:
      '{targetName} resists corruption with {resistancePercent}% resistance from comeback mechanics!',
    detectedWarlockWeakened:
      'The recently detected Warlock {warlockName} appears more vulnerable!',
    corruptionFailed:
      "{warlockName}'s corruption attempt fails against {targetName}'s resolve!",
    detectionPreventsCorruption:
      '{warlockName} cannot corrupt others while suffering from detection penalties!',
    lastHopeResistance:
      'The last hopes of good grant strong resistance to corruption!',
  },

  // Private combat messages (enhanced)
  private: {
    youAttacked:
      'You attacked {targetName} for {damage} damage (initial {initialDamage}, reduced by {reduction}% from armor).',
    youWereAttacked:
      '{attackerName} attacked you for {damage} damage, reduced by {reduction}% from your armor.',
    attackerDamageDealt:
      'You attacked {targetName} for {damage} damage (initial {initialDamage}, reduced by {reduction}% from their {armor} armor).',
    targetDamageReceived: '{attackerName} attacked you for {damage} damage.',

    // Simple damage messages (no armor)
    youAttackedSimple: 'You attacked {targetName} for {damage} damage.',
    youWereAttackedSimple: '{attackerName} attacked you for {damage} damage.',

    // NEW: Private coordination messages
    youCoordinated:
      'Your coordinated attack with {playerCount} others deals bonus damage!',
    coordinationReceived:
      'You benefit from coordinated healing by {playerCount} allies!',

    // NEW: Private comeback messages
    yourComebackBonuses:
      'Comeback mechanics grant you: +{damageBonus}% damage, +{healingBonus}% healing, +{armorBonus} armor!',
    yourCorruptionResistance:
      'Your desperate situation grants {resistancePercent}% corruption resistance!',

    // NEW: Private detection messages
    yourDetectionPenalty:
      'Being detected applies: +{penaltyPercent}% damage taken, corruption blocked this turn.',
    yourDetectionRecovery:
      'Detection penalties have worn off - you can corrupt again!',

    // NEW: CombatSystem.js audit items - Player messages
    attackedWithArmor:
      '{attackerName} attacked you for {actualDamage} damage ({damageAmount} base, reduced by {reductionPercent}% from your {effectiveArmor} armor).',
    attackedNoArmor: '{attackerName} attacked you for {actualDamage} damage.',
    healedByPlayer: 'You are healed for {actualHeal} HP by {healerName}.',
    stoneArmorWeakenedAttacker:
      "{targetName}'s Stone Armor weakens from your attack!",
    moonbeamExposedCorruption:
      "{targetName}'s Moonbeam exposed your corruption!",
    moonbeamConfirmedPurityAttacker:
      "{targetName}'s Moonbeam confirmed your purity.",
    healingBlockedTarget: 'Your healing has no effect on {targetName}.',
    healedTarget: 'You heal {targetName} for {actualHeal} HP.',
    youKilledTarget: 'You killed {targetName}.',
    targetAvoidedDeathUndying: '{playerName} avoided death through Undying.',
    stoneResolveAbsorbedYourDamage:
      "{targetName}'s Stone Resolve absorbed all your damage!",
  },

  // NEW: Game state transition messages
  gameState: {
    comebackActivated:
      'The tide of battle shifts - the remaining good players fight with renewed vigor!',
    comebackDeactivated:
      'The immediate crisis passes, but vigilance remains...',
    coordrationImproved: 'Team coordination is improving!',
    coordinationBroken:
      'Team coordination falters as players act independently.',
    finalStand: 'This may be the final stand of good against evil!',
    hopefulTurn: 'The momentum shifts - perhaps there is hope yet!',
    darknessRising: 'Darkness spreads as the Warlocks gain the upper hand...',
    balanceShifts: 'The balance of power shifts dramatically!',
  },
};
