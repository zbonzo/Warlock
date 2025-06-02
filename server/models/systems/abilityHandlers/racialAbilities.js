/**
 * @fileoverview Racial ability handlers
 * Contains race-specific ability implementations
 */
const config = require('@config');
const messages = require('@messages');

/**
 * Register all racial ability handlers with the registry
 * @param {AbilityRegistry} registry - Ability registry to register with
 */
function register(registry) {
  // Register racial abilities
  registry.registerRacialAbility('adaptability', handleAdaptability);
  registry.registerRacialAbility('bloodRage', handleBloodRage);
  registry.registerRacialAbility('undying', handleUndying);
  // Note: Stone Armor is passive and handled in combat system
}

/**
 * Handler for Artisan Adaptability racial ability
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability (unused for adaptability)
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleAdaptability(actor, target, ability, log, systems) {
  // Mark that adaptability is being used
  actor.usingAdaptability = true;

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
  const privateAdaptabilityLog = {
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
}

/**
 * Handler for Orc Blood Rage racial ability
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability (unused for blood rage)
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleBloodRage(actor, target, ability, log, systems) {
  const selfDamage = ability.params?.selfDamage || 3;
  const damageMultiplier = ability.params?.damageMultiplier || 2.0;

  // Apply self-damage
  const oldHp = actor.hp;
  actor.hp = Math.max(1, actor.hp - selfDamage); // Cannot reduce below 1 HP
  const actualSelfDamage = oldHp - actor.hp;

  // Set up blood rage effect for next attack
  if (!actor.racialEffects) {
    actor.racialEffects = {};
  }
  actor.racialEffects.bloodRageMultiplier = damageMultiplier;

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
}

/**
 * Handler for Lich Undying racial ability
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability (unused)
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleUndying(actor, target, ability, log, systems) {
  // Check if undying is already active
  if (!actor.racialEffects) {
    actor.racialEffects = {};
  }

  if (actor.racialEffects.undyingActive) {
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
  actor.racialEffects.undyingActive = true;

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
}

module.exports = { register };

