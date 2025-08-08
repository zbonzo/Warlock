/**
 * @fileoverview Tests for StatusEffectManager
 * Comprehensive test suite for legacy status effect management with warlock detection
 */

import StatusEffectManager from '../../../../server/models/systems/StatusEffectManager';

// Mock dependencies
jest.mock('@config');
jest.mock('@messages');
jest.mock('@utils/logger');

// Test interfaces
interface MockPlayer {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  isWarlock?: boolean;
  race?: string;
  isVulnerable?: boolean;
  vulnerabilityIncrease?: number;
  stoneArmorIntact?: boolean;
  pendingDeath?: boolean;
  deathAttacker?: string;
  hasSubmittedAction?: boolean;
  clearActionSubmission?: jest.Mock;
  processStoneArmorDegradation?: jest.Mock;
  statusEffects: Record<string, any>;
  hasStatusEffect: jest.Mock;
}

interface MockWarlockSystem {
  markWarlockDetected?: jest.Mock;
}

describe('StatusEffectManager', () => {
  let manager: StatusEffectManager;
  let mockPlayers: Map<string, MockPlayer>;
  let mockWarlockSystem: MockWarlockSystem;
  let mockPlayer1: MockPlayer;
  let mockPlayer2: MockPlayer;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock players
    mockPlayer1 = {
      id: 'player1',
      name: 'Test Player 1',
      hp: 100,
      maxHp: 100,
      isAlive: true,
      isWarlock: false,
      race: 'Human',
      isVulnerable: false,
      vulnerabilityIncrease: 0,
      stoneArmorIntact: false,
      pendingDeath: false,
      hasSubmittedAction: false,
      clearActionSubmission: jest.fn(),
      processStoneArmorDegradation: jest.fn(),
      statusEffects: {},
      hasStatusEffect: jest.fn()
    };

    mockPlayer2 = {
      id: 'player2',
      name: 'Test Player 2',
      hp: 80,
      maxHp: 100,
      isAlive: true,
      isWarlock: true,
      race: 'Elf',
      isVulnerable: false,
      vulnerabilityIncrease: 0,
      stoneArmorIntact: false,
      pendingDeath: false,
      hasSubmittedAction: false,
      clearActionSubmission: jest.fn(),
      processStoneArmorDegradation: jest.fn(),
      statusEffects: {},
      hasStatusEffect: jest.fn()
    };

    mockPlayers = new Map([
      ['player1', mockPlayer1],
      ['player2', mockPlayer2]
    ]);

    mockWarlockSystem = {
      markWarlockDetected: jest.fn()
    };

    // Mock config
    const mockConfig = {
      getStatusEffectDefaults: jest.fn().mockReturnValue({
        turns: 3,
        damage: 5
      }),
      isEffectStackable: jest.fn().mockImplementation((effectName: string) => {
        return effectName === 'poison';
      }),
      isEffectRefreshable: jest.fn().mockImplementation((effectName: string) => {
        return effectName === 'vulnerable';
      }),
      statusEffects: {
        getEffectMessage: jest.fn().mockReturnValue('Mock effect message')
      },
      gameBalance: {
        player: {
          healing: {
            antiDetection: {
              detectionChance: 0.1
            }
          }
        }
      }
    };

    require('@config').__setMockConfig(mockConfig);

    // Mock messages
    const mockMessages = {
      getAbilityMessage: jest.fn().mockReturnValue('Heal message'),
      formatMessage: jest.fn().mockReturnValue('Formatted message'),
      getEvent: jest.fn().mockReturnValue({ type: 'test', message: 'Test event' })
    };

    require('@messages').__setMockMessages(mockMessages);

    manager = new StatusEffectManager(mockPlayers, mockWarlockSystem);
  });

  describe('Constructor', () => {
    it('should initialize with players and warlock system', () => {
      expect(manager).toBeDefined();
    });

    it('should initialize without warlock system', () => {
      const managerWithoutWarlock = new StatusEffectManager(mockPlayers);
      expect(managerWithoutWarlock).toBeDefined();
    });
  });

  describe('Effect Application', () => {
    beforeEach(() => {
      mockPlayer1.hasStatusEffect.mockReturnValue(false);
    });

    it('should apply new effect successfully', () => {
      const result = manager.applyEffect('player1', 'poison', { damage: 10, turns: 5 });

      expect(result).toBe(true);
      expect(mockPlayer1.statusEffects.poison).toEqual({
        turns: 3, // from defaults
        damage: 5, // from defaults
        ...{ damage: 10, turns: 5 } // merged with params
      });
    });

    it('should return false for dead player', () => {
      mockPlayer1.isAlive = false;

      const result = manager.applyEffect('player1', 'poison', { damage: 10 });

      expect(result).toBe(false);
    });

    it('should return false for non-existent player', () => {
      const result = manager.applyEffect('unknown', 'poison', { damage: 10 });

      expect(result).toBe(false);
    });

    it('should return false for unknown effect', () => {
      const mockConfig = require('@config');
      mockConfig.getStatusEffectDefaults.mockReturnValue(null);

      const result = manager.applyEffect('player1', 'unknownEffect', {});

      expect(result).toBe(false);
    });

    it('should refresh existing refreshable effect', () => {
      mockPlayer1.hasStatusEffect.mockReturnValue(true);
      mockPlayer1.statusEffects.vulnerable = { damageIncrease: 25, turns: 2 };

      const result = manager.applyEffect('player1', 'vulnerable', { damageIncrease: 30, turns: 4 });

      expect(result).toBe(true);
      expect(mockPlayer1.statusEffects.vulnerable).toEqual({
        turns: 3, // from defaults
        damage: 5, // from defaults
        damageIncrease: 30,
        turns: 4
      });
    });

    it('should stack poison effects', () => {
      mockPlayer1.hasStatusEffect.mockReturnValue(true);
      mockPlayer1.statusEffects.poison = { damage: 5, turns: 3 };

      const result = manager.applyEffect('player1', 'poison', { damage: 8, turns: 2 });

      expect(result).toBe(true);
      expect(mockPlayer1.statusEffects.poison.damage).toBe(13); // 5 + 8
      expect(mockPlayer1.statusEffects.poison.turns).toBe(3); // max(3, 2)
    });

    it('should not apply non-stackable, non-refreshable effects', () => {
      mockPlayer1.hasStatusEffect.mockReturnValue(true);

      const result = manager.applyEffect('player1', 'stunned', { turns: 3 });

      expect(result).toBe(true); // Still returns true but doesn't modify
    });
  });

  describe('Special Effect Application Handling', () => {
    beforeEach(() => {
      mockPlayer1.hasStatusEffect.mockReturnValue(false);
    });

    it('should handle vulnerable effect application', () => {
      manager.applyEffect('player1', 'vulnerable', { damageIncrease: 30 });

      expect(mockPlayer1.isVulnerable).toBe(true);
      expect(mockPlayer1.vulnerabilityIncrease).toBe(30);
    });

    it('should handle healing over time with healer info', () => {
      manager.applyEffect('player1', 'healingOverTime', {
        amount: 15,
        turns: 4,
        healerId: 'healer1',
        healerName: 'Test Healer',
        isWarlock: true
      });

      expect(mockPlayer1.statusEffects.healingOverTime.healerId).toBe('healer1');
      expect(mockPlayer1.statusEffects.healingOverTime.healerName).toBe('Test Healer');
      expect(mockPlayer1.statusEffects.healingOverTime.isWarlock).toBe(true);
    });
  });

  describe('Effect Processing', () => {
    it('should process all timed effects for alive players', () => {
      mockPlayer1.statusEffects = {
        poison: { damage: 5, turns: 2 },
        vulnerable: { damageIncrease: 25, turns: 1 }
      };
      mockPlayer2.statusEffects = {
        healingOverTime: { amount: 10, turns: 3 }
      };

      const log: any[] = [];
      manager.processTimedEffects(log);

      // Should have processed effects and generated log entries
      expect(log.length).toBeGreaterThan(0);
    });

    it('should skip dead players during processing', () => {
      mockPlayer1.isAlive = false;
      mockPlayer1.statusEffects = { poison: { damage: 5, turns: 2 } };
      mockPlayer2.statusEffects = { vulnerable: { damageIncrease: 25, turns: 1 } };

      const log: any[] = [];
      manager.processTimedEffects(log);

      // Should only process player2's effects
      expect(mockPlayer2.statusEffects.vulnerable.turns).toBe(0);
    });
  });

  describe('Poison Effect Processing', () => {
    beforeEach(() => {
      mockPlayer1.statusEffects = {
        poison: { damage: 10, turns: 3 }
      };
    });

    it('should apply poison damage and reduce turns', () => {
      const log: any[] = [];
      manager.processTimedEffects(log);

      expect(mockPlayer1.hp).toBe(90); // 100 - 10
      expect(mockPlayer1.statusEffects.poison.turns).toBe(2); // 3 - 1
    });

    it('should kill player with lethal poison damage', () => {
      mockPlayer1.hp = 5;
      mockPlayer1.statusEffects.poison.damage = 10;

      const log: any[] = [];
      manager.processTimedEffects(log);

      expect(mockPlayer1.hp).toBe(0);
      expect(mockPlayer1.isAlive).toBe(false);
      expect(mockPlayer1.pendingDeath).toBe(true);
      expect(mockPlayer1.deathAttacker).toBe('Poison');
    });

    it('should process stone armor degradation for Rockhewn', () => {
      mockPlayer1.race = 'Rockhewn';
      mockPlayer1.stoneArmorIntact = true;

      const log: any[] = [];
      manager.processTimedEffects(log);

      expect(mockPlayer1.processStoneArmorDegradation).toHaveBeenCalledWith(10);
    });

    it('should remove expired poison effects', () => {
      mockPlayer1.statusEffects.poison.turns = 1;

      const log: any[] = [];
      manager.processTimedEffects(log);

      expect(mockPlayer1.statusEffects).not.toHaveProperty('poison');
    });
  });

  describe('Healing Over Time Processing', () => {
    beforeEach(() => {
      mockPlayer2.hp = 70; // Below max HP
      mockPlayer2.statusEffects = {
        healingOverTime: {
          amount: 15,
          turns: 3,
          healerId: 'healer1',
          healerName: 'Test Healer'
        }
      };
    });

    it('should heal player and reduce turns', () => {
      const log: any[] = [];
      manager.processTimedEffects(log);

      expect(mockPlayer2.hp).toBe(85); // 70 + 15
      expect(mockPlayer2.statusEffects.healingOverTime.turns).toBe(2); // 3 - 1
    });

    it('should not overheal player', () => {
      mockPlayer2.hp = 95; // Close to max

      const log: any[] = [];
      manager.processTimedEffects(log);

      expect(mockPlayer2.hp).toBe(100); // Capped at maxHp
    });

    it('should detect warlock with healing over time', () => {
      // Mock random to always trigger detection
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.05); // Below detection chance

      const log: any[] = [];
      manager.processTimedEffects(log);

      expect(mockWarlockSystem.markWarlockDetected).toHaveBeenCalledWith('player2', log);
      expect(log).toContainEqual(expect.objectContaining({
        type: 'healing_over_time_detection',
        targetId: 'player2',
        attackerId: 'healer1'
      }));

      Math.random = originalRandom;
    });

    it('should not detect warlock if chance fails', () => {
      // Mock random to never trigger detection
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5); // Above detection chance

      const log: any[] = [];
      manager.processTimedEffects(log);

      expect(mockWarlockSystem.markWarlockDetected).not.toHaveBeenCalled();

      Math.random = originalRandom;
    });

    it('should not detect non-warlocks', () => {
      mockPlayer1.hp = 70;
      mockPlayer1.statusEffects = {
        healingOverTime: {
          amount: 15,
          turns: 3,
          healerId: 'healer1'
        }
      };

      const log: any[] = [];
      manager.processTimedEffects(log);

      expect(mockWarlockSystem.markWarlockDetected).not.toHaveBeenCalled();
    });

    it('should remove expired healing over time effects', () => {
      mockPlayer2.statusEffects.healingOverTime.turns = 1;

      const log: any[] = [];
      manager.processTimedEffects(log);

      expect(mockPlayer2.statusEffects).not.toHaveProperty('healingOverTime');
    });
  });

  describe('Timed Effect Processing', () => {
    it('should handle vulnerability expiration', () => {
      mockPlayer1.statusEffects = { vulnerable: { turns: 1, damageIncrease: 25 } };
      mockPlayer1.isVulnerable = true;
      mockPlayer1.vulnerabilityIncrease = 25;

      const log: any[] = [];
      manager.processTimedEffects(log);

      expect(mockPlayer1.isVulnerable).toBe(false);
      expect(mockPlayer1.vulnerabilityIncrease).toBe(0);
      expect(mockPlayer1.statusEffects).not.toHaveProperty('vulnerable');
    });

    it('should handle stun expiration and clear action submission', () => {
      mockPlayer1.statusEffects = { stunned: { turns: 1 } };
      mockPlayer1.hasSubmittedAction = true;

      const log: any[] = [];
      manager.processTimedEffects(log);

      expect(mockPlayer1.clearActionSubmission).toHaveBeenCalled();
      expect(mockPlayer1.statusEffects).not.toHaveProperty('stunned');
      expect(log).toContainEqual(expect.objectContaining({
        type: 'stun_expired',
        targetId: 'player1'
      }));
    });

    it('should decrement turns for other timed effects', () => {
      mockPlayer1.statusEffects = {
        shielded: { turns: 3, armor: 5 },
        invisible: { turns: 2 }
      };

      const log: any[] = [];
      manager.processTimedEffects(log);

      expect(mockPlayer1.statusEffects.shielded.turns).toBe(2);
      expect(mockPlayer1.statusEffects.invisible.turns).toBe(1);
    });
  });

  describe('Effect Removal', () => {
    beforeEach(() => {
      mockPlayer1.hasStatusEffect.mockImplementation((effectName: string) => {
        return mockPlayer1.statusEffects.hasOwnProperty(effectName);
      });
      mockPlayer1.statusEffects = {
        poison: { damage: 5, turns: 3 },
        vulnerable: { damageIncrease: 25, turns: 2 }
      };
      mockPlayer1.isVulnerable = true;
      mockPlayer1.vulnerabilityIncrease = 25;
    });

    it('should remove effect successfully', () => {
      const result = manager.removeEffect('player1', 'poison');

      expect(result).toBe(true);
      expect(mockPlayer1.statusEffects).not.toHaveProperty('poison');
    });

    it('should handle vulnerability cleanup', () => {
      const result = manager.removeEffect('player1', 'vulnerable');

      expect(result).toBe(true);
      expect(mockPlayer1.isVulnerable).toBe(false);
      expect(mockPlayer1.vulnerabilityIncrease).toBe(0);
    });

    it('should return false for non-existent player', () => {
      const result = manager.removeEffect('unknown', 'poison');

      expect(result).toBe(false);
    });

    it('should return false for non-existent effect', () => {
      const result = manager.removeEffect('player1', 'nonExistent');

      expect(result).toBe(false);
    });
  });

  describe('Effect Queries', () => {
    beforeEach(() => {
      mockPlayer1.hasStatusEffect.mockImplementation((effectName: string) => {
        return mockPlayer1.statusEffects.hasOwnProperty(effectName);
      });
      mockPlayer1.statusEffects = {
        poison: { damage: 5, turns: 3 },
        stunned: { turns: 2 }
      };
    });

    it('should check if player has effect', () => {
      expect(manager.hasEffect('player1', 'poison')).toBe(true);
      expect(manager.hasEffect('player1', 'vulnerable')).toBe(false);
    });

    it('should check if player is stunned', () => {
      expect(manager.isPlayerStunned('player1')).toBe(true);
      expect(manager.isPlayerStunned('player2')).toBe(false);
    });

    it('should check if player is invisible', () => {
      mockPlayer1.statusEffects.invisible = { turns: 3 };

      expect(manager.isPlayerInvisible('player1')).toBe(true);
      expect(manager.isPlayerInvisible('player2')).toBe(false);
    });

    it('should get player effects', () => {
      const effects = manager.getPlayerEffects('player1');

      expect(effects).toEqual(mockPlayer1.statusEffects);
    });

    it('should return empty object for non-existent player', () => {
      const effects = manager.getPlayerEffects('unknown');

      expect(effects).toEqual({});
    });
  });

  describe('Effect Duration Management', () => {
    beforeEach(() => {
      mockPlayer1.hasStatusEffect.mockImplementation((effectName: string) => {
        return mockPlayer1.statusEffects.hasOwnProperty(effectName);
      });
      mockPlayer1.statusEffects = {
        poison: { damage: 5, turns: 3 }
      };
    });

    it('should get effect duration', () => {
      const duration = manager.getEffectDuration('player1', 'poison');

      expect(duration).toBe(3);
    });

    it('should return 0 for non-existent effect', () => {
      const duration = manager.getEffectDuration('player1', 'vulnerable');

      expect(duration).toBe(0);
    });

    it('should modify effect duration', () => {
      const result = manager.modifyEffectDuration('player1', 'poison', -1);

      expect(result).toBe(true);
      expect(mockPlayer1.statusEffects.poison.turns).toBe(2);
    });

    it('should remove effect when duration reaches 0', () => {
      mockPlayer1.statusEffects.poison.turns = 1;

      const result = manager.modifyEffectDuration('player1', 'poison', -1);

      expect(result).toBe(true);
      expect(mockPlayer1.statusEffects).not.toHaveProperty('poison');
    });

    it('should not allow negative duration', () => {
      const result = manager.modifyEffectDuration('player1', 'poison', -5);

      expect(result).toBe(true);
      expect(mockPlayer1.statusEffects).not.toHaveProperty('poison');
    });
  });

  describe('Multiple Effects and Statistics', () => {
    beforeEach(() => {
      mockPlayer1.statusEffects = {
        poison: { damage: 5, turns: 3 },
        vulnerable: { damageIncrease: 25, turns: 2 }
      };
      mockPlayer2.statusEffects = {
        stunned: { turns: 1 },
        invisible: { turns: 4 }
      };
    });

    it('should apply multiple effects', () => {
      const effectsToApply = {
        shielded: { armor: 10, turns: 3 },
        healingOverTime: { amount: 5, turns: 5 }
      };

      const appliedCount = manager.applyMultipleEffects('player1', effectsToApply);

      expect(appliedCount).toBe(2);
    });

    it('should get effect statistics', () => {
      const stats = manager.getEffectStatistics();

      expect(stats.totalEffects).toBe(4);
      expect(stats.effectsByType.poison).toBe(1);
      expect(stats.effectsByType.vulnerable).toBe(1);
      expect(stats.effectsByType.stunned).toBe(1);
      expect(stats.effectsByType.invisible).toBe(1);
      expect(stats.playersCounts.poisoned).toBe(1);
      expect(stats.playersCounts.stunned).toBe(1);
      expect(stats.playersCounts.invisible).toBe(1);
      expect(stats.playersCounts.vulnerable).toBe(1);
    });

    it('should get all active effects', () => {
      const activeEffects = manager.getAllActiveEffects();

      expect(activeEffects).toHaveProperty('player1');
      expect(activeEffects).toHaveProperty('player2');
      expect(activeEffects.player1.playerName).toBe('Test Player 1');
      expect(activeEffects.player1.effects).toEqual(mockPlayer1.statusEffects);
    });

    it('should exclude dead players from statistics', () => {
      mockPlayer1.isAlive = false;

      const stats = manager.getEffectStatistics();

      expect(stats.totalEffects).toBe(2); // Only player2's effects
    });
  });

  describe('Clear All Effects', () => {
    beforeEach(() => {
      mockPlayer1.statusEffects = {
        poison: { damage: 5, turns: 3 },
        vulnerable: { damageIncrease: 25, turns: 2 }
      };
      mockPlayer1.isVulnerable = true;
      mockPlayer1.vulnerabilityIncrease = 25;
    });

    it('should clear all effects from player', () => {
      manager.clearAllEffects('player1');

      expect(mockPlayer1.statusEffects).toEqual({});
      expect(mockPlayer1.isVulnerable).toBe(false);
      expect(mockPlayer1.vulnerabilityIncrease).toBe(0);
    });

    it('should handle non-existent player gracefully', () => {
      expect(() => manager.clearAllEffects('unknown')).not.toThrow();
    });
  });
});

// Mock config module
jest.mock('@config', () => {
  const mockConfig = {};

  return {
    __esModule: true,
    default: mockConfig,
    __setMockConfig: (config: any) => {
      Object.assign(mockConfig, config);
    }
  };
});

// Mock messages module
jest.mock('@messages', () => {
  const mockMessages = {};

  return {
    __esModule: true,
    default: mockMessages,
    __setMockMessages: (messages: any) => {
      Object.assign(mockMessages, messages);
    }
  };
});

// Mock logger module
jest.mock('@utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));
