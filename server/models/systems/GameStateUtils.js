/**
 * @fileoverview Utility functions for game state management
 * Provides common operations and queries on the game state
 */
const config = require('@config');
const messages = require('@messages');
const logger = require('@utils/logger');

/**
 * Helper class with utility functions for game state
 * Centralizes common operations to avoid duplication
 */
class GameStateUtils {
  /**
   * Create a game state utils instance
   * @param {Map} players - Map of player objects
   */
  constructor(players) {
    this.players = players;
  }

  /**
   * Get all currently alive players
   * @returns {Array} Array of alive player objects
   */
  getAlivePlayers() {
    return Array.from(this.players.values()).filter((p) => p.isAlive);
  }

  /**
   * Check if a player is alive
   * @param {string} playerId - Player ID to check
   * @returns {boolean} Whether the player is alive
   */
  isPlayerAlive(playerId) {
    const player = this.players.get(playerId);
    return player && player.isAlive;
  }

  /**
   * Get a random target excluding specified IDs
   * @param {Object} options - Targeting options
   * @param {string} options.actorId - ID of the acting player
   * @param {Array} [options.excludeIds=[]] - IDs to exclude from targeting
   * @param {boolean} [options.includeMonster=false] - Whether to include monster as target
   * @param {Object} [options.monsterRef=null] - Monster state reference if included
   * @param {boolean} [options.onlyPlayers=false] - Whether to only target players
   * @returns {string|null} ID of target or null if no valid targets
   */
  getRandomTarget({
    actorId,
    excludeIds = [],
    includeMonster = false,
    monsterRef = null,
    onlyPlayers = false,
  } = {}) {
    // Get all possible player targets
    let possibleTargets = this.getAlivePlayers()
      .filter((p) => {
        // Exclude specified IDs (including actor if not excluded)
        if (p.id === actorId || excludeIds.includes(p.id)) return false;

        // Exclude invisible players
        if (p.hasStatusEffect && p.hasStatusEffect('invisible')) return false;

        return true;
      })
      .map((p) => p.id);

    // Add monster if allowed and alive
    if (includeMonster && monsterRef && monsterRef.hp > 0 && !onlyPlayers) {
      possibleTargets.push(config.MONSTER_ID);
    }

    // If no valid targets found, consider alternate options
    if (possibleTargets.length === 0) {
      // If only player targets were requested but none found, return null
      if (onlyPlayers) return null;

      // Try targeting self if alive and not invisible
      if (this.isPlayerAlive(actorId)) {
        const actor = this.players.get(actorId);
        if (!actor.hasStatusEffect || !actor.hasStatusEffect('invisible')) {
          return actorId;
        }
      }

      // Last resort: monster if allowed
      if (includeMonster && monsterRef && monsterRef.hp > 0) {
        return config.MONSTER_ID;
      }

      // No valid targets at all
      return null;
    }

    // Select a random target from the list
    return possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
  }

  /**
   * Check if the game has a winner
   * @param {number} numWarlocks - Number of alive warlocks
   * @param {number} aliveCount - Total number of alive players
   * @returns {string|null} Winner ('Good', 'Evil') or null if game continues
   */
  checkWinConditions(numWarlocks, aliveCount) {
    const pendingResurrections = this.countPendingResurrections();

    if (pendingResurrections > 0) {
      logger.debug(
        `Win condition check: ${pendingResurrections} pending resurrections, delaying win condition check`
      );
      return null; // Don't end game yet, resurrections are coming
    }
    
    // If everyone is dead, Evil wins (no survivors means darkness prevails)
    if (aliveCount === 0) {
      return 'Evil';
    }
    
    // Use win conditions from config
    const winConditions = config.gameBalance.warlock.winConditions;

    // Good players win if all warlocks are eliminated
    if (numWarlocks <= 0 && aliveCount > 0)
      return winConditions.allWarlocksGone || 'Good';

    // Warlocks win if all remaining players are warlocks
    if (numWarlocks > 0 && numWarlocks === aliveCount)
      return winConditions.allPlayersWarlocks || 'Evil';

    // Game continues
    return null;
  }

  /**
   * Count players with pending resurrections (Undying abilities)
   * @returns {number} Number of players who will be resurrected
   */
  countPendingResurrections() {
    let count = 0;

    for (const player of this.players.values()) {
      if (player.pendingDeath && this.hasActiveUndying(player)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Check if a player has an active Undying ability
   * @param {Object} player - Player to check
   * @returns {boolean} Whether player will be resurrected
   */
  hasActiveUndying(player) {
    return (
      player.race === 'Lich' &&
      player.racialEffects &&
      player.racialEffects.resurrect &&
      player.racialEffects.resurrect.active
    );
  }

  /**
   * Count players with a specific status effect
   * @param {string} effectName - Name of the effect to count
   * @returns {number} Number of alive players with the effect
   */
  countPlayersWithEffect(effectName) {
    return this.getAlivePlayers().filter(
      (p) => p.hasStatusEffect && p.hasStatusEffect(effectName)
    ).length;
  }

  /**
   * Get the player with lowest HP
   * @param {boolean} [includeInvisible=false] - Whether to include invisible players
   * @returns {Object|null} Player with lowest HP or null if no alive players
   */
  getLowestHpPlayer(includeInvisible = false) {
    const alivePlayers = this.getAlivePlayers();

    if (alivePlayers.length === 0) return null;

    let lowestHp = Number.MAX_SAFE_INTEGER;
    let lowestHpPlayer = null;

    for (const player of alivePlayers) {
      // Skip invisible players if requested
      if (
        !includeInvisible &&
        player.hasStatusEffect &&
        player.hasStatusEffect('invisible')
      ) {
        continue;
      }

      if (player.hp < lowestHp) {
        lowestHp = player.hp;
        lowestHpPlayer = player;
      }
    }

    return lowestHpPlayer;
  }

  /**
   * Get the player with highest HP
   * @param {boolean} [includeInvisible=false] - Whether to include invisible players
   * @returns {Object|null} Player with highest HP or null if no alive players
   */
  getHighestHpPlayer(includeInvisible = false) {
    const alivePlayers = this.getAlivePlayers();

    if (alivePlayers.length === 0) return null;

    let highestHp = -1;
    let highestHpPlayer = null;

    for (const player of alivePlayers) {
      // Skip invisible players if requested
      if (
        !includeInvisible &&
        player.hasStatusEffect &&
        player.hasStatusEffect('invisible')
      ) {
        continue;
      }

      if (player.hp > highestHp) {
        highestHp = player.hp;
        highestHpPlayer = player;
      }
    }

    return highestHpPlayer;
  }

  /**
   * Get players sorted by a specific property
   * @param {string} property - Property to sort by ('hp', 'armor', etc.)
   * @param {boolean} [ascending=true] - Sort in ascending order
   * @param {boolean} [includeInvisible=true] - Whether to include invisible players
   * @returns {Array} Sorted array of player objects
   */
  getPlayersSortedBy(property, ascending = true, includeInvisible = true) {
    const alivePlayers = this.getAlivePlayers();

    // Filter invisible players if needed
    const filteredPlayers = includeInvisible
      ? alivePlayers
      : alivePlayers.filter(
          (p) => !p.hasStatusEffect || !p.hasStatusEffect('invisible')
        );

    // Sort players by the specified property
    return filteredPlayers.sort((a, b) => {
      const aValue = a[property] || 0;
      const bValue = b[property] || 0;

      return ascending ? aValue - bValue : bValue - aValue;
    });
  }

  /**
   * Check if all players in a group have a specific property
   * @param {Array} players - Group of players to check
   * @param {string} property - Property to check for
   * @param {*} value - Value the property should have
   * @returns {boolean} Whether all players have the property with value
   */
  allPlayersHave(players, property, value) {
    return players.every((p) => p[property] === value);
  }

  /**
   * Get all unique groups by property
   * For example, get all race groups or class groups
   * @param {string} property - Property to group by
   * @returns {Object} Map of property value to array of players
   */
  getPlayerGroups(property) {
    const groups = {};

    for (const player of this.players.values()) {
      if (!player.isAlive) continue;

      const value = player[property];
      if (value === undefined || value === null) continue;

      if (!groups[value]) {
        groups[value] = [];
      }

      groups[value].push(player);
    }

    return groups;
  }

  /**
   * Format an ability type into a display name
   * @param {string} abilityType - Type string (e.g., "fireball")
   * @returns {string} Formatted name (e.g., "Fireball")
   */
  formatAbilityName(abilityType) {
    if (!abilityType) return '';

    // Convert camelCase to spaces (e.g., "fireballAttack" -> "fireball Attack")
    let name = abilityType.replace(/([A-Z])/g, ' $1');

    // Capitalize first letter of each word
    name = name
      .split(' ')
      .map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');

    return name;
  }

  /**
   * Determine ability category based on type
   * @param {string} abilityType - Type of ability
   * @returns {string} Category (Attack, Defense, Heal, Special)
   */
  getAbilityCategory(abilityType) {
    // Look up ability in new config system first
    const ability = config.getAbility(abilityType);
    if (ability) {
      return ability.category;
    }

    // Fallback to pattern matching if not found in config
    const attackTypes = ['fireball', 'slash', 'strike', 'shot', 'blast'];
    const healTypes = ['heal', 'bandage', 'restoration', 'mend'];
    const defenseTypes = ['shield', 'protect', 'barrier', 'dodge'];

    for (const type of attackTypes) {
      if (abilityType.toLowerCase().includes(type)) return 'Attack';
    }

    for (const type of healTypes) {
      if (abilityType.toLowerCase().includes(type)) return 'Heal';
    }

    for (const type of defenseTypes) {
      if (abilityType.toLowerCase().includes(type)) return 'Defense';
    }

    // Default to Special if no match found
    return 'Special';
  }

  /**
   * Replace player ability (for Artisan Adaptability)
   * @param {string} playerId - Player ID
   * @param {string} oldAbilityType - Ability type to replace
   * @param {string} newAbilityType - New ability type
   * @param {number} level - Ability level
   * @returns {boolean} Whether the replacement was successful
   */
  replacePlayerAbility(playerId, oldAbilityType, newAbilityType, level) {
    // Find the player
    const player = this.players.get(playerId);
    if (!player) return false;

    // Check if the player is Artisan
    if (player.race !== 'Artisan') return false;

    // Find the old ability in player's abilities
    const oldAbilityIndex = player.abilities.findIndex(
      (a) => a.type === oldAbilityType
    );
    if (oldAbilityIndex === -1) return false;

    // Verify the old ability matches the specified level
    const oldAbility = player.abilities[oldAbilityIndex];
    if (oldAbility.unlockAt !== level) return false;

    // Find the new ability in the class abilities
    const newAbilityTemplate = config
      .getClassAbilitiesByLevel(player.class, level)
      .find((a) => a.type === newAbilityType);

    if (!newAbilityTemplate) {
      return false;
    }

    // Create a deep copy of the ability to avoid reference issues
    const newAbility = JSON.parse(JSON.stringify(newAbilityTemplate));

    // Replace the ability in player's abilities array
    player.abilities[oldAbilityIndex] = newAbility;

    // If the old ability was unlocked, update the unlocked abilities too
    const unlockedIndex = player.unlocked.findIndex(
      (a) => a.type === oldAbilityType
    );
    if (unlockedIndex !== -1) {
      player.unlocked[unlockedIndex] = newAbility;
    }

    return true;
  }

  /**
   * Check if a target is invisible
   * @param {Object} target - The target to check
   * @param {Object} systems - Game systems object
   * @returns {boolean} True if target is invisible
   */
  static isTargetInvisible(target, systems) {
    return (
      target !== config.MONSTER_ID &&
      target.hasStatusEffect &&
      systems.statusEffectSystem.hasEffect(target.id, 'invisible')
    );
  }

  /**
   * Check if a target is invisible and handle attack failure
   * @param {Object} actor - The player/entity performing the action
   * @param {Object} target - The target of the action
   * @param {Object} systems - Game systems object
   * @param {Array} log - Log array to append invisibility message
   * @returns {boolean} True if target is invisible (attack should fail)
   */
  static checkInvisibilityAndLog(actor, target, systems, log) {
    // Check if target is invisible
    if (GameStateUtils.isTargetInvisible(target, systems)) {
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
      return true; // Target is invisible, attack fails
    }
    return false; // Target is not invisible, attack can proceed
  }
}

module.exports = GameStateUtils;
