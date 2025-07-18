/**
 * @fileoverview Multi-hit attack ability handlers
 * Contains abilities that strike multiple times or hit multiple targets
 */
const config = require('@config');
const messages = require('@messages');
const { applyThreatForAbility } = require('../abilityRegistryUtils');

/**
 * Handle multi-hit attack ability (arcane barrage, twin strike, etc.)
 * @param {Object} actor - The player performing the attack
 * @param {Object} target - The target of the attack
 * @param {Object} ability - The ability being used
 * @param {Array} log - Combat log array
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 */
function handleMultiHitAttack(
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
        'Invalid multi-hit attack parameters'
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

  // Get hit parameters
  const hits = ability.params?.hits || 1;
  const damagePerHit = ability.params?.damagePerHit || ability.params?.damage || 0;
  const hitChance = ability.params?.hitChance || 1.0;

  let totalDamage = 0;
  let successfulHits = 0;
  const hitResults = [];

  // Process each hit
  for (let i = 0; i < hits; i++) {
    // Check if this hit connects
    if (Math.random() <= hitChance) {
      // Calculate damage for this hit
      let hitDamage = Math.floor(damagePerHit * (actor.damageMod || 1.0));

      // Apply coordination bonus to each hit
      if (coordinationInfo.bonus) {
        const coordBonus = Math.floor(hitDamage * coordinationInfo.bonus);
        hitDamage += coordBonus;
        
        // Only show coordination bonus message once
        if (i === 0) {
          log.push(
            messages.combat.coordinationBonus
              .replace('{player}', actor.name)
              .replace('{bonus}', coordBonus * hits)
          );
        }
      }

      // Apply damage
      const actualDamage = systems.combatSystem.applyDamage(
        target,
        hitDamage,
        actor,
        ability.type
      );

      totalDamage += actualDamage;
      successfulHits++;
      hitResults.push(actualDamage);
    } else {
      hitResults.push(0); // Miss
    }
  }

  // Create appropriate combat log message
  if (ability.type === 'arcaneBarrage') {
    log.push(
      messages.combat.arcaneBarrage
        .replace('{attacker}', actor.name)
        .replace('{target}', target.name)
        .replace('{hits}', successfulHits)
        .replace('{totalHits}', hits)
        .replace('{damage}', totalDamage)
    );
  } else if (ability.type === 'twinStrike') {
    log.push(
      messages.combat.twinStrike
        .replace('{attacker}', actor.name)
        .replace('{target}', target.name)
        .replace('{hits}', successfulHits)
        .replace('{damage}', totalDamage)
    );
  } else {
    log.push(
      messages.combat.multiHit
        .replace('{attacker}', actor.name)
        .replace('{target}', target.name)
        .replace('{hits}', successfulHits)
        .replace('{totalHits}', hits)
        .replace('{damage}', totalDamage)
    );
  }

  // Apply threat
  applyThreatForAbility(actor, ability, systems);

  return successfulHits > 0;
}

/**
 * Handle area of effect damage ability (meteor shower, chain lightning, etc.)
 * @param {Object} actor - The player performing the attack
 * @param {Object} target - The primary target of the attack
 * @param {Object} ability - The ability being used
 * @param {Array} log - Combat log array
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 */
function handleAoeDamage(
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
        'Invalid AoE damage parameters'
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

  // Apply damage to all enemies
  enemies.forEach(enemy => {
    const actualDamage = systems.combatSystem.applyDamage(
      enemy,
      totalDamage,
      actor,
      ability.type
    );
    totalActualDamage += actualDamage;
    affectedTargets++;
  });

  // Create appropriate combat log message
  if (ability.type === 'meteorShower') {
    log.push(
      messages.combat.meteorShower
        .replace('{attacker}', actor.name)
        .replace('{targets}', affectedTargets)
        .replace('{totalDamage}', totalActualDamage)
    );
  } else if (ability.type === 'chainLightning') {
    log.push(
      messages.combat.chainLightning
        .replace('{attacker}', actor.name)
        .replace('{targets}', affectedTargets)
        .replace('{totalDamage}', totalActualDamage)
    );
  } else {
    log.push(
      messages.combat.aoeAttack
        .replace('{attacker}', actor.name)
        .replace('{targets}', affectedTargets)
        .replace('{totalDamage}', totalActualDamage)
    );
  }

  // Apply threat
  applyThreatForAbility(actor, ability, systems);

  return true;
}

/**
 * Handle ricochet round ability (bouncing projectile)
 * @param {Object} actor - The player performing the attack
 * @param {Object} target - The primary target of the attack
 * @param {Object} ability - The ability being used
 * @param {Array} log - Combat log array
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 */
function handleRicochetRound(
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
        'Invalid ricochet round parameters'
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

  // Hit primary target
  const primaryDamage = systems.combatSystem.applyDamage(
    target,
    totalDamage,
    actor,
    ability.type
  );

  let totalActualDamage = primaryDamage;
  let totalTargets = 1;

  // Get other potential targets for ricochet
  const enemies = systems.combatSystem.getEnemyTargets(actor);
  const otherTargets = enemies.filter(enemy => enemy.id !== target.id);

  // Ricochet to up to 2 additional targets with reduced damage
  const maxRicochets = Math.min(2, otherTargets.length);
  const ricochetDamage = Math.floor(totalDamage * 0.5); // 50% damage on ricochet

  for (let i = 0; i < maxRicochets; i++) {
    const ricochetTarget = otherTargets[i];
    const actualRicochetDamage = systems.combatSystem.applyDamage(
      ricochetTarget,
      ricochetDamage,
      actor,
      ability.type
    );
    totalActualDamage += actualRicochetDamage;
    totalTargets++;
  }

  log.push(
    messages.combat.ricochetRound
      .replace('{attacker}', actor.name)
      .replace('{primaryTarget}', target.name)
      .replace('{primaryDamage}', primaryDamage)
      .replace('{totalTargets}', totalTargets)
      .replace('{totalDamage}', totalActualDamage)
  );

  // Apply threat
  applyThreatForAbility(actor, ability, systems);

  return true;
}

module.exports = {
  handleMultiHitAttack,
  handleAoeDamage,
  handleRicochetRound
};