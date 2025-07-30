/**
 * @fileoverview Racial ability handlers
 * Contains race-specific ability implementations
 * Migrated to TypeScript for Phase 6
 */

import type { Player, Monster, Ability } from '../../../types/generated';
import type {
  AbilityRegistry,
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from './abilityRegistryUtils';

const config = require('@config');
const messages = require('@messages');

/**
 * Game systems interface (temporary until full migration)
 */
interface GameSystems {
  // Currently racial abilities don't need complex system interactions
  // This may expand as we add more complex racial abilities
}

/**
 * Extended player interface for racial effects
 */
interface PlayerWithRacialEffects extends Player {
  usingAdaptability?: boolean;
  racialEffects?: {
    bloodRageMultiplier?: number;
    undyingActive?: boolean;
    [key: string]: any;
  };
}

/**
 * Register all racial ability handlers with the registry
 * @param registry - Ability registry to register with
 */
export function register(registry: AbilityRegistry): void {
  // Register racial abilities
  // Note: These use registerRacialAbility instead of registerClassAbility
  if (registry.registerRacialAbility) {
    registry.registerRacialAbility('adaptability', handleAdaptability);
    registry.registerRacialAbility('bloodRage', handleBloodRage);
    registry.registerRacialAbility('undying', handleUndying);
  } else {
    // Fallback to class abilities if racial abilities aren't supported
    registry.registerClassAbility('adaptability', handleAdaptability);
    registry.registerClassAbility('bloodRage', handleBloodRage);
    registry.registerClassAbility('undying', handleUndying);
  }
  
  // Note: Stone Armor is passive and handled in combat system
}

/**
 * Handler for Artisan Adaptability racial ability
 * @param actor - Actor using the ability
 * @param target - Target of the ability (unused for adaptability)
 * @param ability - Ability configuration
 * @param log - Event log to append messages to
 * @param systems - Game systems
 * @param coordinationInfo - Coordination bonus information (not applicable for racial abilities)
 * @returns Whether the ability was successful
 */
const handleAdaptability: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  const playerWithRacial = actor as PlayerWithRacialEffects;
  
  // Mark that adaptability is being used
  playerWithRacial.usingAdaptability = true;

  const adaptabilityMessage = messages.getAbilityMessage(
    'abilities.racial',
    'adaptabilityUsed'
  );
  log.push(
    messages.formatMessage(adaptabilityMessage, {
      playerName: actor.name,
    })
  );

  // Add private message asking player to choose ability to replace
  const privateAdaptabilityLog: LogEntry = {
    type: 'adaptability_choose',
    public: false,
    targetId: actor.id,
    attackerId: actor.id,
    message: '',
    privateMessage: messages.getAbilityMessage(
      'abilities.racial',
      'adaptabilityAvailableAbilities'
    ),
    attackerMessage: '',
  };
  log.push(privateAdaptabilityLog);

  return true;
};

/**
 * Handler for Orc Blood Rage racial ability
 * @param actor - Actor using the ability
 * @param target - Target of the ability (unused for blood rage)
 * @param ability - Ability configuration
 * @param log - Event log to append messages to
 * @param systems - Game systems
 * @param coordinationInfo - Coordination bonus information (not applicable for racial abilities)
 * @returns Whether the ability was successful
 */
const handleBloodRage: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  const playerWithRacial = actor as PlayerWithRacialEffects;
  
  const selfDamage = ability.params?.selfDamage || 3;
  const damageMultiplier = ability.params?.damageMultiplier || 2.0;

  // Apply self-damage
  const oldHp = actor.hp;
  actor.hp = Math.max(1, actor.hp - selfDamage); // Cannot reduce below 1 HP
  const actualSelfDamage = oldHp - actor.hp;

  // Set up blood rage effect for next attack
  if (!playerWithRacial.racialEffects) {
    playerWithRacial.racialEffects = {};
  }
  playerWithRacial.racialEffects.bloodRageMultiplier = damageMultiplier;

  const bloodRageMessage = messages.getAbilityMessage(
    'abilities.racial',
    'bloodRageUsed'
  );
  log.push(
    messages.formatMessage(bloodRageMessage, {
      playerName: actor.name,
      damage: actualSelfDamage,
    })
  );

  return true;
};

/**
 * Handler for Lich Undying racial ability
 * @param actor - Actor using the ability
 * @param target - Target of the ability (unused)
 * @param ability - Ability configuration
 * @param log - Event log to append messages to
 * @param systems - Game systems
 * @param coordinationInfo - Coordination bonus information (not applicable for racial abilities)
 * @returns Whether the ability was successful
 */
const handleUndying: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  const playerWithRacial = actor as PlayerWithRacialEffects;
  
  // Check if undying is already active
  if (!playerWithRacial.racialEffects) {
    playerWithRacial.racialEffects = {};
  }

  if (playerWithRacial.racialEffects.undyingActive) {
    const alreadyActiveMessage = messages.getAbilityMessage(
      'abilities.racial',
      'undyingAlreadyActive'
    );
    log.push(
      messages.formatMessage(alreadyActiveMessage, {
        playerName: actor.name,
      })
    );
    return false;
  }

  // Activate undying ability
  playerWithRacial.racialEffects.undyingActive = true;

  const undyingMessage = messages.getAbilityMessage(
    'abilities.racial',
    'undyingActivated'
  );
  log.push(
    messages.formatMessage(undyingMessage, {
      playerName: actor.name,
    })
  );

  return true;
};
