/**
 * @fileoverview GameRules domain model
 * Manages game rules, validation, and coordination calculations
 */
const config = require('@config');
const logger = require('@utils/logger');

/**
 * GameRules class manages game rules and validation logic
 * Extracted from GameRoom to improve separation of concerns
 */
class GameRules {
  /**
   * Create a new game rules manager
   * @param {string} gameCode - Game code for logging
   */
  constructor(gameCode) {
    this.gameCode = gameCode;
  }

  /**
   * Check if a player can be added to the game
   * @param {boolean} gameStarted - Whether game has started
   * @param {number} currentPlayerCount - Current number of players
   * @returns {boolean} Whether player can be added
   */
  canAddPlayer(gameStarted, currentPlayerCount) {
    return !gameStarted && currentPlayerCount < config.maxPlayers;
  }

  /**
   * Validate action submission
   * @param {Object} actor - Player performing action
   * @param {string} actionType - Type of action
   * @param {string} targetId - Target of action
   * @param {Object} systems - Game systems for validation
   * @returns {Object} Validation result
   */
  validateActionSubmission(actor, actionType, targetId, systems) {
    // Basic validation
    if (!actor || !actor.isAlive) {
      return { valid: false, reason: 'Actor not alive' };
    }

    if (systems.statusEffectManager.isPlayerStunned(actor.id)) {
      return { valid: false, reason: 'Actor is stunned' };
    }

    if (actor.hasSubmittedAction) {
      return { valid: false, reason: 'Action already submitted' };
    }

    // Find the ability
    const ability = actor.unlocked.find(a => a.type === actionType);
    if (!ability) {
      return { valid: false, reason: 'Ability not found or not unlocked' };
    }

    // Check cooldown
    if (actor.isAbilityOnCooldown(actionType)) {
      return { valid: false, reason: 'Ability on cooldown' };
    }

    // Check if ability is known to registry
    if (!systems.abilityRegistry.hasClassAbility(actionType)) {
      return { valid: false, reason: 'Unknown ability type' };
    }

    // Validate AOE abilities
    if (targetId === 'multi') {
      const isAOEAbility = this.isAOEAbility(ability);
      if (!isAOEAbility) {
        return { valid: false, reason: 'Non-AOE ability with multi target' };
      }
    }

    return { valid: true };
  }

  /**
   * Check if an ability is AOE
   * @param {Object} ability - Ability object
   * @returns {boolean} Whether ability is AOE
   */
  isAOEAbility(ability) {
    return ability.target === 'Multi' ||
           ability.isAOE === true ||
           ability.targetType === 'multi' ||
           [
             'massHeal', 'thunderStrike', 'earthquake', 'massStun',
             'groupHeal', 'meteorShower', 'infernoBlast', 'chainLightning',
             'rejuvenation', 'battleCry', 'divineShield', 'entangle', 'poisonTrap'
           ].includes(ability.type);
  }

  /**
   * Validate racial action submission
   * @param {Object} actor - Player using racial ability
   * @param {string} targetId - Target of racial ability
   * @param {Array} pendingRacialActions - Currently pending racial actions
   * @param {Object} systems - Game systems for validation
   * @returns {Object} Validation result
   */
  validateRacialActionSubmission(actor, targetId, pendingRacialActions, systems) {
    if (!actor || !actor.isAlive) {
      return { valid: false, reason: 'Actor not alive' };
    }

    if (!actor.canUseRacialAbility()) {
      return { valid: false, reason: 'Cannot use racial ability' };
    }

    // Check if already used racial this round
    if (pendingRacialActions.some(a => a.actorId === actor.id)) {
      return { valid: false, reason: 'Already used racial this round' };
    }

    // Check if racial ability is known
    if (!actor.racialAbility || !systems.abilityRegistry.hasRacialAbility(actor.racialAbility.type)) {
      return { valid: false, reason: 'Unknown racial ability type' };
    }

    return { valid: true };
  }

  /**
   * Calculate coordination bonuses for pending actions
   * @param {Array} pendingActions - Array of pending actions
   * @param {Map} players - Map of players
   * @returns {Map} Map of targetId -> coordination info
   */
  calculateCoordinationBonuses(pendingActions, players) {
    const coordinationMap = new Map();
    const actionsByTarget = new Map();

    // Group actions by target
    for (const action of pendingActions) {
      const actor = players.get(action.actorId);
      if (!actor || !actor.isAlive) continue;

      const ability = actor.unlocked.find(a => a.type === action.actionType);
      if (!ability) continue;

      const isDamageAbility = ability.category === 'Attack' || ability.params.damage > 0;
      const isHealingAbility = ability.category === 'Heal' || ability.params.amount > 0;

      if (!isDamageAbility && !isHealingAbility) continue;

      const targetId = action.targetId;

      if (!actionsByTarget.has(targetId)) {
        actionsByTarget.set(targetId, {
          damageActions: [],
          healingActions: [],
        });
      }

      const targetActions = actionsByTarget.get(targetId);

      if (isDamageAbility) {
        targetActions.damageActions.push({
          actorId: action.actorId,
          actionType: action.actionType,
          ability: ability,
          actor: actor,
        });
      } else if (isHealingAbility) {
        targetActions.healingActions.push({
          actorId: action.actorId,
          actionType: action.actionType,
          ability: ability,
          actor: actor,
        });
      }
    }

    // Calculate coordination bonuses
    for (const [targetId, actions] of actionsByTarget.entries()) {
      const damageCount = actions.damageActions.length;
      const healingCount = actions.healingActions.length;

      coordinationMap.set(targetId, {
        damageActions: actions.damageActions,
        healingActions: actions.healingActions,
        damageBonus: damageCount > 1 ? 
          (damageCount - 1) * config.gameBalance.coordinationBonus.damageBonus : 0,
        healingBonus: healingCount > 1 ? 
          (healingCount - 1) * config.gameBalance.coordinationBonus.healingBonus : 0,
        coordinatedDamage: damageCount > 1,
        coordinatedHealing: healingCount > 1,
      });
    }

    return coordinationMap;
  }

  /**
   * Check win conditions
   * @param {number} warlockCount - Number of warlocks
   * @param {number} aliveCount - Number of alive players
   * @returns {string|null} Winner ('Evil', 'Good', null)
   */
  checkWinConditions(warlockCount, aliveCount) {
    if (warlockCount >= aliveCount - warlockCount && warlockCount > 0) {
      return 'Evil'; // Warlocks win
    }
    if (warlockCount === 0 && aliveCount > 0) {
      return 'Good'; // Innocents win
    }
    return null;
  }

  /**
   * Calculate level up bonuses
   * @param {Object} player - Player object
   * @param {number} level - New level
   * @returns {Object} Level up bonus information
   */
  calculateLevelUpBonuses(player, level) {
    const hpIncrease = Math.floor(
      player.maxHp * config.gameBalance.player.levelUp.hpIncrease
    );
    const damageIncrease = config.gameBalance.player.levelUp.damageIncrease;

    return {
      hpIncrease,
      damageIncrease,
      newMaxHp: player.maxHp + hpIncrease,
      newDamageMod: player.damageMod * damageIncrease,
    };
  }

  /**
   * Apply level up bonuses to a player
   * @param {Object} player - Player object
   * @param {number} level - New level
   * @returns {Object} Applied bonus information
   */
  applyLevelUpBonuses(player, level) {
    const bonuses = this.calculateLevelUpBonuses(player, level);

    // Apply HP increase
    player.maxHp = bonuses.newMaxHp;
    player.hp = player.maxHp; // Full heal

    // Apply damage increase
    player.damageMod = bonuses.newDamageMod;

    // Special handling for Barbarian
    if (player.class === 'Barbarian' && player.updateRelentlessFuryLevel) {
      player.updateRelentlessFuryLevel(level);
    }

    logger.debug('LevelUpBonusesApplied', {
      gameCode: this.gameCode,
      playerName: player.name,
      level,
      hpIncrease: bonuses.hpIncrease,
      newMaxHp: bonuses.newMaxHp,
      newDamageMod: bonuses.newDamageMod,
    });

    return bonuses;
  }

  /**
   * Check if all actions are submitted for alive, non-stunned players
   * @param {Array} alivePlayers - Array of alive players
   * @param {Object} statusEffectManager - Status effect manager
   * @returns {Object} Submission status information
   */
  checkActionSubmissionStatus(alivePlayers, statusEffectManager) {
    // Filter to only players who can currently act (not stunned)
    const activePlayerCount = alivePlayers.filter(player => {
      const isCurrentlyStunned = statusEffectManager.isPlayerStunned(player.id);
      const hasStunEffect = player.hasStatusEffect && player.hasStatusEffect('stunned');
      return !isCurrentlyStunned && !hasStunEffect;
    }).length;

    // Count valid submitted actions from non-stunned players
    const submittedActionCount = alivePlayers.filter(player => {
      if (!player.hasSubmittedAction) return false;
      if (player.actionValidationState !== 'valid') return false;
      
      const isCurrentlyStunned = statusEffectManager.isPlayerStunned(player.id);
      const hasStunEffect = player.hasStatusEffect && player.hasStatusEffect('stunned');
      
      return !isCurrentlyStunned && !hasStunEffect;
    }).length;

    return {
      activePlayerCount,
      submittedActionCount,
      allSubmitted: submittedActionCount >= activePlayerCount,
      stunnedPlayers: alivePlayers
        .filter(p => statusEffectManager.isPlayerStunned(p.id))
        .map(p => p.name),
    };
  }

  /**
   * Check if forced progression should be applied
   * @param {Array} alivePlayers - Array of alive players
   * @param {Object} statusEffectManager - Status effect manager
   * @returns {boolean} Whether to force progression
   */
  shouldForceProgression(alivePlayers, statusEffectManager) {
    const activePlayerCount = alivePlayers.filter(player => 
      !statusEffectManager.isPlayerStunned(player.id)
    ).length;
    
    // If no players can act, force progression
    if (activePlayerCount === 0) {
      logger.warn('ForceProgressionNoActivePlayers', {
        gameCode: this.gameCode,
        aliveCount: alivePlayers.length
      });
      return true;
    }
    
    return false;
  }

  /**
   * Sort log entries to put certain types at the end
   * @param {Array} log - Raw log entries
   * @returns {Array} Sorted log entries
   */
  sortLogEntries(log) {
    const regularEntries = [];
    const endEntries = [];

    log.forEach(entry => {
      if (entry.moveToEnd || entry.type === 'corruption') {
        endEntries.push(entry);
      } else {
        regularEntries.push(entry);
      }
    });

    return [...regularEntries, ...endEntries];
  }

  /**
   * Process log entries for client consumption
   * @param {Array} log - Raw log entries
   * @returns {Array} Processed log entries
   */
  processLogForClients(log) {
    return log.map(entry => {
      // If it's already a string, keep it as is (legacy support)
      if (typeof entry === 'string') {
        return {
          type: 'basic',
          public: true,
          message: entry,
          privateMessage: entry,
          attackerMessage: entry,
          visibleTo: [],
        };
      }

      const processed = {
        type: entry.type || 'basic',
        public: entry.public !== false, // Default to true
        targetId: entry.targetId || null,
        attackerId: entry.attackerId || null,
        message: entry.message || '',
        privateMessage: entry.privateMessage || entry.message || '',
        attackerMessage: entry.attackerMessage || entry.message || '',
        ...entry,
      };

      // Compute visibility list for private events
      if (processed.public === false) {
        const visSet = new Set(processed.visibleTo || []);
        if (processed.attackerId) visSet.add(processed.attackerId);
        if (processed.targetId) visSet.add(processed.targetId);
        processed.visibleTo = Array.from(visSet);
      } else {
        processed.visibleTo = [];
      }

      return processed;
    });
  }
}

module.exports = { GameRules };