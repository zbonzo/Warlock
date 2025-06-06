/**
 * @fileoverview Special ability messages
 * All messages related to detection, stun, and utility abilities
 */

module.exports = {
  // Detection abilities
  detectionUsed: '{playerName} uses {abilityName} on {targetName}.',
  detectionInvalidTarget:
    '{playerName} tries to use {abilityName}, but it can only target players.',
  warlockDetected: 'Revelation: {targetName} IS a Warlock!',
  warlockNotDetected: 'Revelation: {targetName} is NOT a Warlock.',

  // Eye of Fate specific
  eyeOfFateUsed: '{playerName} uses {abilityName} on {targetName}.',
  eyeOfFateWarlockFound:
    'Your Eye of Fate reveals that {targetName} is a Warlock!',
  eyeOfFateWarlockNotFound: 'Revelation: {targetName} is NOT a Warlock.',
  eyeOfFatePsychicBacklash:
    '{playerName} takes {damage} psychic backlash for failing to find a Warlock!',
  eyeOfFateBacklashPrivate:
    'You take {damage} psychic damage for not detecting a Warlock!',

  // Stun abilities
  stunApplied: '{targetName} is stunned for {turns} turn(s).',
  stunResisted: "{targetName} resists {playerName}'s {abilityName}!",
  stunInvalidTarget:
    '{playerName} tries to use {abilityName}, but the target is invalid.',

  // Multi-target stun
  multiStunCast: '{playerName} casts {abilityName}!',
  multiStunNoTargets:
    '{playerName} uses {abilityName}, but there are no valid targets.',
  multiStunNoneAffected: "{playerName}'s {abilityName} doesn't stun anyone!",

  // Primal Roar
  primalRoarUsed:
    '{playerName} lets out a terrifying roar! {targetName} is weakened and will deal {reduction}% less damage for {turns} turn(s).',
  primalRoarInvalidTarget:
    '{playerName} tries to use {abilityName}, but the target is invalid.',

  // Blood Frenzy
  bloodFrenzyActivated:
    '{playerName} enters a Blood Frenzy! Damage increases as health decreases ({rate}% per 1% HP missing).',

  // Unstoppable Rage
  unstoppableRageActivated:
    '{playerName} enters an Unstoppable Rage! Damage boosted by {damageBoost}% and damage resistance increased by {resistance}% for {turns} turns.',
  unstoppableRageWarning:
    'Warning: When the rage ends, {playerName} will take {selfDamage}% of max HP as damage!',
  unstoppableRageEnded:
    "{playerName}'s Unstoppable Rage ends, causing {damage} exhaustion damage!",

  // Spirit Guard
  spiritGuardActivated:
    '{playerName} summons vengeful spirits! Gains {armor} armor and attackers will take {counterDamage} damage and be revealed if they are Warlocks for {turns} turn(s).',
  spiritGuardCounter:
    "{targetName}'s vengeful spirits strike back at {attackerName} for {damage} damage!",
  spiritGuardCounterPrivate:
    "{targetName}'s Spirit Guard strikes you for {damage} damage!",
  spiritGuardRevealWarlock:
    'The spirits reveal that {attackerName} IS a Warlock!',
  spiritGuardRevealPrivate:
    'Your spirits reveal that {attackerName} is a Warlock!',
  spiritGuardEnded: "{playerName}'s Spirit Guard fades away.",

  // Sanctuary of Truth
  sanctuaryOfTruthActivated:
    '{playerName} creates a Sanctuary of Truth and heals for {amount} health.',
  sanctuaryOfTruthDetection:
    "{playerName}'s Sanctuary will automatically detect and punish any Warlocks who attack!",
  sanctuaryOfTruthRevealAndPunish:
    "{targetName}'s Sanctuary reveals and punishes the Warlock {attackerName} for {damage} damage!",
  sanctuaryOfTruthRevealNotWarlock:
    "{targetName}'s Sanctuary detects that {attackerName} is NOT a Warlock.",
  sanctuaryOfTruthCounterPrivate:
    "{targetName}'s Sanctuary detects your corruption and punishes you for {damage} damage!",
  sanctuaryOfTruthDetectionPrivate:
    'Your Sanctuary detects that {attackerName} is a Warlock and punishes them!',
  sanctuaryOfTruthNoWarlockPrivate:
    'Your Sanctuary confirms that {attackerName} is not a Warlock.',
  sanctuaryOfTruthHealPrivate: 'Your Sanctuary heals you for {amount} HP.',
  sanctuaryOfTruthEnded: "{playerName}'s Sanctuary of Truth fades away.",

  // Control Monster
  controlMonsterUsed:
    "{playerName} uses {abilityName}! The Monster's eyes glow with unnatural fury as it focuses on {targetName}!",
  controlMonsterDamage:
    "The Monster deals {damage} damage ({boost}% more than normal) under {playerName}'s command!",
  controlMonsterDeadMonster:
    '{playerName} tries to use {abilityName}, but the Monster is already defeated.',
  controlMonsterInvalidTarget:
    '{playerName} tries to use {abilityName}, but cannot force the Monster to attack itself.',
  controlMonsterNoTargets:
    '{playerName} uses {abilityName}, but there are no valid targets for the Monster to attack.',

  // Generic special ability messages
  specialAbilityUsed: '{playerName} uses {abilityName}.',
  specialAbilityFailed:
    '{playerName} tries to use {abilityName}, but it fails.',
  abilityCrit: '{playerName} masterfully uses {abilityName} on {targetName}!',
  abilityUltraFail:
    "{playerName}'s {abilityName} goes haywire and hits {targetName}!",
};
