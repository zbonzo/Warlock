/**
 * @fileoverview System for managing combat, damage calculation, and death processing
 * Centralizes combat logic for consistent damage calculation
 */

/**
 * CombatSystem handles all combat-related operations
 * Ensures consistent damage calculation and death processing
 */
class CombatSystem {
  /**
   * Create a combat system
   * @param {Map} players - Map of player objects
   * @param {MonsterController} monsterController - Monster controller
   * @param {StatusEffectManager} statusEffectManager - Status effect manager
   * @param {RacialAbilitySystem} racialAbilitySystem - Racial ability system
   * @param {WarlockSystem} warlockSystem - Warlock system
   * @param {GameStateUtils} gameStateUtils - Game state utilities
   */
  constructor(
    players, 
    monsterController, 
    statusEffectManager, 
    racialAbilitySystem, 
    warlockSystem, 
    gameStateUtils
  ) {
    this.players = players;
    this.monsterController = monsterController;
    this.statusEffectManager = statusEffectManager;
    this.racialAbilitySystem = racialAbilitySystem;
    this.warlockSystem = warlockSystem;
    this.gameStateUtils = gameStateUtils;
  }

  /**
   * Validate and queue a player action
   * @param {string} actorId - ID of player performing the action
   * @param {string} actionType - Type of action to perform
   * @param {string} targetId - Target of the action
   * @param {Object} options - Additional options for the action
   * @param {Array} pendingActions - List of pending actions to add to
   * @returns {boolean} Whether the action was successfully queued
   */
  validateAndQueueAction(actorId, actionType, targetId, options, pendingActions) {
    const actor = this.players.get(actorId);
    
    // Basic validation
    if (!actor || !actor.isAlive) return false;
    if (this.statusEffectManager.isPlayerStunned(actorId)) return false;
    if (pendingActions.some(a => a.actorId === actorId)) return false; // Already acted
    
    // Find the ability being used
    const ability = actor.unlocked.find(a => a.type === actionType);
    if (!ability) return false; // Ability not found or not unlocked
    
    // Basic target validation
    if (targetId !== '__monster__' && targetId !== actorId) {
      const targetPlayer = this.players.get(targetId);
      if (!targetPlayer || !targetPlayer.isAlive) return false; // Invalid player target
      
      // Handle invisible targets (redirect if needed)
      if (targetPlayer.hasStatusEffect && targetPlayer.hasStatusEffect('invisible')) {
        const redirectTarget = this.gameStateUtils.getRandomTarget({
          actorId, 
          excludeIds: [targetId], 
          includeMonster: true,
          monsterRef: this.monsterController.getState()
        });
        
        if (!redirectTarget) return false; // No valid target to redirect to
        targetId = redirectTarget; // Update target to the redirected one
      }
    }
    
    // Sanitize options object
    const safeOptions = {};
    if (options && typeof options === 'object') {
      // Only allow specific properties
      if (typeof options.bloodRageActive === 'boolean') {
        safeOptions.bloodRageActive = options.bloodRageActive;
      }
      if (typeof options.keenSensesActive === 'boolean') {
        safeOptions.keenSensesActive = options.keenSensesActive;
      }
    }
    
    // Add the action to pending actions
    pendingActions.push({ 
      actorId, 
      actionType, 
      targetId, 
      options: safeOptions
    });
    
    return true;
  }

  /**
   * Apply damage to a player, considering armor and effects
   * @param {Object} target - Target player
   * @param {number} damageAmount - Amount of damage
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   * @param {boolean} isKeenSensesAttack - Whether this is a Keen Senses attack
   * @returns {boolean} Whether the attack was successful
   */
  /**
   * Apply damage to a player, considering armor and effects
   * @param {Object} target - Target player
   * @param {number} damageAmount - Amount of damage
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   * @param {boolean} isKeenSensesAttack - Whether this is a Keen Senses attack
   * @returns {boolean} Whether the attack was successful
   */
  applyDamageToPlayer(target, damageAmount, attacker, log = [], isKeenSensesAttack = false) {
    if (!target || !target.isAlive) return false;
    
    // Check for immunity effects first
    if (this.checkImmunityEffects(target, attacker, log)) {
      return false; // No damage was dealt
    }
    
    // Initialize armor degradation info
    let armorDegradationInfo = null;
    
    // Process Stone Armor degradation for Dwarves (before damage calculation)
    if (target.race === 'Dwarf' && target.stoneArmorIntact) {
      armorDegradationInfo = target.processStoneArmorDegradation(damageAmount);
    }
    
    // Calculate damage reduction from armor (this now includes the degraded stone armor)
    const finalDamage = target.calculateDamageReduction(damageAmount);
    const reductionPercent = Math.round(((damageAmount - finalDamage) / damageAmount) * 100);
    
    // Apply damage
    target.hp = Math.max(0, target.hp - finalDamage);
    
    // Create enhanced log entry
    const isMonsterAttacker = !attacker.id;
    
    const logEvent = {
      type: 'damage',
      public: true,
      targetId: target.id,
      targetName: target.name,
      attackerId: attacker.id || 'monster',
      attackerName: attacker.name || 'The Monster',
      damage: {
        initial: damageAmount,
        final: finalDamage,
        reduction: reductionPercent
      },
      message: `${target.name} was attacked and lost ${finalDamage} health.`,
      privateMessage: `${attacker.name || 'The Monster'} attacked you for ${finalDamage} damage, reduced by ${reductionPercent}% from your armor.`,
      attackerMessage: isMonsterAttacker ? '' : `You attacked ${target.name} for ${finalDamage} damage (initial ${damageAmount}, reduced by ${reductionPercent}% from armor).`
    };
    
    log.push(logEvent);
    
    // Add Stone Armor degradation message if applicable
    if (armorDegradationInfo && armorDegradationInfo.degraded) {
      const armorLogEvent = {
        type: 'stone_armor_degradation',
        public: true,
        targetId: target.id,
        message: `${target.name}'s Stone Armor cracks and weakens! (${armorDegradationInfo.oldValue} → ${armorDegradationInfo.newArmorValue})`,
        privateMessage: `Your Stone Armor degrades from ${armorDegradationInfo.oldValue} to ${armorDegradationInfo.newArmorValue}!`,
        attackerMessage: `${target.name}'s Stone Armor weakens from your attack!`
      };
      
      if (armorDegradationInfo.destroyed && armorDegradationInfo.newArmorValue <= 0) {
        armorLogEvent.message = `${target.name}'s Stone Armor is completely shattered! They now take increased damage!`;
        armorLogEvent.privateMessage = `Your Stone Armor is destroyed! You now take ${Math.abs(armorDegradationInfo.newArmorValue) * 10}% more damage!`;
      }
      
      log.push(armorLogEvent);
    }
      
    // Handle Keen Senses racial ability for Elves
    if (isKeenSensesAttack) {
      this.handleKeenSensesAttack(target, attacker, log);
    }
    
    // Process potential death
    if (target.hp === 0) {
      this.handlePotentialDeath(target, attacker, log);
      return true;
    }
    
    // Check for warlock conversion opportunities
    this.checkWarlockConversion(target, attacker, log);
    
    return true;
  }

  /**
   * Check for immunity effects that prevent damage
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the target is immune to damage
   * @private
   */

  checkImmunityEffects(target, attacker, log) {
    // Check for Stone Resolve immunity (Dwarf racial)
    if (target.racialEffects && target.racialEffects.immuneNextDamage) {
      // Create an anonymous immunity message
      const immunityLog = {
        type: 'immunity',
        public: true,
        targetId: target.id,
        attackerId: attacker.id || 'monster',
        message: `${target.name}'s Stone Resolve absorbed all damage from an attack!`,
        privateMessage: `Your Stone Resolve absorbed all damage from ${attacker.name || 'The Monster'}!`,
        attackerMessage: attacker.id ? `${target.name}'s Stone Resolve absorbed all your damage!` : ''
      };
      log.push(immunityLog);
      
      delete target.racialEffects.immuneNextDamage;
      return true;
    }
    
    return false;
  }


  /**
   * Add damage message to the log
   * @param {Object} target - Target player
   * @param {number} finalDamage - Final damage after reduction
   * @param {number} initialDamage - Initial damage before reduction
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   * @private
   */
  logDamageMessage(target, finalDamage, initialDamage, attacker, log) {
    const attackerName = attacker.name || 'The Monster';
    
    if (finalDamage !== initialDamage) {
      log.push(`${target.name} takes ${finalDamage} damage from ${attackerName}. Armor reduced initial ${initialDamage} damage.`);
    } else {
      log.push(`${target.name} takes ${finalDamage} damage from ${attackerName}.`);
    }
  }

  /**
   * Handle Keen Senses racial ability attack
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player)
   * @param {Array} log - Event log to append messages to
   * @private
   */
  handleKeenSensesAttack(target, attacker, log) {
    // Reveal warlock status
    log.push(`${attacker.name}'s Keen Senses reveal that ${target.name} ${target.isWarlock ? 'IS' : 'is NOT'} a Warlock!`);
  }

  /**
   * Handle potential death when HP reaches 0
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   * @private
   */
  handlePotentialDeath(target, attacker, log) {
    // Add extensive logging for debugging
    console.log(`Checking potential death for ${target.name}`);
    console.log(`Race: ${target.race}, Has racial ability:`, Boolean(target.racialAbility));
    if (target.racialAbility) {
      console.log(`Racial ability type: ${target.racialAbility.type}`);
    }
    console.log(`Racial effects:`, JSON.stringify(target.racialEffects));
    
    // Check for Undying racial ability (Skeleton)
    if (target.race === 'Skeleton' && target.racialEffects && target.racialEffects.resurrect) {
      // Resurrect the player
    target.hp = target.racialEffects.resurrect.resurrectedHp || 1;
    
    const resurrectLog = {
      type: 'resurrect',
      public: true,
      targetId: target.id,
      message: `${target.name} avoided death through Undying!`,
      privateMessage: 'You were resurrected by Undying.',
      attackerMessage: `${target.name} avoided death through Undying.`
    };
    log.push(resurrectLog);
    
      delete target.racialEffects.resurrect;
    } else {
      // Mark for pending death
      target.pendingDeath = true;
      target.deathAttacker = attacker.name || 'The Monster';

      const deathLog = {
        type: 'death',
        public: true,
        targetId: target.id,
        attackerId: attacker.id || 'monster',
        message: `${target.name} has fallen.`,
        privateMessage: `You were killed by ${attacker.name || 'The Monster'}.`,
        attackerMessage: `You killed ${target.name}.`
      };
    log.push(deathLog);
    }
  }

  /**
   * Check if a warlock conversion should occur
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   * @private
   */
  checkWarlockConversion(target, attacker, log) {
    // Only player attackers can cause conversions
    if (!attacker.id || attacker === target) return;
    
    // Check if attacker is a warlock
    if (attacker.isWarlock) {
      this.warlockSystem.attemptConversion(attacker, target, log);
    }
  }

  /**
   * Apply damage to the monster
   * @param {number} amount - Amount of damage
   * @param {Object} attacker - Attacking player
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the attack was successful
   */
  applyDamageToMonster(amount, attacker, log = []) {
    const result = this.monsterController.takeDamage(amount, attacker, log);
    
    // Monster attacks don't need enhanced logs, just return result
    return result;
  }
  /**
   * Process all pending deaths
   * @param {Array} log - Event log to append messages to
   */
  processPendingDeaths(log = []) {
    for (const player of this.players.values()) {
      if (player.pendingDeath) {
        console.log(`Processing pending death for ${player.name}`);
        console.log(`Race: ${player.race}, Has racial ability:`, Boolean(player.racialAbility));
        if (player.racialAbility) {
          console.log(`Racial ability type: ${player.racialAbility.type}`);
        }
        console.log(`Racial effects:`, JSON.stringify(player.racialEffects));
        
        // Check if player has Undying effect
        if (player.race === 'Skeleton' && player.racialEffects && player.racialEffects.resurrect) {
          // Resurrect the player
          player.hp = player.racialEffects.resurrect.resurrectedHp || 1;
          log.push(`${player.name} avoided death through Undying! Resurrected with ${player.hp} HP.`);
          delete player.racialEffects.resurrect;
          delete player.pendingDeath;
          delete player.deathAttacker;
        } else {
          // Player dies
          player.isAlive = false;
          if (player.isWarlock) this.warlockSystem.decrementWarlockCount();
          log.push(`${player.name} has died from wounds inflicted by ${player.deathAttacker}!`);
          delete player.pendingDeath;
          delete player.deathAttacker;
        }
      }
    }
  }

  /**
   * Handle area-of-effect (AoE) damage to multiple targets
   * @param {Object} source - Source of the AoE damage
   * @param {number} baseDamage - Base damage amount
   * @param {Array} targets - Array of target players
   * @param {Array} log - Event log to append messages to
   * @param {Object} options - Additional options
   * @returns {Array} Array of affected targets
   */
  applyAreaDamage(source, baseDamage, targets, log = [], options = {}) {
    const { excludeSelf = true, warlockConversionChance = 0.5 } = options;
    const affectedTargets = [];
    
    // Modify damage based on source's modifier
    const modifiedDamage = source.modifyDamage ? source.modifyDamage(baseDamage) : baseDamage;
    
    // Filter targets
    const validTargets = targets.filter(target => {
      if (!target || !target.isAlive) return false;
      if (excludeSelf && target.id === source.id) return false;
      return true;
    });
    
    // Apply damage to each target
    for (const target of validTargets) {
      this.applyDamageToPlayer(target, modifiedDamage, source, log);
      
      // Check for warlock conversion with reduced chance
      if (source.isWarlock && target.isAlive && !target.isWarlock) {
        this.warlockSystem.attemptConversion(source, target, log, warlockConversionChance);
      }
      
      affectedTargets.push(target);
    }
    
    return affectedTargets;
  }

  /**
   * Handle multi-target healing
   * @param {Object} source - Source of the healing
   * @param {number} baseAmount - Base healing amount
   * @param {Array} targets - Array of target players
   * @param {Array} log - Event log to append messages to
   * @param {Object} options - Additional options
   * @returns {Array} Array of affected targets
   */
  applyAreaHealing(source, baseAmount, targets, log = [], options = {}) {
    const { excludeSelf = false, excludeWarlocks = true } = options;
    const affectedTargets = [];
    
    // Modify healing based on source's modifier
    const healingMod = source.getHealingModifier ? source.getHealingModifier() : 1.0;
    const modifiedAmount = Math.floor(baseAmount * healingMod);
    
    // Filter targets
    const validTargets = targets.filter(target => {
      if (!target || !target.isAlive) return false;
      if (excludeSelf && target.id === source.id) return false;
      if (excludeWarlocks && target.isWarlock) return false;
      return true;
    });
    
    // Apply healing to each target
    for (const target of validTargets) {
      const actualHeal = Math.min(modifiedAmount, target.maxHp - target.hp);
      target.hp += actualHeal;
      
      if (actualHeal > 0) {
        log.push(`${target.name} is healed for ${actualHeal} HP by ${source.name}'s ability.`);
      }
      
      affectedTargets.push(target);
    }
    
    return affectedTargets;
  }

  checkAndSetupUndyingIfNeeded(player) {
  if (player && player.race === 'Skeleton' && (!player.racialEffects || !player.racialEffects.resurrect)) {
    console.log(`Undying not properly set for ${player.name}, setting it up now`);
    player.racialEffects = player.racialEffects || {};
    player.racialEffects.resurrect = {
      resurrectedHp: 1 // Default value if params not available
    };
    console.log(`Fixed Undying effect:`, player.racialEffects);
    return true;
  }
  return false;
}
}

module.exports = CombatSystem;