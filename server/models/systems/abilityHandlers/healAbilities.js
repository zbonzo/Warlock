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
    // Normal healing
    const actualHeal = Math.min(healAmount, target.maxHp - target.hp);
    target.hp += actualHeal;
    
    if (actualHeal > 0) {
      const healLog = {
        type: 'heal',
        public: true,
        targetId: target.id,
        attackerId: actor.id,
        heal: actualHeal,
        message: `${target.name} was healed for ${actualHeal} health.`,
        privateMessage: `${actor.name} healed you for ${actualHeal} health.`,
        attackerMessage: `You healed ${target.name} for ${actualHeal} health.`
      };
      log.push(healLog);
    } else {
      const healLog = {
        type: 'heal_full',
        public: false,
        targetId: target.id,
        attackerId: actor.id,
        message: '',
        privateMessage: `${actor.name} tried to heal you, but you're already at full health.`,
        attackerMessage: `${target.name} is already at full health.`
      };
      log.push(healLog);
    }
  } else {
    // Healing a Warlock
    const actualHeal = Math.min(healAmount, actor.maxHp - actor.hp);
    actor.hp += actualHeal;
    
    const healLog = {
      type: 'heal_warlock',
      public: false,
      targetId: target.id,
      attackerId: actor.id,
      heal: actualHeal,
      message: '', // No public message
      privateMessage: `You rejected the healing from ${actor.name}.`,
      attackerMessage: `You attempted to heal ${target.name} (a Warlock), but healed yourself for ${actualHeal} HP instead.`
    };
    log.push(healLog);
    
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