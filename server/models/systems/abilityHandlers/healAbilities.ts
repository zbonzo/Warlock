/**
 * @fileoverview Healing ability handlers with anti-detection mechanics
 * Healing now always appears to work on warlocks but with a small detection chance
 * Migrated to TypeScript for Phase 6
 */

import type { Player, Monster, Ability } from '../../../types/generated';
import type {
  AbilityRegistry,
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from './abilityRegistryUtils';
import {
  registerAbilitiesByCategory,
  registerAbilitiesByEffectAndTarget,
  registerAbilitiesByCriteria,
  applyThreatForAbility,
} from './abilityRegistryUtils';

const config = require('@config');
const messages = require('@messages');

/**
 * Game systems interface (temporary until full migration)
 */
interface GameSystems {
  gameStateUtils: {
    getAlivePlayers(): Player[];
  };
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
  warlockSystem: {
    markWarlockDetected?(warlockId: string, log: LogEntry[]): void;
  };
  players: Map<string, Player>;
}

/**
 * Register all healing ability handlers with the registry
 * @param registry - Ability registry to register with
 */
export function register(registry: AbilityRegistry): void {
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
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'heal',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    }
  );

  // Register all 'Heal' category abilities with Single target to use the heal handler
  registerAbilitiesByCriteria(
    registry,
    { category: 'Heal', target: 'Single' },
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'heal',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    }
  );

  // Register the rejuvenation as heal over time
  registry.registerClassAbility('rejuvenation', handleRejuvenationHoT);

  // Register other multi-target healing abilities to use the multi-heal handler
  registerAbilitiesByCriteria(
    registry,
    { category: 'Heal', target: 'Multi' },
    (actor, target, ability, log, systems, coordinationInfo) => {
      // Skip rejuvenation since it has its own handler now
      if (ability.type !== 'rejuvenation') {
        return handleMultiHeal(actor, target, ability, log, systems, coordinationInfo);
      }
      return false;
    }
  );
}

/**
 * Handler for generic healing abilities - now with anti-detection mechanics
 * Healing always appears to work but has small detection chance when warlock actually healed
 * @param actor - Actor using the ability
 * @param target - Target of the healing
 * @param ability - Ability configuration
 * @param log - Event log to append messages to
 * @param systems - Game systems
 * @param coordinationInfo - Coordination bonus information
 * @returns Whether the ability was successful
 */
const handleHeal: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  // Use ability.params.amount from classes.js configuration
  let healAmount = Number(ability.params?.amount) || 0;

  // Use proper healing scaling
  const healingModifier = actor.getHealingModifier
    ? actor.getHealingModifier()
    : 1.0;
  healAmount = Math.floor(healAmount * healingModifier);

  // Apply coordination bonus for healing
  if (coordinationInfo.coordinatedHealing && coordinationInfo.healingBonus && coordinationInfo.healingBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.healingBonus / 100;
    healAmount = Math.floor(healAmount * coordinationMultiplier);

    // Log coordination bonus application to healer
    const coordinationPrivateLog: LogEntry = {
      type: 'coordination_healing_applied',
      public: false,
      attackerId: actor.id,
      message: '',
      privateMessage: `Coordination bonus increases your healing by ${coordinationInfo.healingBonus}% (${Math.floor(ability.params?.amount || 0)} → ${healAmount})!`,
      attackerMessage: '',
    };
    log.push(coordinationPrivateLog);
  }

  const playerTarget = target as Player;
  let actualHeal = 0;
  let detectionOccurred = false;

  // Check if anti-detection system is enabled
  const antiDetectionEnabled =
    config.gameBalance?.player?.healing?.antiDetection?.enabled || false;
  const alwaysHealWarlocks =
    config.gameBalance?.player?.healing?.antiDetection?.alwaysHealWarlocks ||
    false;

  // Calculate healing needed - available throughout function
  const healingNeeded = playerTarget.maxHp - playerTarget.hp;

  if (antiDetectionEnabled && alwaysHealWarlocks) {
    // NEW SYSTEM: Always heal the target, regardless of warlock status
    actualHeal = Math.min(healAmount, healingNeeded);

    if (actualHeal > 0) {
      playerTarget.hp += actualHeal;

      // Trophy system: Track healing done by actor
      if (actor.addHealingDone) {
        actor.addHealingDone(actualHeal);
        // Track self-heals separately
        if (actor.id === playerTarget.id && actor.addSelfHeal) {
          actor.addSelfHeal(actualHeal);
        }
      }

      // NEW: Detection chance only if target is warlock AND actually received healing
      if (playerTarget.isWarlock && actualHeal > 0) {
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
            systems.warlockSystem.markWarlockDetected(playerTarget.id, log);
          }

          // Add detection message to log
          const detectionLog: LogEntry = {
            type: 'healing_detection',
            public: true,
            targetId: playerTarget.id,
            attackerId: actor.id,
            message: `${actor.name}'s healing reveals that ${playerTarget.name} IS a Warlock!`,
            privateMessage: `Your healing detected that ${playerTarget.name} is a Warlock!`,
            attackerMessage: `Your healing revealed that ${playerTarget.name} is corrupted!`,
          };
          log.push(detectionLog);
        }
      }
    }
  } else {
    // OLD SYSTEM: Check if target is warlock first
    if (playerTarget.isWarlock) {
      // Healing fails on warlocks in old system
      const failMessage = messages.getAbilityMessage(
        'abilities.heals',
        'healFailWarlock'
      );
      log.push(
        messages.formatMessage(failMessage, {
          healerName: actor.name,
          targetName: playerTarget.name,
        })
      );
      return false;
    } else {
      // Normal healing for non-warlocks
      actualHeal = Math.min(healAmount, healingNeeded);
      if (actualHeal > 0) {
        playerTarget.hp += actualHeal;

        // Trophy system: Track healing done
        if (actor.addHealingDone) {
          actor.addHealingDone(actualHeal);
          if (actor.id === playerTarget.id && actor.addSelfHeal) {
            actor.addSelfHeal(actualHeal);
          }
        }
      }
    }
  }

  // Add healing message to log (always shown, regardless of warlock status in new system)
  if (actualHeal > 0 || (antiDetectionEnabled && alwaysHealWarlocks)) {
    const healMessage = messages.getAbilityMessage(
      'abilities.heals',
      'healSuccess'
    );
    log.push(
      messages.formatMessage(healMessage, {
        healerName: actor.name,
        targetName: playerTarget.name,
        amount: actualHeal,
      })
    );

    // Apply threat for healing
    applyThreatForAbility(actor, target, ability, 0, actualHeal, systems);
  }

  return actualHeal > 0 || detectionOccurred;
};

/**
 * Handler for rejuvenation heal-over-time ability
 * @param actor - Actor using the ability
 * @param target - Target of the ability
 * @param ability - Ability configuration
 * @param log - Event log to append messages to
 * @param systems - Game systems
 * @param coordinationInfo - Coordination bonus information
 * @returns Whether the ability was successful
 */
const handleRejuvenationHoT: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  const playerTarget = target as Player;
  
  // Get rejuvenation parameters
  const rejuvData = ability.params?.rejuvenation || ability.params?.heal || {};
  let healPerTurn = rejuvData.healPerTurn || rejuvData.amount || 5;
  const turns = rejuvData.turns || 3;

  // Apply actor's healing modifier
  const healingModifier = actor.getHealingModifier
    ? actor.getHealingModifier()
    : 1.0;
  healPerTurn = Math.floor(healPerTurn * healingModifier);

  // Apply coordination bonus for healing over time
  if (coordinationInfo.coordinatedHealing && coordinationInfo.healingBonus && coordinationInfo.healingBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.healingBonus / 100;
    healPerTurn = Math.floor(healPerTurn * coordinationMultiplier);
  }

  // Apply rejuvenation effect using status effect system
  systems.statusEffectSystem.applyEffect(
    playerTarget.id,
    'rejuvenation',
    {
      turns: turns,
      healPerTurn: healPerTurn,
    },
    actor.id,
    actor.name,
    log
  );

  const rejuvMessage = messages.getAbilityMessage(
    'abilities.heals',
    'rejuvenationApplied'
  );
  log.push(
    messages.formatMessage(rejuvMessage, {
      healerName: actor.name,
      targetName: playerTarget.name,
      healPerTurn: healPerTurn,
      turns: turns,
    })
  );

  return true;
};

/**
 * Handler for multi-target healing abilities
 * @param actor - Actor using the ability
 * @param target - Target of the ability (ignored for multi-heal)
 * @param ability - Ability configuration
 * @param log - Event log to append messages to
 * @param systems - Game systems
 * @param coordinationInfo - Coordination bonus information
 * @returns Whether the ability was successful
 */
function handleMultiHeal(
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean {
  // Get all alive players as potential targets
  const targets = Array.from(systems.players.values()).filter(
    (p: Player) => p.isAlive
  );

  if (targets.length === 0) {
    const noTargetsMessage = messages.getAbilityMessage(
      'abilities.heals',
      'multiHealNoTargets'
    );
    log.push(
      messages.formatMessage(noTargetsMessage, {
        healerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  let healAmount = Number(ability.params?.amount) || 0;
  const healingModifier = actor.getHealingModifier
    ? actor.getHealingModifier()
    : 1.0;
  healAmount = Math.floor(healAmount * healingModifier);

  // Apply coordination bonus for multi-healing
  if (coordinationInfo.coordinatedHealing && coordinationInfo.healingBonus && coordinationInfo.healingBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.healingBonus / 100;
    healAmount = Math.floor(healAmount * coordinationMultiplier);
  }

  // Announce the multi-heal
  const announceMessage = messages.getAbilityMessage(
    'abilities.heals',
    'multiHealAnnounce'
  );
  log.push(
    messages.formatMessage(announceMessage, {
      healerName: actor.name,
      abilityName: ability.name,
    })
  );

  let totalHealingDone = 0;
  let targetsHealed = 0;

  for (const potentialTarget of targets) {
    const healingNeeded = potentialTarget.maxHp - potentialTarget.hp;
    const actualHeal = Math.min(healAmount, healingNeeded);

    if (actualHeal > 0) {
      potentialTarget.hp += actualHeal;
      totalHealingDone += actualHeal;
      targetsHealed++;

      // Trophy system: Track healing done
      if (actor.addHealingDone) {
        actor.addHealingDone(actualHeal);
        if (actor.id === potentialTarget.id && actor.addSelfHeal) {
          actor.addSelfHeal(actualHeal);
        }
      }

      const individualHealMessage = messages.getAbilityMessage(
        'abilities.heals',
        'multiHealIndividual'
      );
      log.push(
        messages.formatMessage(individualHealMessage, {
          targetName: potentialTarget.name,
          amount: actualHeal,
        })
      );
    }
  }

  // Summary message
  if (targetsHealed > 0) {
    const summaryMessage = messages.getAbilityMessage(
      'abilities.heals',
      'multiHealSummary'
    );
    log.push(
      messages.formatMessage(summaryMessage, {
        count: targetsHealed,
        totalHealing: totalHealingDone,
      })
    );

    // Apply threat for total healing done
    applyThreatForAbility(actor, '__multi__', ability, 0, totalHealingDone, systems);
  }

  return targetsHealed > 0;
}
