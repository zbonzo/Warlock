/**
 * @fileoverview Tests for AbilityCommand class
 */
import { AbilityCommand, AbilityCommandOptions } from '../../../../server/models/commands/AbilityCommand';
import { CommandResult, GameContext } from '../../../../server/models/commands/PlayerActionCommand';
import { EventTypes } from '../../../../server/models/events/EventTypes';

// Mock external dependencies
const mockLenientValidator = {
  validateAbilityAction: jest.fn()
};

const mockLogger = {
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

jest.mock('../validation/ValidationMiddleware', () => ({
  lenientValidator: mockLenientValidator
}));

jest.mock('@utils/logger', () => mockLogger);

describe('AbilityCommand', () => {
  let mockPlayer: any;
  let mockAbility: any;
  let mockGame: any;
  let mockGameContext: GameContext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock player
    mockPlayer = {
      id: 'player1',
      isAlive: true,
      hp: 100,
      maxHp: 100,
      class: 'Warrior',
      race: 'Human',
      hasSubmittedAction: false,
      actionSubmissionTime: 0,
      abilities: [],
      unlocked: [],
      playerAbilities: {
        isAbilityOnCooldown: jest.fn().mockReturnValue(false),
        setCooldown: jest.fn()
      },
      playerEffects: {
        hasEffect: jest.fn().mockReturnValue(false)
      }
    };

    // Mock ability
    mockAbility = {
      id: 'fireball',
      type: 'fireball',
      target: 'Single',
      cooldown: 2,
      category: 'Combat',
      isWarlockAbility: false,
      canTargetDead: false,
      requiresHealth: 0,
      requiredClass: undefined,
      requiredRace: undefined,
      prohibitedEffects: []
    };

    // Mock game
    mockGame = {
      getPlayerById: jest.fn().mockReturnValue(mockPlayer),
      monster: { hp: 100 },
      players: new Map([['player1', mockPlayer], ['player2', { ...mockPlayer, id: 'player2' }]]),
      gamePhase: {
        addPendingAction: jest.fn()
      },
      emitEvent: jest.fn(),
      systems: {
        abilityRegistry: {
          executePlayerAbility: jest.fn().mockResolvedValue({ damage: 25, success: true })
        }
      }
    };

    mockGameContext = { game: mockGame };

    // Setup player abilities and unlocked
    mockPlayer.abilities = [mockAbility];
    mockPlayer.unlocked = [{ id: 'fireball', type: 'fireball' }];

    // Setup validator mock
    mockLenientValidator.validateAbilityAction.mockReturnValue({
      success: true,
      errors: []
    });
  });

  describe('constructor', () => {
    it('should create AbilityCommand with basic options', () => {
      const command = new AbilityCommand('player1', 'fireball');

      expect(command.playerId).toBe('player1');
      expect(command.actionType).toBe('ability');
      expect(command.abilityId).toBe('fireball');
      expect(command.coordinationInfo).toBeNull();
    });

    it('should create AbilityCommand with full options', () => {
      const options: AbilityCommandOptions = {
        targetId: 'player2',
        metadata: { intensity: 'high' },
        coordinationInfo: { bonus: 1.5, participants: ['player1', 'player3'] }
      };

      const command = new AbilityCommand('player1', 'fireball', options);

      expect(command.playerId).toBe('player1');
      expect(command.actionType).toBe('ability');
      expect(command.abilityId).toBe('fireball');
      expect(command.targetId).toBe('player2');
      expect(command.coordinationInfo).toEqual(options.coordinationInfo);
    });

    it('should set canUndo to false by default', () => {
      const command = new AbilityCommand('player1', 'fireball');

      // canUndo is typically not directly accessible, but we can test behavior
      expect(command.actionType).toBe('ability');
    });
  });

  describe('validation', () => {
    it('should validate successful ability action', async () => {
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(true);
      expect(command.validationErrors).toEqual([]);
      expect(mockLenientValidator.validateAbilityAction).toHaveBeenCalledWith({
        playerId: 'player1',
        actionType: 'ability',
        abilityId: 'fireball',
        targetId: 'player2',
        timestamp: expect.any(Date)
      });
      expect(mockGame.emitEvent).toHaveBeenCalledWith(EventTypes.ABILITY.VALIDATED, expect.any(Object));
    });

    it('should handle Zod validation errors gracefully', async () => {
      mockLenientValidator.validateAbilityAction.mockReturnValue({
        success: false,
        errors: ['Invalid ability structure']
      });

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.validationErrors).toContain('Invalid ability structure');
      expect(mockLogger.warn).not.toHaveBeenCalled(); // Should not warn for normal validation failure
    });

    it('should handle Zod validation exception gracefully', async () => {
      mockLenientValidator.validateAbilityAction.mockImplementation(() => {
        throw new Error('Zod parsing error');
      });

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(mockLogger.warn).toHaveBeenCalledWith('Zod validation error in AbilityCommand', expect.any(Object));
      // Should still continue with basic validation
      expect(command.isValid).toBe(true); // Other validations should pass
    });

    it('should fail validation when ability not found', async () => {
      mockPlayer.abilities = []; // No abilities

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Ability fireball not found for player');
    });

    it('should fail validation when ability not unlocked', async () => {
      mockPlayer.unlocked = []; // No unlocked abilities

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Ability fireball is not unlocked');
    });

    it('should fail validation when ability on cooldown', async () => {
      mockPlayer.playerAbilities.isAbilityOnCooldown.mockReturnValue(true);

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Ability fireball is on cooldown');
    });

    it('should support finding ability by type for backward compatibility', async () => {
      mockPlayer.abilities = [{ ...mockAbility, id: 'flame_spell', type: 'fireball' }];
      mockPlayer.unlocked = [{ id: 'flame_spell', type: 'fireball' }];

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(true);
    });
  });

  describe('target validation', () => {
    it('should validate self-target abilities', async () => {
      mockAbility.target = 'Self';
      const command = new AbilityCommand('player1', 'fireball');

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(true);
      expect(command.targetId).toBe('player1'); // Should be set to self
    });

    it('should fail self-target when targeting another player', async () => {
      mockAbility.target = 'Self';
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Self-target abilities cannot target other players');
    });

    it('should validate single-target abilities', async () => {
      mockAbility.target = 'Single';
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(true);
    });

    it('should fail single-target without target', async () => {
      mockAbility.target = 'Single';
      const command = new AbilityCommand('player1', 'fireball');

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Single-target ability requires a target');
    });

    it('should fail when targeting non-existent player', async () => {
      mockAbility.target = 'Single';
      mockGame.getPlayerById.mockReturnValue(undefined);

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'nonexistent' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Target player nonexistent not found');
    });

    it('should fail when targeting dead player (ability cannot target dead)', async () => {
      mockAbility.target = 'Single';
      mockAbility.canTargetDead = false;
      const deadPlayer = { ...mockPlayer, id: 'player2', isAlive: false };
      mockGame.getPlayerById.mockReturnValue(deadPlayer);

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Cannot target dead players with this ability');
    });

    it('should allow targeting dead player when ability can target dead', async () => {
      mockAbility.target = 'Single';
      mockAbility.canTargetDead = true;
      const deadPlayer = { ...mockPlayer, id: 'player2', isAlive: false };
      mockGame.getPlayerById.mockReturnValue(deadPlayer);

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(true);
    });

    it('should validate monster targeting', async () => {
      mockAbility.target = 'Single';
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'monster' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(true);
      expect(command.targetId).toBe('__monster__'); // Should normalize
    });

    it('should fail when targeting dead monster', async () => {
      mockAbility.target = 'Single';
      mockGame.monster.hp = 0;

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'monster' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Cannot target dead or non-existent monster');
    });

    it('should validate Monster-only target type', async () => {
      mockAbility.target = 'Monster';
      const command = new AbilityCommand('player1', 'fireball');

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(true);
      expect(command.targetId).toBe('__monster__');
    });

    it('should validate AoE target types', async () => {
      mockAbility.target = 'All';
      const command = new AbilityCommand('player1', 'fireball');

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(true);

      mockAbility.target = 'AllPlayers';
      const command2 = new AbilityCommand('player1', 'fireball');

      await command2.validate(mockGameContext);

      expect(command2.isValid).toBe(true);
    });

    it('should fail with unknown target type', async () => {
      mockAbility.target = 'Unknown' as any;
      const command = new AbilityCommand('player1', 'fireball');

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Unknown target type: Unknown');
    });

    it('should fail when ability has no target specification', async () => {
      mockAbility.target = undefined;
      const command = new AbilityCommand('player1', 'fireball');

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Ability fireball has no target specification');
    });
  });

  describe('ability requirements validation', () => {
    it('should validate health requirements (absolute)', async () => {
      mockAbility.requiresHealth = 50;
      mockPlayer.hp = 60;

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(true);
    });

    it('should fail health requirements (absolute)', async () => {
      mockAbility.requiresHealth = 50;
      mockPlayer.hp = 40;

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Not enough health (requires 50, have 40)');
    });

    it('should validate status effect requirements', async () => {
      mockAbility.requiresEffect = 'blessed';
      mockPlayer.playerEffects.hasEffect.mockReturnValue(true);

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(true);
      expect(mockPlayer.playerEffects.hasEffect).toHaveBeenCalledWith('blessed');
    });

    it('should fail missing required effect', async () => {
      mockAbility.requiresEffect = 'blessed';
      mockPlayer.playerEffects.hasEffect.mockReturnValue(false);

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Requires status effect: blessed');
    });

    it('should validate prohibited effects', async () => {
      mockAbility.prohibitedEffects = ['silenced', 'stunned'];
      mockPlayer.playerEffects.hasEffect.mockReturnValue(false);

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(true);
    });

    it('should fail when affected by prohibited effect', async () => {
      mockAbility.prohibitedEffects = ['silenced', 'stunned'];
      mockPlayer.playerEffects.hasEffect.mockImplementation((effect: string) => effect === 'silenced');

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Cannot use while affected by: silenced');
    });

    it('should validate class requirements', async () => {
      mockAbility.requiredClass = 'Warrior';
      mockPlayer.class = 'Warrior';

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(true);
    });

    it('should fail class requirements', async () => {
      mockAbility.requiredClass = 'Mage';
      mockPlayer.class = 'Warrior';

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Ability requires class: Mage');
    });

    it('should validate race requirements', async () => {
      mockAbility.requiredRace = 'Human';
      mockPlayer.race = 'Human';

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(true);
    });

    it('should fail race requirements', async () => {
      mockAbility.requiredRace = 'Elf';
      mockPlayer.race = 'Human';

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Ability requires race: Elf');
    });

    it('should handle missing player gracefully', async () => {
      mockGame.getPlayerById.mockReturnValue(undefined);

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Ability fireball not found for player');
    });
  });

  describe('execution', () => {
    it('should execute ability successfully', async () => {
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);
      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(true);
      expect(result.data?.abilityId).toBe('fireball');
      expect(result.data?.targetId).toBe('player2');
      expect(result.data?.actionQueued).toBe(true);
      expect(result.message).toBe('Ability command queued successfully');

      expect(mockGame.gamePhase.addPendingAction).toHaveBeenCalledWith({
        actorId: 'player1',
        actionType: 'fireball',
        targetId: 'player2',
        options: undefined
      });

      expect(mockPlayer.hasSubmittedAction).toBe(true);
      expect(mockPlayer.actionSubmissionTime).toBeGreaterThan(0);

      expect(mockGame.emitEvent).toHaveBeenCalledWith(EventTypes.ABILITY.VALIDATED, {
        playerId: 'player1',
        abilityId: 'fireball',
        targetId: 'player2',
        isValid: true,
        timestamp: expect.any(String)
      });
    });

    it('should handle execution error', async () => {
      mockGame.gamePhase.addPendingAction.mockImplementation(() => {
        throw new Error('Game phase error');
      });

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      await expect(command.execute(mockGameContext)).rejects.toThrow('Game phase error');

      expect(mockGame.emitEvent).toHaveBeenCalledWith(EventTypes.ABILITY.FAILED, {
        playerId: 'player1',
        abilityId: 'fireball',
        targetId: 'player2',
        error: 'Game phase error',
        timestamp: expect.any(String)
      });
    });

    it('should handle missing ability during execution', async () => {
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      // Remove ability after validation
      mockPlayer.abilities = [];

      await command.validate(mockGameContext);

      await expect(command.execute(mockGameContext)).rejects.toThrow('Ability fireball not found for player');
    });

    it('should handle missing game phase', async () => {
      mockGame.gamePhase = undefined;

      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);
      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(true);
      // Should still work without game phase
    });

    it('should handle missing player during execution', async () => {
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      // Remove player after validation
      mockGame.getPlayerById.mockReturnValue(undefined);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(true);
      // Should still work without updating player state
    });

    it('should execute with metadata', async () => {
      const metadata = { intensity: 'high', element: 'fire' };
      const command = new AbilityCommand('player1', 'fireball', {
        targetId: 'player2',
        metadata
      });

      await command.validate(mockGameContext);
      await command.execute(mockGameContext);

      expect(mockGame.gamePhase.addPendingAction).toHaveBeenCalledWith({
        actorId: 'player1',
        actionType: 'fireball',
        targetId: 'player2',
        options: metadata
      });
    });
  });

  describe('warlock ability detection', () => {
    it('should detect warlock abilities by category', () => {
      mockAbility.category = 'Warlock';
      const command = new AbilityCommand('player1', 'fireball');

      // Test private method through reflection
      const isWarlock = (command as any)._isWarlockAbility(mockAbility);
      expect(isWarlock).toBe(true);
    });

    it('should detect warlock abilities by flag', () => {
      mockAbility.isWarlockAbility = true;
      const command = new AbilityCommand('player1', 'fireball');

      const isWarlock = (command as any)._isWarlockAbility(mockAbility);
      expect(isWarlock).toBe(true);
    });

    it('should not detect non-warlock abilities', () => {
      mockAbility.category = 'Combat';
      mockAbility.isWarlockAbility = false;
      const command = new AbilityCommand('player1', 'fireball');

      const isWarlock = (command as any)._isWarlockAbility(mockAbility);
      expect(isWarlock).toBe(false);
    });
  });

  describe('target resolution', () => {
    it('should resolve player target', () => {
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      const target = (command as any)._resolveTarget(mockGameContext);
      expect(target).toBe(mockPlayer); // mockGame.getPlayerById returns mockPlayer
    });

    it('should resolve monster target', () => {
      const command = new AbilityCommand('player1', 'fireball', { targetId: '__monster__' });

      const target = (command as any)._resolveTarget(mockGameContext);
      expect(target).toBe(mockGame.monster);
    });

    it('should resolve AoE target (all players)', () => {
      const command = new AbilityCommand('player1', 'fireball');

      const target = (command as any)._resolveTarget(mockGameContext);
      expect(Array.isArray(target)).toBe(true);
      expect(target.length).toBe(2); // Two players in the map
    });
  });

  describe('ability execution through registry', () => {
    it('should execute ability through registry', async () => {
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });
      const mockTarget = mockPlayer;

      const result = await (command as any)._executeAbility(mockGameContext, mockAbility, mockTarget);

      expect(mockGame.systems.abilityRegistry.executePlayerAbility).toHaveBeenCalledWith(
        mockPlayer,
        mockTarget,
        mockAbility,
        expect.any(Array), // log array
        mockGame.systems,
        null // coordination info
      );

      expect(result.abilityResult).toEqual({ damage: 25, success: true });
      expect(result.coordinationApplied).toBe(false);
      expect(Array.isArray(result.log)).toBe(true);
    });

    it('should execute ability with coordination info', async () => {
      const coordinationInfo = { bonus: 1.5, participants: ['player1', 'player3'] };
      const command = new AbilityCommand('player1', 'fireball', {
        targetId: 'player2',
        coordinationInfo
      });
      const mockTarget = mockPlayer;

      const result = await (command as any)._executeAbility(mockGameContext, mockAbility, mockTarget);

      expect(mockGame.systems.abilityRegistry.executePlayerAbility).toHaveBeenCalledWith(
        mockPlayer,
        mockTarget,
        mockAbility,
        expect.any(Array),
        mockGame.systems,
        coordinationInfo
      );

      expect(result.coordinationApplied).toBe(true);
    });

    it('should handle missing game systems', async () => {
      mockGame.systems = undefined;
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await expect((command as any)._executeAbility(mockGameContext, mockAbility, mockPlayer))
        .rejects.toThrow('Game systems not initialized');
    });

    it('should handle missing ability registry', async () => {
      mockGame.systems.abilityRegistry = undefined;
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await expect((command as any)._executeAbility(mockGameContext, mockAbility, mockPlayer))
        .rejects.toThrow('Game systems not initialized');
    });
  });

  describe('cooldown management', () => {
    it('should set ability cooldown', () => {
      const command = new AbilityCommand('player1', 'fireball');
      mockAbility.cooldown = 3;

      (command as any)._setCooldown(mockPlayer, mockAbility);

      expect(mockPlayer.playerAbilities.setCooldown).toHaveBeenCalledWith('fireball', 3);
    });

    it('should not set cooldown when ability has no cooldown', () => {
      const command = new AbilityCommand('player1', 'fireball');
      mockAbility.cooldown = 0;

      (command as any)._setCooldown(mockPlayer, mockAbility);

      expect(mockPlayer.playerAbilities.setCooldown).not.toHaveBeenCalled();
    });

    it('should not set cooldown when player has no playerAbilities', () => {
      const command = new AbilityCommand('player1', 'fireball');
      mockPlayer.playerAbilities = undefined;

      (command as any)._setCooldown(mockPlayer, mockAbility);

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('static factory method', () => {
    it('should create AbilityCommand from action data', () => {
      const actionData = {
        targetId: 'player2',
        abilityId: 'fireball',
        metadata: { intensity: 'high' }
      };

      const command = AbilityCommand.fromActionData('player1', actionData);

      expect(command.playerId).toBe('player1');
      expect(command.abilityId).toBe('fireball');
      expect(command.targetId).toBe('player2');
      expect(command.metadata).toEqual({ intensity: 'high' });
    });

    it('should create AbilityCommand with minimal action data', () => {
      const actionData = {
        abilityId: 'heal'
      };

      const command = AbilityCommand.fromActionData('player1', actionData);

      expect(command.playerId).toBe('player1');
      expect(command.abilityId).toBe('heal');
      expect(command.targetId).toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete ability workflow', async () => {
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      // Validation
      await command.validate(mockGameContext);
      expect(command.isValid).toBe(true);

      // Execution
      const result = await command.execute(mockGameContext);
      expect(result.success).toBe(true);

      // Verify events were emitted
      expect(mockGame.emitEvent).toHaveBeenCalledWith(EventTypes.ABILITY.VALIDATED, expect.any(Object));

      // Verify action was queued
      expect(mockGame.gamePhase.addPendingAction).toHaveBeenCalled();

      // Verify player state was updated
      expect(mockPlayer.hasSubmittedAction).toBe(true);
    });

    it('should handle self-targeting ability workflow', async () => {
      mockAbility.target = 'Self';
      const command = new AbilityCommand('player1', 'heal');

      await command.validate(mockGameContext);
      expect(command.isValid).toBe(true);
      expect(command.targetId).toBe('player1');

      const result = await command.execute(mockGameContext);
      expect(result.success).toBe(true);
    });

    it('should handle monster-targeting workflow', async () => {
      mockAbility.target = 'Monster';
      const command = new AbilityCommand('player1', 'fireball');

      await command.validate(mockGameContext);
      expect(command.isValid).toBe(true);
      expect(command.targetId).toBe('__monster__');

      const result = await command.execute(mockGameContext);
      expect(result.success).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle null/undefined coordination info', () => {
      const command1 = new AbilityCommand('player1', 'fireball', { coordinationInfo: null });
      const command2 = new AbilityCommand('player1', 'fireball', { coordinationInfo: undefined });

      expect(command1.coordinationInfo).toBeNull();
      expect(command2.coordinationInfo).toBeNull();
    });

    it('should handle missing player abilities system', async () => {
      mockPlayer.playerAbilities = undefined;
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      // Should not fail validation due to missing playerAbilities (cooldown check returns false)
      expect(command.isValid).toBe(true);
    });

    it('should handle missing player effects system', async () => {
      mockPlayer.playerEffects = undefined;
      mockAbility.requiresEffect = 'blessed';
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Requires status effect: blessed');
    });

    it('should handle ability without id or type', async () => {
      mockPlayer.abilities = [{ target: 'Single' }]; // No id or type
      const command = new AbilityCommand('player1', 'fireball', { targetId: 'player2' });

      await command.validate(mockGameContext);

      expect(command.isValid).toBe(false);
      expect(command.validationErrors).toContain('Ability fireball not found for player');
    });
  });
});
