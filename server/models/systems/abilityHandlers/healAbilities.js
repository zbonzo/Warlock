/**
 * @fileoverview FIXED healing ability handlers with anti-detection mechanics
 * Healing now always appears to work on warlocks but with a small detection chance
 */
const config = require('@config');
const messages = require('@messages');
const {
  registerAbilitiesByCategory,
  registerAbilitiesByEffectAndTarget,
  registerAbilitiesByCriteria,
  applyThreatForAbility,
} = require('./abilityRegistryUtils');

/**
 * Register all healing ability handlers with the registry
 * @param {AbilityRegistry} registry - Ability registry to register with
 */
function register(registry) {
  // Basic single-target healing
  registry.registerClassAbility('heal', handleHeal);
  registry.registerClassAbility('swiftMend', handleHeal);
  registry.registerClassAbility('bandage', handleHeal);
  registry.registerClassAbility('cauterize', handleHeal);
  registry.registerClassAbility('ancestralHeal', handleHeal);

  // Register all 'Heal' category abilities with Self target to use the heal handler
  registerAbilitiesByCriteria(
    registry,
    { category: 'Heal', target: 'Self' },
    (actor, target, ability, log, systems) => {
      return registry.executeClassAbility(
        'heal',
        actor,
        target,
        ability,
        log,
        systems
      );
    }
  );

  // Register all 'Heal' category abilities with Single target to use the heal handler
  registerAbilitiesByCriteria(
    registry,
    { category: 'Heal', target: 'Single' },
    (actor, target, ability, log, systems) => {
      return registry.executeClassAbility(
        'heal',
        actor,
        target,
        ability,
        log,
        systems
      );
    }
  );

  // Register the rejuvenation as heal over time
  registry.registerClassAbility('rejuvenation', handleRejuvenationHoT);

  // Register other multi-target healing abilities to use the multi-heal handler
  registerAbilitiesByCriteria(
    registry,
    { category: 'Heal', target: 'Multi' },
    (actor, target, ability, log, systems) => {
      // Skip rejuvenation since it has its own handler now
      if (ability.type !== 'rejuvenation') {
        return handleMultiHeal(actor, target, ability, log, systems);
      }
    }
  );
}

/**
 * FIXED: Handler for generic healing abilities - now with anti-detection mechanics
 * Healing always appears to work but has small detection chance when warlock actually healed
 * @param {Object} actor - Actor using the ability
 * @param {Object} target - Target of the healing
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleHeal(actor, target, ability, log, systems) {
  // Use ability.params.amount from classes.js configuration
  let healAmount = Number(ability.params.amount) || 0;

  // Use proper healing scaling
  const healingModifier = actor.getHealingModifier
    ? actor.getHealingModifier()
    : 1.0;
  healAmount = Math.floor(healAmount * healingModifier);

  let actualHeal = 0;
  let detectionOccurred = false;

  // Check if anti-detection system is enabled
  const antiDetectionEnabled =
    config.gameBalance?.player?.healing?.antiDetection?.enabled || false;
  const alwaysHealWarlocks =
    config.gameBalance?.player?.healing?.antiDetection?.alwaysHealWarlocks ||
    false;

  // Calculate healing needed - available throughout function
  const healingNeeded = target.maxHp - target.hp;

  if (antiDetectionEnabled && alwaysHealWarlocks) {
    // NEW SYSTEM: Always heal the target, regardless of warlock status
    actualHeal = Math.min(healAmount, healingNeeded);

    if (actualHeal > 0) {
      target.hp += actualHeal;

      // NEW: Detection chance only if target is warlock AND actually received healing
      if (target.isWarlock && actualHeal > 0) {
        const detectionChance =
          config.gameBalance?.player?.healing?.antiDetection?.detectionChance ||
          0.05;
        if (Math.random() < detectionChance) {
          detectionOccurred = true;

          // Mark warlock as detected using the warlock system
          if (
            systems.warlockSystem &&
            systems.warlockSystem.markWarlockDetected
          ) {
            systems.warlockSystem.markWarlockDetected(target.id, log);
          }

          // Add detection message to log
          const detectionLog = {
            type: 'healing_detection',
            public: true,
            targetId: target.id,
            attackerId: actor.id,
            message: `${actor.name}'s healing reveals that ${target.name} IS a Warlock!`,
            privateMessage: `Your healing detected that ${target.name} is a Warlock!`,
            attackerMessage: `Your healing revealed that ${target.name} is corrupted!`,
          };
          log.push(detectionLog);
        }
      }
    }
  } else {
    // OLD SYSTEM: Handle warlock behavior from legacy game balance config
    const rejectWarlockHealing =
      config.gameBalance?.player?.healing?.rejectWarlockHealing || true;
    const warlockSelfHealOnly =
      config.gameBalance?.player?.healing?.warlockSelfHealOnly || true;

    if (!target.isWarlock || !rejectWarlockHealing) {
      // Normal healing
      actualHeal = Math.min(healAmount, target.maxHp - target.hp);
      target.hp += actualHeal;
    } else {
      // Warlock healing behavior - heal self instead
      actualHeal = Math.min(healAmount, actor.maxHp - actor.hp);
      actor.hp += actualHeal;

      // Warlock-specific messages
      const warlockHealLog = {
        type: 'heal_warlock',
        public: false,
        targetId: target.id,
        attackerId: actor.id,
        heal: actualHeal,
        message: '',
        privateMessage: messages.getAbilityMessage(
          'abilities.healing',
          'warlockHealingRejected'
        ),
        attackerMessage: messages.formatMessage(
          messages.getAbilityMessage(
            'abilities.healing',
            'warlockHealingSelfHeal'
          ),
          { targetName: target.name, amount: actualHeal }
        ),
      };
      log.push(warlockHealLog);

      // Trigger potential conversion
      systems.warlockSystem.attemptConversion(actor, target, log);

      // Apply threat for healing done
      if (actualHeal > 0) {
        applyThreatForAbility(actor, target, ability, 0, actualHeal, systems);
      }

      return true;
    }
  }

  // Standard healing messages (same for everyone - no warlock indication)
  const healMessage = messages.getAbilityMessage(
    'abilities.healing',
    'healingApplied'
  );
  log.push(
    messages.formatMessage(healMessage, {
      playerName: target.name,
      amount: actualHeal,
    })
  );

  // Add private messages
  const privateHealLog = {
    type: 'heal',
    public: false,
    targetId: target.id,
    attackerId: actor.id,
    heal: actualHeal,
    message: '',
    privateMessage: messages.formatMessage(
      messages.getAbilityMessage('abilities.healing', 'youWereHealed'),
      { healerName: actor.name, amount: actualHeal }
    ),
    attackerMessage: messages.formatMessage(
      messages.getAbilityMessage('abilities.healing', 'youHealed'),
      { targetName: target.name, amount: actualHeal }
    ),
  };
  log.push(privateHealLog);

  if (healingNeeded <= 0) {
    // Target is at full health - same message for everyone
    const healFullLog = {
      type: 'heal_full',
      public: false,
      targetId: target.id,
      attackerId: actor.id,
      message: '',
      privateMessage: `${target.name} is already at full health.`,
      attackerMessage: messages.formatMessage(
        messages.getAbilityMessage('abilities.healing', 'targetFullHealth'),
        { targetName: target.name }
      ),
    };
    log.push(healFullLog);
  }

  // Apply threat for healing done (warlocks generate threat from healing too)
  if (actualHeal > 0) {
    applyThreatForAbility(actor, target, ability, 0, actualHeal, systems);
  }

  return true;
}

/**
 * FIXED: Handler for Rejuvenation as heal over time effect - now with anti-detection
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Initial target (may be ignored for multi-target)
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleRejuvenationHoT(actor, target, ability, log, systems) {
  // Get potential targets (all alive players)
  const targets = Array.from(systems.players.values()).filter((p) => p.isAlive);

  // Check if anti-detection system is enabled
  const antiDetectionEnabled =
    config.gameBalance?.player?.healing?.antiDetection?.enabled || false;

  // NEW: Include warlocks only if anti-detection is enabled, otherwise use legacy exclusion
  const excludeWarlocks = antiDetectionEnabled
    ? false
    : config.gameBalance?.player?.healing?.rejectWarlockHealing || true;

  // Use ability.params.amount from classes.js configuration
  let baseHealAmount = Number(ability.params.amount) || 250;

  // Use proper healing scaling
  const healingModifier = actor.getHealingModifier
    ? actor.getHealingModifier()
    : 1.0;
  const modifiedHealAmount = Math.floor(baseHealAmount * healingModifier);

  // Get turns from ability params, default to 3
  const healingTurns = ability.params.turns || 3;
  const healPerTurn = Math.floor(modifiedHealAmount / healingTurns);

  // Apply healing over time to each valid target
  const castMessage = messages.getAbilityMessage(
    'abilities.healing',
    'rejuvenationCast'
  );
  log.push(
    messages.formatMessage(castMessage, {
      playerName: actor.name,
      abilityName: ability.name,
    })
  );

  let playersAffected = 0;
  let totalPotentialHealing = 0;
  let detectionOccurred = false;

  for (const potentialTarget of targets) {
    // Include warlocks only if anti-detection system is enabled, otherwise use legacy exclusion
    if (
      excludeWarlocks &&
      potentialTarget.isWarlock &&
      !(potentialTarget.id === actor.id && actor.isWarlock)
    ) {
      continue;
    }

    // Apply healing over time status effect
    const success = systems.statusEffectSystem.applyEffect(
      potentialTarget.id,
      'healingOverTime',
      {
        amount: healPerTurn,
        turns: healingTurns,
        // NEW: Track if this is a warlock for detection chances during processing
        isWarlock: potentialTarget.isWarlock,
        healerId: actor.id,
        healerName: actor.name,
      },
      actor.id,
      actor.name,
      log
    );

    if (success) {
      playersAffected++;
      totalPotentialHealing += modifiedHealAmount; // Count full potential healing

      // Add private message for the recipient
      const privateHealLog = {
        type: 'heal_over_time_applied',
        public: false,
        targetId: potentialTarget.id,
        attackerId: actor.id,
        message: '',
        privateMessage: messages.formatMessage(
          messages.getAbilityMessage(
            'abilities.healing',
            'rejuvenationBlessing'
          ),
          {
            playerName: actor.name,
            healPerTurn: healPerTurn,
            turns: healingTurns,
          }
        ),
        attackerMessage: '',
      };
      log.push(privateHealLog);
    }
  }

  if (playersAffected > 0) {
    const appliedMessage = messages.getAbilityMessage(
      'abilities.healing',
      'rejuvenationApplied'
    );
    log.push(
      messages.formatMessage(appliedMessage, {
        count: playersAffected,
        healPerTurn: healPerTurn,
        turns: healingTurns,
      })
    );

    // Apply threat for potential healing (healing over time generates threat upfront)
    applyThreatForAbility(
      actor,
      '__multi__',
      ability,
      0,
      totalPotentialHealing,
      systems
    );
  } else {
    const noTargetsMessage = messages.getAbilityMessage(
      'abilities.healing',
      'rejuvenationNoTargets'
    );
    log.push(
      messages.formatMessage(noTargetsMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
  }

  return playersAffected > 0;
}

/**
 * FIXED: Multi-target instant healing handler - now with anti-detection
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Initial target ("multi" for AOE)
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleMultiHeal(actor, target, ability, log, systems) {
  // Use ability.params.amount from classes.js configuration
  let healAmount = Number(ability.params.amount) || 0;

  // Use proper healing scaling
  const healingModifier = actor.getHealingModifier
    ? actor.getHealingModifier()
    : 1.0;
  healAmount = Math.floor(healAmount * healingModifier);

  // Get potential targets (all alive players)
  const targets = Array.from(systems.players.values()).filter((p) => p.isAlive);

  // Check if anti-detection system is enabled
  const antiDetectionEnabled =
    config.gameBalance?.player?.healing?.antiDetection?.enabled || false;
  const alwaysHealWarlocks =
    config.gameBalance?.player?.healing?.antiDetection?.alwaysHealWarlocks ||
    false;

  // NEW: Include all alive players if anti-detection is enabled, otherwise use legacy exclusion
  const excludeWarlocks = antiDetectionEnabled
    ? false
    : config.gameBalance?.player?.healing?.rejectWarlockHealing || true;

  // Apply healing to each target
  const multiHealMessage = messages.getAbilityMessage(
    'abilities.healing',
    'multiHealCast'
  );
  log.push(
    messages.formatMessage(multiHealMessage, {
      playerName: actor.name,
      abilityName: ability.name,
    })
  );

  let totalHealingDone = 0;
  let detectionOccurred = false;

  for (const potentialTarget of targets) {
    // NEW: Include all alive players (including warlocks)

    // Apply healing
    const actualHeal = Math.min(
      healAmount,
      potentialTarget.maxHp - potentialTarget.hp
    );
    if (actualHeal > 0) {
      potentialTarget.hp += actualHeal;
      totalHealingDone += actualHeal;

      // NEW: Detection chance for warlocks who actually received healing
      if (potentialTarget.isWarlock && actualHeal > 0) {
        const detectionChance =
          config.gameBalance?.player?.healing?.antiDetection?.detectionChance ||
          0.05;
        if (Math.random() < detectionChance) {
          detectionOccurred = true;

          // Mark warlock as detected
          if (
            systems.warlockSystem &&
            systems.warlockSystem.markWarlockDetected
          ) {
            systems.warlockSystem.markWarlockDetected(potentialTarget.id, log);
          }

          // Add detection message
          const detectionLog = {
            type: 'multi_healing_detection',
            public: true,
            targetId: potentialTarget.id,
            attackerId: actor.id,
            message: `${actor.name}'s ${ability.name} reveals that ${potentialTarget.name} IS a Warlock!`,
            privateMessage: `Your ${ability.name} detected that ${potentialTarget.name} is a Warlock!`,
            attackerMessage: `Your ${ability.name} revealed that ${potentialTarget.name} is corrupted!`,
          };
          log.push(detectionLog);
        }
      }

      const healMessage = messages.getAbilityMessage(
        'abilities.healing',
        'healingApplied'
      );
      log.push(
        messages.formatMessage(healMessage, {
          playerName: potentialTarget.name,
          amount: actualHeal,
        })
      );

      // Add private messages for the recipient
      const privateHealLog = {
        type: 'heal',
        public: false,
        targetId: potentialTarget.id,
        attackerId: actor.id,
        heal: actualHeal,
        message: '',
        privateMessage: messages.formatMessage(
          messages.getAbilityMessage('abilities.healing', 'youWereHealed'),
          { healerName: actor.name, amount: actualHeal }
        ),
        attackerMessage: '',
      };
      log.push(privateHealLog);
    }
  }

  // Apply threat for total healing done
  if (totalHealingDone > 0) {
    applyThreatForAbility(
      actor,
      '__multi__',
      ability,
      0,
      totalHealingDone,
      systems
    );
  }

  return true;
}

module.exports = { register };
