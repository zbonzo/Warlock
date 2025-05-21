/**
 * @fileoverview Attack-related ability handlers
 * Contains damage-dealing class abilities
 */
const config = require('@config');
const {
  registerAbilitiesByCategory,
  registerAbilitiesByEffectAndTarget,
  registerAbilitiesByCriteria,
} = require('./abilityRegistryUtils');

/**
 * Register all attack ability handlers with the registry
 * @param {AbilityRegistry} registry - Ability registry to register with
 */
function register(registry) {
  // Register ability handlers by category and effect

  // 1. Basic single-target attack handler
  registry.registerClassAbility('attack', handleAttack);

  // 2. Register all abilities with category "Attack" to use the basic attack handler
  // This allows new attack abilities to work automatically
  registerAbilitiesByCategory(
    registry,
    'Attack',
    (actor, target, ability, log, systems) => {
      return registry.executeClassAbility(
        'attack',
        actor,
        target,
        ability,
        log,
        systems
      );
    }
  );

  // 3. Register specific ability types that need custom handlers

  // Poison-based abilities
  registry.registerClassAbility('poisonStrike', handlePoisonStrike);
  registry.registerClassAbility('deathMark', handleDeathMark);
  registry.registerClassAbility('poisonTrap', handlePoisonTrap);
  registry.registerClassAbility('multiHitAttack', handleMultiHitAttack);
  registry.registerClassAbility(
    'vulnerabilityStrike',
    handleVulnerabilityStrike
  );

  // AOE damage abilities
  registry.registerClassAbility('meteorShower', handleAoeDamage);
  registry.registerClassAbility('infernoBlast', handleInfernoBlast);

  registry.registerClassAbility('shiv', handleVulnerabilityStrike);

  // Register all AoE damage abilities (with null effect and Multi target)
  // Exclude already registered ones
  registerAbilitiesByEffectAndTarget(
    registry,
    null,
    'Multi',
    (actor, target, ability, log, systems) => {
      return registry.executeClassAbility(
        'meteorShower',
        actor,
        target,
        ability,
        log,
        systems
      );
    },
    ['infernoBlast'] // Exclude abilities with specific handlers
  );
  // Add explicit handler for Arcane Barrage
  registry.registerClassAbility('arcaneBarrage', handleMultiHitAttack);

  // Register all vulnerable effect abilities
  registerAbilitiesByEffectAndTarget(
    registry,
    'vulnerable', // Effect
    'Single', // Target
    handleVulnerabilityStrike // Handler function
  );
}

/**
 * Handler for generic attack abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleAttack(actor, target, ability, log, systems) {
  // If target is a player (not monster) and is invisible, attack should fail
  if (
    target !== '__monster__' &&
    target.hasStatusEffect &&
    target.hasStatusEffect('invisible')
  ) {
    const attackFailMessage =
      config.getMessage('events', 'attackInvisible') ||
      `${actor.name} tries to attack ${target.name}, but they are invisible and cannot be seen!`;

    log.push(
      attackFailMessage
        .replace('{attackerName}', actor.name)
        .replace('{targetName}', target.name)
    );
    return false;
  }

  if (target === '__monster__') {
    return handleMonsterAttack(actor, ability, log, systems);
  }
  return handlePlayerAttack(actor, target, ability, log, systems);
}

/**
 * Handler for poison strike ability
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handlePoisonStrike(actor, target, ability, log, systems) {
  // Check if target is invisible
  if (
    target !== '__monster__' &&
    target.hasStatusEffect &&
    target.hasStatusEffect('invisible')
  ) {
    log.push(
      `${actor.name} tries to use ${ability.name} on ${target.name}, but they are invisible!`
    );
    return false;
  }

  // First apply regular attack damage
  const attackResult = handleAttack(actor, target, ability, log, systems);

  // Then apply poison if attack was successful and target is still alive
  if (attackResult && target !== '__monster__' && target.isAlive) {
    const poisonData = ability.params.poison;
    const modifiedPoisonDamage = Math.floor(
      poisonData.damage * (actor.damageMod || 1.0)
    );

    // Get poison effect defaults from config
    const poisonDefaults = config.getStatusEffectDefaults('poison') || {
      turns: 3,
    };

    systems.statusEffectManager.applyEffect(
      target.id,
      'poison',
      {
        turns: poisonData.turns || poisonDefaults.turns,
        damage: modifiedPoisonDamage,
      },
      log
    );

    // Use config message if available
    const poisonMessage =
      config.getMessage('events', 'playerPoisoned') ||
      `{targetName} is poisoned for {damage} damage over {turns} turns.`;

    log.push(
      poisonMessage
        .replace('{playerName}', target.name)
        .replace('{targetName}', target.name)
        .replace('{damage}', modifiedPoisonDamage)
        .replace('{turns}', poisonData.turns || poisonDefaults.turns)
    );
  }

  return attackResult;
}

/**
 * Handler for AoE damage abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleAoeDamage(actor, target, ability, log, systems) {
  const rawDamage = Number(ability.params.damage) || 0;
  const modifiedDamage = actor.modifyDamage(rawDamage);

  // Get potential targets (all alive players except self)
  const targets = Array.from(systems.players.values()).filter(
    (p) => p.isAlive && p.id !== actor.id
  );

  if (targets.length === 0) {
    log.push(
      `${actor.name} uses ${ability.name}, but there are no valid targets.`
    );
    return false;
  }

  // Apply damage to multiple targets
  log.push(`${actor.name} unleashes ${ability.name}!`);

  for (const potentialTarget of targets) {
    systems.combatSystem.applyDamageToPlayer(
      potentialTarget,
      modifiedDamage,
      actor,
      log
    );

    // Check for warlock conversion with reduced chance for AoE
    // Get warlock conversion rate modifier from config if available
    const conversionModifier =
      config.gameBalance?.warlock?.conversion?.aoeModifier || 0.5;

    if (
      actor.isWarlock &&
      potentialTarget.isAlive &&
      !potentialTarget.isWarlock
    ) {
      systems.warlockSystem.attemptConversion(
        actor,
        potentialTarget,
        log,
        conversionModifier
      );
    }
  }

  return true;
}

/**
 * Handler for vulnerability-inducing attacks
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleVulnerabilityStrike(actor, target, ability, log, systems) {
  console.log('=== EXECUTING VULNERABILITY STRIKE ===');

  // First deal normal damage
  const attackResult = handleAttack(actor, target, ability, log, systems);
  console.log('Attack result:', attackResult);

  // If attack successful and target is a player, apply vulnerability
  if (attackResult && target !== '__monster__' && target.isAlive) {
    console.log('Target is valid, applying vulnerability');

    // Get vulnerability parameters
    const vulnerableData = ability.params.vulnerable || {};
    const damageIncrease = vulnerableData.damageIncrease || 50; // Default 50%
    const turns = vulnerableData.turns || 1; // Default 1 turn

    console.log(
      `Vulnerability parameters: ${damageIncrease}% for ${turns} turns`
    );

    // Apply vulnerability directly to the player
    target.applyVulnerability(damageIncrease, turns);

    // Add a clear message
    log.push(
      `${target.name} is VULNERABLE and will take ${damageIncrease}% more damage for ${turns} turn(s)!`
    );
    console.log(`Applied vulnerability to ${target.name}`);
  } else {
    console.log('Target invalid or attack failed, not applying vulnerability');
    if (target === '__monster__') {
      console.log('Cannot apply vulnerability to monster');
    }
  }

  return attackResult;
}
/**
 * Handler for inferno blast ability
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleInfernoBlast(actor, target, ability, log, systems) {
  const rawDamage = Number(ability.params.damage) || 0;
  const modifiedDamage = actor.modifyDamage(rawDamage);

  // Get potential targets (all alive players except self)
  const targets = Array.from(systems.players.values()).filter(
    (p) => p.isAlive && p.id !== actor.id
  );

  if (targets.length === 0) {
    log.push(
      `${actor.name} uses ${ability.name}, but there are no valid targets.`
    );
    return false;
  }

  // Apply damage and poison to multiple targets
  log.push(`${actor.name} unleashes ${ability.name}!`);

  // Get poison defaults from config if needed
  const poisonDefaults = config.getStatusEffectDefaults('poison') || {
    turns: 3,
    damage: 5,
  };

  for (const potentialTarget of targets) {
    // Apply direct damage
    systems.combatSystem.applyDamageToPlayer(
      potentialTarget,
      modifiedDamage,
      actor,
      log
    );

    // Apply poison if target is still alive
    if (potentialTarget.isAlive && ability.effect === 'poison') {
      const poisonData = ability.params.poison || {};
      const modifiedPoisonDamage = Math.floor(
        (poisonData.damage || poisonDefaults.damage) * (actor.damageMod || 1.0)
      );

      systems.statusEffectManager.applyEffect(
        potentialTarget.id,
        'poison',
        {
          turns: poisonData.turns || poisonDefaults.turns,
          damage: modifiedPoisonDamage,
        },
        log
      );

      // Use config message if available
      const poisonMessage =
        config.getMessage('events', 'playerPoisoned') ||
        `{targetName} is poisoned for {damage} damage over {turns} turns.`;

      log.push(
        poisonMessage
          .replace('{playerName}', potentialTarget.name)
          .replace('{targetName}', potentialTarget.name)
          .replace('{damage}', modifiedPoisonDamage)
          .replace('{turns}', poisonData.turns || poisonDefaults.turns)
      );
    }
  }

  return true;
}

/**
 * Handler for death mark ability
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleDeathMark(actor, target, ability, log, systems) {
  if (target === '__monster__') {
    log.push(
      `${actor.name} tries to use ${ability.name} on the Monster, but it has no effect.`
    );
    return false;
  }

  // Get poison defaults from config if needed
  const poisonDefaults = config.getStatusEffectDefaults('poison') || {
    turns: 3,
    damage: 5,
  };

  const poisonData = ability.params.poison || {};
  const modifiedPoisonDamage = Math.floor(
    (poisonData.damage || poisonDefaults.damage) * (actor.damageMod || 1.0)
  );

  systems.statusEffectManager.applyEffect(
    target.id,
    'poison',
    {
      turns: poisonData.turns || poisonDefaults.turns,
      damage: modifiedPoisonDamage,
    },
    log
  );

  log.push(
    `${actor.name} uses ${ability.name} on ${target.name}, poisoning them for ${modifiedPoisonDamage} damage over ${poisonData.turns || poisonDefaults.turns} turns.`
  );
  return true;
}

/**
 * Handler for poison trap ability
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handlePoisonTrap(actor, target, ability, log, systems) {
  // Get all alive players except actor
  const targets = Array.from(systems.players.values()).filter(
    (p) => p.isAlive && p.id !== actor.id
  );

  if (targets.length === 0) {
    log.push(
      `${actor.name} uses ${ability.name}, but there are no valid targets.`
    );
    return false;
  }

  // Get poison defaults from config if needed
  const poisonDefaults = config.getStatusEffectDefaults('poison') || {
    turns: 3,
    damage: 5,
  };

  const poisonData = ability.params.poison || {};
  const modifiedPoisonDamage = Math.floor(
    (poisonData.damage || poisonDefaults.damage) * (actor.damageMod || 1.0)
  );

  // Apply poison to multiple targets
  log.push(`${actor.name} sets a ${ability.name}!`);
  let targetsHit = 0;

  // Get trap hit chance from config or use default
  const trapHitChance =
    config.gameBalance?.abilities?.poisonTrap?.hitChance || 0.7;

  for (const potentialTarget of targets) {
    if (Math.random() < trapHitChance) {
      // 70% chance by default to affect each target
      systems.statusEffectManager.applyEffect(
        potentialTarget.id,
        'poison',
        {
          turns: poisonData.turns || poisonDefaults.turns,
          damage: modifiedPoisonDamage,
        },
        log
      );
      log.push(
        `${potentialTarget.name} is caught in ${actor.name}'s ${ability.name}, taking ${modifiedPoisonDamage} poison damage over ${poisonData.turns || poisonDefaults.turns} turns.`
      );
      targetsHit++;
    }
  }

  if (targetsHit === 0) {
    log.push(`${actor.name}'s ${ability.name} doesn't catch anyone!`);
  }

  return true;
}

/**
 * Helper for handling attacks on the monster
 * @param {Object} actor - Actor using the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 * @private
 */
function handleMonsterAttack(actor, ability, log, systems) {
  const rawDamage = Number(ability.params.damage) || 0;
  const modifiedDamage = actor.modifyDamage(rawDamage);
  systems.monsterController.takeDamage(modifiedDamage, actor, log);

  // Warlocks generate "threat" attacking monster
  if (actor.isWarlock) {
    // Get warlock random conversion modifier from config if available
    const randomConversionModifier =
      config.gameBalance?.warlock?.conversion?.randomModifier || 0.5;
    systems.warlockSystem.attemptConversion(
      actor,
      null,
      log,
      randomConversionModifier
    );
  }

  return true;
}

/**
 * Helper for handling attacks on players
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target player
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 * @private
 */
function handlePlayerAttack(actor, target, ability, log, systems) {
  if (!target || !target.isAlive) return false;

  const rawDamage = Number(ability.params.damage) || 0;
  const modifiedDamage = actor.modifyDamage(rawDamage);

  // Check if this is a Keen Senses attack
  const isKeenSensesAttack =
    actor.racialEffects &&
    actor.racialEffects.keenSensesActiveOnNextAttack === target.id;

  systems.combatSystem.applyDamageToPlayer(
    target,
    modifiedDamage,
    actor,
    log,
    isKeenSensesAttack
  );

  // Clear the Keen Senses flag after use
  if (isKeenSensesAttack) {
    delete actor.racialEffects.keenSensesActiveOnNextAttack;
  }

  // Warlocks may attempt to convert on attack
  if (actor.isWarlock) {
    systems.warlockSystem.attemptConversion(actor, target, log);
  }

  return true;
}

/**
 * Handler for multi-hit attack abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleMultiHitAttack(actor, target, ability, log, systems) {
  // If target is invisible, attack fails
  if (
    target !== '__monster__' &&
    target.hasStatusEffect &&
    target.hasStatusEffect('invisible')
  ) {
    const attackFailMessage =
      config.getMessage('events', 'attackInvisible') ||
      `${actor.name} tries to attack ${target.name}, but they are invisible and cannot be seen!`;

    log.push(
      attackFailMessage
        .replace('{attackerName}', actor.name)
        .replace('{targetName}', target.name)
    );
    return false;
  }

  // Get hit parameters
  const hits = ability.params.hits || 1;

  // IMPORTANT FIX: Make sure we get the correct damage per hit
  // If damagePerHit is specified, use that, otherwise use damage, or fallback to 10
  const damagePerHit =
    ability.params.damagePerHit || ability.params.damage || 10;

  // Announce the multi-hit attack
  log.push(
    `${actor.name} uses ${ability.name} on ${target === '__monster__' ? 'the Monster' : target.name}, striking ${hits} times!`
  );

  // Total damage counter
  let totalDamage = 0;
  let hitCount = 0;

  // Process each hit
  for (let i = 0; i < hits; i++) {
    // Calculate hit chance for each hit (if specified)
    const hitChance = ability.params.hitChance || 1.0;

    // Check if hit lands
    if (Math.random() < hitChance) {
      const modifiedDamage = actor.modifyDamage(damagePerHit);
      hitCount++;

      // Apply the damage directly to the target
      if (target === '__monster__') {
        // For monster target
        const hitSuccess = systems.monsterController.takeDamage(
          modifiedDamage,
          actor,
          []
        );
        if (hitSuccess) {
          totalDamage += modifiedDamage;
        }
      } else {
        // For player target
        const damageLog = [];
        systems.combatSystem.applyDamageToPlayer(
          target,
          modifiedDamage,
          actor,
          damageLog
        );

        // Add hit-specific damage messages to the log
        log.push(
          `Hit #${hitCount}: ${actor.name} dealt ${modifiedDamage} damage to ${target.name}`
        );
        totalDamage += modifiedDamage;
      }
    } else {
      // Log missed hits
      log.push(`Hit #${i + 1} missed!`);
    }
  }

  // Log the total damage
  if (hitCount > 0) {
    log.push(
      `${hitCount} hits connected, dealing a total of ${totalDamage} damage.`
    );
  } else {
    log.push(`All hits missed!`);
  }

  // Check for warlock conversion on player targets
  if (target !== '__monster__' && actor.isWarlock && hitCount > 0) {
    systems.warlockSystem.attemptConversion(actor, target, log);
  }

  return true;
}

module.exports = { register };
