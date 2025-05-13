/**
 * @fileoverview Healing ability handlers
 * Contains all healing-related class abilities
 */

/**
 * Register all healing ability handlers with the registry
 * @param {AbilityRegistry} registry - Ability registry to register with
 */
function register(registry) {
  // Generic heal handler
  registry.registerClassAbility('heal', handleHeal);
  
  // Register all basic heal abilities
  registry.registerClassAbilities([
    'bandage', 'emberRestore', 'arcaneMend', 'adrenalSurge', 'evasionRest',
    'divineBalm', 'spiritMend', 'ancestralHeal', 'bandolierPatch', 'survivalInst'
  ], (actor, target, ability, log, systems) => {
    return registry.executeClassAbility('heal', actor, target, ability, log);
  });
  
  // Multi-target heal
  registry.registerClassAbility('rejuvenation', handleMultiHeal);
}

/**
 * Handler for generic healing abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target of the healing
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleHeal(actor, target, ability, log, systems) {
  let healAmount = Number(ability.params.amount) || 0;
  healAmount = Math.floor(healAmount * actor.getHealingModifier());
  
  if (!target.isWarlock) {
    // Normal healing for non-warlocks
    const actualHeal = Math.min(healAmount, target.maxHp - target.hp);
    target.hp += actualHeal;
    if (actualHeal > 0) {
      log.push(`${target.name} is healed for ${actualHeal} HP.`);
    } else {
      log.push(`${target.name} is already at full health.`);
    }
  } else { 
    // Healing a Warlock triggers a special effect
    const actualHeal = Math.min(healAmount, actor.maxHp - actor.hp);
    actor.hp += actualHeal;
    log.push(`${actor.name} (a Warlock) attempts to heal ${target.name} (also a Warlock), healing themselves for ${actualHeal} HP instead and generating corruption!`);
    
    // Trigger potential conversion
    systems.warlockSystem.attemptConversion(actor, target, log);
  }
  
  return true;
}

/**
 * Handler for multi-target healing abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Initial target (may be ignored for multi-target)
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleMultiHeal(actor, target, ability, log, systems) {
  let healAmount = Number(ability.params.amount) || 0;
  healAmount = Math.floor(healAmount * actor.getHealingModifier());
  
  // Get potential targets (all alive players)
  const targets = Array.from(systems.players.values()).filter(p => p.isAlive);
  
  // If this is a multi-target ability, we heal all valid targets
  if (ability.target === 'Multi') {
    log.push(`${actor.name} casts ${ability.name}, healing nearby allies!`);
    
    for (const potentialTarget of targets) {
      if (!potentialTarget.isWarlock) {
        // Normal players get healed
        const actualHeal = Math.min(healAmount, potentialTarget.maxHp - potentialTarget.hp);
        potentialTarget.hp += actualHeal;
        if (actualHeal > 0) {
          log.push(`${potentialTarget.name} is healed for ${actualHeal} HP.`);
        }
      } else if (potentialTarget.id === actor.id && actor.isWarlock) {
        // Warlocks can only heal themselves
        const actualHeal = Math.min(healAmount, actor.maxHp - actor.hp);
        actor.hp += actualHeal;
        log.push(`${actor.name} heals themselves for ${actualHeal} HP.`);
      }
    }
    return true;
  }
  
  // If not multi-target, fall back to regular heal logic
  return handleHeal(actor, target, ability, log, systems);
}

module.exports = { register };