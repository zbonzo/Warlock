/**
 * @fileoverview Attack-related ability handlers with proper coordination bonuses
 * Contains damage-dealing class abilities with coordination bonus integration
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
const GameStateUtils = require('../GameStateUtils');

/**
 * Game systems interface (temporary until full migration)
 */
interface GameSystems {
  gameStateUtils: {
    getAlivePlayers(): Player[];
  };
  monsterController: {
    takeDamage(damage: number, actor: Player, log: LogEntry[]): boolean;
    addThreat?(playerId: string, damageToMonster: number, totalDamage: number, healing: number, armor: number): void;
  };
  combatSystem: {
    applyDamageToPlayer(target: Player, damage: number, actor: Player, log: LogEntry[]): void;
    handlePotentialDeath?(target: Player, actor: Player, log: LogEntry[]): void;
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
    attemptConversion(actor: Player, target: Player | null, log: LogEntry[], modifier?: number): void;
    markWarlockDetected?(warlockId: string, log: LogEntry[]): void;
  };
  players: Map<string, Player>;
  monster: {
    hp: number;
  };
}

/**
 * Register all attack ability handlers with the registry
 * @param registry - Ability registry to register with
 */
export function register(registry: AbilityRegistry): void {
  // Register ability handlers by category and effect

  // 1. Basic single-target attack handler
  registry.registerClassAbility('attack', handleAttack);

  // 2. Register all abilities with category "Attack" to use the basic attack handler
  // This allows new attack abilities to work automatically
  registerAbilitiesByCategory(
    registry,
    'Attack',
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'attack',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    }
  );

  // 3. Register specific ability types that need custom handlers

  // Poison-based abilities
  registry.registerClassAbility('poisonStrike', handlePoisonStrike);
  registry.registerClassAbility('deathMark', handleDeathMark);
  registry.registerClassAbility('poisonTrap', handlePoisonTrap);
  registry.registerClassAbility('multiHitAttack', handleMultiHitAttack);
  registry.registerClassAbility('barbedArrow', handleBarbedArrow);
  registry.registerClassAbility('pyroblast', handlePyroblast);
  registry.registerClassAbility(
    'vulnerabilityStrike',
    handleVulnerabilityStrike
  );

  // AOE damage abilities - FIXED Inferno Blast
  registry.registerClassAbility('meteorShower', handleAoeDamage);
  registry.registerClassAbility('infernoBlast', handleInfernoBlast);
  registry.registerClassAbility('chainLightning', handleAoeDamage);

  registry.registerClassAbility('shiv', handleVulnerabilityStrike);

  // Register all AoE damage abilities (with null effect and Multi target)
  // Exclude already registered ones
  registerAbilitiesByEffectAndTarget(
    registry,
    null,
    'Multi',
    (actor, target, ability, log, systems, coordinationInfo) => {
      return registry.executeClassAbility(
        'meteorShower',
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    },
    ['infernoBlast', 'chainLightning'] // Exclude abilities with specific handlers
  );

  registry.registerClassAbility('arcaneBarrage', handleMultiHitAttack);
  registry.registerClassAbility('twinStrike', handleMultiHitAttack);

  registry.registerClassAbility('recklessStrike', handleRecklessStrike);

  // Register all vulnerable effect abilities
  registerAbilitiesByEffectAndTarget(
    registry,
    'vulnerable', // Effect
    'Single', // Target
    handleVulnerabilityStrike // Handler function
  );
}

/**
 * Handler for generic attack abilities with coordination bonuses
 * @param actor - Actor using the ability
 * @param target - Target of the ability
 * @param ability - Ability configuration
 * @param log - Event log to append messages to
 * @param systems - Game systems
 * @param coordinationInfo - Coordination bonus information
 * @returns Whether the ability was successful
 */
const handleAttack: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  // If target is a player (not monster) and is invisible, attack should fail
  if (GameStateUtils.isTargetInvisible(target, systems)) {
    const attackFailMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'attackInvisible'
    );
    log.push(
      messages.formatMessage(attackFailMessage, {
        attackerName: actor.name,
        targetName: typeof target === 'string' ? 'the Monster' : target.name,
      })
    );
    return false;
  }

  // Calculate base damage
  const rawDamage = Number(ability.params?.damage) || 0;

  // Apply actor's damage modifiers (race, class, level, etc.)
  let modifiedDamage = actor.modifyDamage ? actor.modifyDamage(rawDamage) : rawDamage;

  // Apply coordination bonus BEFORE applying damage
  if (coordinationInfo.coordinatedDamage && coordinationInfo.damageBonus && coordinationInfo.damageBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
    modifiedDamage = Math.floor(modifiedDamage * coordinationMultiplier);

    // Log coordination bonus application to attacker
    const coordinationPrivateLog: LogEntry = {
      type: 'coordination_damage_applied',
      public: false,
      attackerId: actor.id,
      message: '',
      privateMessage: `Coordination bonus increases your damage by ${coordinationInfo.damageBonus}% (${Math.floor(actor.modifyDamage ? actor.modifyDamage(rawDamage) : rawDamage)} → ${modifiedDamage})!`,
      attackerMessage: '',
    };
    log.push(coordinationPrivateLog);
  }

  // Apply comeback mechanics if active
  const alivePlayers = systems.gameStateUtils.getAlivePlayers();
  const goodPlayers = alivePlayers.filter((p: Player) => !p.isWarlock);
  const comebackActive = config.gameBalance?.shouldActiveComebackMechanics(
    goodPlayers.length,
    alivePlayers.length
  );

  if (comebackActive && !actor.isWarlock) {
    const comebackMultiplier =
      1 + (config.gameBalance?.comebackMechanics?.damageIncrease || 0) / 100;
    const beforeComeback = modifiedDamage;
    modifiedDamage = Math.floor(modifiedDamage * comebackMultiplier);

    if (modifiedDamage > beforeComeback) {
      const comebackPrivateLog: LogEntry = {
        type: 'comeback_damage_applied',
        public: false,
        attackerId: actor.id,
        message: '',
        privateMessage: `Comeback mechanics boost your damage by ${config.gameBalance?.comebackMechanics?.damageIncrease || 0}% (${beforeComeback} → ${modifiedDamage})!`,
        attackerMessage: '',
      };
      log.push(comebackPrivateLog);
    }
  }

  let actualDamage = 0;

  if (target === config.MONSTER_ID) {
    const success = systems.monsterController.takeDamage(
      modifiedDamage,
      actor,
      log
    );
    if (success) {
      actualDamage = modifiedDamage;

      // Trophy system: Track damage to monster
      if (actor.addDamageDealt) {
        actor.addDamageDealt(actualDamage);
      }

      // Generate warlock threat for attacking monster
      if (actor.isWarlock) {
        const randomConversionModifier =
          config.gameBalance?.warlock?.conversion?.randomModifier || 1;
        systems.warlockSystem.attemptConversion(
          actor,
          null,
          log,
          randomConversionModifier
        );
      }
    }
  } else {
    // Player target
    const playerTarget = target as Player;
    if (!playerTarget || !playerTarget.isAlive) return false;

    // Apply damage and track actual damage dealt
    const oldHp = playerTarget.hp;
    systems.combatSystem.applyDamageToPlayer(
      playerTarget,
      modifiedDamage,
      actor,
      log
    );
    actualDamage = oldHp - playerTarget.hp;

    // Warlocks may attempt to convert on attack
    if (actor.isWarlock) {
      systems.warlockSystem.attemptConversion(actor, playerTarget, log);
    }
  }

  // Apply threat for this action
  if (actualDamage > 0) {
    applyThreatForAbility(actor, target, ability, actualDamage, 0, systems);
  }

  return actualDamage > 0;
};

/**
 * Handler for poison strike ability with coordination bonuses
 */
const handlePoisonStrike: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  // Check if target is invisible
  if (GameStateUtils.checkInvisibilityAndLog(actor, target, systems, log)) {
    return false;
  }

  // First apply regular attack damage with coordination bonuses
  const attackResult = handleAttack(
    actor,
    target,
    ability,
    log,
    systems,
    coordinationInfo
  );

  // Then apply poison if attack was successful and target is still alive
  if (attackResult && target !== config.MONSTER_ID && typeof target !== 'string') {
    const playerTarget = target as Player;
    if (playerTarget.isAlive) {
      const poisonData = ability.params?.poison;
      if (poisonData) {
        let modifiedPoisonDamage = Math.floor(
          poisonData.damage * (actor.damageMod || 1.0)
        );

        // Apply coordination bonus to poison damage as well
        if (
          coordinationInfo.coordinatedDamage &&
          coordinationInfo.damageBonus &&
          coordinationInfo.damageBonus > 0
        ) {
          const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
          modifiedPoisonDamage = Math.floor(
            modifiedPoisonDamage * coordinationMultiplier
          );
        }

        // Apply poison using new status effect system
        systems.statusEffectSystem.applyEffect(
          playerTarget.id,
          'poison',
          {
            turns: poisonData.turns || 3,
            damage: modifiedPoisonDamage,
          },
          actor.id,
          actor.name,
          log
        );

        const poisonMessage = messages.getAbilityMessage(
          'abilities.attacks',
          'poisonApplied'
        );
        log.push(
          messages.formatMessage(poisonMessage, {
            playerName: playerTarget.name,
            targetName: playerTarget.name,
            damage: modifiedPoisonDamage,
            turns: poisonData.turns || 3,
          })
        );
      }
    }
  }

  return attackResult;
};

/**
 * Handler for AoE damage abilities with coordination bonuses
 */
const handleAoeDamage: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  const rawDamage = Number(ability.params?.damage) || 0;
  let modifiedDamage = actor.modifyDamage ? actor.modifyDamage(rawDamage) : rawDamage;

  // Apply coordination bonus to base damage
  if (coordinationInfo.coordinatedDamage && coordinationInfo.damageBonus && coordinationInfo.damageBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
    modifiedDamage = Math.floor(modifiedDamage * coordinationMultiplier);
  }

  // Apply comeback mechanics if active
  const alivePlayers = systems.gameStateUtils.getAlivePlayers();
  const goodPlayers = alivePlayers.filter((p: Player) => !p.isWarlock);
  const comebackActive = config.gameBalance?.shouldActiveComebackMechanics(
    goodPlayers.length,
    alivePlayers.length
  );

  if (comebackActive && !actor.isWarlock) {
    const comebackMultiplier =
      1 + (config.gameBalance?.comebackMechanics?.damageIncrease || 0) / 100;
    modifiedDamage = Math.floor(modifiedDamage * comebackMultiplier);
  }

  // Get potential targets based on ability configuration
  let targets: Player[] = [];

  // For AOE damage, typically hit all players except self, and potentially the monster
  if (ability.target === 'Multi' || target === 'multi') {
    // Get all alive players except the caster
    targets = Array.from(systems.players.values()).filter(
      (p: Player) => p.isAlive && p.id !== actor.id
    );

    // Some AOE abilities also hit the monster (check ability config)
    if (
      ability.params?.includeMonster !== false &&
      systems.monster &&
      systems.monster.hp > 0
    ) {
      // For monster, we'll handle it separately since it's not a player object
      const monsterSuccess = systems.monsterController.takeDamage(
        modifiedDamage,
        actor,
        log
      );

      if (monsterSuccess && actor.isWarlock) {
        const randomConversionModifier =
          config.gameBalance?.warlock?.conversion?.randomModifier || 1;
        systems.warlockSystem.attemptConversion(
          actor,
          null,
          log,
          randomConversionModifier
        );
      }
    }
  } else {
    // Fallback: if not explicitly multi-target, still try to handle it
    targets = Array.from(systems.players.values()).filter(
      (p: Player) => p.isAlive && p.id !== actor.id
    );
  }

  if (
    targets.length === 0 &&
    (ability.params?.includeMonster === false || systems.monster.hp <= 0)
  ) {
    const noTargetsMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'aoeNoTargets'
    );
    log.push(
      messages.formatMessage(noTargetsMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  // Apply damage to multiple targets
  const announceMessage = messages.getAbilityMessage(
    'abilities.attacks',
    'aoeAnnounce'
  );
  log.push(
    messages.formatMessage(announceMessage, {
      playerName: actor.name,
      abilityName: ability.name,
    })
  );

  let totalDamageDealt = 0;

  for (const potentialTarget of targets) {
    const oldHp = potentialTarget.hp;
    systems.combatSystem.applyDamageToPlayer(
      potentialTarget,
      modifiedDamage,
      actor,
      log
    );
    const actualDamage = oldHp - potentialTarget.hp;
    totalDamageDealt += actualDamage;

    // Check for warlock conversion with reduced chance for AoE
    const conversionModifier =
      config.gameBalance?.warlock?.conversion?.aoeModifier || 1;

    if (
      actor.isWarlock &&
      potentialTarget.isAlive &&
      !potentialTarget.isWarlock
    ) {
      systems.warlockSystem.attemptConversion(
        actor,
        potentialTarget,
        log,
        conversionModifier
      );
    }
  }

  // Apply threat for total AoE damage
  if (totalDamageDealt > 0) {
    applyThreatForAbility(
      actor,
      '__multi__',
      ability,
      totalDamageDealt,
      0,
      systems
    );
  }

  return true;
};

/**
 * Handler for vulnerability-inducing attacks with coordination bonuses
 */
const handleVulnerabilityStrike: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  // First deal normal damage with coordination bonuses
  const attackResult = handleAttack(
    actor,
    target,
    ability,
    log,
    systems,
    coordinationInfo
  );

  // If attack successful and target is a player, apply vulnerability
  if (attackResult && target !== config.MONSTER_ID && typeof target !== 'string') {
    const playerTarget = target as Player;
    if (playerTarget.isAlive) {
      // Get vulnerability parameters
      const vulnerableData = ability.params?.vulnerable || {};
      const damageIncrease = vulnerableData.damageIncrease || 50; // Default 50%
      const turns = vulnerableData.turns || 1; // Default 1 turn

      // Apply vulnerability directly to the player
      if (playerTarget.applyVulnerability) {
        playerTarget.applyVulnerability(damageIncrease, turns);
      }

      // Add a clear message
      const vulnMessage = messages.getAbilityMessage(
        'abilities.attacks',
        'vulnerabilityApplied'
      );
      log.push(
        messages.formatMessage(vulnMessage, {
          targetName: playerTarget.name,
          increase: damageIncrease,
          turns: turns,
        })
      );
    }
  }

  return attackResult;
};

/**
 * Handler for multi-hit attack abilities with coordination bonuses
 */
const handleMultiHitAttack: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  // If target is invisible, attack fails
  if (GameStateUtils.checkInvisibilityAndLog(actor, target, systems, log)) {
    return false;
  }

  // Get hit parameters
  const hits = ability.params?.hits || 1;

  // Use damage parameter for single-target, damagePerHit for multi-target
  let damagePerHit: number;
  if (ability.params?.damagePerHit) {
    damagePerHit = ability.params.damagePerHit;
  } else {
    damagePerHit = ability.params?.damage || 10;
  }

  // Apply actor's damage modifier
  let modifiedDamagePerHit = actor.modifyDamage ? actor.modifyDamage(damagePerHit) : damagePerHit;

  // Apply coordination bonus
  if (coordinationInfo.coordinatedDamage && coordinationInfo.damageBonus && coordinationInfo.damageBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
    modifiedDamagePerHit = Math.floor(
      modifiedDamagePerHit * coordinationMultiplier
    );
  }

  // Apply comeback mechanics if active
  const alivePlayers = systems.gameStateUtils.getAlivePlayers();
  const goodPlayers = alivePlayers.filter((p: Player) => !p.isWarlock);
  const comebackActive = config.gameBalance?.shouldActiveComebackMechanics(
    goodPlayers.length,
    alivePlayers.length
  );

  if (comebackActive && !actor.isWarlock) {
    const comebackMultiplier =
      1 + (config.gameBalance?.comebackMechanics?.damageIncrease || 0) / 100;
    modifiedDamagePerHit = Math.floor(
      modifiedDamagePerHit * comebackMultiplier
    );
  }

  // Announce the multi-hit attack
  const announceMessage = messages.getAbilityMessage(
    'abilities.attacks',
    'multiHitAnnounce'
  );

  const announceLog: LogEntry = {
    type: 'multi_hit_announce',
    public: false,
    attackerId: actor.id,
    targetId: target === config.MONSTER_ID ? config.MONSTER_ID : (target as Player).id,
    message: '',
    privateMessage: messages.formatMessage(announceMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      targetName: target === config.MONSTER_ID ? 'the Monster' : (target as Player).name,
      hits: hits,
    }),
    attackerMessage: messages.formatMessage(announceMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      targetName: target === config.MONSTER_ID ? 'the Monster' : (target as Player).name,
      hits: hits,
    }),
  };
  log.push(announceLog);

  let totalDamage = 0;
  let hitCount = 0;

  // Process each hit
  for (let i = 0; i < hits; i++) {
    const hitChance = ability.params?.hitChance || 1.0;

    if (Math.random() < hitChance) {
      hitCount++;

      if (target === config.MONSTER_ID) {
        const hitSuccess = systems.monsterController.takeDamage(
          modifiedDamagePerHit,
          actor,
          []
        );
        if (hitSuccess) {
          totalDamage += modifiedDamagePerHit;
        }
      } else {
        const playerTarget = target as Player;
        const oldHp = playerTarget.hp;
        const finalDamage = playerTarget.calculateDamageReduction 
          ? playerTarget.calculateDamageReduction(modifiedDamagePerHit)
          : modifiedDamagePerHit;
        playerTarget.hp = Math.max(0, playerTarget.hp - finalDamage);
        const actualDamage = oldHp - playerTarget.hp;

        if (playerTarget.hp <= 0) {
          playerTarget.isAlive = false;
          if (systems.combatSystem.handlePotentialDeath) {
            systems.combatSystem.handlePotentialDeath(playerTarget, actor, log);
          }
        }

        const hitMessage = messages.getAbilityMessage(
          'abilities.attacks',
          'multiHitIndividual'
        );

        const hitLog: LogEntry = {
          type: 'multi_hit_hit',
          public: false,
          attackerId: actor.id,
          targetId: playerTarget.id,
          message: '',
          privateMessage: messages.formatMessage(hitMessage, {
            hitNumber: hitCount,
            playerName: actor.name,
            damage: actualDamage,
            targetName: playerTarget.name,
          }),
          attackerMessage: messages.formatMessage(hitMessage, {
            hitNumber: hitCount,
            playerName: actor.name,
            damage: actualDamage,
            targetName: playerTarget.name,
          }),
        };
        log.push(hitLog);
        totalDamage += actualDamage;
      }
    } else {
      const missMessage = messages.getAbilityMessage(
        'abilities.attacks',
        'multiHitMiss'
      );
      const missLog: LogEntry = {
        type: 'multi_hit_miss',
        public: false,
        attackerId: actor.id,
        targetId: target === config.MONSTER_ID ? config.MONSTER_ID : (target as Player).id,
        message: '',
        privateMessage: messages.formatMessage(missMessage, {
          hitNumber: i + 1,
        }),
        attackerMessage: messages.formatMessage(missMessage, {
          hitNumber: i + 1,
        }),
      };
      log.push(missLog);
    }
  }

  // Log the total damage summary
  if (hitCount > 0) {
    const summaryMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'multiHitSummary'
    );

    const summaryLog: LogEntry = {
      type: 'multi_hit_summary',
      public: false,
      attackerId: actor.id,
      targetId: target === config.MONSTER_ID ? config.MONSTER_ID : (target as Player).id,
      message: '',
      privateMessage: messages.formatMessage(summaryMessage, {
        hitCount: hitCount,
        totalDamage: totalDamage,
      }),
      attackerMessage: messages.formatMessage(summaryMessage, {
        hitCount: hitCount,
        totalDamage: totalDamage,
      }),
    };
    log.push(summaryLog);

    // Apply threat for total damage dealt
    applyThreatForAbility(actor, target, ability, totalDamage, 0, systems);
  } else {
    const allMissedMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'multiHitMissed'
    );
    const missedLog: LogEntry = {
      type: 'multi_hit_missed',
      public: false,
      attackerId: actor.id,
      targetId: target === config.MONSTER_ID ? config.MONSTER_ID : (target as Player).id,
      message: '',
      privateMessage: allMissedMessage,
      attackerMessage: allMissedMessage,
    };
    log.push(missedLog);
  }

  // Check for warlock conversion on player targets
  if (target !== config.MONSTER_ID && actor.isWarlock && hitCount > 0) {
    systems.warlockSystem.attemptConversion(actor, target as Player, log);
  }

  return hitCount > 0;
};

/**
 * Handler for Reckless Strike ability (Barbarian) with coordination bonuses
 */
const handleRecklessStrike: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  // Check if target is invisible first
  if (GameStateUtils.isTargetInvisible(target, systems)) {
    const invisibleMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'attackInvisible'
    );
    log.push(
      messages.formatMessage(invisibleMessage, {
        attackerName: actor.name,
        targetName: typeof target === 'string' ? 'the Monster' : target.name,
      })
    );
    return false;
  }

  // Apply self-damage BEFORE the attack (to show the commitment)
  const selfDamage = ability.params?.selfDamage || 5;
  const oldHp = actor.hp;
  actor.hp = Math.max(1, actor.hp - selfDamage); // Cannot reduce below 1 HP
  const actualSelfDamage = oldHp - actor.hp;

  if (actualSelfDamage > 0) {
    const selfDamageMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'recklessStrikeSelfDamage'
    );
    log.push(
      messages.formatMessage(selfDamageMessage, {
        playerName: actor.name,
        damage: actualSelfDamage,
      })
    );
  }

  // Now perform the attack with coordination bonuses
  const rawDamage = Number(ability.params?.damage) || 0;
  let modifiedDamage = actor.modifyDamage ? actor.modifyDamage(rawDamage) : rawDamage;

  // Apply coordination bonus
  if (coordinationInfo.coordinatedDamage && coordinationInfo.damageBonus && coordinationInfo.damageBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
    modifiedDamage = Math.floor(modifiedDamage * coordinationMultiplier);
  }

  // Apply comeback mechanics if active
  const alivePlayers = systems.gameStateUtils.getAlivePlayers();
  const goodPlayers = alivePlayers.filter((p: Player) => !p.isWarlock);
  const comebackActive = config.gameBalance?.shouldActiveComebackMechanics(
    goodPlayers.length,
    alivePlayers.length
  );

  if (comebackActive && !actor.isWarlock) {
    const comebackMultiplier =
      1 + (config.gameBalance?.comebackMechanics?.damageIncrease || 0) / 100;
    modifiedDamage = Math.floor(modifiedDamage * comebackMultiplier);
  }

  if (target === config.MONSTER_ID) {
    systems.monsterController.takeDamage(modifiedDamage, actor, log);

    // Warlocks generate "threat" attacking monster
    if (actor.isWarlock) {
      const randomConversionModifier =
        config.gameBalance?.warlock?.conversion?.randomModifier || 1;
      systems.warlockSystem.attemptConversion(
        actor,
        null,
        log,
        randomConversionModifier
      );
    }
  } else {
    // Player target
    const playerTarget = target as Player;
    if (!playerTarget || !playerTarget.isAlive) return false;

    systems.combatSystem.applyDamageToPlayer(
      playerTarget,
      modifiedDamage,
      actor,
      log
    );

    // Warlocks may attempt to convert on attack
    if (actor.isWarlock) {
      systems.warlockSystem.attemptConversion(actor, playerTarget, log);
    }
  }

  return true;
};

// Additional handler implementations would continue here...
// For brevity, I'm including the key handlers. The remaining handlers follow similar patterns.

/**
 * Handler for barbed arrow with bleed and detection (with coordination bonuses)
 */
const handleBarbedArrow: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  return handleAttackWithDetection(
    actor,
    target,
    ability,
    log,
    systems,
    coordinationInfo,
    // Bleed effect handler
    (actor, target, ability, log, systems, coordinationInfo) => {
      const bleedData = ability.params?.bleed;
      if (bleedData && typeof target !== 'string' && target !== config.MONSTER_ID) {
        const playerTarget = target as Player;
        let modifiedBleedDamage = Math.floor(
          bleedData.damage * (actor.damageMod || 1.0)
        );

        // Apply coordination bonus to bleed as well
        if (
          coordinationInfo?.coordinatedDamage &&
          coordinationInfo.damageBonus &&
          coordinationInfo.damageBonus > 0
        ) {
          const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
          modifiedBleedDamage = Math.floor(
            modifiedBleedDamage * coordinationMultiplier
          );
        }

        systems.statusEffectSystem.applyEffect(
          playerTarget.id,
          'bleed',
          {
            turns: bleedData.turns || 3,
            damage: modifiedBleedDamage,
          },
          actor.id,
          actor.name,
          log
        );
      }
    }
  );
};

/**
 * Handler for pyroblast with burn/poison and detection (with coordination bonuses)
 */
const handlePyroblast: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  return handleAttackWithDetection(
    actor,
    target,
    ability,
    log,
    systems,
    coordinationInfo,
    // Burn/poison effect handler
    (actor, target, ability, log, systems, coordinationInfo) => {
      const burnData = ability.params?.poison || ability.params?.burn; // Support both naming conventions
      if (burnData && typeof target !== 'string' && target !== config.MONSTER_ID) {
        const playerTarget = target as Player;
        let modifiedBurnDamage = Math.floor(
          burnData.damage * (actor.damageMod || 1.0)
        );

        // Apply coordination bonus to burn damage as well
        if (
          coordinationInfo?.coordinatedDamage &&
          coordinationInfo.damageBonus &&
          coordinationInfo.damageBonus > 0
        ) {
          const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
          modifiedBurnDamage = Math.floor(
            modifiedBurnDamage * coordinationMultiplier
          );
        }

        systems.statusEffectSystem.applyEffect(
          playerTarget.id,
          'poison', // Use poison effect for burns
          {
            turns: burnData.turns || 3,
            damage: modifiedBurnDamage,
          },
          actor.id,
          actor.name,
          log
        );
      }
    }
  );
};

/**
 * Generic handler for attack abilities with detection and coordination bonuses
 */
function handleAttackWithDetection(
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {},
  additionalEffectHandler: ((actor: Player, target: Player | Monster | string, ability: Ability, log: LogEntry[], systems: GameSystems, coordinationInfo?: CoordinationInfo) => void) | null = null
): boolean {
  // Check if target is invisible
  if (GameStateUtils.isTargetInvisible(target, systems)) {
    const invisibleMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'attackInvisible'
    );
    log.push(
      messages.formatMessage(invisibleMessage, {
        attackerName: actor.name,
        targetName: typeof target === 'string' ? 'the Monster' : target.name,
      })
    );
    return false;
  }

  // First apply regular attack damage with coordination bonuses
  const attackResult = handleAttack(
    actor,
    target,
    ability,
    log,
    systems,
    coordinationInfo
  );

  // Apply additional effects if attack was successful and target is still alive
  if (attackResult && target !== config.MONSTER_ID && typeof target !== 'string') {
    const playerTarget = target as Player;
    // Apply any additional effects (poison, etc.)
    if (additionalEffectHandler) {
      additionalEffectHandler(
        actor,
        target,
        ability,
        log,
        systems,
        coordinationInfo
      );
    }

    // Detection logic - only works on living players
    if (
      ability.params?.detectChance &&
      Math.random() < ability.params.detectChance
    ) {
      const abilityType = ability.type; // Use ability type for message keys

      if (playerTarget.isWarlock) {
        // Mark warlock as detected for penalties
        if (systems.warlockSystem.markWarlockDetected) {
          systems.warlockSystem.markWarlockDetected(playerTarget.id, log);
        }

        // Private message to attacker revealing Warlock
        const privateDetectionLog: LogEntry = {
          type: `${abilityType}_detection`,
          public: false,
          targetId: playerTarget.id,
          attackerId: actor.id,
          message: '',
          privateMessage: '',
          attackerMessage: messages.formatMessage(
            messages.getAbilityMessage(
              'abilities.attacks',
              `${abilityType}DetectSuccess`
            ),
            { targetName: playerTarget.name }
          ),
        };
        log.push(privateDetectionLog);
      } else {
        // Private message confirming target is not a Warlock
        const privateNoDetectionLog: LogEntry = {
          type: `${abilityType}_no_detection`,
          public: false,
          targetId: playerTarget.id,
          attackerId: actor.id,
          message: '',
          privateMessage: '',
          attackerMessage: messages.formatMessage(
            messages.getAbilityMessage(
              'abilities.attacks',
              `${abilityType}DetectFail`
            ),
            { targetName: playerTarget.name }
          ),
        };
        log.push(privateNoDetectionLog);
      }
    }
  }

  return attackResult;
}

/**
 * Handler for inferno blast ability with coordination bonuses
 */
const handleInfernoBlast: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  const rawDamage = Number(ability.params?.damage) || 0;
  let modifiedDamage = actor.modifyDamage ? actor.modifyDamage(rawDamage) : rawDamage;

  // Apply coordination bonus
  if (coordinationInfo.coordinatedDamage && coordinationInfo.damageBonus && coordinationInfo.damageBonus > 0) {
    const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
    modifiedDamage = Math.floor(modifiedDamage * coordinationMultiplier);
  }

  // Apply comeback mechanics if active
  const alivePlayers = systems.gameStateUtils.getAlivePlayers();
  const goodPlayers = alivePlayers.filter((p: Player) => !p.isWarlock);
  const comebackActive = config.gameBalance?.shouldActiveComebackMechanics(
    goodPlayers.length,
    alivePlayers.length
  );

  if (comebackActive && !actor.isWarlock) {
    const comebackMultiplier =
      1 + (config.gameBalance?.comebackMechanics?.damageIncrease || 0) / 100;
    modifiedDamage = Math.floor(modifiedDamage * comebackMultiplier);
  }

  // Get potential targets (all alive players except self)
  const targets = Array.from(systems.players.values()).filter(
    (p: Player) => p.isAlive && p.id !== actor.id
  );

  if (targets.length === 0) {
    const noTargetsMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'aoeNoTargets'
    );
    log.push(
      messages.formatMessage(noTargetsMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  // Apply damage and poison to multiple targets
  const announceMessage = messages.getAbilityMessage(
    'abilities.attacks',
    'aoeAnnounce'
  );
  log.push(
    messages.formatMessage(announceMessage, {
      playerName: actor.name,
      abilityName: ability.name,
    })
  );

  // Get poison defaults from config if needed
  const poisonDefaults = {
    turns: 3,
    damage: 5,
  };

  for (const potentialTarget of targets) {
    // Apply direct damage
    systems.combatSystem.applyDamageToPlayer(
      potentialTarget,
      modifiedDamage,
      actor,
      log
    );

    // Apply poison if target is still alive
    if (potentialTarget.isAlive && ability.effect === 'poison') {
      const poisonData = ability.params?.poison || {};
      let modifiedPoisonDamage = Math.floor(
        (poisonData.damage || poisonDefaults.damage) * (actor.damageMod || 1.0)
      );

      // Apply coordination bonus to poison damage as well
      if (
        coordinationInfo.coordinatedDamage &&
        coordinationInfo.damageBonus &&
        coordinationInfo.damageBonus > 0
      ) {
        const coordinationMultiplier = 1 + coordinationInfo.damageBonus / 100;
        modifiedPoisonDamage = Math.floor(
          modifiedPoisonDamage * coordinationMultiplier
        );
      }

      systems.statusEffectSystem.applyEffect(
        potentialTarget.id,
        'poison',
        {
          turns: poisonData.turns || 3,
          damage: modifiedPoisonDamage,
        },
        actor.id,
        actor.name,
        log
      );

      const poisonMessage = messages.getAbilityMessage(
        'abilities.attacks',
        'infernoBlastPoison'
      );
      log.push(
        messages.formatMessage(poisonMessage, {
          targetName: potentialTarget.name,
          damage: modifiedPoisonDamage,
          turns: poisonData.turns || poisonDefaults.turns,
        })
      );
    }
  }

  return true;
};

/**
 * Handler for death mark ability (no coordination bonus needed - special ability)
 */
const handleDeathMark: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  if (target === config.MONSTER_ID) {
    const invalidMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'deathMarkInvalidTarget'
    );
    log.push(
      messages.formatMessage(invalidMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  const playerTarget = target as Player;

  // Get poison defaults from config if needed
  const poisonDefaults = {
    turns: 3,
    damage: 5,
  };

  // Apply high-damage poison to target
  const poisonData = ability.params?.poison || {};
  const modifiedPoisonDamage = Math.floor(
    (poisonData.damage || poisonDefaults.damage) * (actor.damageMod || 1.0)
  );

  systems.statusEffectSystem.applyEffect(
    playerTarget.id,
    'poison',
    {
      turns: poisonData.turns || 3,
      damage: modifiedPoisonDamage,
    },
    actor.id,
    actor.name,
    log
  );

  // Apply invisibility to the caster (actor)
  const invisibleData = ability.params?.selfInvisible || { duration: 1 };
  systems.statusEffectSystem.applyEffect(
    actor.id,
    'invisible',
    {
      turns: invisibleData.duration,
    },
    actor.id,
    actor.name,
    log
  );

  const deathMarkMessage = messages.getAbilityMessage(
    'abilities.attacks',
    'deathMarkPoison'
  );
  log.push(
    messages.formatMessage(deathMarkMessage, {
      playerName: actor.name,
      abilityName: ability.name,
      targetName: playerTarget.name,
      damage: modifiedPoisonDamage,
      turns: poisonData.turns || poisonDefaults.turns,
    })
  );

  return true;
};

/**
 * Handler for poison trap ability (AOE - coordination would be weird here)
 */
const handlePoisonTrap: AbilityHandler = (
  actor: Player,
  target: Player | Monster | string,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo: CoordinationInfo = {}
): boolean => {
  // Get all alive players except actor
  const targets = Array.from(systems.players.values()).filter(
    (p: Player) => p.isAlive && p.id !== actor.id
  );

  if (targets.length === 0) {
    const noTargetsMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'aoeNoTargets'
    );
    log.push(
      messages.formatMessage(noTargetsMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
    return false;
  }

  // Get poison defaults from config if needed
  const poisonDefaults = config.getStatusEffectDefaults?.('poison') || {
    turns: 2,
    damage: 5,
  };

  const poisonData = ability.params?.poison || {};
  const vulnerableData = ability.params?.vulnerable || {};
  const modifiedPoisonDamage = Math.floor(
    (poisonData.damage || poisonDefaults.damage) * (actor.damageMod || 1.0)
  );

  // Apply poison and vulnerability to multiple targets
  const announceMessage = messages.getAbilityMessage(
    'abilities.attacks',
    'poisonTrapAnnounce'
  );
  log.push(
    messages.formatMessage(announceMessage, {
      playerName: actor.name,
      abilityName: ability.name,
    })
  );

  let targetsHit = 0;

  // Get trap hit chance from ability params or use default
  const trapHitChance = ability.params?.hitChance || 0.75;

  for (const potentialTarget of targets) {
    if (Math.random() < trapHitChance) {
      // Apply poison
      systems.statusEffectSystem.applyEffect(
        potentialTarget.id,
        'poison',
        {
          turns: poisonData.turns || 3,
          damage: modifiedPoisonDamage,
        },
        actor.id,
        actor.name,
        log
      );

      // Apply vulnerability
      if (potentialTarget.applyVulnerability) {
        potentialTarget.applyVulnerability(
          vulnerableData.damageIncrease || 30,
          vulnerableData.turns || 2
        );
      }

      const caughtMessage = messages.getAbilityMessage(
        'abilities.attacks',
        'poisonTrapCaught'
      );
      log.push(
        messages.formatMessage(caughtMessage, {
          targetName: potentialTarget.name,
          playerName: actor.name,
          abilityName: ability.name,
          damage: modifiedPoisonDamage,
          turns: poisonData.turns || poisonDefaults.turns,
          increase: vulnerableData.damageIncrease || 30,
          vulnerableTurns: vulnerableData.turns || 2,
        })
      );
      targetsHit++;
    }
  }

  if (targetsHit === 0) {
    const missedMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'poisonTrapMissed'
    );
    log.push(
      messages.formatMessage(missedMessage, {
        playerName: actor.name,
        abilityName: ability.name,
      })
    );
  } else {
    const summaryMessage = messages.getAbilityMessage(
      'abilities.attacks',
      'poisonTrapSummary'
    );
    log.push(
      messages.formatMessage(summaryMessage, {
        count: targetsHit,
      })
    );
  }

  return true;
};
