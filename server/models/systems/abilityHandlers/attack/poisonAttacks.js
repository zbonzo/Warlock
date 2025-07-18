/**
 * @fileoverview Poison-based attack ability handlers
 * Contains abilities that deal damage and apply poison effects
 */
const config = require('@config');
const messages = require('@messages');
const { applyThreatForAbility } = require('../abilityRegistryUtils');

/**
 * Handle poison strike ability
 * @param {Object} actor - The player performing the attack
 * @param {Object} target - The target of the attack
 * @param {Object} ability - The ability being used
 * @param {Array} log - Combat log array
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 */
function handlePoisonStrike(
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
        'Invalid poison strike parameters'
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

  // Apply poison effect
  if (ability.params?.poison) {
    const poisonData = {
      damage: Math.floor(
        (ability.params.poison.damage || 0) * (actor.damageMod || 1.0)
      ),
      turns: ability.params.poison.turns || 3,
      source: actor.name
    };
    
    systems.statusEffectManager.applyStatusEffect(
      target,
      'poison',
      poisonData
    );

    log.push(
      messages.combat.poisonStrike
        .replace('{attacker}', actor.name)
        .replace('{target}', target.name)
        .replace('{damage}', actualDamage)
        .replace('{poisonDamage}', poisonData.damage)
        .replace('{turns}', poisonData.turns)
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
 * Handle death mark ability (poison + invisibility)
 * @param {Object} actor - The player performing the attack
 * @param {Object} target - The target of the attack
 * @param {Object} ability - The ability being used
 * @param {Array} log - Combat log array
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 */
function handleDeathMark(
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
        'Invalid death mark parameters'
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

  // Apply poison effect first
  if (ability.params?.poison) {
    const poisonData = {
      damage: Math.floor(
        (ability.params.poison.damage || 0) * (actor.damageMod || 1.0)
      ),
      turns: ability.params.poison.turns || 5,
      source: actor.name
    };
    
    systems.statusEffectManager.applyStatusEffect(
      target,
      'poison',
      poisonData
    );

    log.push(
      messages.combat.deathMark
        .replace('{attacker}', actor.name)
        .replace('{target}', target.name)
        .replace('{poisonDamage}', poisonData.damage)
        .replace('{turns}', poisonData.turns)
    );
  }

  // Apply invisibility to actor
  if (ability.params?.invisibility) {
    const invisibilityData = {
      turns: ability.params.invisibility.turns || 2,
      source: actor.name
    };
    
    systems.statusEffectManager.applyStatusEffect(
      actor,
      'invisible',
      invisibilityData
    );

    log.push(
      messages.combat.invisible
        .replace('{player}', actor.name)
        .replace('{turns}', invisibilityData.turns)
    );
  }

  // Apply threat
  applyThreatForAbility(actor, ability, systems);

  return true;
}

/**
 * Handle poison trap ability (AoE poison)
 * @param {Object} actor - The player performing the attack
 * @param {Object} target - The target of the attack (unused for AoE)
 * @param {Object} ability - The ability being used
 * @param {Array} log - Combat log array
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 */
function handlePoisonTrap(
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
        'Invalid poison trap parameters'
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

  let affectedTargets = 0;

  // Apply poison to all enemies
  enemies.forEach(enemy => {
    if (ability.params?.poison) {
      const poisonData = {
        damage: Math.floor(
          (ability.params.poison.damage || 0) * (actor.damageMod || 1.0)
        ),
        turns: ability.params.poison.turns || 4,
        source: actor.name
      };
      
      systems.statusEffectManager.applyStatusEffect(
        enemy,
        'poison',
        poisonData
      );

      // Apply vulnerable effect if specified
      if (ability.params?.vulnerable) {
        const vulnerableData = {
          damageIncrease: ability.params.vulnerable.damageIncrease || 0.15,
          turns: ability.params.vulnerable.turns || 2,
          source: actor.name
        };
        
        systems.statusEffectManager.applyStatusEffect(
          enemy,
          'vulnerable',
          vulnerableData
        );
      }

      affectedTargets++;
    }
  });

  log.push(
    messages.combat.poisonTrap
      .replace('{attacker}', actor.name)
      .replace('{targets}', affectedTargets)
  );

  // Apply threat
  applyThreatForAbility(actor, ability, systems);

  return true;
}

/**
 * Handle barbed arrow ability (damage + bleeding)
 * @param {Object} actor - The player performing the attack
 * @param {Object} target - The target of the attack
 * @param {Object} ability - The ability being used
 * @param {Array} log - Combat log array
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 */
function handleBarbedArrow(
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
        'Invalid barbed arrow parameters'
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

  // Apply bleeding effect (treated as poison)
  if (ability.params?.poison) {
    const bleedData = {
      damage: Math.floor(
        (ability.params.poison.damage || 0) * (actor.damageMod || 1.0)
      ),
      turns: ability.params.poison.turns || 4,
      source: actor.name,
      type: 'bleeding'
    };
    
    systems.statusEffectManager.applyStatusEffect(
      target,
      'poison',
      bleedData
    );

    log.push(
      messages.combat.barbedArrow
        .replace('{attacker}', actor.name)
        .replace('{target}', target.name)
        .replace('{damage}', actualDamage)
        .replace('{bleedDamage}', bleedData.damage)
        .replace('{turns}', bleedData.turns)
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
  handlePoisonStrike,
  handleDeathMark,
  handlePoisonTrap,
  handleBarbedArrow
};