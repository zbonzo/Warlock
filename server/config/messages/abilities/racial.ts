/**
 * @fileoverview Racial ability messages
 * All messages related to race-specific abilities
 */

const messages = {
  // Artisan Adaptability
  adaptabilityUsed: '{playerName} uses Adaptability to replace one ability.',
  adaptabilityAvailableAbilities:
    'Choose an ability to replace with Adaptability.',

  // Crestfallen Keen Senses (commented out as it's not currently active)
  // keenSensesUsed: '{playerName} uses Keen Senses to study {targetName} closely.',
  // keenSensesInvalidTarget: '{playerName} tried to use Keen Senses on the Monster, but it has no effect.',
  // keenSensesNextAttack: '{playerName}\'s next attack on {targetName} will reveal their true nature.',

  // Orc Blood Rage
  bloodRageUsed:
    '{playerName} enters a Blood Rage, taking {damage} damage but doubling their next attack!',

  // Kinfolk Forest's Grace (commented out as it's not currently active)
  // forestsGraceUsed: '{playerName} calls upon Forest\'s Grace, gaining healing over time.',
  // forestsGraceHealing: '{playerName} will heal for {amount} HP each turn for {turns} turns.',

  // Lich Undying
  undyingActivated:
    "{playerName}'s Undying ability is now active and will trigger automatically when needed.",
  undyingAlreadyActive: "{playerName}'s Undying ability is already active.",

  // Rockhewn Stone Armor (passive - messages handled in combat system)

  // Generic racial ability messages
  racialAbilityUsed: '{playerName} uses their racial ability.',
  racialAbilityFailed:
    '{playerName} tries to use their racial ability, but it fails.',
  racialAbilityCrit:
    '{playerName} unleashes the full power of their racial ability!',
  racialAbilityUltraFail:
    "{playerName}'s racial ability backfires on {targetName}!",
} as const;

export default messages;