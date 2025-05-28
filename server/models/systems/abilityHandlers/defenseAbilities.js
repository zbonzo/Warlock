/**
 * @fileoverview Defense-related ability handlers
 * Contains protective and defensive class abilities
 */
const config = require('@config');
const {
  registerAbilitiesByCategory,
  registerAbilitiesByEffectAndTarget,
  registerAbilitiesByCriteria,
} = require('./abilityRegistryUtils');

/**
 * Register all defense ability handlers with the registry
 * @param {AbilityRegistry} registry - Ability registry to register with
 */
function register(registry) {
  // Base protection ability handlers
  registry.registerClassAbility('shieldWall', handleShieldWall);
  registry.registerClassAbility('shadowVeil', handleInvisibility);

  // Register all 'Defense' category abilities to use appropriate handlers based on effect
  registerAbilitiesByCriteria(
    registry,
    { category: 'Defense', effect: 'shielded' },
    (actor, target, ability, log, systems) => {
      return registry.executeClassAbility(
        'shieldWall',
        actor,
        target,
        ability,
        log,
        systems
      );
    }
  );

  registerAbilitiesByCriteria(
    registry,
    { category: 'Defense', effect: 'invisible' },
    (actor, target, ability, log, systems) => {
      return registry.executeClassAbility(
        'shadowVeil',
        actor,
        target,
        ability,
        log,
        systems
      );
    }
  );

  // Special abilities with their own handlers
  registry.registerClassAbility('shadowstep', handleShadowstep);
  registry.registerClassAbility('battleCry', handleMultiProtection);
  registry.registerClassAbility('divineShield', handleMultiProtection);
}

/**
 * Handler for shield/protection abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target of the protection
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleShieldWall(actor, target, ability, log, systems) {
  // Get protection defaults from config if needed
  const protectionDefaults = config.getStatusEffectDefaults('shielded') || {
    armor: 2,
    turns: 1,
  };

  systems.statusEffectManager.applyEffect(
    target.id,
    'shielded',
    {
      armor: ability.params.armor || protectionDefaults.armor,
      turns: ability.params.duration || protectionDefaults.turns,
    },
    log
  );

  // Use message from config if available
  const protectionMessage = messages.getAbilityMessage(
    'abilities.defense',
    'shieldApplied'
  );
  log.push(
    messages.formatMessage(protectionMessage, {
      playerName: target.name,
      armor: ability.params.armor || protectionDefaults.armor,
      turns: ability.params.duration || protectionDefaults.turns,
    })
  );
  return true;
}

/**
 * Handler for invisibility abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target to make invisible
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleInvisibility(actor, target, ability, log, systems) {
  // Get invisibility defaults from config if needed
  const invisibilityDefaults = config.getStatusEffectDefaults('invisible') || {
    turns: 1,
  };

  systems.statusEffectManager.applyEffect(
    target.id,
    'invisible',
    {
      turns: ability.params.duration || invisibilityDefaults.turns,
    },
    log
  );

  // Use message from config if available
  const invisibilityMessage = messages.getAbilityMessage(
    'abilities.defense',
    'invisibilityApplied'
  );
  log.push(
    messages.formatMessage(invisibilityMessage, {
      playerName: target.name,
      turns: ability.params.duration || invisibilityDefaults.turns,
    })
  );

  return true;
}

/**
 * Handler for shadowstep ability (Alchemist specialty)
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target to make invisible
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleShadowstep(actor, target, ability, log, systems) {
  if (!target || target === '__monster__') {
    const invalidTargetMessage = messages.getAbilityMessage(
      'abilities.defense',
      'shadowstepInvalidTarget'
    );
    log.push(
      messages.formatMessage(invalidTargetMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  // Get invisibility defaults from config if needed
  const invisibilityDefaults = config.getStatusEffectDefaults('invisible') || {
    turns: 1,
  };

  systems.statusEffectManager.applyEffect(
    target.id,
    'invisible',
    {
      turns: ability.params.duration || invisibilityDefaults.turns,
    },
    log
  );

  const shadowstepMessage = messages.getAbilityMessage(
    'abilities.defense',
    'shadowstepUsed'
  );
  log.push(
    messages.formatMessage(shadowstepMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      targetName: target.name,
      turns: ability.params.duration || invisibilityDefaults.turns,
    })
  );

  return true;
}
/**
 * Handler for multi-target protection abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Initial target (ignored for multi-target)
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleMultiProtection(actor, target, ability, log, systems) {
  // Get all alive players
  const targets = Array.from(systems.players.values()).filter((p) => p.isAlive);

  // Get protection defaults from config if needed
  const protectionDefaults = config.getStatusEffectDefaults('shielded') || {
    armor: 2,
    turns: 1,
  };

  let shieldedCount = 0;

  for (const potentialTarget of targets) {
    systems.statusEffectManager.applyEffect(
      potentialTarget.id,
      'shielded',
      {
        armor: ability.params.armor || protectionDefaults.armor,
        turns: ability.params.duration || protectionDefaults.turns,
      },
      log
    );
    shieldedCount++;
  }

  const multiProtectionMessage = messages.getAbilityMessage(
    'abilities.defense',
    'multiProtectionUsed'
  );
  log.push(
    messages.formatMessage(multiProtectionMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      count: shieldedCount,
      armor: ability.params.armor || protectionDefaults.armor,
      turns: ability.params.duration || protectionDefaults.turns,
    })
  );

  return true;
}

module.exports = { register };
