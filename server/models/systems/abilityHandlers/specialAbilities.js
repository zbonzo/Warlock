/**
 * @fileoverview Special ability handlers - FIXED
 * Contains utility, detection, and status-effect abilities with correct status effect usage
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

  // Register Barbarian passive abilities
  registry.registerClassAbility('relentlessFury', handleRelentlessFury);
  registry.registerClassAbility('thirstyBlade', handleThirstyBlade);
  registry.registerClassAbility('sweepingStrike', handleSweepingStrike);

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
  if (!target || target === config.MONSTER_ID) {
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
 * Handler for stun abilities - FINAL FIX
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target to potentially stun
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleStunAbility(actor, target, ability, log, systems) {
  // For multi-target stun abilities or when target is "multi"
  if (ability.target === 'Multi' || target === 'multi') {
    return handleMultiStunFinal(actor, ability, log, systems);
  }

  // For single-target stun abilities
  if (!target || target === '__monster__' || target === 'multi') {
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
    // Apply stun effect DIRECTLY to the player, bypassing StatusEffectManager
    const stunDuration = ability.params.duration || stunDefaults.turns;

    // Apply stun directly to player
    if (!target.statusEffects) {
      target.statusEffects = {};
    }
    target.statusEffects.stunned = {
      turns: stunDuration + 1, // Add 1 for immediate countdown
    };

    // Generate our own custom message for entangling roots
    if (ability.type === 'entangle') {
      const entangleMessage = `${target.name} has been pinned to the ground by roots for ${stunDuration} turn(s).`;
      log.push({
        type: 'entangle_stun',
        public: true,
        targetId: target.id,
        attackerId: actor.id,
        message: entangleMessage,
        privateMessage: entangleMessage,
        attackerMessage: entangleMessage,
      });
    } else {
      // For other stun abilities, use a simple message
      log.push({
        type: 'stunned',
        public: true,
        targetId: target.id,
        attackerId: actor.id,
        message: `${target.name} is stunned for ${stunDuration} turn(s).`,
        privateMessage: `${target.name} is stunned for ${stunDuration} turn(s).`,
        attackerMessage: `${target.name} is stunned for ${stunDuration} turn(s).`,
      });
    }

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
 * FINAL FIX: Multi-stun handler that bypasses StatusEffectManager and fixes target names
 */
function handleMultiStunFinal(actor, ability, log, systems) {
  // Get all alive players except actor
  const targets = Array.from(systems.players.values()).filter(
    (p) => p.isAlive && p.id !== actor.id
  );

  if (targets.length === 0) {
    log.push({
      type: 'no_targets',
      public: true,
      attackerId: actor.id,
      message: `${actor.name} uses ${ability.name}, but there are no valid targets.`,
      privateMessage: `${actor.name} uses ${ability.name}, but there are no valid targets.`,
      attackerMessage: `${actor.name} uses ${ability.name}, but there are no valid targets.`,
    });
    return false;
  }

  // Cast announcement
  log.push({
    type: 'ability_cast',
    public: true,
    attackerId: actor.id,
    message: `${actor.name} casts ${ability.name}!`,
    privateMessage: `${actor.name} casts ${ability.name}!`,
    attackerMessage: `${actor.name} casts ${ability.name}!`,
  });

  const stunDefaults = config.getStatusEffectDefaults('stunned') || {
    turns: 1,
  };
  const stunChance = ability.params.chance || 0.5;
  const stunDuration = ability.params.duration || stunDefaults.turns;
  let stunCount = 0;

  for (const potentialTarget of targets) {
    if (Math.random() < stunChance) {
      // Apply stun directly to player
      if (!potentialTarget.statusEffects) {
        potentialTarget.statusEffects = {};
      }
      potentialTarget.statusEffects.stunned = {
        turns: stunDuration + 1, // Add 1 for immediate countdown
      };

      // Generate custom message for THIS SPECIFIC TARGET
      if (ability.type === 'entangle') {
        const entangleMessage = `${potentialTarget.name} has been pinned to the ground by roots for ${stunDuration} turn(s).`;
        log.push({
          type: 'entangle_stun',
          public: true,
          targetId: potentialTarget.id,
          attackerId: actor.id,
          message: entangleMessage,
          privateMessage: entangleMessage,
          attackerMessage: entangleMessage,
        });
      } else {
        log.push({
          type: 'stunned',
          public: true,
          targetId: potentialTarget.id,
          attackerId: actor.id,
          message: `${potentialTarget.name} is stunned for ${stunDuration} turn(s).`,
          privateMessage: `${potentialTarget.name} is stunned for ${stunDuration} turn(s).`,
          attackerMessage: `${potentialTarget.name} is stunned for ${stunDuration} turn(s).`,
        });
      }
      stunCount++;
    }
  }

  if (stunCount === 0) {
    log.push({
      type: 'no_effect',
      public: true,
      attackerId: actor.id,
      message: `${actor.name}'s ${ability.name} doesn't stun anyone!`,
      privateMessage: `${actor.name}'s ${ability.name} doesn't stun anyone!`,
      attackerMessage: `${actor.name}'s ${ability.name} doesn't stun anyone!`,
    });
  }

  return stunCount > 0;
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
  if (!target || target === config.MONSTER_ID) {
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
 * Handler for Blood Frenzy ability (Barbarian)
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
 * Handler for Spirit Guard ability (Oracle)
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleSpiritGuard(actor, target, ability, log, systems) {
  const armor = ability.params.armor || 2;
  const counterDamage = ability.params.counterDamage || 25;
  const duration = ability.params.duration || 1;

  // Apply spirit guard status effect using the correct effect name
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
 * Handler for Sanctuary of Truth ability (Oracle)
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleSanctuaryOfTruth(actor, target, ability, log, systems) {
  const healAmount = ability.params.amount || 20;
  const counterDamage = ability.params.counterDamage || 50;
  const duration = ability.params.duration || 1;

  // Heal the actor immediately
  const actualHeal = Math.min(healAmount, actor.maxHp - actor.hp);
  actor.hp += actualHeal;

  // Apply sanctuary status effect using the correct effect name
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
 * Handler for Control Monster ability (Tracker)
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target to force the monster to attack
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleControlMonster(actor, target, ability, log, systems) {
  // Check if monster is still alive
  if (systems.monsterController.isDead()) {
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
  if (target === config.MONSTER_ID) {
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
  const damageBoost = ability.params.damageBoost || 2;
  const normalDamage = systems.monsterController.calculateNextAttackDamage();
  const boostedDamage = Math.floor(normalDamage * damageBoost);

  // Apply damage to the target
  systems.combatSystem.applyDamageToPlayer(
    target,
    boostedDamage,
    {
      name: 'The Monster',
      id: config.MONSTER_ID,
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
  if (!target || target === config.MONSTER_ID) {
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
    // Found a warlock - Oracle survives
    const warlockFoundMessage = messages.getAbilityMessage(
      'abilities.special',
      'warlockDetected'
    );
    log.push(
      messages.formatMessage(warlockFoundMessage, {
        targetName: target.name,
      })
    );

    // Mark warlock as detected for penalties
    systems.warlockSystem.markWarlockDetected(target.id, log);

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
    // Not a warlock - Oracle dies instantly
    const selfDamageType = ability.params.selfDamageOnFailure;
    
    if (selfDamageType === 'instant_death') {
      // Instant death - bypass all armor and protections
      actor.hp = 0;
      actor.isAlive = false;
      actor.pendingDeath = true;
      actor.deathAttacker = 'Psychic Backlash';
      
      const instantDeathMessage = `${actor.name}'s mind is shattered by the psychic backlash of detecting an innocent soul!`;
      log.push({
        type: 'eye_of_fate_instant_death',
        public: true,
        attackerId: actor.id,
        targetId: actor.id,
        message: instantDeathMessage,
        privateMessage: 'The truth was too much to bear. Your mind is destroyed.',
        attackerMessage: '',
      });
    } else {
      // Fallback to normal damage (legacy support)
      const backlashDamage = typeof selfDamageType === 'number' ? selfDamageType : 1000;
      actor.hp = Math.max(0, actor.hp - backlashDamage);
      
      if (actor.hp <= 0) {
        actor.isAlive = false;
        actor.pendingDeath = true;
        actor.deathAttacker = 'Psychic Backlash';
      }
      
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
    }

    const notWarlockMessage = messages.getAbilityMessage(
      'abilities.special',
      'eyeOfFateWarlockNotFound'
    );
    log.push(
      messages.formatMessage(notWarlockMessage, {
        targetName: target.name,
      })
    );
  }

  return true;
}

/**
 * Helper for multi-target stun abilities - FIXED to prevent duplicate messages
 * @param {Object} actor - Actor using the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 * @private
 */
function handleMultiStun(actor, ability, log, systems) {
  // Get all alive players except actor (stun abilities typically don't affect the caster)
  const targets = Array.from(systems.players.values()).filter(
    (p) => p.isAlive && p.id !== actor.id
  );

  // Note: AOE stun typically doesn't affect the monster
  // If a specific ability should stun the monster, it can be handled separately

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
      // FIXED: Apply effect with message suppression
      systems.statusEffectManager.applyEffect(
        potentialTarget.id,
        'stunned',
        {
          turns: ability.params.duration || stunDefaults.turns,
        },
        log,
        { suppressMessage: true } // Suppress automatic messages
      );

      // FIXED: Generate our own custom message for entangling roots
      if (ability.type === 'entangle') {
        const entangleMessage = `${potentialTarget.name} has been pinned to the ground by roots for ${ability.params.duration || stunDefaults.turns} turn(s).`;
        log.push({
          type: 'entangle_stun',
          public: true,
          targetId: potentialTarget.id,
          attackerId: actor.id,
          message: entangleMessage,
          privateMessage: entangleMessage,
          attackerMessage: entangleMessage,
        });
      } else {
        // Generic stun message for other abilities
        const stunMessage = messages.getAbilityMessage(
          'abilities.special',
          'stunApplied'
        );
        log.push(
          messages.formatMessage(stunMessage, {
            playerName: potentialTarget.name, // FIXED: Use playerName consistently
            targetName: potentialTarget.name, // Also provide targetName for flexibility
            turns: ability.params.duration || stunDefaults.turns,
          })
        );
      }
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

/**
 * Handler for Relentless Fury passive ability (Barbarian Level 2)
 * Increases damage dealt and taken per level
 */
function handleRelentlessFury(actor, target, ability, log, systems) {
  // Set up the relentless fury effect on the actor
  if (!actor.classEffects) {
    actor.classEffects = {};
  }

  const damagePerLevel = ability.params.damagePerLevel || 0.03;
  const vulnerabilityPerLevel = ability.params.vulnerabilityPerLevel || 0.03;

  // FIXED: Get level from the player object directly
  const currentLevel = actor.level || 2; // Default to level 2 when first unlocked

  actor.classEffects.relentlessFury = {
    damagePerLevel: damagePerLevel,
    vulnerabilityPerLevel: vulnerabilityPerLevel,
    currentLevel: currentLevel,
    active: true,
  };

  const damageBonus = Math.round(damagePerLevel * currentLevel * 100);
  const vulnerabilityBonus = Math.round(
    vulnerabilityPerLevel * currentLevel * 100
  );

  const relentlessFuryMessage = `${actor.name} enters Relentless Fury! Damage increased by ${damageBonus}% and vulnerability by ${vulnerabilityBonus}% at level ${currentLevel}.`;

  log.push({
    type: 'relentless_fury_activated',
    public: true,
    attackerId: actor.id,
    message: relentlessFuryMessage,
    privateMessage: `Your rage burns brighter! +${damageBonus}% damage, +${vulnerabilityBonus}% damage taken.`,
    attackerMessage: '',
  });

  return true;
}

/**
 * Handler for Thirsty Blade passive ability (Barbarian Level 3)
 * Provides life steal and refreshes on kills
 */
function handleThirstyBlade(actor, target, ability, log, systems) {
  if (!actor.classEffects) {
    actor.classEffects = {};
  }

  const lifeSteal = ability.params.lifeSteal || 0.15;
  const initialDuration = ability.params.initialDuration || 4;

  // Create NEW object for each player (not shared reference)
  actor.classEffects.thirstyBlade = {
    lifeSteal: lifeSteal,
    maxDuration: initialDuration,
    turnsLeft: initialDuration,
    refreshOnKill: ability.params.refreshOnKill !== false, // Default true
    active: true,
  };

  const thirstyBladeMessage = `${actor.name} awakens their Thirsty Blade! ${Math.round(lifeSteal * 100)}% life steal active for ${initialDuration} turns.`;

  log.push({
    type: 'thirsty_blade_activated',
    public: true,
    attackerId: actor.id,
    message: thirstyBladeMessage,
    privateMessage: `Your blade thirsts for blood! ${Math.round(lifeSteal * 100)}% life steal for ${initialDuration} turns.`,
    attackerMessage: '',
  });

  return true;
}

/**
 * Handler for Sweeping Strike passive ability (Barbarian Level 4)
 * Enables attacks to hit additional targets with stun chance
 */
function handleSweepingStrike(actor, target, ability, log, systems) {
  if (!actor.classEffects) {
    actor.classEffects = {};
  }

  const bonusTargets = ability.params.bonusTargets || 1;
  const stunChance = ability.params.stunChance || 0.25;
  const stunDuration = ability.params.stunDuration || 1;

  actor.classEffects.sweepingStrike = {
    bonusTargets: bonusTargets,
    stunChance: stunChance,
    stunDuration: stunDuration,
    active: true,
  };

  const sweepingStrikeMessage = messages.getAbilityMessage(
    'abilities.special',
    'sweepingStrikeActivated'
  );

  log.push(
    messages.formatMessage(sweepingStrikeMessage, {
      playerName: actor.name,
      bonusTargets: bonusTargets,
      stunChance: Math.round(stunChance * 100),
    })
  );

  return true;
}
module.exports = { register };
