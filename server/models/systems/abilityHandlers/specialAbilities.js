/**
 * @fileoverview Special ability handlers
 * Contains utility, detection, and status-effect abilities
 */
const config = require('@config');
const messages = require('@messages');
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
  registry.registerClassAbility('controlMonster', handleControlMonster);

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
      const abilityUsedMessage = messages.getAbilityMessage(
        'abilities.special',
        'specialAbilityUsed'
      );
      log.push(
        messages.formatMessage(abilityUsedMessage, {
          playerName: actor.name,
          abilityName: ability.name,
        })
      );
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
    const invalidTargetMessage = messages.getAbilityMessage(
      'abilities.special',
      'detectionInvalidTarget'
    );
    log.push(
      messages.formatMessage(invalidTargetMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  const detectionUsedMessage = messages.getAbilityMessage(
    'abilities.special',
    'detectionUsed'
  );
  log.push(
    messages.formatMessage(detectionUsedMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      targetName: target.name,
    })
  );

  // Reveal warlock status
  const isWarlock = target.isWarlock;
  const revealMessage = isWarlock
    ? messages.getAbilityMessage('abilities.special', 'warlockDetected')
    : messages.getAbilityMessage('abilities.special', 'warlockNotDetected');

  const revealText = messages.formatMessage(revealMessage, {
    targetName: target.name,
  });
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
    const invalidTargetMessage = messages.getAbilityMessage(
      'abilities.special',
      'stunInvalidTarget'
    );
    log.push(
      messages.formatMessage(invalidTargetMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
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

    const stunMessage = messages.getAbilityMessage(
      'abilities.special',
      'stunApplied'
    );
    log.push(
      messages.formatMessage(stunMessage, {
        playerName: target.name,
        turns: ability.params.duration || stunDefaults.turns,
      })
    );

    return true;
  } else {
    const resistMessage = messages.getAbilityMessage(
      'abilities.special',
      'stunResisted'
    );
    log.push(
      messages.formatMessage(resistMessage, {
        targetName: target.name,
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
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
    const invalidTargetMessage = messages.getAbilityMessage(
      'abilities.special',
      'primalRoarInvalidTarget'
    );
    log.push(
      messages.formatMessage(invalidTargetMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
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

  const primalRoarMessage = messages.getAbilityMessage(
    'abilities.special',
    'primalRoarUsed'
  );
  log.push(
    messages.formatMessage(primalRoarMessage, {
      playerName: actor.name,
      targetName: target.name,
      reduction: Math.round(damageReduction * 100),
      turns: duration,
    })
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

  const bloodFrenzyMessage = messages.getAbilityMessage(
    'abilities.special',
    'bloodFrenzyActivated'
  );
  log.push(
    messages.formatMessage(bloodFrenzyMessage, {
      playerName: actor.name,
      rate: Math.round(
        (ability.params.damageIncreasePerHpMissing || 0.01) * 100
      ),
    })
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
    active: true,
  };

  const unstoppableRageMessage = messages.getAbilityMessage(
    'abilities.special',
    'unstoppableRageActivated'
  );
  log.push(
    messages.formatMessage(unstoppableRageMessage, {
      playerName: actor.name,
      damageBoost: Math.round((damageBoost - 1) * 100),
      resistance: Math.round(damageResistance * 100),
      turns: duration,
    })
  );

  const warningMessage = messages.getAbilityMessage(
    'abilities.special',
    'unstoppableRageWarning'
  );
  log.push(
    messages.formatMessage(warningMessage, {
      playerName: actor.name,
      selfDamage: Math.round(selfDamagePercent * 100),
    })
  );

  return true;
}

/**
 * Handler for Spirit Guard ability (Shaman) - FIXED
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleSpiritGuard(actor, target, ability, log, systems) {
  const armor = ability.params.armor || 3;
  const counterDamage = ability.params.counterDamage || 5;
  const duration = ability.params.duration || 2;

  // Apply spirit guard status effect
  systems.statusEffectManager.applyEffect(
    actor.id,
    'spiritGuard',
    {
      armor: armor,
      counterDamage: counterDamage,
      turns: duration,
    },
    log
  );

  const spiritGuardMessage = messages.getAbilityMessage(
    'abilities.special',
    'spiritGuardActivated'
  );
  log.push(
    messages.formatMessage(spiritGuardMessage, {
      playerName: actor.name,
      armor: armor,
      counterDamage: counterDamage,
      turns: duration,
    })
  );

  return true;
}

/**
 * Handler for Sanctuary of Truth ability (Paladin) - FIXED
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleSanctuaryOfTruth(actor, target, ability, log, systems) {
  const healAmount = ability.params.healAmount || 10;
  const counterDamage = ability.params.counterDamage || 15;
  const duration = ability.params.duration || 2;

  // Heal the actor immediately
  const actualHeal = Math.min(healAmount, actor.maxHp - actor.hp);
  actor.hp += actualHeal;

  // Apply sanctuary status effect
  systems.statusEffectManager.applyEffect(
    actor.id,
    'sanctuary',
    {
      counterDamage: counterDamage,
      turns: duration,
    },
    log
  );

  const sanctuaryMessage = messages.getAbilityMessage(
    'abilities.special',
    'sanctuaryOfTruthActivated'
  );
  log.push(
    messages.formatMessage(sanctuaryMessage, {
      playerName: actor.name,
      amount: actualHeal,
    })
  );

  const detectionMessage = messages.getAbilityMessage(
    'abilities.special',
    'sanctuaryOfTruthDetection'
  );
  log.push(
    messages.formatMessage(detectionMessage, {
      playerName: actor.name,
    })
  );

  return true;
}

/**
 * Handler for Control Monster ability (Warlock) - FIXED
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target to force the monster to attack
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleControlMonster(actor, target, ability, log, systems) {
  // Check if monster is still alive
  if (!systems.monsterController.monster.isAlive) {
    const deadMonsterMessage = messages.getAbilityMessage(
      'abilities.special',
      'controlMonsterDeadMonster'
    );
    log.push(
      messages.formatMessage(deadMonsterMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  // Check if trying to attack the monster itself
  if (target === '__monster__') {
    const invalidTargetMessage = messages.getAbilityMessage(
      'abilities.special',
      'controlMonsterInvalidTarget'
    );
    log.push(
      messages.formatMessage(invalidTargetMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  // Check if target is valid and alive
  if (!target || !target.isAlive) {
    const noTargetsMessage = messages.getAbilityMessage(
      'abilities.special',
      'controlMonsterNoTargets'
    );
    log.push(
      messages.formatMessage(noTargetsMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  const controlMessage = messages.getAbilityMessage(
    'abilities.special',
    'controlMonsterUsed'
  );
  log.push(
    messages.formatMessage(controlMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      targetName: target.name,
    })
  );

  // Force monster to attack the target with boosted damage
  const damageBoost = ability.params.damageBoost || 1.5;
  const boostedDamage = Math.floor(
    systems.monsterController.monster.damage * damageBoost
  );

  // Apply damage to the target
  systems.combatSystem.applyDamageToPlayer(
    target,
    boostedDamage,
    {
      name: 'Monster',
      id: '__monster__',
    },
    log
  );

  const damageMessage = messages.getAbilityMessage(
    'abilities.special',
    'controlMonsterDamage'
  );
  log.push(
    messages.formatMessage(damageMessage, {
      damage: boostedDamage,
      boost: Math.round((damageBoost - 1) * 100),
      playerName: actor.name,
    })
  );

  return true;
}

/**
 * Handler for Eye of Fate ability (Oracle) - FIXED
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target to detect
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleEyeOfFate(actor, target, ability, log, systems) {
  if (!target || target === '__monster__') {
    const invalidTargetMessage = messages.getAbilityMessage(
      'abilities.special',
      'detectionInvalidTarget'
    );
    log.push(
      messages.formatMessage(invalidTargetMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  const eyeOfFateMessage = messages.getAbilityMessage(
    'abilities.special',
    'eyeOfFateUsed'
  );
  log.push(
    messages.formatMessage(eyeOfFateMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      targetName: target.name,
    })
  );

  if (target.isWarlock) {
    // Found a warlock
    const warlockFoundMessage = messages.getAbilityMessage(
      'abilities.special',
      'warlockDetected'
    );
    log.push(
      messages.formatMessage(warlockFoundMessage, {
        targetName: target.name,
      })
    );

    // Private message to the oracle
    const privateFoundLog = {
      type: 'oracle_success',
      public: false,
      targetId: target.id,
      attackerId: actor.id,
      message: '',
      privateMessage: '',
      attackerMessage: messages.formatMessage(
        messages.getAbilityMessage(
          'abilities.special',
          'eyeOfFateWarlockFound'
        ),
        { targetName: target.name }
      ),
    };
    log.push(privateFoundLog);
  } else {
    // Not a warlock - take psychic backlash
    const backlashDamage = ability.params.backlashDamage || 5;
    actor.hp = Math.max(1, actor.hp - backlashDamage);

    const notWarlockMessage = messages.getAbilityMessage(
      'abilities.special',
      'eyeOfFateWarlockNotFound'
    );
    log.push(
      messages.formatMessage(notWarlockMessage, {
        targetName: target.name,
      })
    );

    const backlashMessage = messages.getAbilityMessage(
      'abilities.special',
      'eyeOfFatePsychicBacklash'
    );
    log.push(
      messages.formatMessage(backlashMessage, {
        playerName: actor.name,
        damage: backlashDamage,
      })
    );

    // Private message to the oracle
    const privateBacklashLog = {
      type: 'oracle_backlash',
      public: false,
      targetId: target.id,
      attackerId: actor.id,
      message: '',
      privateMessage: '',
      attackerMessage: messages.formatMessage(
        messages.getAbilityMessage(
          'abilities.special',
          'eyeOfFateBacklashPrivate'
        ),
        { damage: backlashDamage }
      ),
    };
    log.push(privateBacklashLog);
  }

  return true;
}

/**
 * Helper for multi-target stun abilities
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
    const noTargetsMessage = messages.getAbilityMessage(
      'abilities.special',
      'multiStunNoTargets'
    );
    log.push(
      messages.formatMessage(noTargetsMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  const multiStunMessage = messages.getAbilityMessage(
    'abilities.special',
    'multiStunCast'
  );
  log.push(
    messages.formatMessage(multiStunMessage, {
      playerName: actor.name,
      abilityName: ability.name,
    })
  );

  // Get stun defaults from config if needed
  const stunDefaults = config.getStatusEffectDefaults('stunned') || {
    turns: 1,
  };

  const stunChance = ability.params.chance || 0.5;
  let stunCount = 0;

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

      const stunMessage = messages.getAbilityMessage(
        'abilities.special',
        'stunApplied'
      );
      log.push(
        messages.formatMessage(stunMessage, {
          targetName: potentialTarget.name,
          turns: ability.params.duration || stunDefaults.turns,
        })
      );
      stunCount++;
    }
  }

  if (stunCount === 0) {
    const noneAffectedMessage = messages.getAbilityMessage(
      'abilities.special',
      'multiStunNoneAffected'
    );
    log.push(
      messages.formatMessage(noneAffectedMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
  }

  return stunCount > 0;
}

module.exports = { register };
