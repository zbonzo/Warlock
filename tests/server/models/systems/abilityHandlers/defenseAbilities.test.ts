/**
 * @fileoverview Tests for defenseAbilities handlers
 */
import { register } from '../../../../../server/models/systems/abilityHandlers/defenseAbilities';
import type { AbilityRegistry, AbilityHandler, CoordinationInfo, LogEntry } from '../../../../../server/models/systems/abilityHandlers/abilityRegistryUtils';
import type { Player, Monster, Ability } from '../../../../../server/types/generated';

// Mock dependencies
jest.mock('@config');
jest.mock('@messages');

const mockConfig = require('@config');
const mockMessages = require('@messages');

// Mock game systems interface
interface MockGameSystems {
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
  players: Map<string, Player>;
}

describe('defenseAbilities', () => {
  let mockRegistry: jest.Mocked<AbilityRegistry>;
  let mockSystems: MockGameSystems;
  let mockActor: Player;
  let mockTarget: Player;
  let mockAbility: Ability;
  let log: LogEntry[];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock config
    mockConfig.MONSTER_ID = 'monster1';

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
      id: 'defender1',
      name: 'TestDefender',
      hp: 100,
      maxHp: 100,
      isAlive: true,
      isWarlock: false
    } as any;

    mockTarget = {
      id: 'target1',
      name: 'TestTarget',
      hp: 80,
      maxHp: 100,
      isAlive: true,
      isWarlock: false
    } as any;

    // Create mock systems
    mockSystems = {
      statusEffectSystem: {
        applyEffect: jest.fn()
      },
      players: new Map([
        ['defender1', mockActor],
        ['target1', mockTarget]
      ])
    };

    // Create mock ability
    mockAbility = {
      id: 'testShield',
      name: 'Test Shield',
      type: 'shieldWall',
      category: 'Defense',
      target: 'Single',
      effect: 'shielded',
      params: {
        armor: 5,
        duration: 2
      }
    } as any;

    log = [];
  });

  describe('register function', () => {
    it('should register all defense ability handlers', () => {
      register(mockRegistry);

      // Verify core defense abilities are registered
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('shieldWall', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('shadowVeil', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('shadowstep', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('battleCry', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('divineShield', expect.any(Function));
    });
  });

  describe('shield wall handler', () => {
    let shieldHandler: AbilityHandler;

    beforeEach(() => {
      register(mockRegistry);
      shieldHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'shieldWall'
      )?.[1];
    });

    it('should apply shield effect successfully', () => {
      const result = shieldHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'shielded',
        {
          armor: 5,
          turns: 2
        },
        mockActor.id,
        mockActor.name,
        log
      );
      expect(log.some(entry => entry.includes('shieldApplied'))).toBe(true);
    });

    it('should use default values when params missing', () => {
      const abilityNoParams = { ...mockAbility, params: {} };

      const result = shieldHandler(
        mockActor,
        mockTarget,
        abilityNoParams,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'shielded',
        {
          armor: 2, // Default
          turns: 1 // Default
        },
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should apply coordination bonus to armor', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedDefense: true,
        defenseBonus: 40
      };

      const result = shieldHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      // 5 * 1.40 = 7
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'shielded',
        {
          armor: 7,
          turns: 2
        },
        mockActor.id,
        mockActor.name,
        log
      );

      // Should log coordination bonus
      expect(log.some(entry => 
        entry.type === 'coordination_defense_applied' && 
        entry.privateMessage?.includes('40%')
      )).toBe(true);
    });

    it('should handle zero defense bonus gracefully', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedDefense: true,
        defenseBonus: 0
      };

      const result = shieldHandler(
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
        'shielded',
        {
          armor: 5, // Unchanged
          turns: 2
        },
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should floor coordination bonus calculations', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedDefense: true,
        defenseBonus: 33 // 5 * 1.33 = 6.65, floored to 6
      };

      const result = shieldHandler(
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
        'shielded',
        {
          armor: 6, // Floored
          turns: 2
        },
        mockActor.id,
        mockActor.name,
        log
      );
    });
  });

  describe('invisibility handler', () => {
    let invisHandler: AbilityHandler;

    beforeEach(() => {
      register(mockRegistry);
      invisHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'shadowVeil'
      )?.[1];

      mockAbility = {
        id: 'shadowVeil',
        name: 'Shadow Veil',
        type: 'shadowVeil',
        category: 'Defense',
        target: 'Single',
        effect: 'invisible',
        params: {
          duration: 3
        }
      } as any;
    });

    it('should apply invisibility effect successfully', () => {
      const result = invisHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'invisible',
        {
          turns: 3
        },
        mockActor.id,
        mockActor.name,
        log
      );
      expect(log.some(entry => entry.includes('invisibilityApplied'))).toBe(true);
    });

    it('should use default duration when params missing', () => {
      const abilityNoParams = { ...mockAbility, params: {} };

      const result = invisHandler(
        mockActor,
        mockTarget,
        abilityNoParams,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'invisible',
        {
          turns: 1 // Default
        },
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should apply coordination bonus to duration', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedUtility: true,
        utilityBonus: 50
      };

      const result = invisHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      // 3 * 1.50 = 4 (floored)
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'invisible',
        {
          turns: 4
        },
        mockActor.id,
        mockActor.name,
        log
      );

      // Should log coordination bonus
      expect(log.some(entry => 
        entry.type === 'coordination_utility_applied' && 
        entry.privateMessage?.includes('50%')
      )).toBe(true);
    });

    it('should handle fractional duration bonuses', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedUtility: true,
        utilityBonus: 25 // 3 * 1.25 = 3.75, floored to 3
      };

      const result = invisHandler(
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
        'invisible',
        {
          turns: 3 // Floored, no change from original
        },
        mockActor.id,
        mockActor.name,
        log
      );
    });
  });

  describe('shadowstep handler', () => {
    let shadowstepHandler: AbilityHandler;

    beforeEach(() => {
      register(mockRegistry);
      shadowstepHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'shadowstep'
      )?.[1];

      mockAbility = {
        id: 'shadowstep',
        name: 'Shadowstep',
        type: 'shadowstep',
        category: 'Defense',
        target: 'Single',
        effect: 'invisible',
        params: {
          duration: 2
        }
      } as any;
    });

    it('should apply shadowstep invisibility successfully', () => {
      const result = shadowstepHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'invisible',
        {
          turns: 2
        },
        mockActor.id,
        mockActor.name,
        log
      );
      expect(log.some(entry => entry.includes('shadowstepUsed'))).toBe(true);
    });

    it('should fail when targeting monster', () => {
      const result = shadowstepHandler(
        mockActor,
        mockConfig.MONSTER_ID,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(false);
      expect(mockSystems.statusEffectSystem.applyEffect).not.toHaveBeenCalled();
      expect(log.some(entry => entry.includes('shadowstepInvalidTarget'))).toBe(true);
    });

    it('should fail when target is null', () => {
      const result = shadowstepHandler(
        mockActor,
        null as any,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(false);
      expect(mockSystems.statusEffectSystem.applyEffect).not.toHaveBeenCalled();
      expect(log.some(entry => entry.includes('shadowstepInvalidTarget'))).toBe(true);
    });

    it('should apply coordination bonus to shadowstep duration', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedUtility: true,
        utilityBonus: 100 // Double duration
      };

      const result = shadowstepHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      // 2 * 2.0 = 4
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'invisible',
        {
          turns: 4
        },
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should use default duration when params missing', () => {
      const abilityNoParams = { ...mockAbility, params: {} };

      const result = shadowstepHandler(
        mockActor,
        mockTarget,
        abilityNoParams,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'invisible',
        {
          turns: 1 // Default
        },
        mockActor.id,
        mockActor.name,
        log
      );
    });
  });

  describe('multi-protection handler', () => {
    let multiProtectionHandler: AbilityHandler;
    let mockTarget2: Player;
    let mockTarget3: Player;

    beforeEach(() => {
      register(mockRegistry);
      multiProtectionHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'battleCry'
      )?.[1];

      // Create additional targets
      mockTarget2 = {
        id: 'target2',
        name: 'TestTarget2',
        hp: 60,
        maxHp: 100,
        isAlive: true,
        isWarlock: false
      } as any;

      mockTarget3 = {
        id: 'target3',
        name: 'TestTarget3',
        hp: 90,
        maxHp: 100,
        isAlive: true,
        isWarlock: false
      } as any;

      mockSystems.players.set('target2', mockTarget2);
      mockSystems.players.set('target3', mockTarget3);

      mockAbility = {
        id: 'battleCry',
        name: 'Battle Cry',
        type: 'battleCry',
        category: 'Defense',
        target: 'Multi',
        effect: 'shielded',
        params: {
          armor: 3,
          duration: 2
        }
      } as any;
    });

    it('should protect all alive players', () => {
      const result = multiProtectionHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      
      // Should apply effect to all players
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledTimes(4);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockActor.id,
        'shielded',
        { armor: 3, turns: 2 },
        mockActor.id,
        mockActor.name,
        log
      );
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'shielded',
        { armor: 3, turns: 2 },
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should use default values when params missing', () => {
      const abilityNoParams = { ...mockAbility, params: {} };

      const result = multiProtectionHandler(
        mockActor,
        'multi',
        abilityNoParams,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockActor.id,
        'shielded',
        { armor: 2, turns: 1 }, // Defaults
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should apply defense coordination bonus to armor', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedDefense: true,
        defenseBonus: 50
      };

      const result = multiProtectionHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      // 3 * 1.50 = 4 (floored)
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockActor.id,
        'shielded',
        { armor: 4, turns: 2 },
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should apply utility coordination bonus to duration', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedUtility: true,
        utilityBonus: 100 // Double duration
      };

      const result = multiProtectionHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockActor.id,
        'shielded',
        { armor: 3, turns: 4 }, // 2 * 2 = 4
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should apply both defense and utility bonuses', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedDefense: true,
        defenseBonus: 33, // 3 * 1.33 = 3.99 -> 3
        coordinatedUtility: true,
        utilityBonus: 50 // 2 * 1.5 = 3
      };

      const result = multiProtectionHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockActor.id,
        'shielded',
        { armor: 3, turns: 3 },
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should handle non-shielded effects correctly', () => {
      mockAbility.effect = 'invisible';
      delete mockAbility.params!.armor; // Invisibility doesn't use armor

      const result = multiProtectionHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockActor.id,
        'invisible',
        { turns: 2 }, // No armor field
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should fail when no players alive', () => {
      mockSystems.players.clear();

      const result = multiProtectionHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(false);
      expect(mockSystems.statusEffectSystem.applyEffect).not.toHaveBeenCalled();
      expect(log.some(entry => entry.includes('multiProtectionNoTargets'))).toBe(true);
    });

    it('should skip dead players', () => {
      mockTarget2.isAlive = false;

      const result = multiProtectionHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledTimes(3); // Only alive players
      expect(mockSystems.statusEffectSystem.applyEffect).not.toHaveBeenCalledWith(
        mockTarget2.id,
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    it('should log announce, individual, and summary messages', () => {
      const result = multiProtectionHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(log.some(entry => entry.includes('multiProtectionAnnounce'))).toBe(true);
      expect(log.some(entry => entry.includes('multiProtectionIndividual'))).toBe(true);
      expect(log.some(entry => entry.includes('multiProtectionSummary'))).toBe(true);
    });

    it('should use default effect type when not specified', () => {
      delete mockAbility.effect;

      const result = multiProtectionHandler(
        mockActor,
        'multi',
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockActor.id,
        'shielded', // Default
        { armor: 3, turns: 2 },
        mockActor.id,
        mockActor.name,
        log
      );
    });
  });

  describe('error handling and edge cases', () => {
    let shieldHandler: AbilityHandler;

    beforeEach(() => {
      register(mockRegistry);
      shieldHandler = mockRegistry.registerClassAbility.mock.calls.find(
        call => call[0] === 'shieldWall'
      )?.[1];
    });

    it('should handle null target gracefully', () => {
      const result = shieldHandler(
        mockActor,
        null as any,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true); // Still succeeds
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalled();
    });

    it('should handle missing status effect system gracefully', () => {
      delete (mockSystems as any).statusEffectSystem;

      expect(() => shieldHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      )).toThrow(); // Should throw since statusEffectSystem is required
    });

    it('should handle negative coordination bonuses', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedDefense: true,
        defenseBonus: -25 // Reduce armor
      };

      const result = shieldHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      // 5 * 0.75 = 3.75 -> 3
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'shielded',
        {
          armor: 3, // Reduced
          turns: 2
        },
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should handle zero armor values', () => {
      mockAbility.params!.armor = 0;

      const result = shieldHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems
      );

      expect(result).toBe(true);
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'shielded',
        {
          armor: 0,
          turns: 2
        },
        mockActor.id,
        mockActor.name,
        log
      );
    });

    it('should handle extremely high coordination bonuses', () => {
      const coordinationInfo: CoordinationInfo = {
        coordinatedDefense: true,
        defenseBonus: 1000 // 10x multiplier
      };

      const result = shieldHandler(
        mockActor,
        mockTarget,
        mockAbility,
        log,
        mockSystems,
        coordinationInfo
      );

      expect(result).toBe(true);
      // 5 * 11 = 55
      expect(mockSystems.statusEffectSystem.applyEffect).toHaveBeenCalledWith(
        mockTarget.id,
        'shielded',
        {
          armor: 55,
          turns: 2
        },
        mockActor.id,
        mockActor.name,
        log
      );
    });
  });
});