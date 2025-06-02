/**
 * @fileoverview Defense ability messages
 * All messages related to protective and defensive abilities
 */

module.exports = {
  // Shield/Protection messages
  shieldApplied:
    '{playerName} is shielded with {armor} armor for {turns} turn(s).',
  protectionGranted:
    '{playerName} is protected with {armor} armor for {turns} turn(s).',

  // Invisibility messages
  invisibilityApplied: '{playerName} becomes invisible for {turns} turn(s).',
  shadowVeilUsed: '{playerName} fades from sight for {turns} turn(s).',

  // Shadowstep messages
  shadowstepUsed:
    '{playerName} uses {abilityName} on {targetName}, shrouding them in shadows for {turns} turn(s).',
  shadowstepInvalidTarget:
    '{playerName} tries to use {abilityName}, but the target is invalid.',

  // Multi-target protection
  multiProtectionUsed:
    '{playerName} uses {abilityName}, protecting {count} allies with {armor} armor for {turns} turn(s).',
  battleCryUsed:
    '{playerName} uses {abilityName}, protecting {count} allies with {armor} armor for {turns} turn(s).',
  divineShieldUsed:
    '{playerName} uses {abilityName}, protecting {count} allies with {armor} armor for {turns} turn(s).',

  // Generic defense messages
  defenseActivated: '{playerName} activates {abilityName}.',
  defenseFailed: '{playerName} tries to use {abilityName}, but it fails.',
};

