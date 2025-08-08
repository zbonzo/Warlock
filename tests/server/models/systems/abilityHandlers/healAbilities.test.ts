/**
 * @fileoverview Tests for healAbilities handlers
 */
import { register } from '../../../../../server/models/systems/abilityHandlers/healAbilities';
import type { AbilityRegistry, AbilityHandler, CoordinationInfo, LogEntry } from '../../../../../server/models/systems/abilityHandlers/abilityRegistryUtils';
import type { Player, Monster, Ability } from '../../../../../server/types/generated';

// Mock dependencies
jest.mock('@config');
jest.mock('@messages');

const mockConfig = require('@config');
const mockMessages = require('@messages');

// Mock game systems interface
interface MockGameSystems {
  gameStateUtils: {
    getAlivePlayers(): Player[];
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
    markWarlockDetected?(warlockId: string, log: LogEntry[]): void;
  };
  players: Map<string, Player>;
}

describe('healAbilities', () => {
  let mockRegistry: jest.Mocked<AbilityRegistry>;
  let mockSystems: MockGameSystems;
  let mockActor: Player;
  let mockTarget: Player;
  let mockWarlockTarget: Player;
  let mockAbility: Ability;
  let log: LogEntry[];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock config
    mockConfig.gameBalance = {
      player: {
        healing: {
          antiDetection: {
            enabled: false,
            alwaysHealWarlocks: false,
            detectionChance: 0.05
          }
        }
      }
    };

    // Mock messages
    mockMessages.getAbilityMessage = jest.fn((category, key) => `${category}.${key}`);
    mockMessages.formatMessage = jest.fn((template, params) =>
      `Formatted: ${template} with ${JSON.stringify(params)}`
    );

    // Create mock registry
    mockRegistry = {
      registerClassAbility: jest.fn(),
      executeClassAbility: jest.fn(),
      getHandler: jest.fn()
    } as any;

    // Create mock players
    mockActor = {
      id: 'healer1',
      name: 'TestHealer',
      hp: 100,
      maxHp: 100,
      isAlive: true,
      isWarlock: false,
      getHealingModifier: jest.fn().mockReturnValue(1.0),
      addHealingDone: jest.fn(),
      addSelfHeal: jest.fn()
    } as any;

    mockTarget = {
      id: 'target1',
      name: 'TestTarget',
      hp: 60,
      maxHp: 100,
      isAlive: true,
      isWarlock: false
    } as any;

    mockWarlockTarget = {
      id: 'warlock1',
      name: 'TestWarlock',
      hp: 50,
      maxHp: 100,
      isAlive: true,
      isWarlock: true
    } as any;

    // Create mock systems
    mockSystems = {
      gameStateUtils: {
        getAlivePlayers: jest.fn().mockReturnValue([mockActor, mockTarget, mockWarlockTarget])
      },
      statusEffectSystem: {
        applyEffect: jest.fn()
      },
      warlockSystem: {
        markWarlockDetected: jest.fn()
      },
      players: new Map([
        ['healer1', mockActor],
        ['target1', mockTarget],
        ['warlock1', mockWarlockTarget]
      ])
    };

    // Create mock ability
    mockAbility = {
      id: 'testHeal',
      name: 'Test Heal',
      type: 'heal',
      category: 'Heal',
      target: 'Single',
      effect: null,
      params: {
        amount: 25
      }
    } as any;

    log = [];
  });

  describe('register function', () => {
    it('should register all healing ability handlers', () => {
      register(mockRegistry);

      // Verify core healing abilities are registered
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('heal', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('swiftMend', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('bandage', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('cauterize', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('ancestralHeal', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('rejuvenation', expect.any(Function));
    });
  });

  describe('basic heal handler', () => {
    let healHandler: AbilityHandler;

    beforeEach(() => {
      register(mockRegistry);
      // Get the heal handler from the first registerClassAbility call
      healHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'heal'
      )?.[1];
    });

    describe('old system (anti-detection disabled)', () => {
      beforeEach(() => {
        mockConfig.gameBalance.player.healing.antiDetection.enabled = false;
      });

      it('should heal non-warlock target successfully', () => {
        const result = healHandler(
          mockActor,
          mockTarget,
          mockAbility,
          log,
          mockSystems
        );

        expect(result).toBe(true);
        expect(mockTarget.hp).toBe(85); // 60 + 25
        expect(mockActor.addHealingDone).toHaveBeenCalledWith(25);
        expect(log.some(entry => entry.includes('healSuccess'))).toBe(true);
      });

      it('should fail to heal warlock target', () => {
        const result = healHandler(
          mockActor,
          mockWarlockTarget,
          mockAbility,
          log,
          mockSystems
        );

        expect(result).toBe(false);
        expect(mockWarlockTarget.hp).toBe(50); // Unchanged
        expect(mockActor.addHealingDone).not.toHaveBeenCalled();
        expect(log.some(entry => entry.includes('healFailWarlock'))).toBe(true);
      });

      it('should not overheal target', () => {
        mockTarget.hp = 90; // Only needs 10 HP

        const result = healHandler(
          mockActor,
          mockTarget,
          mockAbility,
          log,
          mockSystems
        );

        expect(result).toBe(true);
        expect(mockTarget.hp).toBe(100); // Capped at max HP
        expect(mockActor.addHealingDone).toHaveBeenCalledWith(10);
      });

      it('should not heal target at full HP', () => {
        mockTarget.hp = 100;

        const result = healHandler(
          mockActor,
          mockTarget,
          mockAbility,
          log,
          mockSystems
        );

        expect(result).toBe(false);
        expect(mockTarget.hp).toBe(100);
        expect(mockActor.addHealingDone).not.toHaveBeenCalled();
      });
    });

    describe('new system (anti-detection enabled)', () => {
      beforeEach(() => {
        mockConfig.gameBalance.player.healing.antiDetection.enabled = true;
        mockConfig.gameBalance.player.healing.antiDetection.alwaysHealWarlocks = true;
        mockConfig.gameBalance.player.healing.antiDetection.detectionChance = 0.05;
      });

      it('should heal warlock target successfully in new system', () => {
        const result = healHandler(
          mockActor,
          mockWarlockTarget,
          mockAbility,
          log,
          mockSystems
        );

        expect(result).toBe(true);
        expect(mockWarlockTarget.hp).toBe(75); // 50 + 25
        expect(mockActor.addHealingDone).toHaveBeenCalledWith(25);
        expect(log.some(entry => entry.includes('healSuccess'))).toBe(true);
      });

      it('should heal non-warlock target normally in new system', () => {
        const result = healHandler(
          mockActor,
          mockTarget,
          mockAbility,
          log,
          mockSystems
        );

        expect(result).toBe(true);
        expect(mockTarget.hp).toBe(85); // 60 + 25
        expect(mockActor.addHealingDone).toHaveBeenCalledWith(25);
      });

      it('should have chance to detect warlock when healing', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.01); // Below detection chance

        const result = healHandler(
          mockActor,
          mockWarlockTarget,
          mockAbility,
          log,
          mockSystems
        );

        expect(result).toBe(true);
        expect(mockWarlockTarget.hp).toBe(75); // Still healed
        expect(mockSystems.warlockSystem.markWarlockDetected).toHaveBeenCalledWith(
          mockWarlockTarget.id,
          log
        );
        expect(log.some(entry =>
          entry.type === 'healing_detection' &&
          entry.message?.includes('IS a Warlock')
        )).toBe(true);

        jest.restoreAllMocks();
      });

      it('should not detect warlock when random is above threshold', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.1); // Above detection chance

        const result = healHandler(
          mockActor,
          mockWarlockTarget,
          mockAbility,
          log,
          mockSystems
        );

        expect(result).toBe(true);
        expect(mockWarlockTarget.hp).toBe(75); // Still healed
        expect(mockSystems.warlockSystem.markWarlockDetected).not.toHaveBeenCalled();
        expect(log.some(entry => entry.type === 'healing_detection')).toBe(false);

        jest.restoreAllMocks();
      });

      it('should not attempt detection if no actual healing occurred', () => {
        mockWarlockTarget.hp = 100; // Already at full HP

        const result = healHandler(
          mockActor,
          mockWarlockTarget,
          mockAbility,
          log,
          mockSystems
        );

        expect(result).toBe(true); // Still returns true in new system
        expect(mockWarlockTarget.hp).toBe(100);
        expect(mockSystems.warlockSystem.markWarlockDetected).not.toHaveBeenCalled();
      });
    });

    it('should apply healing modifier correctly', () => {
      mockActor.getHealingModifier = jest.fn().mockReturnValue(1.5);

      const result = healHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockTarget.hp).toBe(97); // 60 + (25 * 1.5) = 60 + 37 = 97
      expect(mockActor.addHealingDone).toHaveBeenCalledWith(37);
    });

    it('should apply coordination bonus correctly', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedHealing: true,
        healingBonus: 40
      };

      const result = healHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      // 25 * 1.40 = 35
      expect(mockTarget.hp).toBe(95); // 60 + 35
      expect(mockActor.addHealingDone).toHaveBeenCalledWith(35);

      // Should log coordination bonus
      expect(log.some(entry =>
        entry.type === 'coordination_healing_applied' &&
        entry.privateMessage?.includes('40%')
      )).toBe(true);
    });

    it('should track self-heals separately', () => {
      const result = healHandler(
        mockActor,
        mockActor, // Self-heal
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockActor.addHealingDone).toHaveBeenCalledWith(25);
      expect(mockActor.addSelfHeal).toHaveBeenCalledWith(25);
    });

    it('should handle missing healing modifier gracefully', () => {
      delete mockActor.getHealingModifier;

      const result = healHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockTarget.hp).toBe(85); // 60 + 25 (no modifier applied)
    });

    it('should handle missing ability params gracefully', () => {
      const abilityNoAmount = { ...mockAbility, params: {} };

      const result = healHandler(
        mockActor,
        mockTarget,
        abilityNoAmount,
        log,
        mockSystems
      );

      expect(result).toBe(false);
      expect(mockTarget.hp).toBe(60); // No healing
      expect(mockActor.addHealingDone).not.toHaveBeenCalled();
    });

    it('should handle missing tracking methods gracefully', () => {
      delete mockActor.addHealingDone;
      delete mockActor.addSelfHeal;

      const result = healHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockTarget.hp).toBe(85); // Healing still works
    });
  });

  describe('rejuvenation handler', () => {
    let rejuvHandler: AbilityHandler;

    beforeEach(() => {
      register(mockRegistry);
      rejuvHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'rejuvenation'
      )?.[1];

      mockAbility = {
        id: 'rejuvenation',
        name: 'Rejuvenation',
        type: 'rejuvenation',
        category: 'Heal',
        target: 'Single',
        params: {
          rejuvenation: {
            healPerTurn: 8,
            turns: 4
          }
        }
      } as any;
    });

    it('should apply rejuvenation effect successfully', () => {
      const result = rejuvHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'rejuvenation',
        {
          turns: 4,
          healPerTurn: 8
        },
        mockActor.id,
        mockActor.name,
        log
      );
      expect(log.some(entry => entry.includes('rejuvenationApplied'))).toBe(true);
    });

    it('should apply healing modifier to rejuvenation', () => {
      mockActor.getHealingModifier = jest.fn().mockReturnValue(1.25);

      const result = rejuvHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'rejuvenation',
        {
          turns: 4,
          healPerTurn: 10 // 8 * 1.25 = 10
        },
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should apply coordination bonus to rejuvenation', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedHealing: true,
        healingBonus: 25
      };

      const result = rejuvHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'rejuvenation',
        {
          turns: 4,
          healPerTurn: 10 // 8 * 1.25 = 10
        },
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should handle alternative param structure', () => {
      mockAbility.params = {
        heal: {
          amount: 6,
          turns: 3
        }
      };

      const result = rejuvHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'rejuvenation',
        {
          turns: 3,
          healPerTurn: 6
        },
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should use default values when params missing', () => {
      mockAbility.params = {};

      const result = rejuvHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'rejuvenation',
        {
          turns: 3, // Default
          healPerTurn: 5 // Default
        },
        mockActor.id,
        mockActor.name,
        log
      );
    });
  });

  describe('multi-heal handler', () => {
    let multiHealHandler: any;
    let mockTarget2: Player;
    let mockTarget3: Player;

    beforeEach(() => {
      register(mockRegistry);

      // Create additional targets
      mockTarget2 = {
        id: 'target2',
        name: 'TestTarget2',
        hp: 40,
        maxHp: 100,
        isAlive: true,
        isWarlock: false
      } as any;

      mockTarget3 = {
        id: 'target3',
        name: 'TestTarget3',
        hp: 80,
        maxHp: 100,
        isAlive: true,
        isWarlock: false
      } as any;

      mockSystems.players.set('target2', mockTarget2);
      mockSystems.players.set('target3', mockTarget3);
      mockSystems.gameStateUtils.getAlivePlayers.mockReturnValue([
        mockActor, mockTarget, mockTarget2, mockTarget3
      ]);

      // Get the multi-heal handler by using it directly
      // Since it's called from within the registration function, we need to mock it
      const { handleMultiHeal } = require('../../../../../server/models/systems/abilityHandlers/healAbilities');
      multiHealHandler = handleMultiHeal;

      mockAbility = {
        id: 'groupHeal',
        name: 'Group Heal',
        type: 'groupHeal',
        category: 'Heal',
        target: 'Multi',
        params: {
          amount: 20
        }
      } as any;
    });

    it('should heal all alive players', () => {
      const result = multiHealHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockActor.hp).toBe(100); // Already at max, no healing
      expect(mockTarget.hp).toBe(80); // 60 + 20
      expect(mockTarget2.hp).toBe(60); // 40 + 20
      expect(mockTarget3.hp).toBe(100); // 80 + 20
    });

    it('should track total healing done', () => {
      const result = multiHealHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      // Healer at max (0), target1 (20), target2 (20), target3 (20) = 60 total
      expect(mockActor.addHealingDone).toHaveBeenCalledTimes(3); // Once per target that got healed
      expect(mockActor.addHealingDone).toHaveBeenCalledWith(20);
    });

    it('should apply coordination bonus to multi-heal', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedHealing: true,
        healingBonus: 50
      };

      const result = multiHealHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      // 20 * 1.50 = 30
      expect(mockTarget.hp).toBe(90); // 60 + 30
      expect(mockTarget2.hp).toBe(70); // 40 + 30
      expect(mockTarget3.hp).toBe(100); // 80 + 20 (capped at max)
    });

    it('should handle no valid targets', () => {
      // Make all players full HP
      mockActor.hp = 100;
      mockTarget.hp = 100;
      mockTarget2.hp = 100;
      mockTarget3.hp = 100;

      const result = multiHealHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(false);
      expect(mockActor.addHealingDone).not.toHaveBeenCalled();
    });

    it('should handle empty player list', () => {
      mockSystems.players.clear();
      mockSystems.gameStateUtils.getAlivePlayers.mockReturnValue([]);

      const result = multiHealHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(false);
      expect(log.some(entry => entry.includes('multiHealNoTargets'))).toBe(true);
    });

    it('should apply healing modifier to all targets', () => {
      mockActor.getHealingModifier = jest.fn().mockReturnValue(1.5);

      const result = multiHealHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      // 20 * 1.5 = 30
      expect(mockTarget.hp).toBe(90); // 60 + 30
      expect(mockTarget2.hp).toBe(70); // 40 + 30
      expect(mockTarget3.hp).toBe(100); // 80 + 20 (capped)
    });

    it('should log individual heals and summary', () => {
      const result = multiHealHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(log.some(entry => entry.includes('multiHealAnnounce'))).toBe(true);
      expect(log.some(entry => entry.includes('multiHealIndividual'))).toBe(true);
      expect(log.some(entry => entry.includes('multiHealSummary'))).toBe(true);
    });

    it('should handle missing healing modifier gracefully', () => {
      delete mockActor.getHealingModifier;

      const result = multiHealHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockTarget.hp).toBe(80); // 60 + 20 (no modifier)
    });

    it('should track self-heals in multi-heal', () => {
      mockActor.hp = 80; // Healer needs healing

      const result = multiHealHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockActor.hp).toBe(100); // 80 + 20
      expect(mockActor.addSelfHeal).toHaveBeenCalledWith(20);
    });
  });

  describe('error handling and edge cases', () => {
    let healHandler: AbilityHandler;

    beforeEach(() => {
      register(mockRegistry);
      healHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'heal'
      )?.[1];
    });

    it('should handle null target gracefully', () => {
      const result = healHandler(
        mockActor,
        null as any,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(false);
    });

    it('should handle missing warlock system gracefully', () => {
      mockConfig.gameBalance.player.healing.antiDetection.enabled = true;
      mockConfig.gameBalance.player.healing.antiDetection.alwaysHealWarlocks = true;
      delete mockSystems.warlockSystem.markWarlockDetected;
      jest.spyOn(Math, 'random').mockReturnValue(0.01); // Trigger detection

      const result = healHandler(
        mockActor,
        mockWarlockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockWarlockTarget.hp).toBe(75); // Still healed
      // Should not crash even though markWarlockDetected is missing

      jest.restoreAllMocks();
    });

    it('should handle missing config values gracefully', () => {
      delete mockConfig.gameBalance;

      const result = healHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockTarget.hp).toBe(85); // Should still work with defaults
    });

    it('should handle zero or negative healing amounts', () => {
      mockAbility.params!.amount = 0;

      const result = healHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(false);
      expect(mockTarget.hp).toBe(60); // No change
    });

    it('should handle negative coordination bonus', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedHealing: true,
        healingBonus: -25 // Negative bonus
      };

      const result = healHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      // 25 * 0.75 = 18 (floored)
      expect(mockTarget.hp).toBe(78); // 60 + 18
      expect(mockActor.addHealingDone).toHaveBeenCalledWith(18);
    });

    it('should handle extremely high healing amounts', () => {
      mockAbility.params!.amount = 1000;

      const result = healHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockTarget.hp).toBe(100); // Capped at max HP
      expect(mockActor.addHealingDone).toHaveBeenCalledWith(40); // Only actual healing
    });
  });
});
