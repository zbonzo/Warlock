/**
 * @fileoverview Special ability handlers
 * Contains utility, detection, and status-effect abilities with correct status effect usage
 * Migrated to TypeScript for Phase 6
 */

import type { Player as BasePlayer, Monster, Ability as BaseAbility } from '../../../types/generated';
import type {
  AbilityRegistry,
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from './abilityRegistryUtils';
import {
  registerAbilitiesByCategory,
  registerAbilitiesByEffectAndTarget,
  // registerAbilitiesByCriteria, // Currently unused
} from './abilityRegistryUtils';

const config = require('@config');
const messages = require('@messages');

/**
 * Extended interfaces for runtime compatibility
 */
interface Player extends BasePlayer {
  isWarlock?: boolean;
  isAlive?: boolean;
  [key: string]: any;
}

interface Ability extends BaseAbility {
  params?: Record<string, any>;
  [key: string]: any;
}

/**
 * Game systems interface (temporary until full migration)
 */
interface GameSystems {
  statusEffectSystem: {
    applyEffect(
      targetId: string,
      effectType: string,
      effectData: Record<string, any>,
      sourceId?: string,
      sourceName?: string,
      log?: LogEntry[]
    ): void;
  };
  statusEffectManager?: {
    applyEffect(
      targetId: string,
      effectType: string,
      effectData: Record<string, any>,
      log: LogEntry[]
    ): void;
  };
  warlockSystem: {
    markWarlockDetected?(warlockId: string, log: LogEntry[]): void;
  };
  monsterController: {
    isControlled?: boolean;
    controllerPlayerId?: string;
    setController?(playerId: string, turns: number): void;
  };
  players: Map<string, Player>;
}

/**
 * Register all special ability handlers with the registry
 * @param registry - Ability registry to register with
 */
export function register(registry: AbilityRegistry): void {
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
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'fatesEye',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
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
    (actor, target, ability, log, systems, coordinationInfo) => {
      if (ability.type !== 'entangle') {
        // Skip ones with specific handlers
        return registry.executeClassAbility(
          'entangle',
          actor,
          target,
          ability,
          log,
          systems,
          coordinationInfo
        );
      }
      return false;
    }
  );

  // Register remaining Special category abilities
  registerAbilitiesByCategory(
    registry,
    'Special',
    (actor, target, ability, log, systems, coordinationInfo) => {
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
 * Handler for Eye of Fate detection ability
 */
const handleEyeOfFate: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
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

  const playerTarget = target as Player;

  const detectionUsedMessage = messages.getAbilityMessage(
    'abilities.special',
    'detectionUsed'
  );
  log.push(
    messages.formatMessage(detectionUsedMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      targetName: playerTarget.name,
    })
  );

  // Reveal warlock status
  const isWarlock = playerTarget.isWarlock;
  
  if (isWarlock && systems.warlockSystem.markWarlockDetected) {
    systems.warlockSystem.markWarlockDetected(playerTarget.id, log);
  }
  
  const revealMessage = isWarlock
    ? messages.getAbilityMessage('abilities.special', 'warlockDetected')
    : messages.getAbilityMessage('abilities.special', 'warlockNotDetected');

  const revealText = messages.formatMessage(revealMessage, {
    targetName: playerTarget.name,
  });
  
  const revelationLog: LogEntry = {
    type: 'detection_result',
    public: false,
    attackerId: actor.id,
    targetId: playerTarget.id,
    message: '',
    privateMessage: `Revelation: ${revealText}`,
    attackerMessage: `Revelation: ${revealText}`,
  };
  log.push(revelationLog);
  
  return true;
};

/**
 * Handler for stun abilities
 */
const handleStunAbility: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  // Special handling for Entangling Roots - target single random player
  if ((ability as any).type === 'entangle') {
    return handleEntanglingRootsSingleTarget(actor, ability, log, systems);
  }
  
  // For multi-target stun abilities or when target is "multi"
  if ((ability as any).target === 'Multi' || target === 'multi') {
    return handleMultiStunFinal(actor, ability, log, systems);
  }

  // For single-target stun abilities
  if (!target || target === config.MONSTER_ID || target === 'multi') {
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

  const playerTarget = target as Player;

  // Check stun chance
  const stunChance = (ability as any).params?.chance || 0.5;
  let stunDuration = (ability as any).params?.duration || 1;

  // Apply coordination bonus for utility (stun duration)
  if (coordinationInfo.coordinatedUtility && coordinationInfo.utilityBonus && coordinationInfo.utilityBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.utilityBonus / 100;
    stunDuration = Math.floor(stunDuration * coordinationMultiplier);
  }

  if (Math.random() < stunChance) {
    // Apply stun effect using new status effect system
    systems.statusEffectSystem.applyEffect(
      playerTarget.id,
      'stunned',
      {
        turns: stunDuration,
      },
      actor.id,
      actor.name,
      log
    );

    // Generate our own custom message for entangling roots
    if ((ability as any).type === 'entangle') {
      const entangleMessage = `${playerTarget.name} has been pinned to the ground by roots for ${stunDuration} turn(s).`;
      const stunLog: LogEntry = {
        type: 'entangle_stun',
        public: true,
        targetId: playerTarget.id,
        attackerId: actor.id,
        message: entangleMessage,
        privateMessage: entangleMessage,
        attackerMessage: entangleMessage,
      };
      log.push(stunLog);
    } else {
      // For other stun abilities, use a simple message
      const stunLog: LogEntry = {
        type: 'stunned',
        public: true,
        targetId: playerTarget.id,
        attackerId: actor.id,
        message: `${playerTarget.name} is stunned for ${stunDuration} turn(s).`,
        privateMessage: `${playerTarget.name} is stunned for ${stunDuration} turn(s).`,
        attackerMessage: `${playerTarget.name} is stunned for ${stunDuration} turn(s).`,
      };
      log.push(stunLog);
    }

    return true;
  } else {
    const resistMessage = messages.getAbilityMessage(
      'abilities.special',
      'stunResisted'
    );
    log.push(
      messages.formatMessage(resistMessage, {
        targetName: playerTarget.name,
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }
};

/**
 * Handler for Entangling Roots - targets a single random alive player
 */
function handleEntanglingRootsSingleTarget(
  actor: Player,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems
): boolean {
  // Get all alive players except actor
  const availableTargets = Array.from(systems.players.values()).filter(
    (p: Player) => p.isAlive && p.id !== actor.id
  );

  if (availableTargets.length === 0) {
    const noTargetsLog: LogEntry = {
      type: 'no_targets',
      public: true,
      attackerId: actor.id,
      message: `${actor.name} casts ${ability.name}, but there are no valid targets.`,
      privateMessage: `${actor.name} casts ${ability.name}, but there are no valid targets.`,
      attackerMessage: `You cast ${ability.name}, but there are no valid targets.`,
    };
    log.push(noTargetsLog);
    return false;
  }

  // Select a random target
  const randomIndex = Math.floor(Math.random() * availableTargets.length);
  const randomTarget = availableTargets[randomIndex];
  if (!randomTarget) {
    return false;
  }

  // Cast announcement
  const castLog: LogEntry = {
    type: 'ability_cast',
    public: true,
    attackerId: actor.id,
    message: `${actor.name} casts ${ability.name}!`,
    privateMessage: `${actor.name} casts ${ability.name}!`,
    attackerMessage: `You cast ${ability.name}!`,
  };
  log.push(castLog);

  const stunChance = (ability as any).params?.chance || 0.8; // Higher chance for single target
  const stunDuration = (ability as any).params?.stunDuration || 1;

  if (Math.random() < stunChance) {
    // Apply stun using status effect system
    if (systems.statusEffectManager) {
      // Legacy 4-parameter signature
      systems.statusEffectManager.applyEffect(
        randomTarget.id,
        'stunned',
        {
          turns: stunDuration,
        },
        log
      );
    } else {
      // New signature
      systems.statusEffectSystem.applyEffect(
        randomTarget.id,
        'stunned',
        {
          turns: stunDuration,
        },
        actor.id,
        actor.name,
        log
      );
    }

    const entangleMessage = `${randomTarget.name} has been pinned to the ground by roots for ${stunDuration} turn(s).`;
    const entangleLog: LogEntry = {
      type: 'entangle_stun',
      public: true,
      targetId: randomTarget.id,
      attackerId: actor.id,
      message: entangleMessage,
      privateMessage: entangleMessage,
      attackerMessage: `Your ${ability.name} successfully entangles ${randomTarget.name}!`,
    };
    log.push(entangleLog);

    return true;
  } else {
    // Resisted
    const resistMessage = `${randomTarget.name} breaks free from the grasping roots!`;
    const resistLog: LogEntry = {
      type: 'entangle_resist',
      public: true,
      targetId: randomTarget.id,
      attackerId: actor.id,
      message: resistMessage,
      privateMessage: resistMessage,
      attackerMessage: `${randomTarget.name} resisted your ${ability.name}!`,
    };
    log.push(resistLog);

    return false;
  }
}

/**
 * Handler for multi-target stun abilities
 */
function handleMultiStunFinal(
  actor: Player,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems
): boolean {
  // Get all alive players except actor
  const targets = Array.from(systems.players.values()).filter(
    (p: Player) => p.isAlive && p.id !== actor.id
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

  // Announce the multi-stun
  const announceMessage = messages.getAbilityMessage(
    'abilities.special',
    'multiStunAnnounce'
  );
  log.push(
    messages.formatMessage(announceMessage, {
      playerName: actor.name,
      abilityName: ability.name,
    })
  );

  const stunChance = (ability as any).params?.chance || 0.5;
  const stunDuration = (ability as any).params?.duration || 1;
  let targetsStunned = 0;

  for (const potentialTarget of targets) {
    if (Math.random() < stunChance) {
      systems.statusEffectSystem.applyEffect(
        potentialTarget.id,
        'stunned',
        {
          turns: stunDuration,
        },
        actor.id,
        actor.name,
        log
      );

      const individualStunMessage = messages.getAbilityMessage(
        'abilities.special',
        'multiStunIndividual'
      );
      log.push(
        messages.formatMessage(individualStunMessage, {
          targetName: potentialTarget.name,
          turns: stunDuration,
        })
      );

      targetsStunned++;
    }
  }

  // Summary message
  if (targetsStunned > 0) {
    const summaryMessage = messages.getAbilityMessage(
      'abilities.special',
      'multiStunSummary'
    );
    log.push(
      messages.formatMessage(summaryMessage, {
        count: targetsStunned,
      })
    );
  }

  return targetsStunned > 0;
}

/**
 * Handler for Control Monster ability
 */
const handleControlMonster: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  if (target !== config.MONSTER_ID) {
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

  // Check if monster is already controlled
  if (systems.monsterController.isControlled) {
    const alreadyControlledMessage = messages.getAbilityMessage(
      'abilities.special',
      'controlMonsterAlreadyControlled'
    );
    log.push(
      messages.formatMessage(alreadyControlledMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  let controlDuration = (ability as any).params?.duration || 2;

  // Apply coordination bonus for utility (control duration)
  if (coordinationInfo.coordinatedUtility && coordinationInfo.utilityBonus && coordinationInfo.utilityBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.utilityBonus / 100;
    controlDuration = Math.floor(controlDuration * coordinationMultiplier);
  }

  // Set monster controller
  if (systems.monsterController.setController) {
    systems.monsterController.setController(actor.id, controlDuration);
  }

  const controlMessage = messages.getAbilityMessage(
    'abilities.special',
    'controlMonsterSuccess'
  );
  log.push(
    messages.formatMessage(controlMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      turns: controlDuration,
    })
  );

  return true;
};

// Placeholder handlers for remaining special abilities
const handlePrimalRoar: AbilityHandler = (actor, target, ability, log, systems, coordinationInfo = {}) => {
  // Primal Roar: Intimidates enemies and boosts damage for the barbarian and nearby allies
  const roarParams = (ability as any).params || {};
  const intimidationChance = roarParams.intimidationChance || 0.3;
  const damageBoostPercent = roarParams.damageBoost || 25;
  const duration = roarParams.duration || 2;
  const affectedRadius = roarParams.affectedRadius || 3;

  // Get all alive players for targeting effects
  const alivePlayers = Array.from(systems.players.values()).filter(
    (p: any) => p.isAlive && p.id !== actor.id
  ) as Player[];

  let intimidatedPlayers = 0;
  let boostedAllies = 0;

  // Apply intimidation to enemy players (chance to stun)
  const enemies = alivePlayers.filter((p: Player) => (p as any).isWarlock !== (actor as any).isWarlock);
  for (const enemy of enemies) {
    if (Math.random() < intimidationChance) {
      systems.statusEffectSystem.applyEffect(
        enemy.id,
        'stunned',
        {
          duration: 1,
          source: actor.id,
          sourceName: actor.name,
          suppressMessage: false
        },
        actor.id,
        actor.name,
        log
      );
      intimidatedPlayers++;
    }
  }

  // Apply damage boost to actor
  systems.statusEffectSystem.applyEffect(
    actor.id,
    'enraged',
    {
      duration: duration,
      damageIncrease: damageBoostPercent,
      source: actor.id,
      sourceName: actor.name,
      suppressMessage: false
    },
    actor.id,
    actor.name,
    log
  );
  boostedAllies++;

  // Apply damage boost to nearby allies
  const allies = alivePlayers.filter((p: Player) => 
    (p as any).isWarlock === (actor as any).isWarlock && 
    Math.random() < 0.7 // 70% chance to affect each ally (simulating "nearby")
  );
  
  for (const ally of allies.slice(0, affectedRadius)) {
    systems.statusEffectSystem.applyEffect(
      ally.id,
      'enraged',
      {
        duration: duration,
        damageIncrease: Math.floor(damageBoostPercent * 0.75), // Allies get 75% of the boost
        source: actor.id,
        sourceName: actor.name,
        suppressMessage: false
      },
      actor.id,
      actor.name,
      log
    );
    boostedAllies++;
  }

  // Log the primal roar usage
  const roarMessage = messages.getAbilityMessage(
    'abilities.special',
    'primalRoarUsed'
  ) || `{playerName} lets out a primal roar with {abilityName}!`;
  
  log.push(
    messages.formatMessage(roarMessage, {
      playerName: actor.name,
      abilityName: ability.name,
    })
  );

  // Log intimidation results
  if (intimidatedPlayers > 0) {
    const intimidationMessage = messages.getAbilityMessage(
      'abilities.special',
      'primalRoarIntimidation'
    ) || `The roar intimidates {count} enemies, leaving them stunned!`;
    
    log.push(
      messages.formatMessage(intimidationMessage, {
        count: intimidatedPlayers,
      })
    );
  }

  // Log boost results
  if (boostedAllies > 0) {
    const boostMessage = messages.getAbilityMessage(
      'abilities.special',
      'primalRoarBoost'
    ) || `{count} warriors are filled with primal fury!`;
    
    log.push(
      messages.formatMessage(boostMessage, {
        count: boostedAllies,
      })
    );
  }

  return true;
};

const handleBloodFrenzy: AbilityHandler = (actor, target, ability, log, systems, coordinationInfo = {}) => {
  // Blood Frenzy: Sacrifice health for increased damage output
  const frenzyParams = (ability as any).params || {};
  const healthCostPercent = frenzyParams.healthCost || 0.25; // 25% of current HP
  const damageBoostPercent = frenzyParams.damageBoost || 50; // 50% damage increase
  const duration = frenzyParams.duration || 3;
  const minimumHealthThreshold = frenzyParams.minimumHealth || 0.1; // Can't go below 10% HP

  // Calculate health cost and ensure actor won't die
  const currentHealth = (actor as any).health || (actor as any).hp || 100;
  const healthCost = Math.floor(currentHealth * healthCostPercent);
  const newHealth = currentHealth - healthCost;

  // Check if the actor has enough health to use this ability
  if (newHealth < (currentHealth * minimumHealthThreshold)) {
    const insufficientHealthMessage = messages.getAbilityMessage(
      'abilities.special',
      'bloodFrenzyInsufficientHealth'
    ) || `{playerName} doesn't have enough health to enter a blood frenzy!`;
    
    log.push(
      messages.formatMessage(insufficientHealthMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  // Apply health cost
  if ((actor as any).health !== undefined) {
    (actor as any).health = newHealth;
  } else if ((actor as any).hp !== undefined) {
    (actor as any).hp = newHealth;
  }

  // Apply coordination bonus to damage boost if applicable
  let finalDamageBoost = damageBoostPercent;
  if (coordinationInfo && (coordinationInfo as any).coordinatedAttack && (coordinationInfo as any).attackBonus && (coordinationInfo as any).attackBonus > 0) {
    finalDamageBoost += (coordinationInfo as any).attackBonus;
  }

  // Apply blood frenzy status effect
  systems.statusEffectSystem.applyEffect(
    actor.id,
    'bloodFrenzy',
    {
      duration: duration,
      damageIncrease: finalDamageBoost,
      healthCost: healthCost,
      source: actor.id,
      sourceName: actor.name,
      suppressMessage: false
    },
    actor.id,
    actor.name,
    log
  );

  // Log the blood frenzy activation
  const frenzyMessage = messages.getAbilityMessage(
    'abilities.special',
    'bloodFrenzyActivated'
  ) || `{playerName} enters a blood frenzy, sacrificing {healthCost} health for increased power!`;
  
  log.push(
    messages.formatMessage(frenzyMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      healthCost: healthCost,
      damageBoost: finalDamageBoost,
    })
  );

  return true;
};

const handleUnstoppableRage: AbilityHandler = (actor, target, ability, log, systems, coordinationInfo = {}) => {
  // Unstoppable Rage: Temporary immunity to status effects with damage boost
  const rageParams = (ability as any).params || {};
  const damageBoostPercent = rageParams.damageBoost || 40; // 40% damage increase
  const duration = rageParams.duration || 2;
  const immunityEffects = rageParams.immunities || ['stunned', 'weakened', 'poison', 'bleed'];

  // Apply coordination bonus to damage boost if applicable
  let finalDamageBoost = damageBoostPercent;
  if (coordinationInfo && (coordinationInfo as any).coordinatedAttack && (coordinationInfo as any).attackBonus) {
    finalDamageBoost += (coordinationInfo as any).attackBonus;
  }

  // Clear existing negative status effects
  let clearedEffects = 0;
  for (const effectType of immunityEffects) {
    // Try to remove the effect (this would need to be implemented in the status effect system)
    // For now, we'll apply the immunity which should prevent new applications
    clearedEffects++;
  }

  // Apply unstoppable rage status effect (immunity + damage boost)
  systems.statusEffectSystem.applyEffect(
    actor.id,
    'unstoppableRage',
    {
      duration: duration,
      damageIncrease: finalDamageBoost,
      immunities: immunityEffects,
      source: actor.id,
      sourceName: actor.name,
      suppressMessage: false
    },
    actor.id,
    actor.name,
    log
  );

  // Log the rage activation
  const rageMessage = messages.getAbilityMessage(
    'abilities.special',
    'unstoppableRageActivated'
  ) || `{playerName} enters an unstoppable rage, becoming immune to debilitating effects!`;
  
  log.push(
    messages.formatMessage(rageMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      damageBoost: finalDamageBoost,
      duration: duration,
    })
  );

  // Log immunity details
  const immunityMessage = messages.getAbilityMessage(
    'abilities.special',
    'unstoppableRageImmunity'
  ) || `{playerName} is now immune to stunning, weakening, and damage over time effects!`;
  
  log.push(
    messages.formatMessage(immunityMessage, {
      playerName: actor.name,
    })
  );

  return true;
};

const handleSpiritGuard: AbilityHandler = (actor, target, ability, log, systems, coordinationInfo = {}) => {
  // Spirit Guard: Provides spiritual protection against attacks and detection
  const guardParams = (ability as any).params || {};
  const duration = guardParams.duration || 3;
  const damageReduction = guardParams.damageReduction || 30; // 30% damage reduction
  const detectionResistance = guardParams.detectionResistance || 50; // 50% chance to resist detection
  const reflectChance = guardParams.reflectChance || 0.15; // 15% chance to reflect damage back

  // Apply coordination bonus if multiple players are using defensive abilities
  let finalDamageReduction = damageReduction;
  if (coordinationInfo && (coordinationInfo as any).coordinatedDefense && (coordinationInfo as any).defenseBonus) {
    finalDamageReduction += (coordinationInfo as any).defenseBonus;
  }

  // Apply spirit guard status effect
  systems.statusEffectSystem.applyEffect(
    actor.id,
    'spiritGuard',
    {
      duration: duration,
      damageReduction: finalDamageReduction,
      detectionResistance: detectionResistance,
      reflectChance: reflectChance,
      source: actor.id,
      sourceName: actor.name,
      suppressMessage: false
    },
    actor.id,
    actor.name,
    log
  );

  // Log the spirit guard activation
  const guardMessage = messages.getAbilityMessage(
    'abilities.special',
    'spiritGuardActivated'
  ) || `{playerName} calls upon spiritual guardians for protection!`;
  
  log.push(
    messages.formatMessage(guardMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      damageReduction: finalDamageReduction,
      duration: duration,
    })
  );

  // Log protection details
  const protectionMessage = messages.getAbilityMessage(
    'abilities.special',
    'spiritGuardProtection'
  ) || `Spiritual energy surrounds {playerName}, reducing incoming damage and providing mystical protection!`;
  
  log.push(
    messages.formatMessage(protectionMessage, {
      playerName: actor.name,
    })
  );

  return true;
};

const handleSanctuaryOfTruth: AbilityHandler = (actor, target, ability, log, systems, coordinationInfo = {}) => {
  // Sanctuary of Truth: Area ability that detects warlocks and provides protection to good players
  const sanctuaryParams = (ability as any).params || {};
  const duration = sanctuaryParams.duration || 4;
  const detectionRange = sanctuaryParams.detectionRange || 5; // Number of players to potentially detect
  const protectionBonus = sanctuaryParams.protectionBonus || 20; // 20% damage reduction for good players
  const detectionChance = sanctuaryParams.detectionChance || 0.6; // 60% chance to detect each warlock

  // Get all alive players
  const alivePlayers = Array.from(systems.players.values()).filter(
    (p: any) => p.isAlive && p.id !== actor.id
  ) as Player[];

  let detectedWarlocks = 0;
  let protectedGoodPlayers = 0;

  // Detection phase - scan for warlocks
  const potentialTargets = alivePlayers.slice(0, detectionRange);
  for (const player of potentialTargets) {
    if ((player as any).isWarlock && Math.random() < detectionChance) {
      // Mark warlock as detected
      if (systems.warlockSystem.markWarlockDetected) {
        systems.warlockSystem.markWarlockDetected(player.id, log);
      }
      detectedWarlocks++;

      // Log detection
      const detectionMessage = messages.getAbilityMessage(
        'abilities.special',
        'sanctuaryDetection'
      ) || `The sanctuary reveals {targetName} as an agent of evil!`;
      
      log.push({
        type: 'detection_result',
        public: true,
        attackerId: actor.id,
        targetId: player.id,
        message: messages.formatMessage(detectionMessage, {
          targetName: player.name,
        }),
        privateMessage: '',
        attackerMessage: '',
      });
    }
  }

  // Protection phase - apply sanctuary effect to good players (including caster)
  const goodPlayers = [actor, ...alivePlayers.filter((p: Player) => !(p as any).isWarlock)];
  
  for (const goodPlayer of goodPlayers) {
    systems.statusEffectSystem.applyEffect(
      goodPlayer.id,
      'sanctuary',
      {
        duration: duration,
        damageReduction: protectionBonus,
        source: actor.id,
        sourceName: actor.name,
        suppressMessage: false
      },
      actor.id,
      actor.name,
      log
    );
    protectedGoodPlayers++;
  }

  // Log the sanctuary creation
  const sanctuaryMessage = messages.getAbilityMessage(
    'abilities.special',
    'sanctuaryOfTruthActivated'
  ) || `{playerName} establishes a Sanctuary of Truth, revealing hidden evil and protecting the righteous!`;
  
  log.push(
    messages.formatMessage(sanctuaryMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      duration: duration,
    })
  );

  // Log results summary
  if (detectedWarlocks > 0) {
    const detectionSummary = messages.getAbilityMessage(
      'abilities.special',
      'sanctuaryDetectionSummary'
    ) || `The sanctuary's divine light reveals {count} agents of evil!`;
    
    log.push(
      messages.formatMessage(detectionSummary, {
        count: detectedWarlocks,
      })
    );
  }

  if (protectedGoodPlayers > 0) {
    const protectionSummary = messages.getAbilityMessage(
      'abilities.special',
      'sanctuaryProtectionSummary'
    ) || `{count} righteous souls receive the sanctuary's protection!`;
    
    log.push(
      messages.formatMessage(protectionSummary, {
        count: protectedGoodPlayers,
      })
    );
  }

  return true;
};

const handleRelentlessFury: AbilityHandler = (actor, target, ability, log, systems, coordinationInfo = {}) => {
  // Relentless Fury: Barbarian passive that increases damage and attack speed as health decreases
  const furyParams = (ability as any).params || {};
  const duration = furyParams.duration || 5;
  const maxDamageBonus = furyParams.maxDamageBonus || 60; // 60% max damage increase at low health
  const healthThreshold = furyParams.healthThreshold || 0.5; // Activates below 50% health
  const attackSpeedBonus = furyParams.attackSpeedBonus || 25; // 25% faster actions

  // Get current health percentage
  const currentHealth = (actor as any).health || (actor as any).hp || 100;
  const maxHealth = (actor as any).maxHealth || (actor as any).maxHp || 100;
  const healthPercent = currentHealth / maxHealth;

  // Check if fury should activate
  if (healthPercent > healthThreshold) {
    const furyNotActiveMessage = messages.getAbilityMessage(
      'abilities.special',
      'relentlessFuryNotActive'
    ) || `{playerName} is not wounded enough to enter a relentless fury!`;
    
    log.push(
      messages.formatMessage(furyNotActiveMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  // Calculate fury intensity based on missing health
  const missingHealthPercent = 1 - healthPercent;
  const furyIntensity = Math.min(1, missingHealthPercent / (1 - healthThreshold));
  const actualDamageBonus = Math.floor(maxDamageBonus * furyIntensity);

  // Apply coordination bonus if applicable
  let finalDamageBonus = actualDamageBonus;
  if (coordinationInfo && (coordinationInfo as any).coordinatedAttack && (coordinationInfo as any).attackBonus) {
    finalDamageBonus += (coordinationInfo as any).attackBonus;
  }

  // Apply relentless fury status effect
  systems.statusEffectSystem.applyEffect(
    actor.id,
    'relentlessFury',
    {
      duration: duration,
      damageIncrease: finalDamageBonus,
      attackSpeedBonus: attackSpeedBonus,
      furyIntensity: furyIntensity,
      source: actor.id,
      sourceName: actor.name,
      suppressMessage: false
    },
    actor.id,
    actor.name,
    log
  );

  // Log the fury activation
  const furyMessage = messages.getAbilityMessage(
    'abilities.special',
    'relentlessFuryActivated'
  ) || `{playerName}'s wounds fuel their rage, entering a relentless fury!`;
  
  log.push(
    messages.formatMessage(furyMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      damageBonus: finalDamageBonus,
      attackSpeedBonus: attackSpeedBonus,
    })
  );

  // Log intensity details
  const intensityMessage = messages.getAbilityMessage(
    'abilities.special',
    'relentlessFuryIntensity'
  ) || `The closer to death, the more ferocious {playerName} becomes!`;
  
  log.push(
    messages.formatMessage(intensityMessage, {
      playerName: actor.name,
      intensity: Math.floor(furyIntensity * 100),
    })
  );

  return true;
};

const handleThirstyBlade: AbilityHandler = (actor, target, ability, log, systems, coordinationInfo = {}) => {
  // Thirsty Blade: Weapon enhancement that grants lifesteal and bonus damage
  const bladeParams = (ability as any).params || {};
  const duration = bladeParams.duration || 4;
  const lifestealPercent = bladeParams.lifesteal || 0.3; // 30% of damage dealt heals the wielder
  const damageBonus = bladeParams.damageBonus || 20; // 20% bonus damage
  const criticalChance = bladeParams.criticalChance || 0.15; // 15% chance for critical hits

  // Apply coordination bonus if multiple players are coordinating attacks
  let finalDamageBonus = damageBonus;
  if (coordinationInfo && (coordinationInfo as any).coordinatedAttack && (coordinationInfo as any).attackBonus) {
    finalDamageBonus += (coordinationInfo as any).attackBonus;
  }

  // Apply thirsty blade enhancement status effect
  systems.statusEffectSystem.applyEffect(
    actor.id,
    'thirstyBlade',
    {
      duration: duration,
      lifesteal: lifestealPercent,
      damageIncrease: finalDamageBonus,
      criticalChance: criticalChance,
      source: actor.id,
      sourceName: actor.name,
      suppressMessage: false
    },
    actor.id,
    actor.name,
    log
  );

  // Log the blade enhancement
  const bladeMessage = messages.getAbilityMessage(
    'abilities.special',
    'thirstyBladeActivated'
  ) || `{playerName}'s weapon thirsts for blood, becoming enhanced with dark power!`;
  
  log.push(
    messages.formatMessage(bladeMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      damageBonus: finalDamageBonus,
      lifesteal: Math.floor(lifestealPercent * 100),
    })
  );

  // Log enhancement details
  const enhancementMessage = messages.getAbilityMessage(
    'abilities.special',
    'thirstyBladeEnhancement'
  ) || `The blade glows with malevolent energy, promising to heal its wielder with each strike!`;
  
  log.push(
    messages.formatMessage(enhancementMessage, {
      playerName: actor.name,
      criticalChance: Math.floor(criticalChance * 100),
    })
  );

  return true;
};

const handleSweepingStrike: AbilityHandler = (actor, target, ability, log, systems, coordinationInfo = {}) => {
  // Sweeping Strike: Area attack that hits multiple enemies with reduced damage
  const strikeParams = (ability as any).params || {};
  const maxTargets = strikeParams.maxTargets || 3; // Hit up to 3 enemies
  const damageReduction = strikeParams.damageReduction || 0.75; // 75% of normal damage per target
  const stunChance = strikeParams.stunChance || 0.2; // 20% chance to stun each target
  const weaponDamage = strikeParams.baseDamage || 30; // Base weapon damage

  // Get all alive enemy players
  const alivePlayers = Array.from(systems.players.values()).filter(
    (p: any) => p.isAlive && p.id !== actor.id
  ) as Player[];

  const enemies = alivePlayers.filter((p: Player) => (p as any).isWarlock !== (actor as any).isWarlock);
  
  if (enemies.length === 0) {
    const noTargetsMessage = messages.getAbilityMessage(
      'abilities.special',
      'sweepingStrikeNoTargets'
    ) || `{playerName} finds no enemies within range for a sweeping strike!`;
    
    log.push(
      messages.formatMessage(noTargetsMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  // Select targets (up to maxTargets)
  const targets = enemies.slice(0, maxTargets);
  let totalDamage = 0;
  let stunnedTargets = 0;

  // Apply coordination bonus to damage if applicable
  let finalDamageModifier = damageReduction;
  if (coordinationInfo && (coordinationInfo as any).coordinatedAttack && (coordinationInfo as any).attackBonus) {
    const bonusMultiplier = 1 + ((coordinationInfo as any).attackBonus / 100);
    finalDamageModifier *= bonusMultiplier;
  }

  // Log the sweeping strike initiation
  const strikeMessage = messages.getAbilityMessage(
    'abilities.special',
    'sweepingStrikeUsed'
  ) || `{playerName} unleashes a sweeping strike, targeting {targetCount} enemies!`;
  
  log.push(
    messages.formatMessage(strikeMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      targetCount: targets.length,
    })
  );

  // Process each target
  for (const enemyTarget of targets) {
    const damage = Math.floor(weaponDamage * finalDamageModifier);
    totalDamage += damage;

    // Apply damage (simplified - in real implementation this would go through damage system)
    if ((enemyTarget as any).health !== undefined) {
      (enemyTarget as any).health = Math.max(0, (enemyTarget as any).health - damage);
    } else if ((enemyTarget as any).hp !== undefined) {
      (enemyTarget as any).hp = Math.max(0, (enemyTarget as any).hp - damage);
    }

    // Log individual hit
    const hitMessage = messages.getAbilityMessage(
      'abilities.special',
      'sweepingStrikeHit'
    ) || `{targetName} is struck for {damage} damage!`;
    
    log.push(
      messages.formatMessage(hitMessage, {
        targetName: enemyTarget.name,
        damage: damage,
      })
    );

    // Check for stun
    if (Math.random() < stunChance) {
      systems.statusEffectSystem.applyEffect(
        enemyTarget.id,
        'stunned',
        {
          duration: 1,
          source: actor.id,
          sourceName: actor.name,
          suppressMessage: false
        },
        actor.id,
        actor.name,
        log
      );
      stunnedTargets++;
    }
  }

  // Log summary
  const summaryMessage = messages.getAbilityMessage(
    'abilities.special',
    'sweepingStrikeSummary'
  ) || `Sweeping strike complete! {totalDamage} total damage dealt to {targetCount} enemies.`;
  
  log.push(
    messages.formatMessage(summaryMessage, {
      totalDamage: totalDamage,
      targetCount: targets.length,
    })
  );

  if (stunnedTargets > 0) {
    const stunMessage = messages.getAbilityMessage(
      'abilities.special',
      'sweepingStrikeStunned'
    ) || `{stunnedCount} enemies are left reeling from the devastating blow!`;
    
    log.push(
      messages.formatMessage(stunMessage, {
        stunnedCount: stunnedTargets,
      })
    );
  }

  return true;
};
