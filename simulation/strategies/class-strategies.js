/**
 * Helper function to handle multi-target abilities correctly
 * @param {Object} action - The action to use
 * @param {Object} gameState - Current game state
 * @param {string} myId - This player's ID
 * @returns {Object} Decision with proper targeting
 */
function handleMultiTargetAbility(action, gameState, myId) {
  // For multi-target abilities, just pick the first available target
  // The server will handle making it affect everyone
  const validTarget =
    action.targets.find(
      (targetId) => targetId !== myId || action.ability.target === 'Self'
    ) || action.targets[0];

  return {
    actionType: action.abilityType,
    targetId: validTarget,
  };
}

/**
 * @fileoverview Class-specific AI strategies
 * Each class has its own strategic approach based on its role and abilities
 */

const BaseStrategy = require('./base-strategy');

/**
 * Warrior Strategy - Tank role, protect allies
 */
class WarriorStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Critical health - prioritize Bandage
    if (player.hp <= player.maxHp * 0.3) {
      const bandage = this.findAction(availableActions, 'bandage');
      if (bandage) {
        return {
          actionType: 'bandage',
          targetId: myId,
        };
      }
    }

    // High threat or multiple allies injured - use Battle Cry
    if (
      this.gameMemory.threatLevel === 'high' ||
      this.gameMemory.threatLevel === 'critical'
    ) {
      const battleCry = this.findAction(availableActions, 'battleCry');
      if (battleCry) {
        // For multi-target buffs, target any player (the spell will affect everyone)
        const targetId = this.prioritizeTarget(
          battleCry.targets,
          gameState,
          myId,
          'any'
        );
        return {
          actionType: 'battleCry',
          targetId: targetId,
        };
      }
    }

    // Use Shield Wall when moderately threatened
    if (player.hp <= player.maxHp * 0.6) {
      const shieldWall = this.findAction(availableActions, 'shieldWall');
      if (shieldWall) {
        return {
          actionType: 'shieldWall',
          targetId: myId,
        };
      }
    }

    // Default to attacking to generate threat and protect allies
    const attackActions = this.getActionsByCategory(availableActions, 'Attack');
    if (attackActions.length > 0) {
      const action = attackActions[0];
      const targetId = this.prioritizeTarget(
        action.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: action.abilityType,
        targetId: targetId,
      };
    }

    return null;
  }
}

/**
 * Priest Strategy - Healing and detection focus
 */
class PriestStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Critical self-heal
    if (player.hp <= player.maxHp * 0.25) {
      const heal =
        this.findAction(availableActions, 'heal') ||
        this.findAction(availableActions, 'swiftMend');
      if (heal) {
        return {
          actionType: heal.abilityType,
          targetId: myId,
        };
      }
    }

    // Look for critically injured allies
    const mostInjured = this.getMostInjuredAlly(gameState, myId);
    if (mostInjured) {
      const injuredPlayer = gameState.players.get(mostInjured);
      if (injuredPlayer && injuredPlayer.hp <= injuredPlayer.maxHp * 0.4) {
        const heal =
          this.findAction(availableActions, 'heal') ||
          this.findAction(availableActions, 'swiftMend');
        if (heal) {
          return {
            actionType: heal.abilityType,
            targetId: mostInjured,
          };
        }
      }
    }

    // Use Divine Shield when team is threatened
    if (this.gameMemory.threatLevel === 'high') {
      const divineShield = this.findAction(availableActions, 'divineShield');
      if (divineShield) {
        // For multi-target buffs, target any player (the spell will affect everyone)
        const targetId = this.prioritizeTarget(
          divineShield.targets,
          gameState,
          myId,
          'any'
        );
        return {
          actionType: 'divineShield',
          targetId: targetId,
        };
      }
    }

    // Attack suspected Warlocks or monster
    const attackActions = this.getActionsByCategory(availableActions, 'Attack');
    if (attackActions.length > 0) {
      const action = attackActions[0];
      const targetId = this.prioritizeTarget(
        action.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: action.abilityType,
        targetId: targetId,
      };
    }

    return null;
  }
}

/**
 * Oracle Strategy - Detection and truth-seeking
 */
class OracleStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use Sanctuary when low HP for healing + detection
    if (player.hp <= player.maxHp * 0.4) {
      const sanctuary = this.findAction(availableActions, 'sanctuaryOfTruth');
      if (sanctuary) {
        return {
          actionType: 'sanctuaryOfTruth',
          targetId: myId,
        };
      }
    }

    // Use Eye of Fate on highly suspected targets (but only if we can afford the risk)
    if (this.canAffordRisk(player, 10)) {
      const mostSuspicious = this.getMostSuspiciousTarget(gameState, myId);
      if (mostSuspicious) {
        const eyeOfFate = this.findAction(availableActions, 'fatesEye');
        if (eyeOfFate && eyeOfFate.targets.includes(mostSuspicious)) {
          return {
            actionType: 'fatesEye',
            targetId: mostSuspicious,
          };
        }
      }
    }

    // Use Spirit Guard when threatened
    if (
      this.gameMemory.threatLevel === 'medium' ||
      this.gameMemory.threatLevel === 'high'
    ) {
      const spiritGuard = this.findAction(availableActions, 'spiritGuard');
      if (spiritGuard) {
        return {
          actionType: 'spiritGuard',
          targetId: myId,
        };
      }
    }

    // Attack with Psychic Bolt
    const psychicBolt = this.findAction(availableActions, 'psychicBolt');
    if (psychicBolt) {
      const targetId = this.prioritizeTarget(
        psychicBolt.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: 'psychicBolt',
        targetId: targetId,
      };
    }

    return null;
  }
}

/**
 * Pyromancer Strategy - High damage, careful positioning, detection capabilities
 */
class PyromancerStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Emergency healing when critical
    if (player.hp <= player.maxHp * 0.2) {
      const cauterize = this.findAction(availableActions, 'cauterize');
      if (cauterize) {
        return {
          actionType: 'cauterize',
          targetId: myId,
        };
      }
    }

    // NEW: Use Pyroblast for detection on suspected Warlocks
    const pyroblast = this.findAction(availableActions, 'pyroblast');
    if (pyroblast && this.gameMemory.suspectedWarlocks.size > 0) {
      const suspiciousTarget = this.getMostSuspiciousTarget(gameState, myId);
      if (suspiciousTarget && pyroblast.targets.includes(suspiciousTarget)) {
        // Prioritize detection over regular targeting
        console.log(
          `    ${player.name} using Pyroblast for Warlock detection on ${suspiciousTarget}`
        );
        return {
          actionType: 'pyroblast',
          targetId: suspiciousTarget,
        };
      }
    }

    // Use Inferno Blast when multiple enemies or late game
    const infernoBlast = this.findAction(availableActions, 'infernoBlast');
    if (
      infernoBlast &&
      (gameState.round >= 5 || this.gameMemory.suspectedWarlocks.size >= 2)
    ) {
      // For multi-target attacks, target any player (the spell will hit everyone)
      const targetId = this.prioritizeTarget(
        infernoBlast.targets,
        gameState,
        myId,
        'any'
      );
      return {
        actionType: 'infernoBlast',
        targetId: targetId,
      };
    }

    // Use Pyroblast for sustained damage (if not used for detection above)
    if (pyroblast) {
      const targetId = this.prioritizeTarget(
        pyroblast.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: 'pyroblast',
        targetId: targetId,
      };
    }

    // Default to Fireball
    const fireball = this.findAction(availableActions, 'fireball');
    if (fireball) {
      const targetId = this.prioritizeTarget(
        fireball.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'fireball',
        targetId: targetId,
      };
    }

    return null;
  }
}
/**
 * Assassin Strategy - Stealth and precise strikes
 */
class AssassinStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use invisibility when threatened
    if (player.hp <= player.maxHp * 0.5) {
      const shadowVeil = this.findAction(availableActions, 'shadowVeil');
      if (shadowVeil) {
        return {
          actionType: 'shadowVeil',
          targetId: myId,
        };
      }
    }

    // Use Death Mark on suspected Warlocks for poison + stealth combo
    const deathMark = this.findAction(availableActions, 'deathMark');
    if (deathMark) {
      const suspiciousTarget = this.getMostSuspiciousTarget(gameState, myId);
      if (suspiciousTarget && deathMark.targets.includes(suspiciousTarget)) {
        return {
          actionType: 'deathMark',
          targetId: suspiciousTarget,
        };
      }
    }

    // Twin Strike for sustained damage
    const twinStrike = this.findAction(availableActions, 'twinStrike');
    if (twinStrike) {
      const targetId = this.prioritizeTarget(
        twinStrike.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: 'twinStrike',
        targetId: targetId,
      };
    }

    // Backstab as default
    const backstab = this.findAction(availableActions, 'backstab');
    if (backstab) {
      const targetId = this.prioritizeTarget(
        backstab.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'backstab',
        targetId: targetId,
      };
    }

    return null;
  }
}

/**
 * Barbarian Strategy - Manage self-damage, focus on monster combat
 */
class BarbarianStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use Unstoppable Rage when desperate or for finishing moves
    if (
      (player.hp <= player.maxHp * 0.3 &&
        this.gameMemory.threatLevel === 'critical') ||
      gameState.monster?.hp <= 50
    ) {
      const unstoppableRage = this.findAction(
        availableActions,
        'unstoppableRage'
      );
      if (unstoppableRage) {
        return {
          actionType: 'unstoppableRage',
          targetId: myId,
        };
      }
    }

    // Use Primal Roar to weaken threats
    const primalRoar = this.findAction(availableActions, 'primalRoar');
    if (primalRoar) {
      const suspiciousTarget = this.getMostSuspiciousTarget(gameState, myId);
      if (suspiciousTarget && primalRoar.targets.includes(suspiciousTarget)) {
        return {
          actionType: 'primalRoar',
          targetId: suspiciousTarget,
        };
      }
    }

    // Blood Frenzy when moderately injured for damage boost
    if (player.hp <= player.maxHp * 0.7) {
      const bloodFrenzy = this.findAction(availableActions, 'bloodFrenzy');
      if (bloodFrenzy) {
        return {
          actionType: 'bloodFrenzy',
          targetId: myId,
        };
      }
    }

    // Reckless Strike - be careful about self-damage
    const recklessStrike = this.findAction(availableActions, 'recklessStrike');
    if (recklessStrike && this.canAffordRisk(player, 10)) {
      const targetId = this.prioritizeTarget(
        recklessStrike.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'recklessStrike',
        targetId: targetId,
      };
    }

    return null;
  }
}

/**
 * Wizard Strategy - Powerful late-game abilities, careful positioning
 */
class WizardStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use Arcane Shield when threatened
    if (player.hp <= player.maxHp * 0.6) {
      const arcaneShield = this.findAction(availableActions, 'arcaneShield');
      if (arcaneShield) {
        return {
          actionType: 'arcaneShield',
          targetId: myId,
        };
      }
    }

    // Meteor Shower for multiple targets or late game
    const meteorShower = this.findAction(availableActions, 'meteorShower');
    if (
      meteorShower &&
      (gameState.round >= 4 || this.getAlivePlayers(gameState).length >= 6)
    ) {
      // For multi-target attacks, target any player (the spell will hit everyone)
      const targetId = this.prioritizeTarget(
        meteorShower.targets,
        gameState,
        myId,
        'any'
      );
      return {
        actionType: 'meteorShower',
        targetId: targetId,
      };
    }

    // Magic Missile for high single-target damage
    const magicMissile = this.findAction(availableActions, 'magicMissile');
    if (magicMissile) {
      const targetId = this.prioritizeTarget(
        magicMissile.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: 'magicMissile',
        targetId: targetId,
      };
    }

    // Arcane Barrage as early-game option
    const arcaneBarrage = this.findAction(availableActions, 'arcaneBarrage');
    if (arcaneBarrage) {
      const targetId = this.prioritizeTarget(
        arcaneBarrage.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'arcaneBarrage',
        targetId: targetId,
      };
    }

    return null;
  }
}

/**
 * Alchemist Strategy - Poison and invisibility tactics
 */
class AlchemistStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use Smoke Bomb when threatened
    if (player.hp <= player.maxHp * 0.5) {
      const smokeBomb = this.findAction(availableActions, 'smokeBomb');
      if (smokeBomb) {
        return {
          actionType: 'smokeBomb',
          targetId: myId,
        };
      }
    }

    // Poison Trap for area control
    const poisonTrap = this.findAction(availableActions, 'poisonTrap');
    if (
      poisonTrap &&
      (this.gameMemory.suspectedWarlocks.size >= 2 || gameState.round >= 3)
    ) {
      // For multi-target attacks, target any player (the spell will hit everyone)
      const targetId = this.prioritizeTarget(
        poisonTrap.targets,
        gameState,
        myId,
        'any'
      );
      return {
        actionType: 'poisonTrap',
        targetId: targetId,
      };
    }

    // Shiv for vulnerability application
    const shiv = this.findAction(availableActions, 'shiv');
    if (shiv) {
      const targetId = this.prioritizeTarget(
        shiv.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: 'shiv',
        targetId: targetId,
      };
    }

    // Poison Strike as default
    const poisonStrike = this.findAction(availableActions, 'poisonStrike');
    if (poisonStrike) {
      const targetId = this.prioritizeTarget(
        poisonStrike.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'poisonStrike',
        targetId: targetId,
      };
    }

    return null;
  }
}

/**
 * Shaman Strategy - Balanced combat and healing
 */
class ShamanStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Heal critically injured allies
    const mostInjured = this.getMostInjuredAlly(gameState, myId);
    if (mostInjured) {
      const injuredPlayer = gameState.players.get(mostInjured);
      if (injuredPlayer && injuredPlayer.hp <= injuredPlayer.maxHp * 0.3) {
        const ancestralHeal = this.findAction(
          availableActions,
          'ancestralHeal'
        );
        if (ancestralHeal) {
          return {
            actionType: 'ancestralHeal',
            targetId: mostInjured,
          };
        }
      }
    }

    // Use Totemic Barrier when threatened
    if (player.hp <= player.maxHp * 0.6) {
      const totemShield = this.findAction(availableActions, 'totemShield');
      if (totemShield) {
        return {
          actionType: 'totemShield',
          targetId: myId,
        };
      }
    }

    // Chain Lightning for multiple targets
    const chainLightning = this.findAction(availableActions, 'chainLightning');
    if (
      chainLightning &&
      (this.getAlivePlayers(gameState).length >= 5 ||
        this.gameMemory.suspectedWarlocks.size >= 2)
    ) {
      // For multi-target attacks, target any player (the spell will hit everyone)
      const targetId = this.prioritizeTarget(
        chainLightning.targets,
        gameState,
        myId,
        'any'
      );
      return {
        actionType: 'chainLightning',
        targetId: targetId,
      };
    }

    // Lightning Bolt as default attack
    const lightningBolt = this.findAction(availableActions, 'lightningBolt');
    if (lightningBolt) {
      const targetId = this.prioritizeTarget(
        lightningBolt.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'lightningBolt',
        targetId: targetId,
      };
    }

    return null;
  }
}

/**
 * Gunslinger Strategy - Ranged safety, smoke screen escapes
 */
class GunslingerStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use Smoke Screen when threatened
    if (player.hp <= player.maxHp * 0.5) {
      const smokeScreen = this.findAction(availableActions, 'smokeScreen');
      if (smokeScreen) {
        return {
          actionType: 'smokeScreen',
          targetId: myId,
        };
      }
    }

    // Aimed Shot for high single-target damage
    const aimedShot = this.findAction(availableActions, 'aimedShot');
    if (aimedShot) {
      const targetId = this.prioritizeTarget(
        aimedShot.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: 'aimedShot',
        targetId: targetId,
      };
    }

    // Ricochet Round for multiple targets
    const ricochetRound = this.findAction(availableActions, 'ricochetRound');
    if (
      ricochetRound &&
      (this.getAlivePlayers(gameState).length >= 5 || gameState.round >= 4)
    ) {
      // For multi-target attacks, target any player (the spell will hit everyone)
      const targetId = this.prioritizeTarget(
        ricochetRound.targets,
        gameState,
        myId,
        'any'
      );
      return {
        actionType: 'ricochetRound',
        targetId: targetId,
      };
    }

    // Pistol Shot as reliable default
    const pistolShot = this.findAction(availableActions, 'pistolShot');
    if (pistolShot) {
      const targetId = this.prioritizeTarget(
        pistolShot.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'pistolShot',
        targetId: targetId,
      };
    }

    return null;
  }
}

/**
 * Tracker Strategy - Control Monster against Warlocks, precision shots, detection
 */
class TrackerStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use Control Monster on suspected Warlocks when available
    const controlMonster = this.findAction(availableActions, 'controlMonster');
    if (controlMonster && this.gameMemory.suspectedWarlocks.size > 0) {
      const suspiciousTarget = this.getMostSuspiciousTarget(gameState, myId);
      if (
        suspiciousTarget &&
        controlMonster.targets.includes(suspiciousTarget)
      ) {
        return {
          actionType: 'controlMonster',
          targetId: suspiciousTarget,
        };
      }
    }

    // NEW: Use Barbed Arrow for detection on suspected Warlocks
    const barbedArrow = this.findAction(availableActions, 'barbedArrow');
    if (barbedArrow && this.gameMemory.suspectedWarlocks.size > 0) {
      const suspiciousTarget = this.getMostSuspiciousTarget(gameState, myId);
      if (suspiciousTarget && barbedArrow.targets.includes(suspiciousTarget)) {
        // Prioritize detection over regular damage
        console.log(
          `    ${player.name} using Barbed Arrow for Warlock detection on ${suspiciousTarget}`
        );
        return {
          actionType: 'barbedArrow',
          targetId: suspiciousTarget,
        };
      }
    }

    // Use Camouflage when threatened
    if (player.hp <= player.maxHp * 0.5) {
      const camouflage = this.findAction(availableActions, 'camouflage');
      if (camouflage) {
        return {
          actionType: 'camouflage',
          targetId: myId,
        };
      }
    }

    // Barbed Arrow for sustained damage (if not used for detection above)
    if (barbedArrow) {
      const targetId = this.prioritizeTarget(
        barbedArrow.targets,
        gameState,
        myId,
        'warlock'
      );
      return {
        actionType: 'barbedArrow',
        targetId: targetId,
      };
    }

    // Precise Shot as default
    const preciseShot = this.findAction(availableActions, 'preciseShot');
    if (preciseShot) {
      const targetId = this.prioritizeTarget(
        preciseShot.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'preciseShot',
        targetId: targetId,
      };
    }

    return null;
  }
}

/**
 * Druid Strategy - Crowd control, healing over time, early fast attacks
 */
class DruidStrategy extends BaseStrategy {
  makeDecision(availableActions, gameState, player) {
    const myId = this.getMyPlayerId(gameState);

    // Use Rejuvenation when multiple allies are injured
    const injuredCount = this.getAlivePlayers(gameState).filter(
      (p) =>
        p.hp <= p.maxHp * 0.7 &&
        gameState.players.get(this.getMyPlayerId(gameState)) !== p
    ).length;

    if (injuredCount >= 2) {
      const rejuvenation = this.findAction(availableActions, 'rejuvenation');
      if (rejuvenation) {
        // For multi-target heals, target any player (the spell will heal everyone)
        const targetId = this.prioritizeTarget(
          rejuvenation.targets,
          gameState,
          myId,
          'any'
        );
        return {
          actionType: 'rejuvenation',
          targetId: targetId,
        };
      }
    }

    // Use Entangling Roots for crowd control when multiple enemies
    const entangle = this.findAction(availableActions, 'entangle');
    if (
      entangle &&
      (this.gameMemory.suspectedWarlocks.size >= 2 ||
        this.gameMemory.threatLevel === 'high')
    ) {
      // For multi-target stuns, target any player (the spell will hit everyone except monster and user)
      const targetId = this.prioritizeTarget(
        entangle.targets,
        gameState,
        myId,
        'any'
      );
      return {
        actionType: 'entangle',
        targetId: targetId,
      };
    }

    // Use Barkskin when moderately threatened
    if (player.hp <= player.maxHp * 0.6) {
      const barkskin = this.findAction(availableActions, 'barkskin');
      if (barkskin) {
        return {
          actionType: 'barkskin',
          targetId: myId,
        };
      }
    }

    // Claw Swipe as fast default attack
    const clawSwipe = this.findAction(availableActions, 'clawSwipe');
    if (clawSwipe) {
      const targetId = this.prioritizeTarget(
        clawSwipe.targets,
        gameState,
        myId,
        'monster'
      );
      return {
        actionType: 'clawSwipe',
        targetId: targetId,
      };
    }

    return null;
  }
}

/**
 * Factory function to create class strategies
 * @param {string} className - Class name
 * @param {string} playerName - Player name
 * @returns {BaseStrategy} Appropriate strategy instance
 */
function createClassStrategy(className, playerName) {
  switch (className) {
    case 'Warrior':
      return new WarriorStrategy(playerName);
    case 'Priest':
      return new PriestStrategy(playerName);
    case 'Oracle':
      return new OracleStrategy(playerName);
    case 'Pyromancer':
      return new PyromancerStrategy(playerName);
    case 'Assassin':
      return new AssassinStrategy(playerName);
    case 'Barbarian':
      return new BarbarianStrategy(playerName);
    case 'Wizard':
      return new WizardStrategy(playerName);
    case 'Alchemist':
      return new AlchemistStrategy(playerName);
    case 'Shaman':
      return new ShamanStrategy(playerName);
    case 'Gunslinger':
      return new GunslingerStrategy(playerName);
    case 'Tracker':
      return new TrackerStrategy(playerName);
    case 'Druid':
      return new DruidStrategy(playerName);
    default:
      return new BaseStrategy(playerName);
  }
}

module.exports = {
  WarriorStrategy,
  PriestStrategy,
  OracleStrategy,
  PyromancerStrategy,
  AssassinStrategy,
  BarbarianStrategy,
  WizardStrategy,
  AlchemistStrategy,
  ShamanStrategy,
  GunslingerStrategy,
  TrackerStrategy,
  DruidStrategy,
  createClassStrategy,
};
