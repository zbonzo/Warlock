/**
 * @fileoverview Combat system messages
 * Messages for damage, death, resurrection, armor, and combat mechanics
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

  // Death and resurrection messages
  death: {
    playerDies: '{playerName} has fallen!',
    playerCollapse: '{playerName} collapses to the ground!',
    playerFinalBreath: '{playerName} draws their final breath!',
    playerLightFades: "The light fades from {playerName}'s eyes!",

    // Death by specific causes
    deathByPoison: '{playerName} succumbs to poison.',
    deathByEffects: '{playerName} is overcome by magical effects.',
  },

  resurrection: {
    playerResurrected: '{playerName} refuses to stay down!',
    playerRises: '{playerName} rises from the brink of death!',
    playerDefiesDeath: 'Death cannot claim {playerName} just yet!',
    playerDefiesFate: '{playerName} defies their fate!',

    // Specific resurrection abilities
    undyingActivated: '{playerName} avoided death through Undying!',
    resurrectionByAbility: '{playerName} avoided death through {abilityName}!',
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
  },

  // Unstoppable Rage messages
  unstoppableRage: {
    damageReduction:
      "{playerName}'s Unstoppable Rage reduces damage by {resistance}%! ({before} → {after})",
    rageEnded:
      "{playerName}'s Unstoppable Rage ends, causing {damage} exhaustion damage!",
    rageFading: "{playerName}'s rage is fading...",
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
  },

  // Life Bond (Kinfolk racial)
  lifeBond: {
    healing:
      "{playerName}'s Life Bond with the monster heals them for {amount} HP.",
    healingPrivate:
      'Your Life Bond with the monster heals you for {amount} HP.',
  },

  // Private combat messages
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
  },
};


