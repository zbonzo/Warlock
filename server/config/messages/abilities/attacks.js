/**
 * @fileoverview Attack ability messages
 * All messages related to damage-dealing abilities
 */

module.exports = {
  // Basic attack failure messages
  attackInvisible:
    '{attackerName} tries to attack {targetName}, but they are invisible and cannot be seen!',
  attackInvalidTarget:
    '{actorName} tries to use {abilityName}, but the target is invalid.',
  attackDeadTarget: '{actorName} cannot attack the fallen {targetName}.',

  // Poison-related messages
  poisonStrike:
    '{targetName} is poisoned for {damage} damage over {turns} turns.',
  poisonApplied:
    '{playerName} is poisoned for {damage} damage over {turns} turns.',

  // Multi-hit attack messages
  multiHitAnnounce:
    '{playerName} uses {abilityName} on {targetName}, striking {hits} times!',
  multiHitSummary:
    '{hitCount} hits connected, dealing a total of {totalDamage} damage.',
  multiHitMissed: 'All hits missed!',
  multiHitIndividual:
    'Hit #{hitNumber}: {playerName} dealt {damage} damage to {targetName}',
  multiHitMiss: 'Hit #{hitNumber} missed!',

  // Vulnerability messages
  vulnerabilityApplied:
    '{targetName} is VULNERABLE and will take {increase}% more damage for {turns} turn(s)!',
  vulnerabilityStrike:
    "{targetName} is weakened by {playerName}'s {abilityName}!",

  // Area of Effect messages
  aoeAnnounce: '{playerName} unleashes {abilityName}!',
  aoeNoTargets:
    '{playerName} uses {abilityName}, but there are no valid targets.',

  // Death Mark specific
  deathMarkPoison:
    '{playerName} uses {abilityName} on {targetName}, marking them for death with {damage} poison damage over {turns} turns, then vanishes into the shadows!',
  deathMarkInvalidTarget:
    '{playerName} tries to use {abilityName} on the Monster, but it has no effect.',

  // Poison Trap messages
  poisonTrapAnnounce: '{playerName} sets multiple {abilityName}s!',
  poisonTrapCaught:
    "{targetName} is caught in {playerName}'s {abilityName}, taking {damage} poison damage over {turns} turns and becoming vulnerable (+{increase}% damage) for {vulnerableTurns} turns!",
  poisonTrapMissed: "{playerName}'s {abilityName}s don't catch anyone!",
  poisonTrapSummary: '{count} enemies were caught in the traps!',

  // Reckless Strike messages
  recklessStrikeSelfDamage:
    '{playerName} commits to a reckless strike, taking {damage} damage!',

  // Inferno Blast messages
  infernoBlastPoison:
    '{targetName} is poisoned for {damage} damage over {turns} turns.',

  // Monster attack messages (when players attack monster)
  monsterAttackSuccess:
    "The Monster takes {damage} damage from {playerName}'s {abilityName}!",
  monsterAttackFailure:
    '{playerName} tries to use {abilityName} on the Monster, but it has no effect.',

  // Generic ability usage
  abilityUsed: '{playerName} uses {abilityName}.',
  abilityFailed:
    '{playerName} tries to use {abilityName}, but something goes wrong!',
};


