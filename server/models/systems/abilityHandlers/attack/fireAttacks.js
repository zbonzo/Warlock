/**
 * @fileoverview Fire-based attack ability handlers
 * Contains abilities that deal fire damage and apply burning effects
 */
const config = require('@config');
const messages = require('@messages');
const { applyThreatForAbility } = require('../abilityRegistryUtils');

/**
 * Handle pyroblast ability (fire damage + burn)
 * @param {Object} actor - The player performing the attack
 * @param {Object} target - The target of the attack
 * @param {Object} ability - The ability being used
 * @param {Array} log - Combat log array
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 */
function handlePyroblast(
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
        'Invalid pyroblast parameters'
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

  // Apply burning effect (treated as poison)
  if (ability.params?.poison) {
    const burnData = {
      damage: Math.floor(
        (ability.params.poison.damage || 0) * (actor.damageMod || 1.0)
      ),
      turns: ability.params.poison.turns || 3,
      source: actor.name,
      type: 'burning'
    };
    
    systems.statusEffectManager.applyStatusEffect(
      target,
      'poison',
      burnData
    );

    log.push(
      messages.combat.pyroblast
        .replace('{attacker}', actor.name)
        .replace('{target}', target.name)
        .replace('{damage}', actualDamage)
        .replace('{burnDamage}', burnData.damage)
        .replace('{turns}', burnData.turns)
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
 * Handle inferno blast ability (AoE fire damage + burn)
 * @param {Object} actor - The player performing the attack
 * @param {Object} target - The target of the attack (unused for AoE)
 * @param {Object} ability - The ability being used
 * @param {Array} log - Combat log array
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 */
function handleInfernoBlast(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  // Input validation
  if (!actor || !ability) {
    log.push(
      messages.combat.error.replace(
        '{error}',
        'Invalid inferno blast parameters'
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

  // Get all enemy targets
  const enemies = systems.combatSystem.getEnemyTargets(actor);
  
  if (enemies.length === 0) {
    log.push(
      messages.combat.noTargets.replace('{player}', actor.name)
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

  let totalActualDamage = 0;
  let affectedTargets = 0;

  // Apply damage and burning to all enemies
  enemies.forEach(enemy => {
    // Apply damage
    const actualDamage = systems.combatSystem.applyDamage(
      enemy,
      totalDamage,
      actor,
      ability.type
    );
    totalActualDamage += actualDamage;

    // Apply burning effect
    if (ability.params?.poison) {
      const burnData = {
        damage: Math.floor(
          (ability.params.poison.damage || 0) * (actor.damageMod || 1.0)
        ),
        turns: ability.params.poison.turns || 3,
        source: actor.name,
        type: 'burning'
      };
      
      systems.statusEffectManager.applyStatusEffect(
        enemy,
        'poison',
        burnData
      );
    }

    affectedTargets++;
  });

  log.push(
    messages.combat.infernoBlast
      .replace('{attacker}', actor.name)
      .replace('{targets}', affectedTargets)
      .replace('{totalDamage}', totalActualDamage)
  );

  // Apply threat
  applyThreatForAbility(actor, ability, systems);

  return true;
}

module.exports = {
  handlePyroblast,
  handleInfernoBlast
};