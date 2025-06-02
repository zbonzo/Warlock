/**
 * @fileoverview Healing ability messages
 * All messages related to healing and restoration abilities
 */

module.exports = {
  // Basic healing messages
  healingApplied: '{playerName} was healed for {amount} health.',
  healingPerformed: '{healerName} healed {targetName} for {amount} health.',

  // Full health messages
  alreadyFullHealth:
    "{healerName} tried to heal {targetName}, but they're already at full health.",
  targetFullHealth: '{targetName} is already at full health.',

  // Warlock healing behavior
  warlockHealingRejected: 'You rejected the healing from {healerName}.',
  warlockHealingSelfHeal:
    'You attempted to heal {targetName} (a Warlock), but healed yourself for {amount} HP instead.',

  // Rejuvenation (Heal over Time)
  rejuvenationCast:
    '{playerName} casts {abilityName}, blessing nearby allies with healing over time!',
  rejuvenationApplied:
    '{count} allies were blessed with {healPerTurn} HP regeneration per turn for {turns} turns.',
  rejuvenationNoTargets:
    "{playerName}'s {abilityName} finds no valid targets to bless.",
  rejuvenationBlessing:
    '{playerName} blessed you with healing over time! You will regenerate {healPerTurn} HP per turn for {turns} turns.',

  // Healing over time processing
  healingOverTimeRegeneration:
    '{playerName} regenerates {amount} health from their blessing.',
  healingOverTimeExpired: 'The healing blessing on {playerName} has faded.',

  // Multi-target healing
  multiHealCast: '{playerName} casts {abilityName}, healing nearby allies!',
  multiHealTargets:
    "{count} allies were healed by {playerName}'s {abilityName}.",

  // Private healing messages
  youHealed: 'You healed {targetName} for {amount} health.',
  youWereHealed: '{healerName} healed you for {amount} health.',
  youRegenerateHP: 'You regenerate {amount} HP from healing over time.',

  // Generic healing messages
  healingFailed:
    '{playerName} tries to use {abilityName}, but the healing fails.',
  healingUsed: '{playerName} uses {abilityName}.',
};


