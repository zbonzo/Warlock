/**
 * Monster type configurations for progressive difficulty
 */

const monsterTypes = {
  1: {
    type: 'wildBeast',
    name: 'Wild Beast',
    emoji: '🐺',
    description: 'A savage creature driven by primal hunger',
    stats: {
      hpMultiplier: 1.0,
      damageMultiplier: 1.0,
      armorMultiplier: 1.0
    },
    attackPattern: 'single',
    threatModifiers: {
      healers: 1.2  // Slightly prefers healers
    }
  },
  
  2: {
    type: 'direBear',
    name: 'Dire Bear',
    emoji: '🐻',
    description: 'A massive ursine monstrosity with devastating claws',
    stats: {
      hpMultiplier: 1.2,
      damageMultiplier: 0.9,
      armorMultiplier: 1.2
    },
    attackPattern: 'cleave',  // Hits main target + 1 adjacent
    specialAttack: {
      name: 'Savage Maul',
      chance: 0.3,
      effect: 'bleed',
      duration: 2
    }
  },
  
  3: {
    type: 'ancientDrake',
    name: 'Ancient Drake',
    emoji: '🦖',
    description: 'A primordial dragon wreathed in flames',
    stats: {
      hpMultiplier: 1.3,
      damageMultiplier: 1.1,
      armorMultiplier: 1.5
    },
    attackPattern: 'aoe',  // Breath attack hits 3 targets
    specialAttack: {
      name: 'Dragon Breath',
      chance: 0.4,
      effect: 'burn',
      targets: 3
    }
  },
  
  4: {
    type: 'stoneTitan',
    name: 'Stone Titan',
    emoji: '🗿',
    description: 'An ancient golem of living rock',
    stats: {
      hpMultiplier: 1.5,
      damageMultiplier: 1.2,
      armorMultiplier: 2.0
    },
    attackPattern: 'crush',
    specialAttack: {
      name: 'Seismic Slam',
      chance: 0.35,
      effect: 'stun',
      duration: 1
    }
  },
  
  5: {
    type: 'demonLord',
    name: 'Demon Lord',
    emoji: '👹',
    description: 'A malevolent entity from the abyss',
    stats: {
      hpMultiplier: 1.6,
      damageMultiplier: 1.3,
      armorMultiplier: 1.8
    },
    attackPattern: 'corrupt',
    specialAttack: {
      name: 'Soul Corruption',
      chance: 0.4,
      effect: 'corrupt',  // Turns player into temporary warlock
      duration: 2
    },
    passiveAbility: {
      name: 'Aura of Despair',
      effect: 'reduceDamage',  // All players deal 10% less damage
      amount: 0.1
    }
  },
  
  6: {
    type: 'voidLeviathan',
    name: 'Void Leviathan',
    emoji: '🌊',
    description: 'An aberration from beyond the veil of reality',
    stats: {
      hpMultiplier: 1.8,
      damageMultiplier: 1.4,
      armorMultiplier: 2.0
    },
    attackPattern: 'reality_warp',
    specialAttack: {
      name: 'Void Rift',
      chance: 0.45,
      effect: 'teleport',  // Swaps positions of 2 random players
      secondary: 'vulnerability'
    },
    passiveAbility: {
      name: 'Ethereal Form',
      effect: 'dodge',
      chance: 0.15  // 15% chance to phase through attacks
    }
  },
  
  7: {
    type: 'eldritchHorror',
    name: 'The Unnamed One',
    emoji: '👁️',
    description: 'An incomprehensible horror that defies mortal understanding',
    stats: {
      hpMultiplier: 2.0,
      damageMultiplier: 1.5,
      armorMultiplier: 2.5
    },
    attackPattern: 'madness',
    specialAttack: {
      name: 'Glimpse of Madness',
      chance: 0.5,
      effect: 'confusion',  // Players have 50% chance to hit wrong target
      targets: 'all',
      duration: 1
    },
    passiveAbility: {
      name: 'Immortal Essence',
      effect: 'regeneration',
      amount: 10  // Heals 10 HP per round
    },
    phaseTransition: {
      at: 0.5,  // At 50% HP
      newAttackPattern: 'apocalypse',
      message: 'The horror reveals its true form!'
    }
  }
};

/**
 * Attack pattern definitions
 */
const attackPatterns = {
  single: {
    targetsCount: 1,
    targetSelection: 'highest_threat'
  },
  cleave: {
    targetsCount: 2,
    targetSelection: 'main_plus_adjacent'
  },
  aoe: {
    targetsCount: 3,
    targetSelection: 'random_cluster'
  },
  crush: {
    targetsCount: 1,
    targetSelection: 'highest_hp',
    bonusDamage: 1.5
  },
  corrupt: {
    targetsCount: 1,
    targetSelection: 'non_warlock_highest_threat'
  },
  reality_warp: {
    targetsCount: 2,
    targetSelection: 'random',
    special: 'swap_positions'
  },
  madness: {
    targetsCount: 'all',
    targetSelection: 'all_alive',
    damageReduction: 0.5  // Madness attack does half damage
  },
  apocalypse: {
    targetsCount: 'all',
    targetSelection: 'all_alive',
    escalatingDamage: true  // Damage increases each use
  }
};

module.exports = {
  monsterTypes,
  attackPatterns,
  
  /**
   * Get monster configuration for a given level
   */
  getMonsterForLevel(level) {
    return monsterTypes[level] || monsterTypes[7];  // Cap at level 7
  },
  
  /**
   * Get attack pattern details
   */
  getAttackPattern(patternName) {
    return attackPatterns[patternName] || attackPatterns.single;
  }
};