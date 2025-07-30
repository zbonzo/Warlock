/**
 * @fileoverview Defense-related ability handlers
 * Contains protective and defensive class abilities
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
  players: Map<string, Player>;
}

/**
 * Register all defense ability handlers with the registry
 * @param registry - Ability registry to register with
 */
export function register(registry: AbilityRegistry): void {
  // Base protection ability handlers
  registry.registerClassAbility('shieldWall', handleShieldWall);
  registry.registerClassAbility('shadowVeil', handleInvisibility);

  // Register all 'Defense' category abilities to use appropriate handlers based on effect
  registerAbilitiesByCriteria(
    registry,
    { category: 'Defense', effect: 'shielded' },
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'shieldWall',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    }
  );

  registerAbilitiesByCriteria(
    registry,
    { category: 'Defense', effect: 'invisible' },
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'shadowVeil',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
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
 * @param actor - Actor using the ability
 * @param target - Target of the protection
 * @param ability - Ability configuration
 * @param log - Event log to append messages to
 * @param systems - Game systems
 * @param coordinationInfo - Coordination bonus information
 * @returns Whether the ability was successful
 */
const handleShieldWall: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  const playerTarget = target as Player;
  
  let armor = ability.params?.armor || 2;
  const turns = ability.params?.duration || 1;

  // Apply coordination bonus for defense
  if (coordinationInfo.coordinatedDefense && coordinationInfo.defenseBonus && coordinationInfo.defenseBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.defenseBonus / 100;
    armor = Math.floor(armor * coordinationMultiplier);

    // Log coordination bonus application to defender
    const coordinationPrivateLog: LogEntry = {
      type: 'coordination_defense_applied',
      public: false,
      attackerId: actor.id,
      message: '',
      privateMessage: `Coordination bonus increases your shield armor by ${coordinationInfo.defenseBonus}% (${ability.params?.armor || 2} → ${armor})!`,
      attackerMessage: '',
    };
    log.push(coordinationPrivateLog);
  }

  systems.statusEffectSystem.applyEffect(
    playerTarget.id,
    'shielded',
    {
      armor: armor,
      turns: turns,
    },
    actor.id,
    actor.name,
    log
  );

  // Use message from config if available
  const protectionMessage = messages.getAbilityMessage(
    'abilities.defense',
    'shieldApplied'
  );
  log.push(
    messages.formatMessage(protectionMessage, {
      playerName: playerTarget.name,
      armor: armor,
      turns: turns,
    })
  );
  
  return true;
};

/**
 * Handler for invisibility abilities
 * @param actor - Actor using the ability
 * @param target - Target to make invisible
 * @param ability - Ability configuration
 * @param log - Event log to append messages to
 * @param systems - Game systems
 * @param coordinationInfo - Coordination bonus information
 * @returns Whether the ability was successful
 */
const handleInvisibility: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  const playerTarget = target as Player;
  
  let turns = ability.params?.duration || 1;

  // Apply coordination bonus for utility (invisibility duration)
  if (coordinationInfo.coordinatedUtility && coordinationInfo.utilityBonus && coordinationInfo.utilityBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.utilityBonus / 100;
    turns = Math.floor(turns * coordinationMultiplier);

    // Log coordination bonus application
    const coordinationPrivateLog: LogEntry = {
      type: 'coordination_utility_applied',
      public: false,
      attackerId: actor.id,
      message: '',
      privateMessage: `Coordination bonus increases your invisibility duration by ${coordinationInfo.utilityBonus}% (${ability.params?.duration || 1} → ${turns} turns)!`,
      attackerMessage: '',
    };
    log.push(coordinationPrivateLog);
  }

  systems.statusEffectSystem.applyEffect(
    playerTarget.id,
    'invisible',
    {
      turns: turns,
    },
    actor.id,
    actor.name,
    log
  );

  // Use message from config if available
  const invisibilityMessage = messages.getAbilityMessage(
    'abilities.defense',
    'invisibilityApplied'
  );
  log.push(
    messages.formatMessage(invisibilityMessage, {
      playerName: playerTarget.name,
      turns: turns,
    })
  );

  return true;
};

/**
 * Handler for shadowstep ability (Alchemist specialty)
 * @param actor - Actor using the ability
 * @param target - Target to make invisible
 * @param ability - Ability configuration
 * @param log - Event log to append messages to
 * @param systems - Game systems
 * @param coordinationInfo - Coordination bonus information
 * @returns Whether the ability was successful
 */
const handleShadowstep: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  if (!target || target === config.MONSTER_ID) {
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

  const playerTarget = target as Player;
  let turns = ability.params?.duration || 1;

  // Apply coordination bonus for utility (shadowstep duration)
  if (coordinationInfo.coordinatedUtility && coordinationInfo.utilityBonus && coordinationInfo.utilityBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.utilityBonus / 100;
    turns = Math.floor(turns * coordinationMultiplier);
  }

  systems.statusEffectSystem.applyEffect(
    playerTarget.id,
    'invisible',
    {
      turns: turns,
    },
    actor.id,
    actor.name,
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
      targetName: playerTarget.name,
      turns: turns,
    })
  );

  return true;
};

/**
 * Handler for multi-target protection abilities
 * @param actor - Actor using the ability
 * @param target - Initial target (ignored for multi-target)
 * @param ability - Ability configuration
 * @param log - Event log to append messages to
 * @param systems - Game systems
 * @param coordinationInfo - Coordination bonus information
 * @returns Whether the ability was successful
 */
const handleMultiProtection: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  // Get all alive players (multi-protection typically affects everyone including the caster)
  const targets = Array.from(systems.players.values()).filter((p: Player) => p.isAlive);

  if (targets.length === 0) {
    const noTargetsMessage = messages.getAbilityMessage(
      'abilities.defense',
      'multiProtectionNoTargets'
    );
    log.push(
      messages.formatMessage(noTargetsMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  // Get protection parameters from ability config
  let armor = ability.params?.armor || 2;
  let turns = ability.params?.duration || 1;
  const effectType = ability.effect || 'shielded'; // Default to shielded

  // Apply coordination bonuses
  if (coordinationInfo.coordinatedDefense && coordinationInfo.defenseBonus && coordinationInfo.defenseBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.defenseBonus / 100;
    armor = Math.floor(armor * coordinationMultiplier);
  }

  if (coordinationInfo.coordinatedUtility && coordinationInfo.utilityBonus && coordinationInfo.utilityBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.utilityBonus / 100;
    turns = Math.floor(turns * coordinationMultiplier);
  }

  // Announce the multi-protection
  const announceMessage = messages.getAbilityMessage(
    'abilities.defense',
    'multiProtectionAnnounce'
  );
  log.push(
    messages.formatMessage(announceMessage, {
      playerName: actor.name,
      abilityName: ability.name,
    })
  );

  let targetsProtected = 0;

  for (const potentialTarget of targets) {
    // Apply the protection effect
    const effectData: Record<string, any> = {
      turns: turns,
    };

    // Add armor value for shielded effects
    if (effectType === 'shielded') {
      effectData.armor = armor;
    }

    systems.statusEffectSystem.applyEffect(
      potentialTarget.id,
      effectType,
      effectData,
      actor.id,
      actor.name,
      log
    );

    const individualProtectionMessage = messages.getAbilityMessage(
      'abilities.defense',
      'multiProtectionIndividual'
    );
    log.push(
      messages.formatMessage(individualProtectionMessage, {
        targetName: potentialTarget.name,
        effectType: effectType,
        turns: turns,
        armor: effectType === 'shielded' ? armor : undefined,
      })
    );

    targetsProtected++;
  }

  // Summary message
  if (targetsProtected > 0) {
    const summaryMessage = messages.getAbilityMessage(
      'abilities.defense',
      'multiProtectionSummary'
    );
    log.push(
      messages.formatMessage(summaryMessage, {
        count: targetsProtected,
        effectType: effectType,
      })
    );

    // Apply threat for multi-protection (considered utility/support)
    applyThreatForAbility(actor, '__multi__', ability, 0, 0, systems);
  }

  return targetsProtected > 0;
};
