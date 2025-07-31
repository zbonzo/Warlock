/**
 * @fileoverview Utility functions for game state management
 * Provides common operations and queries on the game state
 */

import config from '@config';
import messages from '@messages';
import logger from '@utils/logger';

interface Player {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  isWarlock?: boolean;
  race?: string;
  class?: string;
  pendingDeath?: boolean;
  hasStatusEffect?: (effect: string) => boolean;
  abilities?: Ability[];
  unlocked?: Ability[];
  racialEffects?: {
    resurrect?: {
      active: boolean;
    };
  };
}

interface Ability {
  type: string;
  unlockAt: number;
  name?: string;
  description?: string;
}

interface Monster {
  hp: number;
  maxHp: number;
  id?: string;
}

interface TargetingOptions {
  actorId: string;
  excludeIds?: string[];
  includeMonster?: boolean;
  monsterRef?: Monster | null;
  onlyPlayers?: boolean;
}

interface GameSystems {
  statusEffectSystem: {
    hasEffect: (targetId: string, effectType: string) => boolean;
  };
}

/**
 * Helper class with utility functions for game state
 * Centralizes common operations to avoid duplication
 */
class GameStateUtils {
  private players: Map<string, Player>;

  /**
   * Create a game state utils instance
   */
  constructor(players: Map<string, Player>) {
    this.players = players;
  }

  /**
   * Get all currently alive players
   */
  getAlivePlayers(): Player[] {
    return Array.from(this.players.values()).filter((p) => p.isAlive);
  }

  /**
   * Check if a player is alive
   */
  isPlayerAlive(playerId: string): boolean {
    const player = this.players.get(playerId);
    return player ? player.isAlive : false;
  }

  /**
   * Get a random target excluding specified IDs
   */
  getRandomTarget(options: TargetingOptions): string | null {
    const {
      actorId,
      excludeIds = [],
      includeMonster = false,
      monsterRef = null,
      onlyPlayers = false,
    } = options;

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
        if (actor && (!actor.hasStatusEffect || !actor.hasStatusEffect('invisible'))) {
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
   */
  checkWinConditions(numWarlocks: number, aliveCount: number): string | null {
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
   */
  countPendingResurrections(): number {
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
   */
  hasActiveUndying(player: Player): boolean {
    return (
      player.race === 'Lich' &&
      player.racialEffects &&
      player.racialEffects.resurrect &&
      player.racialEffects.resurrect.active
    );
  }

  /**
   * Count players with a specific status effect
   */
  countPlayersWithEffect(effectName: string): number {
    return this.getAlivePlayers().filter(
      (p) => p.hasStatusEffect && p.hasStatusEffect(effectName)
    ).length;
  }

  /**
   * Get the player with lowest HP
   */
  getLowestHpPlayer(includeInvisible: boolean = false): Player | null {
    const alivePlayers = this.getAlivePlayers();

    if (alivePlayers.length === 0) return null;

    let lowestHp = Number.MAX_SAFE_INTEGER;
    let lowestHpPlayer: Player | null = null;

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
   */
  getHighestHpPlayer(includeInvisible: boolean = false): Player | null {
    const alivePlayers = this.getAlivePlayers();

    if (alivePlayers.length === 0) return null;

    let highestHp = -1;
    let highestHpPlayer: Player | null = null;

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
   */
  getPlayersSortedBy(
    property: keyof Player, 
    ascending: boolean = true, 
    includeInvisible: boolean = true
  ): Player[] {
    const alivePlayers = this.getAlivePlayers();

    // Filter invisible players if needed
    const filteredPlayers = includeInvisible
      ? alivePlayers
      : alivePlayers.filter(
          (p) => !p.hasStatusEffect || !p.hasStatusEffect('invisible')
        );

    // Sort players by the specified property
    return filteredPlayers.sort((a, b) => {
      const aValue = (a[property] as any) || 0;
      const bValue = (b[property] as any) || 0;

      return ascending ? aValue - bValue : bValue - aValue;
    });
  }

  /**
   * Check if all players in a group have a specific property
   */
  allPlayersHave(players: Player[], property: keyof Player, value: any): boolean {
    return players.every((p) => p[property] === value);
  }

  /**
   * Get all unique groups by property
   * For example, get all race groups or class groups
   */
  getPlayerGroups(property: keyof Player): Record<string, Player[]> {
    const groups: Record<string, Player[]> = {};

    for (const player of this.players.values()) {
      if (!player.isAlive) continue;

      const value = player[property] as string;
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
   */
  formatAbilityName(abilityType: string): string {
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
   */
  getAbilityCategory(abilityType: string): string {
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
   */
  replacePlayerAbility(
    playerId: string, 
    oldAbilityType: string, 
    newAbilityType: string, 
    level: number
  ): boolean {
    // Find the player
    const player = this.players.get(playerId);
    if (!player) return false;

    // Check if the player is Artisan
    if (player.race !== 'Artisan') return false;

    // Find the old ability in player's abilities
    if (!player.abilities) return false;
    
    const oldAbilityIndex = player.abilities.findIndex(
      (a) => a.type === oldAbilityType
    );
    if (oldAbilityIndex === -1) return false;

    // Verify the old ability matches the specified level
    const oldAbility = player.abilities[oldAbilityIndex];
    if (oldAbility.unlockAt !== level) return false;

    // Find the new ability in the class abilities
    const newAbilityTemplate = config
      .getClassAbilitiesByLevel(player.class!, level)
      .find((a: Ability) => a.type === newAbilityType);

    if (!newAbilityTemplate) {
      return false;
    }

    // Create a deep copy of the ability to avoid reference issues
    const newAbility = JSON.parse(JSON.stringify(newAbilityTemplate));

    // Replace the ability in player's abilities array
    player.abilities[oldAbilityIndex] = newAbility;

    // If the old ability was unlocked, update the unlocked abilities too
    if (player.unlocked) {
      const unlockedIndex = player.unlocked.findIndex(
        (a) => a.type === oldAbilityType
      );
      if (unlockedIndex !== -1) {
        player.unlocked[unlockedIndex] = newAbility;
      }
    }

    return true;
  }

  /**
   * Check if a target is invisible
   */
  static isTargetInvisible(target: any, systems: GameSystems): boolean {
    return (
      target !== config.MONSTER_ID &&
      target.hasStatusEffect &&
      systems.statusEffectSystem.hasEffect(target.id, 'invisible')
    );
  }

  /**
   * Check if a target is invisible and handle attack failure
   */
  static checkInvisibilityAndLog(
    actor: Player, 
    target: Player, 
    systems: GameSystems, 
    log: any[]
  ): boolean {
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

export default GameStateUtils;