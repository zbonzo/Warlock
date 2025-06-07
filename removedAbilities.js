/*
 * This file is to store removed abilities
 * that are no longer available in the game.
 */

/**
 * Handler for Elf Keen Senses racial ability (currently commented out)
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target to study
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleKeenSenses(actor, target, ability, log, systems) {
  // This ability is currently disabled/commented out in the codebase
  // Uncomment the message in racial.js if you want to re-enable it

  if (!target || target === config.MONSTER_ID) {
    const invalidTargetMessage = messages.getAbilityMessage(
      'abilities.racial',
      'keenSensesInvalidTarget'
    );
    log.push(
      messages.formatMessage(invalidTargetMessage, {
        playerName: actor.name,
      })
    );
    return false;
  }

  // Set up keen senses effect for next attack
  if (!actor.racialEffects) {
    actor.racialEffects = {};
  }
  actor.racialEffects.keenSensesActiveOnNextAttack = target.id;

  const keenSensesMessage = messages.getAbilityMessage(
    'abilities.racial',
    'keenSensesUsed'
  );
  log.push(
    messages.formatMessage(keenSensesMessage, {
      playerName: actor.name,
      targetName: target.name,
    })
  );

  const nextAttackMessage = messages.getAbilityMessage(
    'abilities.racial',
    'keenSensesNextAttack'
  );
  log.push(
    messages.formatMessage(nextAttackMessage, {
      playerName: actor.name,
      targetName: target.name,
    })
  );
  return false;
}

/**
 * Handler for Satyr Forest's Grace racial ability (currently commented out)
 * @param {Object} actor - Actor using the ability
 * @param {Object|string} target - Target of the ability (unused)
 * @param {Object} ability - Ability configuration
 * @param {Array} log - Event log to append messages to
 * @param {Object} systems - Game systems
 * @returns {boolean} Whether the ability was successful
 */
function handleForestsGrace(actor, target, ability, log, systems) {
  // This ability is currently disabled/commented out in the codebase
  // Uncomment the message in racial.js if you want to re-enable it

  const healAmount = ability.params?.healAmount || 3;
  const turns = ability.params?.turns || 3;

  // Apply healing over time status effect
  systems.statusEffectManager.applyEffect(
    actor.id,
    'healingOverTime',
    {
      amount: healAmount,
      turns: turns,
    },
    log
  );

  const forestsGraceMessage = messages.getAbilityMessage(
    'abilities.racial',
    'forestsGraceUsed'
  );
  log.push(
    messages.formatMessage(forestsGraceMessage, {
      playerName: actor.name,
    })
  );

  const healingMessage = messages.getAbilityMessage(
    'abilities.racial',
    'forestsGraceHealing'
  );
  log.push(
    messages.formatMessage(healingMessage, {
      playerName: actor.name,
      amount: healAmount,
      turns: turns,
    })
  );

  return false; // Currently disabled
}

// Seer: [ // Kept for reference - can be uncommented to re-add to the game
//   {
//     type: 'psychicBolt',
//     name: 'Psychic Bolt',
//     category: 'Attack',
//     effect: null,
//     target: 'Single',
//     params: { damage: 28 },
//     unlockAt: 1,
//     order: 1050,
//     cooldown: 0,
//     flavorText: 'Assault the mind with a focused blast of pure mental force.',
//   },
//   {
//     type: 'spiritGuard',
//     name: 'Spirit Guard',
//     category: 'Defense',
//     effect: 'shielded',
//     target: 'Self',
//     params: { armor: 3, duration: 1 },
//     unlockAt: 3,
//     order: 17,
//     cooldown: 0,
//     flavorText: 'Summon protective spirits to ward off incoming attacks.',
//   },
//   {
//     type: 'spiritMend',
//     name: 'Spirit Mend',
//     category: 'Heal',
//     effect: null,
//     target: 'Self',
//     params: { amount: 20 },
//     unlockAt: 4,
//     order: 10070,
//     cooldown: 2,
//     flavorText: 'Channel soothing spiritual energy to repair your own form.',
//   },
//   {
//     type: 'revealSecret',
//     name: 'Reveal Secret',
//     category: 'Special',
//     effect: 'detect',
//     target: 'Single',
//     params: {},
//     unlockAt: 2,
//     order: 101,
//     cooldown: 4,
//     flavorText: "Uncover hidden truths and expose the enemy's deceptions.",
//   },
// ],
/*
    {
      type: 'primalRoar',
      name: 'Primal Roar',
      category: 'Special',
      effect: 'weakened',
      target: 'Single',
      params: { damageReduction: 0.25, duration: 1 },
      unlockAt: 2,
      order: 120,
      cooldown: 0,
      flavorText:
        "Let out a terrifying roar that weakens your enemy's resolve.",
    },
    {
      type: 'bloodFrenzy',
      name: 'Blood Frenzy',
      category: 'Special',
      effect: 'passive',
      target: 'Self',
      params: { damageIncreasePerHpMissing: 0.01 },
      unlockAt: 3,
      order: 5,
      cooldown: 0,
      flavorText: 'The closer to death you get, the more dangerous you become.',
    },
    {
      type: 'unstoppableRage',
      name: 'Unstoppable Rage',
      category: 'Special',
      effect: 'enraged',
      target: 'Self',
      params: {
        damageBoost: 2,
        damageResistance: 0.5,
        duration: 3,
        effectEnds: { selfDamagePercent: 0.5 },
      },
      unlockAt: 4,
      order: 8,
      cooldown: 4,
      flavorText:
        'Enter an unstoppable rage that makes you incredibly dangerous, but at a terrible cost.',
    },
*/
