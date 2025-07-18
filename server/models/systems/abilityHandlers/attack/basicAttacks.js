/**
 * @fileoverview Basic attack ability handlers
 * Contains fundamental attack mechanics and single-target damage abilities
 */
const config = require('@config');
const messages = require('@messages');
const { applyThreatForAbility } = require('../abilityRegistryUtils');

/**
 * Handle basic attack ability
 * @param {Object} actor - The player performing the attack
 * @param {Object} target - The target of the attack
 * @param {Object} ability - The ability being used
 * @param {Array} log - Combat log array
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 */
function handleAttack(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  // Input validation
  if (!actor || !target || !ability) {
    log.push(
      messages.combat.error.replace(
        '{error}',
        'Invalid attack parameters'
      )
    );
    return false;
  }

  // Check if actor is stunned
  if (actor.statusEffects.stunned) {
    log.push(
      messages.combat.stunned.replace('{player}', actor.name)
    );
    return false;
  }

  // Calculate base damage
  const baseDamage = ability.params?.damage || 0;
  let totalDamage = Math.floor(baseDamage * (actor.damageMod || 1.0));

  // Apply coordination bonus
  if (coordinationInfo.bonus) {
    const coordBonus = Math.floor(totalDamage * coordinationInfo.bonus);
    totalDamage += coordBonus;
    log.push(
      messages.combat.coordinationBonus
        .replace('{player}', actor.name)
        .replace('{bonus}', coordBonus)
    );
  }

  // Apply damage
  const actualDamage = systems.combatSystem.applyDamage(
    target,
    totalDamage,
    actor,
    ability.type
  );

  // Add combat log entry
  log.push(
    messages.combat.attack
      .replace('{attacker}', actor.name)
      .replace('{target}', target.name)
      .replace('{damage}', actualDamage)
  );

  // Apply threat
  applyThreatForAbility(actor, ability, systems);

  return true;
}

/**
 * Handle reckless strike ability (deals damage to self)
 * @param {Object} actor - The player performing the attack
 * @param {Object} target - The target of the attack
 * @param {Object} ability - The ability being used
 * @param {Array} log - Combat log array
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 */
function handleRecklessStrike(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  // Input validation
  if (!actor || !target || !ability) {
    log.push(
      messages.combat.error.replace(
        '{error}',
        'Invalid reckless strike parameters'
      )
    );
    return false;
  }

  // Check if actor is stunned
  if (actor.statusEffects.stunned) {
    log.push(
      messages.combat.stunned.replace('{player}', actor.name)
    );
    return false;
  }

  // Calculate base damage
  const baseDamage = ability.params?.damage || 0;
  let totalDamage = Math.floor(baseDamage * (actor.damageMod || 1.0));

  // Apply coordination bonus
  if (coordinationInfo.bonus) {
    const coordBonus = Math.floor(totalDamage * coordinationInfo.bonus);
    totalDamage += coordBonus;
    log.push(
      messages.combat.coordinationBonus
        .replace('{player}', actor.name)
        .replace('{bonus}', coordBonus)
    );
  }

  // Apply damage to target
  const actualDamage = systems.combatSystem.applyDamage(
    target,
    totalDamage,
    actor,
    ability.type
  );

  // Apply self damage (recoil)
  const selfDamage = ability.params?.selfDamage || 0;
  if (selfDamage > 0) {
    const actualSelfDamage = systems.combatSystem.applyDamage(
      actor,
      selfDamage,
      actor,
      'recoil'
    );
    
    log.push(
      messages.combat.recklessStrike
        .replace('{attacker}', actor.name)
        .replace('{target}', target.name)
        .replace('{damage}', actualDamage)
        .replace('{selfDamage}', actualSelfDamage)
    );
  } else {
    log.push(
      messages.combat.attack
        .replace('{attacker}', actor.name)
        .replace('{target}', target.name)
        .replace('{damage}', actualDamage)
    );
  }

  // Apply threat
  applyThreatForAbility(actor, ability, systems);

  return true;
}

/**
 * Handle vulnerability strike (causes vulnerable status)
 * @param {Object} actor - The player performing the attack
 * @param {Object} target - The target of the attack
 * @param {Object} ability - The ability being used
 * @param {Array} log - Combat log array
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 */
function handleVulnerabilityStrike(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  // Input validation
  if (!actor || !target || !ability) {
    log.push(
      messages.combat.error.replace(
        '{error}',
        'Invalid vulnerability strike parameters'
      )
    );
    return false;
  }

  // Check if actor is stunned
  if (actor.statusEffects.stunned) {
    log.push(
      messages.combat.stunned.replace('{player}', actor.name)
    );
    return false;
  }

  // Calculate base damage
  const baseDamage = ability.params?.damage || 0;
  let totalDamage = Math.floor(baseDamage * (actor.damageMod || 1.0));

  // Apply coordination bonus
  if (coordinationInfo.bonus) {
    const coordBonus = Math.floor(totalDamage * coordinationInfo.bonus);
    totalDamage += coordBonus;
    log.push(
      messages.combat.coordinationBonus
        .replace('{player}', actor.name)
        .replace('{bonus}', coordBonus)
    );
  }

  // Apply damage to target
  const actualDamage = systems.combatSystem.applyDamage(
    target,
    totalDamage,
    actor,
    ability.type
  );

  // Apply vulnerable status effect
  if (ability.params?.vulnerable) {
    const vulnerableData = {
      damageIncrease: ability.params.vulnerable.damageIncrease || 0.25,
      turns: ability.params.vulnerable.turns || 3,
      source: actor.name
    };
    
    systems.statusEffectManager.applyStatusEffect(
      target,
      'vulnerable',
      vulnerableData
    );

    log.push(
      messages.combat.vulnerabilityStrike
        .replace('{attacker}', actor.name)
        .replace('{target}', target.name)
        .replace('{damage}', actualDamage)
        .replace('{turns}', vulnerableData.turns)
    );
  } else {
    log.push(
      messages.combat.attack
        .replace('{attacker}', actor.name)
        .replace('{target}', target.name)
        .replace('{damage}', actualDamage)
    );
  }

  // Apply threat
  applyThreatForAbility(actor, ability, systems);

  return true;
}

module.exports = {
  handleAttack,
  handleRecklessStrike,
  handleVulnerabilityStrike
};