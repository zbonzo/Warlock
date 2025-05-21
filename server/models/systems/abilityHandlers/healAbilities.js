/**
 * @fileoverview Healing ability handlers
 * Contains all healing-related class abilities
 */
const config = require('@config');
const {
  registerAbilitiesByCategory,
  registerAbilitiesByEffectAndTarget,
  registerAbilitiesByCriteria
} = require('./abilityRegistryUtils');

/**
 * Register all healing ability handlers with the registry
 * @param {AbilityRegistry} registry - Ability registry to register with
 */
function register(registry) {
  // Basic single-target healing
  registry.registerClassAbility('heal', handleHeal);
  
  // Register all 'Heal' category abilities with Self target to use the heal handler
  registerAbilitiesByCriteria(registry, 
    { category: 'Heal', target: 'Self' }, 
    (actor, target, ability, log, systems) => {
      return registry.executeClassAbility('heal', actor, target, ability, log, systems);
    }
  );
  
  // Register all 'Heal' category abilities with Single target to use the heal handler
  registerAbilitiesByCriteria(registry, 
    { category: 'Heal', target: 'Single' }, 
    (actor, target, ability, log, systems) => {
      return registry.executeClassAbility('heal', actor, target, ability, log, systems);
    }
  );
  
  // Register multi-target healing abilities
  registry.registerClassAbility('rejuvenation', handleMultiHeal);
  
  // Register all healing abilities with Multi target to use multi-heal handler
  registerAbilitiesByCriteria(registry, 
    { category: 'Heal', target: 'Multi' }, 
    (actor, target, ability, log, systems) => {
      if (ability.type !== 'rejuvenation') { // Skip ones with specific handlers
        return registry.executeClassAbility('rejuvenation', actor, target, ability, log, systems);
      }
    }
  );
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
  
  // Handle warlock behavior from game balance config
  const rejectWarlockHealing = config.gameBalance?.player?.healing?.rejectWarlockHealing || true;
  const warlockSelfHealOnly = config.gameBalance?.player?.healing?.warlockSelfHealOnly || true;
  
  if (!target.isWarlock || !rejectWarlockHealing) {
    // Normal healing
    const actualHeal = Math.min(healAmount, target.maxHp - target.hp);
    target.hp += actualHeal;
    
    if (actualHeal > 0) {
      // Use config message if available
      const healMessage = config.getMessage('events', 'playerHealed') || 
        `{playerName} was healed for {amount} health.`;
      
      log.push(healMessage
        .replace('{playerName}', target.name)
        .replace('{amount}', actualHeal));
      
      // Add private messages
      const privateHealLog = {
        type: 'heal',
        public: false,
        targetId: target.id,
        attackerId: actor.id,
        heal: actualHeal,
        message: '',
        privateMessage: `${actor.name} healed you for ${actualHeal} health.`,
        attackerMessage: `You healed ${target.name} for ${actualHeal} health.`
      };
      log.push(privateHealLog);
    } else {
      // Target is at full health
      const healFullLog = {
        type: 'heal_full',
        public: false,
        targetId: target.id,
        attackerId: actor.id,
        message: '',
        privateMessage: `${actor.name} tried to heal you, but you're already at full health.`,
        attackerMessage: `${target.name} is already at full health.`
      };
      log.push(healFullLog);
    }
  } else {
    // Warlock healing behavior - heal self instead
    const actualHeal = Math.min(healAmount, actor.maxHp - actor.hp);
    actor.hp += actualHeal;
    
    // Warlock-specific messages
    const warlockHealLog = {
      type: 'heal_warlock',
      public: false,
      targetId: target.id,
      attackerId: actor.id,
      heal: actualHeal,
      message: '', // No public message
      privateMessage: `You rejected the healing from ${actor.name}.`,
      attackerMessage: `You attempted to heal ${target.name} (a Warlock), but healed yourself for ${actualHeal} HP instead.`
    };
    log.push(warlockHealLog);
    
    // Trigger potential conversion
    systems.warlockSystem.attemptConversion(actor, target, log);
  }
  
  return true;
}

/**
 * Handler for multi-target healing abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Initial target (may be ignored for multi-target)
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
  
  // Handle warlock behavior from game balance config
  const excludeWarlocks = config.gameBalance?.player?.healing?.rejectWarlockHealing || true;
  
  // Apply healing to each target
  log.push(`${actor.name} casts ${ability.name}, healing nearby allies!`);
  
  for (const potentialTarget of targets) {
    // Skip warlocks if configured to do so (unless it's the actor and they're a warlock)
    if (excludeWarlocks && potentialTarget.isWarlock && 
        !(potentialTarget.id === actor.id && actor.isWarlock)) {
      continue;
    }
    
    // Apply healing
    const actualHeal = Math.min(healAmount, potentialTarget.maxHp - potentialTarget.hp);
    potentialTarget.hp += actualHeal;
    
    if (actualHeal > 0) {
      // Use config message if available
      const healMessage = config.getMessage('events', 'playerHealed') || 
        `{playerName} was healed for {amount} health.`;
      
      log.push(healMessage
        .replace('{playerName}', potentialTarget.name)
        .replace('{amount}', actualHeal));
      
      // Add private messages for the recipient
      const privateHealLog = {
        type: 'heal',
        public: false,
        targetId: potentialTarget.id,
        attackerId: actor.id,
        heal: actualHeal,
        message: '',
        privateMessage: `${actor.name} healed you for ${actualHeal} health.`,
        attackerMessage: ''
      };
      log.push(privateHealLog);
    }
  }
  
  return true;
}

module.exports = { register };