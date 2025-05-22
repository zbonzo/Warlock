/**
 * @fileoverview Special ability handlers
 * Contains utility, detection, and status-effect abilities
 */
const config = require('@config');
const {
  registerAbilitiesByCategory,
  registerAbilitiesByEffectAndTarget,
  registerAbilitiesByCriteria,
} = require('./abilityRegistryUtils');

/**
 * Register all special ability handlers with the registry
 * @param {AbilityRegistry} registry - Ability registry to register with
 */
function register(registry) {
  // Register detection abilities
  registry.registerClassAbility('fatesEye', handleEyeOfFate);
  registry.registerClassAbility('primalRoar', handlePrimalRoar);
  registry.registerClassAbility('bloodFrenzy', handleBloodFrenzy);
  registry.registerClassAbility('unstoppableRage', handleUnstoppableRage);
  registry.registerClassAbility('spiritGuard', handleSpiritGuard);
  registry.registerClassAbility('sanctuaryOfTruth', handleSanctuaryOfTruth);

  // Register all abilities with 'detect' effect
  registerAbilitiesByEffectAndTarget(
    registry,
    'detect',
    'Single',
    (actor, target, ability, log, systems) => {
      return registry.executeClassAbility(
        'fatesEye',
        actor,
        target,
        ability,
        log,
        systems
      );
    }
  );

  // Register stun abilities
  registry.registerClassAbility('entangle', handleStunAbility);

  // Register all abilities with 'stunned' effect
  registerAbilitiesByEffectAndTarget(
    registry,
    'stunned',
    'Multi',
    (actor, target, ability, log, systems) => {
      if (ability.type !== 'entangle') {
        // Skip ones with specific handlers
        return registry.executeClassAbility(
          'entangle',
          actor,
          target,
          ability,
          log,
          systems
        );
      }
    }
  );

  // Register remaining Special category abilities
  registerAbilitiesByCategory(
    registry,
    'Special',
    (actor, target, ability, log, systems) => {
      // Default handler for Special category abilities without a specific handler
      // Log that the ability was used
      log.push(`${actor.name} uses ${ability.name}.`);
      return true;
    }
  );
}

/**
 * Handler for detection abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target to detect information about
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleDetectionAbility(actor, target, ability, log, systems) {
  if (!target || target === '__monster__') {
    log.push(
      `${actor.name} tries to use ${ability.name}, but it can only target players.`
    );
    return false;
  }

  log.push(`${actor.name} uses ${ability.name} on ${target.name}.`);

  // Reveal warlock status
  // Use config message if available
  const isWarlock = target.isWarlock;
  const warlockMessage = isWarlock
    ? config.getMessage('events', 'warlockRevealed') ||
      `{playerName} IS a Warlock!`
    : config.getMessage('events', 'notWarlock') ||
      `{playerName} is NOT a Warlock.`;

  const revealText = warlockMessage.replace('{playerName}', target.name);

  log.push(`Revelation: ${revealText}`);
  return true;
}

/**
 * Handler for stun abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target to potentially stun
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleStunAbility(actor, target, ability, log, systems) {
  // For multi-target stun abilities
  if (ability.target === 'Multi') {
    return handleMultiStun(actor, ability, log, systems);
  }

  // For single-target stun abilities
  if (!target || target === '__monster__') {
    log.push(
      `${actor.name} tries to use ${ability.name}, but the target is invalid.`
    );
    return false;
  }

  // Get stun defaults from config if needed
  const stunDefaults = config.getStatusEffectDefaults('stunned') || {
    turns: 1,
  };

  // Check stun chance
  const stunChance = ability.params.chance || 0.5;

  if (Math.random() < stunChance) {
    // Apply stun effect
    systems.statusEffectManager.applyEffect(
      target.id,
      'stunned',
      {
        turns: ability.params.duration || stunDefaults.turns,
      },
      log
    );

    // Use config message if available
    const stunMessage =
      config.getMessage('events', 'playerStunned') ||
      `{playerName} is stunned for {turns} turn(s).`;

    log.push(
      stunMessage
        .replace('{playerName}', target.name)
        .replace('{turns}', ability.params.duration || stunDefaults.turns)
    );

    return true;
  } else {
    log.push(`${target.name} resists ${actor.name}'s ${ability.name}!`);
    return false;
  }
}

/**
 * Handler for Primal Roar ability (Barbarian)
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handlePrimalRoar(actor, target, ability, log, systems) {
  if (!target || target === '__monster__') {
    log.push(
      `${actor.name} tries to use ${ability.name}, but the target is invalid.`
    );
    return false;
  }

  // Apply damage reduction effect
  const damageReduction = ability.params.damageReduction || 0.25;
  const duration = ability.params.duration || 1;

  // Apply weakened effect (custom status effect)
  systems.statusEffectManager.applyEffect(
    target.id,
    'weakened',
    {
      damageReduction: damageReduction,
      turns: duration,
    },
    log
  );

  log.push(
    `${actor.name} lets out a terrifying roar! ${target.name} is weakened and will deal ${Math.round(damageReduction * 100)}% less damage for ${duration} turn(s).`
  );

  return true;
}

/**
 * Handler for Blood Frenzy ability (Barbarian) - FIXED
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleBloodFrenzy(actor, target, ability, log, systems) {
  // This is a passive ability that should be automatically active
  // Set up the blood frenzy effect on the actor
  if (!actor.classEffects) {
    actor.classEffects = {};
  }

  actor.classEffects.bloodFrenzy = {
    damageIncreasePerHpMissing:
      ability.params.damageIncreasePerHpMissing || 0.01,
    active: true,
  };

  log.push(
    `${actor.name} enters a Blood Frenzy! Damage increases as health decreases (${Math.round((ability.params.damageIncreasePerHpMissing || 0.01) * 100)}% per 1% HP missing).`
  );

  return true;
}

/**
 * Handler for Unstoppable Rage ability (Barbarian) - FIXED
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleUnstoppableRage(actor, target, ability, log, systems) {
  // Apply the enraged status effect
  const damageBoost = ability.params.damageBoost || 1.5;
  const damageResistance = ability.params.damageResistance || 0.3;
  const duration = ability.params.duration || 2;
  const selfDamagePercent =
    ability.params.effectEnds?.selfDamagePercent || 0.25;

  // Apply enraged status effect
  systems.statusEffectManager.applyEffect(
    actor.id,
    'enraged',
    {
      damageBoost: damageBoost,
      damageResistance: damageResistance,
      turns: duration + 1, // Add 1 to account for immediate countdown
      selfDamagePercent: selfDamagePercent,
    },
    log
  );

  // Also set up special effects
  if (!actor.classEffects) {
    actor.classEffects = {};
  }

  actor.classEffects.unstoppableRage = {
    damageBoost: damageBoost,
    damageResistance: damageResistance,
    turnsLeft: duration + 1, // Add 1 to account for immediate countdown
    selfDamagePercent: selfDamagePercent,
  };

  log.push(
    `${actor.name} enters an Unstoppable Rage! Damage boosted by ${Math.round((damageBoost - 1) * 100)}% and damage resistance increased by ${Math.round(damageResistance * 100)}% for ${duration} turns.`
  );
  log.push(
    `Warning: When the rage ends, ${actor.name} will take ${Math.round(selfDamagePercent * 100)}% of max HP as damage!`
  );

  return true;
}

/**
 * Handler for Eye of Fate ability (Oracle) - FIXED
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleEyeOfFate(actor, target, ability, log, systems) {
  if (!target || target === '__monster__') {
    log.push(
      `${actor.name} tries to use ${ability.name}, but it can only target players.`
    );
    return false;
  }

  log.push(`${actor.name} uses ${ability.name} on ${target.name}.`);

  // Reveal warlock status
  const isWarlock = target.isWarlock;

  if (isWarlock) {
    const revealMessage = `Revelation: ${target.name} IS a Warlock!`;
    log.push(revealMessage);

    // Private message to the Oracle
    const privateRevealLog = {
      type: 'warlock_detected',
      public: false,
      targetId: actor.id,
      message: '',
      privateMessage: `Your Eye of Fate reveals that ${target.name} is a Warlock!`,
      attackerMessage: '',
    };
    log.push(privateRevealLog);
  } else {
    const notWarlockMessage = `Revelation: ${target.name} is NOT a Warlock.`;
    log.push(notWarlockMessage);

    // Apply self-damage for failed detection
    const selfDamage = ability.params.selfDamageOnFailure || 10;
    const oldHp = actor.hp;
    actor.hp = Math.max(1, actor.hp - selfDamage);
    const actualSelfDamage = oldHp - actor.hp;

    if (actualSelfDamage > 0) {
      log.push(
        `${actor.name} takes ${actualSelfDamage} psychic backlash for failing to find a Warlock!`
      );

      // Private message to the Oracle
      const backlashLog = {
        type: 'psychic_backlash',
        public: false,
        targetId: actor.id,
        message: '',
        privateMessage: `You take ${actualSelfDamage} psychic damage for not detecting a Warlock!`,
        attackerMessage: '',
      };
      log.push(backlashLog);
    }
  }

  return true;
}

/**
 * Handler for Spirit Guard ability (Oracle) - FIXED
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleSpiritGuard(actor, target, ability, log, systems) {
  // Apply protection with counter-damage and warlock detection
  const armor = ability.params.armor || 2;
  const counterDamage = ability.params.counterDamage || 15;
  const duration = ability.params.duration || 1;

  // Apply protected status with special counter-damage property
  systems.statusEffectManager.applyEffect(
    actor.id,
    'protected',
    {
      armor: armor,
      turns: duration + 1, // Add 1 to account for immediate countdown
      counterDamage: counterDamage,
      revealsWarlocks: true, // Special property for Spirit Guard
    },
    log
  );

  // Also set up the counter-attack effect in classEffects
  if (!actor.classEffects) {
    actor.classEffects = {};
  }

  actor.classEffects.spiritGuard = {
    counterDamage: counterDamage,
    revealsWarlocks: true,
    turnsLeft: duration + 1, // Add 1 to account for immediate countdown
  };

  log.push(
    `${actor.name} summons vengeful spirits! Gains ${armor} armor and attackers will take ${counterDamage} damage and be revealed if they are Warlocks for ${duration} turn(s).`
  );

  return true;
}

/**
 * Handler for Sanctuary of Truth ability (Oracle) - FIXED
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleSanctuaryOfTruth(actor, target, ability, log, systems) {
  // Apply healing
  const healAmount = Math.floor(
    (ability.params.amount || 20) * actor.getHealingModifier()
  );
  const actualHeal = Math.min(healAmount, actor.maxHp - actor.hp);
  actor.hp += actualHeal;

  if (actualHeal > 0) {
    log.push(
      `${actor.name} creates a Sanctuary of Truth and heals for ${actualHeal} health.`
    );

    // Private healing message
    const healLog = {
      type: 'sanctuary_heal',
      public: false,
      targetId: actor.id,
      message: '',
      privateMessage: `Your Sanctuary heals you for ${actualHeal} HP.`,
      attackerMessage: '',
    };
    log.push(healLog);
  }

  // Set up the sanctuary effect
  if (!actor.classEffects) {
    actor.classEffects = {};
  }

  actor.classEffects.sanctuaryOfTruth = {
    counterDamage: ability.params.counterDamage || 10,
    autoDetect: ability.params.autoDetect || true,
    turnsLeft: 2, // Active for this round and next
  };

  log.push(
    `${actor.name}'s Sanctuary will automatically detect and punish any Warlocks who attack!`
  );

  return true;
}
/**
 * Handler for multi-target stun abilities
 * @param {Object} actor - Actor using the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 * @private
 */
function handleMultiStun(actor, ability, log, systems) {
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

  // Get stun defaults from config if needed
  const stunDefaults = config.getStatusEffectDefaults('stunned') || {
    turns: 1,
  };

  // Apply stun to multiple targets
  log.push(`${actor.name} casts ${ability.name}!`);
  let targetsStunned = 0;

  // Get stun chance from ability or use default
  const stunChance = ability.params.chance || 0.5;

  for (const potentialTarget of targets) {
    if (Math.random() < stunChance) {
      systems.statusEffectManager.applyEffect(
        potentialTarget.id,
        'stunned',
        {
          turns: ability.params.duration || stunDefaults.turns,
        },
        log
      );

      // Use config message if available
      const stunMessage =
        config.getMessage('events', 'playerStunned') ||
        `{playerName} is stunned for {turns} turn(s).`;

      log.push(
        stunMessage
          .replace('{playerName}', potentialTarget.name)
          .replace('{turns}', ability.params.duration || stunDefaults.turns)
      );

      targetsStunned++;
    } else {
      log.push(
        `${potentialTarget.name} resists ${actor.name}'s ${ability.name}!`
      );
    }
  }

  if (targetsStunned === 0) {
    log.push(`${actor.name}'s ${ability.name} doesn't stun anyone!`);
  }

  return true;
}

module.exports = { register };
