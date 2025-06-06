/**
 * @fileoverview FIXED Attack-related ability handlers with proper coordination bonuses
 * Contains damage-dealing class abilities with coordination bonus integration
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
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'attack',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    }
  );

  // 3. Register specific ability types that need custom handlers

  // Poison-based abilities
  registry.registerClassAbility('poisonStrike', handlePoisonStrike);
  registry.registerClassAbility('deathMark', handleDeathMark);
  registry.registerClassAbility('poisonTrap', handlePoisonTrap);
  registry.registerClassAbility('multiHitAttack', handleMultiHitAttack);
  registry.registerClassAbility('barbedArrow', handleBarbedArrow);
  registry.registerClassAbility('pyroblast', handlePyroblast);
  registry.registerClassAbility(
    'vulnerabilityStrike',
    handleVulnerabilityStrike
  );

  // AOE damage abilities - FIXED Inferno Blast
  registry.registerClassAbility('meteorShower', handleAoeDamage);
  registry.registerClassAbility('infernoBlast', handleInfernoBlast);
  registry.registerClassAbility('chainLightning', handleAoeDamage);

  registry.registerClassAbility('shiv', handleVulnerabilityStrike);

  // Register all AoE damage abilities (with null effect and Multi target)
  // Exclude already registered ones
  registerAbilitiesByEffectAndTarget(
    registry,
    null,
    'Multi',
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'meteorShower',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    },
    ['infernoBlast', 'chainLightning'] // Exclude abilities with specific handlers
  );

  registry.registerClassAbility('arcaneBarrage', handleMultiHitAttack);
  registry.registerClassAbility('twinStrike', handleMultiHitAttack);

  registry.registerClassAbility('recklessStrike', handleRecklessStrike);

  // Register all vulnerable effect abilities
  registerAbilitiesByEffectAndTarget(
    registry,
    'vulnerable', // Effect
    'Single', // Target
    handleVulnerabilityStrike // Handler function
  );
}

/**
 * FIXED: Handler for generic attack abilities with coordination bonuses
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 * @returns {boolean} Whether the ability was successful
 */
function handleAttack(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  // If target is a player (not monster) and is invisible, attack should fail
  if (
    target !== config.MONSTER_ID &&
    target.hasStatusEffect &&
    target.hasStatusEffect('invisible')
  ) {
    const attackFailMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'attackInvisible'
    );
    log.push(
      messages.formatMessage(attackFailMessage, {
        attackerName: actor.name,
        targetName: target.name,
      })
    );
    return false;
  }

  // Calculate base damage
  const rawDamage = Number(ability.params.damage) || 0;

  // Apply actor's damage modifiers (race, class, level, etc.)
  let modifiedDamage = actor.modifyDamage(rawDamage);

  // NEW: Apply coordination bonus BEFORE applying damage
  if (coordinationInfo.coordinatedDamage && coordinationInfo.damageBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
    modifiedDamage = Math.floor(modifiedDamage * coordinationMultiplier);

    // Log coordination bonus application to attacker
    const coordinationPrivateLog = {
      type: 'coordination_damage_applied',
      public: false,
      attackerId: actor.id,
      message: '',
      privateMessage: `Coordination bonus increases your damage by ${coordinationInfo.damageBonus}% (${Math.floor(actor.modifyDamage(rawDamage))} → ${modifiedDamage})!`,
      attackerMessage: '',
    };
    log.push(coordinationPrivateLog);
  }

  // NEW: Apply comeback mechanics if active
  const alivePlayers = systems.gameStateUtils.getAlivePlayers();
  const goodPlayers = alivePlayers.filter((p) => !p.isWarlock);
  const comebackActive = config.gameBalance.shouldActiveComebackMechanics(
    goodPlayers.length,
    alivePlayers.length
  );

  if (comebackActive && !actor.isWarlock) {
    const comebackMultiplier =
      1 + config.gameBalance.comebackMechanics.damageIncrease / 100;
    const beforeComeback = modifiedDamage;
    modifiedDamage = Math.floor(modifiedDamage * comebackMultiplier);

    if (modifiedDamage > beforeComeback) {
      const comebackPrivateLog = {
        type: 'comeback_damage_applied',
        public: false,
        attackerId: actor.id,
        message: '',
        privateMessage: `Comeback mechanics boost your damage by ${config.gameBalance.comebackMechanics.damageIncrease}% (${beforeComeback} → ${modifiedDamage})!`,
        attackerMessage: '',
      };
      log.push(comebackPrivateLog);
    }
  }

  let actualDamage = 0;

  if (target === config.MONSTER_ID) {
    const success = systems.monsterController.takeDamage(
      modifiedDamage,
      actor,
      log
    );
    if (success) {
      actualDamage = modifiedDamage;

      // Generate warlock threat for attacking monster
      if (actor.isWarlock) {
        const randomConversionModifier =
          config.gameBalance.warlock.conversion.randomModifier;
        systems.warlockSystem.attemptConversion(
          actor,
          null,
          log,
          randomConversionModifier
        );
      }
    }
  } else {
    // Player target
    if (!target || !target.isAlive) return false;

    // Apply damage and track actual damage dealt
    const oldHp = target.hp;
    systems.combatSystem.applyDamageToPlayer(
      target,
      modifiedDamage,
      actor,
      log
    );
    actualDamage = oldHp - target.hp;

    // Warlocks may attempt to convert on attack
    if (actor.isWarlock) {
      systems.warlockSystem.attemptConversion(actor, target, log);
    }
  }

  // NEW: Apply threat for this action
  if (actualDamage > 0) {
    applyThreatForAbility(actor, target, ability, actualDamage, 0, systems);
  }

  return actualDamage > 0;
}

/**
 * FIXED: Handler for poison strike ability with coordination bonuses
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 * @returns {boolean} Whether the ability was successful
 */
function handlePoisonStrike(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  // Check if target is invisible
  if (
    target !== config.MONSTER_ID &&
    target.hasStatusEffect &&
    target.hasStatusEffect('invisible')
  ) {
    const invisibleMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'attackInvisible'
    );
    const invisibleLog = {
      type: 'attack_invisible',
      public: false,
      attackerId: actor.id,
      targetId: target.id,
      message: '',
      privateMessage: messages.formatMessage(invisibleMessage, {
        attackerName: actor.name,
        targetName: target.name,
      }),
      attackerMessage: messages.formatMessage(invisibleMessage, {
        attackerName: actor.name,
        targetName: target.name,
      }),
    };
    log.push(invisibleLog);
    return false;
  }

  // First apply regular attack damage with coordination bonuses
  const attackResult = handleAttack(
    actor,
    target,
    ability,
    log,
    systems,
    coordinationInfo
  );

  // Then apply poison if attack was successful and target is still alive
  if (attackResult && target !== config.MONSTER_ID && target.isAlive) {
    const poisonData = ability.params.poison;
    let modifiedPoisonDamage = Math.floor(
      poisonData.damage * (actor.damageMod || 1.0)
    );

    // NEW: Apply coordination bonus to poison damage as well
    if (
      coordinationInfo.coordinatedDamage &&
      coordinationInfo.damageBonus > 0
    ) {
      const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
      modifiedPoisonDamage = Math.floor(
        modifiedPoisonDamage * coordinationMultiplier
      );
    }

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

    const poisonMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'poisonApplied'
    );
    log.push(
      messages.formatMessage(poisonMessage, {
        playerName: target.name,
        targetName: target.name,
        damage: modifiedPoisonDamage,
        turns: poisonData.turns || poisonDefaults.turns,
      })
    );
  }

  return attackResult;
}

/**
 * FIXED: Handler for AoE damage abilities with coordination bonuses
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 * @returns {boolean} Whether the ability was successful
 */
function handleAoeDamage(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  const rawDamage = Number(ability.params.damage) || 0;
  let modifiedDamage = actor.modifyDamage(rawDamage);

  // NEW: Apply coordination bonus to base damage
  if (coordinationInfo.coordinatedDamage && coordinationInfo.damageBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
    modifiedDamage = Math.floor(modifiedDamage * coordinationMultiplier);
  }

  // NEW: Apply comeback mechanics if active
  const alivePlayers = systems.gameStateUtils.getAlivePlayers();
  const goodPlayers = alivePlayers.filter((p) => !p.isWarlock);
  const comebackActive = config.gameBalance.shouldActiveComebackMechanics(
    goodPlayers.length,
    alivePlayers.length
  );

  if (comebackActive && !actor.isWarlock) {
    const comebackMultiplier =
      1 + config.gameBalance.comebackMechanics.damageIncrease / 100;
    modifiedDamage = Math.floor(modifiedDamage * comebackMultiplier);
  }

  // Get potential targets based on ability configuration
  let targets = [];

  // For AOE damage, typically hit all players except self, and potentially the monster
  if (ability.target === 'Multi' || target === 'multi') {
    // Get all alive players except the caster
    targets = Array.from(systems.players.values()).filter(
      (p) => p.isAlive && p.id !== actor.id
    );

    // Some AOE abilities also hit the monster (check ability config)
    if (
      ability.params.includeMonster !== false &&
      systems.monster &&
      systems.monster.hp > 0
    ) {
      // For monster, we'll handle it separately since it's not a player object
      const monsterSuccess = systems.monsterController.takeDamage(
        modifiedDamage,
        actor,
        log
      );

      if (monsterSuccess && actor.isWarlock) {
        const randomConversionModifier =
          config.gameBalance.warlock.conversion.randomModifier;
        systems.warlockSystem.attemptConversion(
          actor,
          null,
          log,
          randomConversionModifier
        );
      }
    }
  } else {
    // Fallback: if not explicitly multi-target, still try to handle it
    targets = Array.from(systems.players.values()).filter(
      (p) => p.isAlive && p.id !== actor.id
    );
  }

  if (
    targets.length === 0 &&
    (ability.params.includeMonster === false || systems.monster.hp <= 0)
  ) {
    const noTargetsMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'aoeNoTargets'
    );
    log.push(
      messages.formatMessage(noTargetsMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  // Apply damage to multiple targets
  const announceMessage = messages.getAbilityMessage(
    'abilities.attacks',
    'aoeAnnounce'
  );
  log.push(
    messages.formatMessage(announceMessage, {
      playerName: actor.name,
      abilityName: ability.name,
    })
  );

  let totalDamageDealt = 0;

  for (const potentialTarget of targets) {
    const oldHp = potentialTarget.hp;
    systems.combatSystem.applyDamageToPlayer(
      potentialTarget,
      modifiedDamage,
      actor,
      log
    );
    const actualDamage = oldHp - potentialTarget.hp;
    totalDamageDealt += actualDamage;

    // Check for warlock conversion with reduced chance for AoE
    const conversionModifier =
      config.gameBalance.warlock.conversion.aoeModifier;

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

  // NEW: Apply threat for total AoE damage
  if (totalDamageDealt > 0) {
    applyThreatForAbility(
      actor,
      '__multi__',
      ability,
      totalDamageDealt,
      0,
      systems
    );
  }

  return true;
}

/**
 * FIXED: Handler for vulnerability-inducing attacks with coordination bonuses
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 * @returns {boolean} Whether the ability was successful
 */
function handleVulnerabilityStrike(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  // First deal normal damage with coordination bonuses
  const attackResult = handleAttack(
    actor,
    target,
    ability,
    log,
    systems,
    coordinationInfo
  );

  // If attack successful and target is a player, apply vulnerability
  if (attackResult && target !== config.MONSTER_ID && target.isAlive) {
    // Get vulnerability parameters
    const vulnerableData = ability.params.vulnerable || {};
    const damageIncrease = vulnerableData.damageIncrease || 50; // Default 50%
    const turns = vulnerableData.turns || 1; // Default 1 turn

    // Apply vulnerability directly to the player
    target.applyVulnerability(damageIncrease, turns);

    // Add a clear message
    const vulnMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'vulnerabilityApplied'
    );
    log.push(
      messages.formatMessage(vulnMessage, {
        targetName: target.name,
        increase: damageIncrease,
        turns: turns,
      })
    );
  }

  return attackResult;
}

/**
 * FIXED: Handler for multi-hit attack abilities with coordination bonuses
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 * @returns {boolean} Whether the ability was successful
 */
function handleMultiHitAttack(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  // If target is invisible, attack fails
  if (
    target !== config.MONSTER_ID &&
    target.hasStatusEffect &&
    target.hasStatusEffect('invisible')
  ) {
    const invisibleMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'attackInvisible'
    );
    const invisibleLog = {
      type: 'attack_invisible',
      public: false,
      attackerId: actor.id,
      targetId: target.id,
      message: '',
      privateMessage: messages.formatMessage(invisibleMessage, {
        attackerName: actor.name,
        targetName: target.name,
      }),
      attackerMessage: messages.formatMessage(invisibleMessage, {
        attackerName: actor.name,
        targetName: target.name,
      }),
    };
    log.push(invisibleLog);
    return false;
  }

  // Get hit parameters
  const hits = ability.params.hits || 1;

  // Use damage parameter for single-target, damagePerHit for multi-target
  let damagePerHit;
  if (ability.params.damagePerHit) {
    damagePerHit = ability.params.damagePerHit;
  } else {
    damagePerHit = ability.params.damage || 10;
  }

  // Apply actor's damage modifier
  let modifiedDamagePerHit = actor.modifyDamage(damagePerHit);

  // NEW: Apply coordination bonus
  if (coordinationInfo.coordinatedDamage && coordinationInfo.damageBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
    modifiedDamagePerHit = Math.floor(
      modifiedDamagePerHit * coordinationMultiplier
    );
  }

  // NEW: Apply comeback mechanics if active
  const alivePlayers = systems.gameStateUtils.getAlivePlayers();
  const goodPlayers = alivePlayers.filter((p) => !p.isWarlock);
  const comebackActive = config.gameBalance.shouldActiveComebackMechanics(
    goodPlayers.length,
    alivePlayers.length
  );

  if (comebackActive && !actor.isWarlock) {
    const comebackMultiplier =
      1 + config.gameBalance.comebackMechanics.damageIncrease / 100;
    modifiedDamagePerHit = Math.floor(
      modifiedDamagePerHit * comebackMultiplier
    );
  }

  // Announce the multi-hit attack
  const announceMessage = messages.getAbilityMessage(
    'abilities.attacks',
    'multiHitAnnounce'
  );

  const announceLog = {
    type: 'multi_hit_announce',
    public: false,
    attackerId: actor.id,
    targetId: target === config.MONSTER_ID ? config.MONSTER_ID : target.id,
    message: '',
    privateMessage: messages.formatMessage(announceMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      targetName: target === config.MONSTER_ID ? 'the Monster' : target.name,
      hits: hits,
    }),
    attackerMessage: messages.formatMessage(announceMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      targetName: target === config.MONSTER_ID ? 'the Monster' : target.name,
      hits: hits,
    }),
  };
  log.push(announceLog);

  let totalDamage = 0;
  let hitCount = 0;

  // Process each hit
  for (let i = 0; i < hits; i++) {
    const hitChance = ability.params.hitChance || 1.0;

    if (Math.random() < hitChance) {
      hitCount++;

      if (target === config.MONSTER_ID) {
        const hitSuccess = systems.monsterController.takeDamage(
          modifiedDamagePerHit,
          actor,
          []
        );
        if (hitSuccess) {
          totalDamage += modifiedDamagePerHit;
        }
      } else {
        const oldHp = target.hp;
        const finalDamage =
          target.calculateDamageReduction(modifiedDamagePerHit);
        target.hp = Math.max(0, target.hp - finalDamage);
        const actualDamage = oldHp - target.hp;

        if (target.hp <= 0) {
          target.isAlive = false;
          systems.combatSystem.handlePotentialDeath(target, actor, log);
        }

        const hitMessage = messages.getAbilityMessage(
          'abilities.attacks',
          'multiHitIndividual'
        );

        const hitLog = {
          type: 'multi_hit_hit',
          public: false,
          attackerId: actor.id,
          targetId: target.id,
          message: '',
          privateMessage: messages.formatMessage(hitMessage, {
            hitNumber: hitCount,
            playerName: actor.name,
            damage: actualDamage,
            targetName: target.name,
          }),
          attackerMessage: messages.formatMessage(hitMessage, {
            hitNumber: hitCount,
            playerName: actor.name,
            damage: actualDamage,
            targetName: target.name,
          }),
        };
        log.push(hitLog);
        totalDamage += actualDamage;
      }
    } else {
      const missMessage = messages.getAbilityMessage(
        'abilities.attacks',
        'multiHitMiss'
      );
      const missLog = {
        type: 'multi_hit_miss',
        public: false,
        attackerId: actor.id,
        targetId: target === config.MONSTER_ID ? config.MONSTER_ID : target.id,
        message: '',
        privateMessage: messages.formatMessage(missMessage, {
          hitNumber: i + 1,
        }),
        attackerMessage: messages.formatMessage(missMessage, {
          hitNumber: i + 1,
        }),
      };
      log.push(missLog);
    }
  }

  // Log the total damage summary
  if (hitCount > 0) {
    const summaryMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'multiHitSummary'
    );

    const summaryLog = {
      type: 'multi_hit_summary',
      public: false,
      attackerId: actor.id,
      targetId: target === config.MONSTER_ID ? config.MONSTER_ID : target.id,
      message: '',
      privateMessage: messages.formatMessage(summaryMessage, {
        hitCount: hitCount,
        totalDamage: totalDamage,
      }),
      attackerMessage: messages.formatMessage(summaryMessage, {
        hitCount: hitCount,
        totalDamage: totalDamage,
      }),
    };
    log.push(summaryLog);

    // NEW: Apply threat for total damage dealt
    applyThreatForAbility(actor, target, ability, totalDamage, 0, systems);
  } else {
    const allMissedMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'multiHitMissed'
    );
    const missedLog = {
      type: 'multi_hit_missed',
      public: false,
      attackerId: actor.id,
      targetId: target === config.MONSTER_ID ? config.MONSTER_ID : target.id,
      message: '',
      privateMessage: allMissedMessage,
      attackerMessage: allMissedMessage,
    };
    log.push(missedLog);
  }

  // Check for warlock conversion on player targets
  if (target !== config.MONSTER_ID && actor.isWarlock && hitCount > 0) {
    systems.warlockSystem.attemptConversion(actor, target, log);
  }

  return hitCount > 0;
}

/**
 * FIXED: Handler for Reckless Strike ability (Barbarian) with coordination bonuses
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 * @returns {boolean} Whether the ability was successful
 */
function handleRecklessStrike(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  // Check if target is invisible first
  if (
    target !== config.MONSTER_ID &&
    target.hasStatusEffect &&
    target.hasStatusEffect('invisible')
  ) {
    const invisibleMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'attackInvisible'
    );
    log.push(
      messages.formatMessage(invisibleMessage, {
        attackerName: actor.name,
        targetName: target.name,
      })
    );
    return false;
  }

  // Apply self-damage BEFORE the attack (to show the commitment)
  const selfDamage = ability.params.selfDamage || 5;
  const oldHp = actor.hp;
  actor.hp = Math.max(1, actor.hp - selfDamage); // Cannot reduce below 1 HP
  const actualSelfDamage = oldHp - actor.hp;

  if (actualSelfDamage > 0) {
    const selfDamageMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'recklessStrikeSelfDamage'
    );
    log.push(
      messages.formatMessage(selfDamageMessage, {
        playerName: actor.name,
        damage: actualSelfDamage,
      })
    );
  }

  // Now perform the attack with coordination bonuses
  const rawDamage = Number(ability.params.damage) || 0;
  let modifiedDamage = actor.modifyDamage(rawDamage);

  // NEW: Apply coordination bonus
  if (coordinationInfo.coordinatedDamage && coordinationInfo.damageBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
    modifiedDamage = Math.floor(modifiedDamage * coordinationMultiplier);
  }

  // NEW: Apply comeback mechanics if active
  const alivePlayers = systems.gameStateUtils.getAlivePlayers();
  const goodPlayers = alivePlayers.filter((p) => !p.isWarlock);
  const comebackActive = config.gameBalance.shouldActiveComebackMechanics(
    goodPlayers.length,
    alivePlayers.length
  );

  if (comebackActive && !actor.isWarlock) {
    const comebackMultiplier =
      1 + config.gameBalance.comebackMechanics.damageIncrease / 100;
    modifiedDamage = Math.floor(modifiedDamage * comebackMultiplier);
  }

  if (target === config.MONSTER_ID) {
    systems.monsterController.takeDamage(modifiedDamage, actor, log);

    // Warlocks generate "threat" attacking monster
    if (actor.isWarlock) {
      const randomConversionModifier =
        config.gameBalance.warlock.conversion.randomModifier;
      systems.warlockSystem.attemptConversion(
        actor,
        null,
        log,
        randomConversionModifier
      );
    }
  } else {
    // Player target
    if (!target || !target.isAlive) return false;

    systems.combatSystem.applyDamageToPlayer(
      target,
      modifiedDamage,
      actor,
      log
    );

    // Warlocks may attempt to convert on attack
    if (actor.isWarlock) {
      systems.warlockSystem.attemptConversion(actor, target, log);
    }
  }

  return true;
}

/**
 * Generic handler for attack abilities with detection and coordination bonuses
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 * @param {Function} additionalEffectHandler - Optional function for additional effects (poison, etc.)
 * @returns {boolean} Whether the ability was successful
 */
function handleAttackWithDetection(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {},
  additionalEffectHandler = null
) {
  // Check if target is invisible
  if (
    target !== config.MONSTER_ID &&
    target.hasStatusEffect &&
    target.hasStatusEffect('invisible')
  ) {
    const invisibleMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'attackInvisible'
    );
    log.push(
      messages.formatMessage(invisibleMessage, {
        attackerName: actor.name,
        targetName: target.name,
      })
    );
    return false;
  }

  // First apply regular attack damage with coordination bonuses
  const attackResult = handleAttack(
    actor,
    target,
    ability,
    log,
    systems,
    coordinationInfo
  );

  // Apply additional effects if attack was successful and target is still alive
  if (attackResult && target !== config.MONSTER_ID && target.isAlive) {
    // Apply any additional effects (poison, etc.)
    if (additionalEffectHandler) {
      additionalEffectHandler(
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    }

    // Detection logic - only works on living players
    if (
      ability.params.detectChance &&
      Math.random() < ability.params.detectChance
    ) {
      const abilityType = ability.type; // Use ability type for message keys

      if (target.isWarlock) {
        // Mark warlock as detected for penalties
        systems.warlockSystem.markWarlockDetected(target.id, log);

        // Private message to attacker revealing Warlock
        const privateDetectionLog = {
          type: `${abilityType}_detection`,
          public: false,
          targetId: target.id,
          attackerId: actor.id,
          message: '',
          privateMessage: '',
          attackerMessage: messages.formatMessage(
            messages.getAbilityMessage(
              'abilities.attacks',
              `${abilityType}DetectSuccess`
            ),
            { targetName: target.name }
          ),
        };
        log.push(privateDetectionLog);
      } else {
        // Private message confirming target is not a Warlock
        const privateNoDetectionLog = {
          type: `${abilityType}_no_detection`,
          public: false,
          targetId: target.id,
          attackerId: actor.id,
          message: '',
          privateMessage: '',
          attackerMessage: messages.formatMessage(
            messages.getAbilityMessage(
              'abilities.attacks',
              `${abilityType}DetectFail`
            ),
            { targetName: target.name }
          ),
        };
        log.push(privateNoDetectionLog);
      }
    }
  }

  return attackResult;
}

/**
 * Handler for barbed arrow with poison and detection (with coordination bonuses)
 */
function handleBarbedArrow(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  return handleAttackWithDetection(
    actor,
    target,
    ability,
    log,
    systems,
    coordinationInfo,
    // Poison effect handler
    (actor, target, ability, log, systems, coordinationInfo) => {
      const poisonData = ability.params.poison;
      let modifiedPoisonDamage = Math.floor(
        poisonData.damage * (actor.damageMod || 1.0)
      );

      // Apply coordination bonus to poison as well
      if (
        coordinationInfo.coordinatedDamage &&
        coordinationInfo.damageBonus > 0
      ) {
        const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
        modifiedPoisonDamage = Math.floor(
          modifiedPoisonDamage * coordinationMultiplier
        );
      }

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
    }
  );
}

/**
 * Handler for pyroblast with burn/poison and detection (with coordination bonuses)
 */
function handlePyroblast(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  return handleAttackWithDetection(
    actor,
    target,
    ability,
    log,
    systems,
    coordinationInfo,
    // Burn/poison effect handler
    (actor, target, ability, log, systems, coordinationInfo) => {
      const burnData = ability.params.poison || ability.params.burn; // Support both naming conventions
      let modifiedBurnDamage = Math.floor(
        burnData.damage * (actor.damageMod || 1.0)
      );

      // Apply coordination bonus to burn damage as well
      if (
        coordinationInfo.coordinatedDamage &&
        coordinationInfo.damageBonus > 0
      ) {
        const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
        modifiedBurnDamage = Math.floor(
          modifiedBurnDamage * coordinationMultiplier
        );
      }

      const poisonDefaults = config.getStatusEffectDefaults('poison') || {
        turns: 3,
      };

      systems.statusEffectManager.applyEffect(
        target.id,
        'poison', // Use poison effect for burns
        {
          turns: burnData.turns || poisonDefaults.turns,
          damage: modifiedBurnDamage,
        },
        log
      );
    }
  );
}

/**
 * FIXED: Handler for inferno blast ability with coordination bonuses
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @param {Object} coordinationInfo - Coordination bonus information
 * @returns {boolean} Whether the ability was successful
 */
function handleInfernoBlast(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  const rawDamage = Number(ability.params.damage) || 0;
  let modifiedDamage = actor.modifyDamage(rawDamage);

  // NEW: Apply coordination bonus
  if (coordinationInfo.coordinatedDamage && coordinationInfo.damageBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
    modifiedDamage = Math.floor(modifiedDamage * coordinationMultiplier);
  }

  // NEW: Apply comeback mechanics if active
  const alivePlayers = systems.gameStateUtils.getAlivePlayers();
  const goodPlayers = alivePlayers.filter((p) => !p.isWarlock);
  const comebackActive = config.gameBalance.shouldActiveComebackMechanics(
    goodPlayers.length,
    alivePlayers.length
  );

  if (comebackActive && !actor.isWarlock) {
    const comebackMultiplier =
      1 + config.gameBalance.comebackMechanics.damageIncrease / 100;
    modifiedDamage = Math.floor(modifiedDamage * comebackMultiplier);
  }

  // Get potential targets (all alive players except self)
  const targets = Array.from(systems.players.values()).filter(
    (p) => p.isAlive && p.id !== actor.id
  );

  if (targets.length === 0) {
    const noTargetsMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'aoeNoTargets'
    );
    log.push(
      messages.formatMessage(noTargetsMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  // Apply damage and poison to multiple targets
  const announceMessage = messages.getAbilityMessage(
    'abilities.attacks',
    'aoeAnnounce'
  );
  log.push(
    messages.formatMessage(announceMessage, {
      playerName: actor.name,
      abilityName: ability.name,
    })
  );

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
      let modifiedPoisonDamage = Math.floor(
        (poisonData.damage || poisonDefaults.damage) * (actor.damageMod || 1.0)
      );

      // Apply coordination bonus to poison damage as well
      if (
        coordinationInfo.coordinatedDamage &&
        coordinationInfo.damageBonus > 0
      ) {
        const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
        modifiedPoisonDamage = Math.floor(
          modifiedPoisonDamage * coordinationMultiplier
        );
      }

      systems.statusEffectManager.applyEffect(
        potentialTarget.id,
        'poison',
        {
          turns: poisonData.turns || poisonDefaults.turns,
          damage: modifiedPoisonDamage,
        },
        log
      );

      const poisonMessage = messages.getAbilityMessage(
        'abilities.attacks',
        'infernoBlastPoison'
      );
      log.push(
        messages.formatMessage(poisonMessage, {
          targetName: potentialTarget.name,
          damage: modifiedPoisonDamage,
          turns: poisonData.turns || poisonDefaults.turns,
        })
      );
    }
  }

  return true;
}

/**
 * Handler for death mark ability (no coordination bonus needed - special ability)
 */
function handleDeathMark(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  if (target === config.MONSTER_ID) {
    const invalidMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'deathMarkInvalidTarget'
    );
    log.push(
      messages.formatMessage(invalidMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  // Get poison defaults from config if needed
  const poisonDefaults = config.getStatusEffectDefaults('poison') || {
    turns: 3,
    damage: 5,
  };

  // Apply high-damage poison to target
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

  // Apply invisibility to the caster (actor)
  const invisibleData = ability.params.selfInvisible || { duration: 1 };
  systems.statusEffectManager.applyEffect(
    actor.id,
    'invisible',
    {
      turns: invisibleData.duration,
    },
    log
  );

  const deathMarkMessage = messages.getAbilityMessage(
    'abilities.attacks',
    'deathMarkPoison'
  );
  log.push(
    messages.formatMessage(deathMarkMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      targetName: target.name,
      damage: modifiedPoisonDamage,
      turns: poisonData.turns || poisonDefaults.turns,
    })
  );

  return true;
}

/**
 * Handler for poison trap ability (AOE - coordination would be weird here)
 */
function handlePoisonTrap(
  actor,
  target,
  ability,
  log,
  systems,
  coordinationInfo = {}
) {
  // Get all alive players except actor
  const targets = Array.from(systems.players.values()).filter(
    (p) => p.isAlive && p.id !== actor.id
  );

  if (targets.length === 0) {
    const noTargetsMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'aoeNoTargets'
    );
    log.push(
      messages.formatMessage(noTargetsMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  // Get poison defaults from config if needed
  const poisonDefaults = config.getStatusEffectDefaults('poison') || {
    turns: 2,
    damage: 5,
  };

  const poisonData = ability.params.poison || {};
  const vulnerableData = ability.params.vulnerable || {};
  const modifiedPoisonDamage = Math.floor(
    (poisonData.damage || poisonDefaults.damage) * (actor.damageMod || 1.0)
  );

  // Apply poison and vulnerability to multiple targets
  const announceMessage = messages.getAbilityMessage(
    'abilities.attacks',
    'poisonTrapAnnounce'
  );
  log.push(
    messages.formatMessage(announceMessage, {
      playerName: actor.name,
      abilityName: ability.name,
    })
  );

  let targetsHit = 0;

  // Get trap hit chance from ability params or use default
  const trapHitChance = ability.params.hitChance || 0.75;

  for (const potentialTarget of targets) {
    if (Math.random() < trapHitChance) {
      // Apply poison
      systems.statusEffectManager.applyEffect(
        potentialTarget.id,
        'poison',
        {
          turns: poisonData.turns || poisonDefaults.turns,
          damage: modifiedPoisonDamage,
        },
        log
      );

      // Apply vulnerability
      potentialTarget.applyVulnerability(
        vulnerableData.damageIncrease || 30,
        vulnerableData.turns || 2
      );

      const caughtMessage = messages.getAbilityMessage(
        'abilities.attacks',
        'poisonTrapCaught'
      );
      log.push(
        messages.formatMessage(caughtMessage, {
          targetName: potentialTarget.name,
          playerName: actor.name,
          abilityName: ability.name,
          damage: modifiedPoisonDamage,
          turns: poisonData.turns || poisonDefaults.turns,
          increase: vulnerableData.damageIncrease || 30,
          vulnerableTurns: vulnerableData.turns || 2,
        })
      );
      targetsHit++;
    }
  }

  if (targetsHit === 0) {
    const missedMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'poisonTrapMissed'
    );
    log.push(
      messages.formatMessage(missedMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
  } else {
    const summaryMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'poisonTrapSummary'
    );
    log.push(
      messages.formatMessage(summaryMessage, {
        count: targetsHit,
      })
    );
  }

  return true;
}

module.exports = { register };
