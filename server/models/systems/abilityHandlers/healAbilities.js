/**
 * @fileoverview FIXED healing ability handlers
 * Contains all healing-related class abilities with proper parameter usage and level scaling
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

  // Register the FIXED rejuvenation as heal over time
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
 * FIXED: Handler for generic healing abilities - now uses ability params and proper healing scaling
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

  // Handle warlock behavior from game balance config
  const rejectWarlockHealing =
    config.gameBalance?.player?.healing?.rejectWarlockHealing || true;
  const warlockSelfHealOnly =
    config.gameBalance?.player?.healing?.warlockSelfHealOnly || true;

  let actualHeal = 0;

  if (!target.isWarlock || !rejectWarlockHealing) {
    // Normal healing
    actualHeal = Math.min(healAmount, target.maxHp - target.hp);
    target.hp += actualHeal;

    if (actualHeal > 0) {
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
    } else {
      // Target is at full health
      const healFullLog = {
        type: 'heal_full',
        public: false,
        targetId: target.id,
        attackerId: actor.id,
        message: '',
        privateMessage: messages.formatMessage(
          messages.getAbilityMessage('abilities.healing', 'alreadyFullHealth'),
          { healerName: actor.name }
        ),
        attackerMessage: messages.formatMessage(
          messages.getAbilityMessage('abilities.healing', 'targetFullHealth'),
          { targetName: target.name }
        ),
      };
      log.push(healFullLog);
    }
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
  }

  // NEW: Apply threat for healing done
  if (actualHeal > 0) {
    applyThreatForAbility(actor, target, ability, 0, actualHeal, systems);
  }

  return true;
}

/**
 * FIXED: Handler for Rejuvenation as heal over time effect
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

  // Handle warlock behavior from game balance config
  const excludeWarlocks =
    config.gameBalance?.player?.healing?.rejectWarlockHealing || true;

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

  for (const potentialTarget of targets) {
    // Skip warlocks if configured to do so (unless it's the actor and they're a warlock)
    if (
      excludeWarlocks &&
      potentialTarget.isWarlock &&
      !(potentialTarget.id === actor.id && actor.isWarlock)
    ) {
      continue;
    }

    // Apply healing over time status effect
    const success = systems.statusEffectManager.applyEffect(
      potentialTarget.id,
      'healingOverTime',
      {
        amount: healPerTurn,
        turns: healingTurns,
      },
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

    // NEW: Apply threat for potential healing (healing over time generates threat upfront)
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
 * FIXED: Multi-target instant healing handler
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Initial target (may be ignored for multi-target)
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

  // Handle warlock behavior from game balance config
  const excludeWarlocks =
    config.gameBalance?.player?.healing?.rejectWarlockHealing || true;

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

  for (const potentialTarget of targets) {
    // Skip warlocks if configured to do so (unless it's the actor and they're a warlock)
    if (
      excludeWarlocks &&
      potentialTarget.isWarlock &&
      !(potentialTarget.id === actor.id && actor.isWarlock)
    ) {
      continue;
    }

    // Apply healing
    const actualHeal = Math.min(
      healAmount,
      potentialTarget.maxHp - potentialTarget.hp
    );
    if (actualHeal > 0) {
      potentialTarget.hp += actualHeal;
      totalHealingDone += actualHeal;

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

  // NEW: Apply threat for total healing done
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


