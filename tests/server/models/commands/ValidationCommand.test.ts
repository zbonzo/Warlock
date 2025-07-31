/**
 * @fileoverview Tests for ValidationCommand class
 */
import { 
  ValidationCommand, 
  ValidationType, 
  ValidationSeverity,
  ValidationRuleResult,
  ValidationResults,
  ValidationCommandOptions
} from '../../../../server/models/commands/ValidationCommand';
import { GameContext } from '../../../../server/models/commands/PlayerActionCommand';
import { EventTypes } from '../../../../server/models/events/EventTypes';

// Mock logger
const mockLogger = {
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

jest.mock('@utils/logger', () => mockLogger);

describe('ValidationCommand', () => {
  let mockGame: any;
  let mockGameContext: GameContext;
  let mockPlayer: any;
  let mockMonster: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock player
    mockPlayer = {
      id: 'player1',
      name: 'TestPlayer',
      isAlive: true,
      isReady: true,
      race: 'Human',
      class: 'Warrior',
      abilities: [
        { id: 'fireball', name: 'Fireball' },
        { id: 'heal', name: 'Heal' }
      ],
      unlocked: [
        { id: 'fireball', type: 'fireball' },
        { id: 'heal', type: 'heal' }
      ],
      playerAbilities: {
        isAbilityOnCooldown: jest.fn().mockReturnValue(false)
      }
    };

    // Mock monster
    mockMonster = {
      hp: 100,
      maxHp: 150,
      isAlive: true
    };

    // Mock game
    mockGame = {
      getPlayerById: jest.fn().mockReturnValue(mockPlayer),
      players: new Map([
        ['player1', mockPlayer],
        ['player2', { ...mockPlayer, id: 'player2', name: 'Player2' }]
      ]),
      monster: mockMonster,
      started: true,
      phase: 'action',
      round: 3,
      level: 2,
      emitEvent: jest.fn(),
      gamePhase: {
        hasPlayerSubmittedAction: jest.fn().mockReturnValue(false),
        haveAllPlayersSubmitted: jest.fn().mockReturnValue(true)
      }
    };

    mockGameContext = { game: mockGame };
  });

  describe('constructor', () => {
    it('should create ValidationCommand with basic parameters', () => {
      const command = new ValidationCommand('player1', 'action_submission');

      expect(command.playerId).toBe('player1');
      expect(command.actionType).toBe('validation');
      expect(command.validationType).toBe('action_submission');
      expect(command.actionData).toEqual({});
      expect(command.validationRules).toEqual([]);
      expect(command.strict).toBe(false);
      expect(command.priority).toBe(100); // High priority
      expect(command.canUndo).toBe(false);
    });

    it('should create ValidationCommand with full options', () => {
      const options: ValidationCommandOptions = {
        actionData: { actionType: 'ability', targetId: 'player2' },
        validationRules: ['player_alive', 'game_started'],
        strict: true,
        metadata: { source: 'client' }
      };

      const command = new ValidationCommand('player1', 'game_state', options);

      expect(command.validationType).toBe('game_state');
      expect(command.actionData).toEqual({ actionType: 'ability', targetId: 'player2' });
      expect(command.validationRules).toEqual(['player_alive', 'game_started']);
      expect(command.strict).toBe(true);
      expect(command.metadata).toEqual({ source: 'client' });
    });

    it('should initialize validation results', () => {
      const command = new ValidationCommand('player1', 'action_submission');

      expect(command.validationResults.passed).toEqual([]);
      expect(command.validationResults.failed).toEqual([]);
      expect(command.validationResults.warnings).toEqual([]);
      expect(command.validationResults.score).toBe(0);
    });
  });

  describe('validation', () => {
    it('should validate ValidationCommand itself', async () => {
      const command = new ValidationCommand('player1', 'action_submission');

      const isValid = await command.validate(mockGameContext);

      expect(isValid).toBe(true);
      expect(command.validationErrors).toEqual([]);
    });

    it('should fail validation with missing validation type', async () => {
      const command = new ValidationCommand('player1', '' as ValidationType);

      const isValid = await command.validate(mockGameContext);

      expect(isValid).toBe(false);
      expect(command.validationErrors).toContain('Validation type is required');
    });

    it('should fail validation with invalid validation type', async () => {
      const command = new ValidationCommand('player1', 'invalid_type' as ValidationType);

      const isValid = await command.validate(mockGameContext);

      expect(isValid).toBe(false);
      expect(command.validationErrors).toContain('Unknown validation type: invalid_type');
    });

    it('should fail validation when player not found', async () => {
      mockGame.getPlayerById.mockReturnValue(null);
      const command = new ValidationCommand('nonexistent', 'action_submission');

      const isValid = await command.validate(mockGameContext);

      expect(isValid).toBe(false);
      expect(command.validationErrors).toContain('Player nonexistent not found');
    });
  });

  describe('action submission validation', () => {
    it('should validate successful action submission', async () => {
      const actionData = {
        actionType: 'ability',
        targetId: 'player2',
        abilityId: 'fireball'
      };

      const command = new ValidationCommand('player1', 'action_submission', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(true);
      expect(command.validationResults.failed).toEqual([]);
      expect(command.validationResults.passed.length).toBeGreaterThan(0);
    });

    it('should fail when player is dead', async () => {
      mockPlayer.isAlive = false;
      const actionData = { actionType: 'ability' };

      const command = new ValidationCommand('player1', 'action_submission', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'player_alive',
        message: 'Dead players cannot submit actions',
        severity: 'error'
      });
    });

    it('should fail when game not started', async () => {
      mockGame.started = false;
      const actionData = { actionType: 'ability' };

      const command = new ValidationCommand('player1', 'action_submission', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'game_started',
        message: 'Game must be started to submit actions',
        severity: 'error'
      });
    });

    it('should fail when not in action phase', async () => {
      mockGame.phase = 'preparation';
      const actionData = { actionType: 'ability' };

      const command = new ValidationCommand('player1', 'action_submission', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'action_phase',
        message: 'Actions can only be submitted during action phase',
        severity: 'error'
      });
    });

    it('should fail when player already submitted action', async () => {
      mockGame.gamePhase.hasPlayerSubmittedAction.mockReturnValue(true);
      const actionData = { actionType: 'ability' };

      const command = new ValidationCommand('player1', 'action_submission', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'no_duplicate_actions',
        message: 'Player has already submitted an action this turn',
        severity: 'error'
      });
    });

    it('should fail with invalid action type', async () => {
      const actionData = { actionType: 'invalid_action' };

      const command = new ValidationCommand('player1', 'action_submission', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'valid_action_type',
        message: 'Invalid action type: invalid_action',
        severity: 'error'
      });
    });

    it('should validate target when specified', async () => {
      const actionData = {
        actionType: 'ability',
        targetId: 'player2'
      };

      const command = new ValidationCommand('player1', 'action_submission', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(true);
      expect(command.validationResults.passed.some(r => r.rule === 'target_exists')).toBe(true);
    });

    it('should validate ability when specified', async () => {
      const actionData = {
        actionType: 'ability',
        abilityId: 'fireball'
      };

      const command = new ValidationCommand('player1', 'action_submission', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(true);
      expect(command.validationResults.passed.some(r => r.rule === 'player_has_ability')).toBe(true);
    });
  });

  describe('game state validation', () => {
    it('should validate healthy game state', async () => {
      const command = new ValidationCommand('player1', 'game_state');
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(true);
      expect(command.validationResults.failed).toEqual([]);
    });

    it('should fail with too few players', async () => {
      mockGame.players = new Map([['player1', mockPlayer]]);

      const command = new ValidationCommand('player1', 'game_state');
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'min_players',
        message: 'Need at least 3 players (have 1)',
        severity: 'error'
      });
    });

    it('should fail with too many players', async () => {
      const manyPlayers = new Map();
      for (let i = 1; i <= 11; i++) {
        manyPlayers.set(`player${i}`, { ...mockPlayer, id: `player${i}` });
      }
      mockGame.players = manyPlayers;

      const command = new ValidationCommand('player1', 'game_state');
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'max_players',
        message: 'Too many players (max 10, have 11)',
        severity: 'error'
      });
    });

    it('should fail when no alive players', async () => {
      const deadPlayer = { ...mockPlayer, isAlive: false };
      mockGame.players = new Map([['player1', deadPlayer]]);

      const command = new ValidationCommand('player1', 'game_state');
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'alive_players_exist',
        message: 'No alive players remaining',
        severity: 'error'
      });
    });

    it('should validate monster health', async () => {
      mockGame.monster.hp = -10;

      const command = new ValidationCommand('player1', 'game_state');
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'monster_health_valid',
        message: 'Monster health cannot be negative',
        severity: 'error'
      });
    });

    it('should validate monster max health', async () => {
      mockGame.monster.hp = 200;
      mockGame.monster.maxHp = 150;

      const command = new ValidationCommand('player1', 'game_state');
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'monster_health_max',
        message: 'Monster health exceeds maximum',
        severity: 'error'
      });
    });

    it('should validate game phase', async () => {
      mockGame.phase = 'invalid_phase';

      const command = new ValidationCommand('player1', 'game_state');
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'valid_phase',
        message: 'Invalid game phase: invalid_phase',
        severity: 'error'
      });
    });

    it('should validate round and level', async () => {
      mockGame.round = 0;
      mockGame.level = -1;

      const command = new ValidationCommand('player1', 'game_state');
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'valid_round',
        message: 'Invalid round number: 0',
        severity: 'error'
      });
      expect(command.validationResults.failed).toContainEqual({
        rule: 'valid_level',
        message: 'Invalid level: -1',
        severity: 'error'
      });
    });
  });

  describe('player readiness validation', () => {
    it('should validate ready player', async () => {
      mockGame.started = false;

      const command = new ValidationCommand('player1', 'player_readiness');
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(true);
      expect(command.validationResults.failed).toEqual([]);
    });

    it('should fail when game already started', async () => {
      const command = new ValidationCommand('player1', 'player_readiness');
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'game_not_started',
        message: 'Cannot change readiness after game starts',
        severity: 'error'
      });
    });

    it('should fail when race not selected', async () => {
      mockGame.started = false;
      mockPlayer.race = null;

      const command = new ValidationCommand('player1', 'player_readiness');
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'race_selected',
        message: 'Player must select a race',
        severity: 'error'
      });
    });

    it('should fail when class not selected', async () => {
      mockGame.started = false;
      mockPlayer.class = null;

      const command = new ValidationCommand('player1', 'player_readiness');
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'class_selected',
        message: 'Player must select a class',
        severity: 'error'
      });
    });

    it('should fail when no abilities assigned', async () => {
      mockGame.started = false;
      mockPlayer.abilities = [];

      const command = new ValidationCommand('player1', 'player_readiness');
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'abilities_assigned',
        message: 'Player must have abilities assigned',
        severity: 'error'
      });
    });
  });

  describe('phase transition validation', () => {
    it('should validate valid phase transition', async () => {
      const actionData = { fromPhase: 'action', toPhase: 'resolution' };

      const command = new ValidationCommand('player1', 'phase_transition', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(true);
      expect(command.validationResults.failed).toEqual([]);
    });

    it('should fail when current phase mismatch', async () => {
      const actionData = { fromPhase: 'preparation', toPhase: 'action' };

      const command = new ValidationCommand('player1', 'phase_transition', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'current_phase_match',
        message: 'Expected phase preparation, but game is in action',
        severity: 'error'
      });
    });

    it('should fail with invalid transition', async () => {
      const actionData = { fromPhase: 'action', toPhase: 'waiting' };

      const command = new ValidationCommand('player1', 'phase_transition', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'valid_transition',
        message: 'Cannot transition from action to waiting',
        severity: 'error'
      });
    });

    it('should validate preparation to action requires all ready', async () => {
      mockGame.phase = 'preparation';
      const actionData = { fromPhase: 'preparation', toPhase: 'action' };
      const notReadyPlayer = { ...mockPlayer, id: 'player2', isReady: false };
      mockGame.players.set('player2', notReadyPlayer);

      const command = new ValidationCommand('player1', 'phase_transition', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'all_players_ready',
        message: 'All players must be ready to start action phase',
        severity: 'error'
      });
    });

    it('should validate action to resolution requires all submitted', async () => {
      const actionData = { fromPhase: 'action', toPhase: 'resolution' };
      mockGame.gamePhase.haveAllPlayersSubmitted.mockReturnValue(false);

      const command = new ValidationCommand('player1', 'phase_transition', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'all_actions_submitted',
        message: 'All alive players must submit actions before resolution',
        severity: 'error'
      });
    });
  });

  describe('ability usage validation', () => {
    it('should validate ability usage', async () => {
      const actionData = { abilityId: 'fireball' };

      const command = new ValidationCommand('player1', 'ability_usage', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(true);
      expect(command.validationResults.failed).toEqual([]);
    });

    it('should fail when player does not have ability', async () => {
      const actionData = { abilityId: 'lightning' };

      const command = new ValidationCommand('player1', 'ability_usage', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'player_has_ability',
        message: 'Player does not have ability: lightning',
        severity: 'error'
      });
    });

    it('should fail when ability not unlocked', async () => {
      mockPlayer.unlocked = [];
      const actionData = { abilityId: 'fireball' };

      const command = new ValidationCommand('player1', 'ability_usage', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'ability_unlocked',
        message: 'Ability fireball is not unlocked',
        severity: 'error'
      });
    });

    it('should fail when ability on cooldown', async () => {
      mockPlayer.playerAbilities.isAbilityOnCooldown.mockReturnValue(true);
      const actionData = { abilityId: 'fireball' };

      const command = new ValidationCommand('player1', 'ability_usage', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'ability_not_on_cooldown',
        message: 'Ability fireball is on cooldown',
        severity: 'error'
      });
    });
  });

  describe('target selection validation', () => {
    it('should validate player target', async () => {
      const actionData = { targetId: 'player2' };

      const command = new ValidationCommand('player1', 'target_selection', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(true);
      expect(command.validationResults.failed).toEqual([]);
    });

    it('should validate monster target', async () => {
      const actionData = { targetId: 'monster' };

      const command = new ValidationCommand('player1', 'target_selection', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(true);
      expect(command.validationResults.failed).toEqual([]);
    });

    it('should fail when target player not found', async () => {
      const actionData = { targetId: 'nonexistent' };

      const command = new ValidationCommand('player1', 'target_selection', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'target_exists',
        message: 'Target player nonexistent not found',
        severity: 'error'
      });
    });

    it('should fail when monster does not exist', async () => {
      mockGame.monster = null;
      const actionData = { targetId: 'monster' };

      const command = new ValidationCommand('player1', 'target_selection', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'monster_exists',
        message: 'Monster does not exist',
        severity: 'error'
      });
    });

    it('should fail when monster is dead', async () => {
      mockGame.monster.isAlive = false;
      const actionData = { targetId: 'monster' };

      const command = new ValidationCommand('player1', 'target_selection', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toContainEqual({
        rule: 'monster_alive',
        message: 'Cannot target dead monster',
        severity: 'error'
      });
    });
  });

  describe('validation rules filtering', () => {
    it('should only run specified rules', async () => {
      mockPlayer.isAlive = false; // This would normally fail
      mockGame.started = false; // This would normally fail

      const command = new ValidationCommand('player1', 'action_submission', {
        actionData: { actionType: 'ability' },
        validationRules: ['game_started'] // Only check this rule
      });
      
      await command.validate(mockGameContext);
      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed).toHaveLength(1);
      expect(command.validationResults.failed[0].rule).toBe('game_started');
      // player_alive rule should be skipped
    });

    it('should run all rules when none specified', async () => {
      mockPlayer.isAlive = false;
      mockGame.started = false;

      const command = new ValidationCommand('player1', 'action_submission', {
        actionData: { actionType: 'ability' }
      });
      
      await command.validate(mockGameContext);
      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
      expect(command.validationResults.failed.length).toBeGreaterThan(1);
    });
  });

  describe('validation scoring', () => {
    it('should calculate 100% score for all passed rules', async () => {
      const command = new ValidationCommand('player1', 'action_submission', {
        actionData: { actionType: 'ability' }
      });
      
      await command.validate(mockGameContext);
      const result = await command.execute(mockGameContext);

      expect(command.validationResults.score).toBe(100);
    });

    it('should calculate 0% score for all failed rules', async () => {
      mockPlayer.isAlive = false;
      mockGame.started = false;
      mockGame.phase = 'preparation';

      const command = new ValidationCommand('player1', 'action_submission', {
        actionData: { actionType: 'ability' }
      });
      
      await command.validate(mockGameContext);
      const result = await command.execute(mockGameContext);

      expect(command.validationResults.score).toBe(0);
    });

    it('should calculate weighted score with warnings', async () => {
      const command = new ValidationCommand('player1', 'action_submission', {
        actionData: { actionType: 'ability' }
      });
      
      // Manually add some results to test scoring
      command.validationResults.passed.push({
        rule: 'test_pass',
        message: 'Passed',
        severity: 'info'
      });
      command.validationResults.warnings.push({
        rule: 'test_warn',
        message: 'Warning',
        severity: 'warning'
      });

      await command.validate(mockGameContext);
      await command.execute(mockGameContext);

      // Should be weighted average: (1 * 1 + 1 * 0.5) / 2 * 100 = 75%
      expect(command.validationResults.score).toBeGreaterThan(50);
      expect(command.validationResults.score).toBeLessThan(100);
    });
  });

  describe('strict mode', () => {
    it('should pass in non-strict mode with warnings', async () => {
      const command = new ValidationCommand('player1', 'action_submission', {
        actionData: { actionType: 'ability' },
        strict: false
      });
      
      // Manually add a warning
      command.validationResults.warnings.push({
        rule: 'test_warning',
        message: 'Warning message',
        severity: 'warning'
      });

      await command.validate(mockGameContext);
      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(true);
    });

    it('should fail in strict mode with warnings', async () => {
      const command = new ValidationCommand('player1', 'action_submission', {
        actionData: { actionType: 'ability' },
        strict: true
      });
      
      // Manually add a warning
      command.validationResults.warnings.push({
        rule: 'test_warning',
        message: 'Warning message',
        severity: 'warning'
      });

      await command.validate(mockGameContext);
      const result = await command.execute(mockGameContext);

      expect(result.success).toBe(false);
    });
  });

  describe('event emission', () => {
    it('should emit validation completed event', async () => {
      const command = new ValidationCommand('player1', 'action_submission', {
        actionData: { actionType: 'ability' }
      });
      
      await command.validate(mockGameContext);
      await command.execute(mockGameContext);

      expect(mockGame.emitEvent).toHaveBeenCalledWith(EventTypes.ACTION.VALIDATED, {
        playerId: 'player1',
        validationType: 'action_submission',
        results: command.validationResults,
        timestamp: expect.any(String)
      });
    });
  });

  describe('error handling', () => {
    it('should handle execution errors gracefully', async () => {
      mockGame.emitEvent.mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      const command = new ValidationCommand('player1', 'action_submission', {
        actionData: { actionType: 'ability' }
      });
      
      await command.validate(mockGameContext);

      await expect(command.execute(mockGameContext)).rejects.toThrow('Event emission failed');
      
      expect(command.validationResults.failed).toContainEqual({
        rule: 'validation_execution',
        message: 'Validation execution failed: Event emission failed',
        severity: 'error'
      });
    });

    it('should handle unknown validation types', async () => {
      const command = new ValidationCommand('player1', 'unknown_type' as ValidationType);
      
      await command.validate(mockGameContext);

      await expect(command.execute(mockGameContext)).rejects.toThrow('Unhandled validation type: unknown_type');
    });

    it('should handle missing game phase gracefully', async () => {
      mockGame.gamePhase = null;
      const actionData = { actionType: 'ability' };

      const command = new ValidationCommand('player1', 'action_submission', { actionData });
      await command.validate(mockGameContext);

      const result = await command.execute(mockGameContext);

      // Should not fail due to missing gamePhase
      expect(result.success).toBe(true);
    });
  });

  describe('static factory method', () => {
    it('should create ValidationCommand with create method', () => {
      const actionData = { actionType: 'ability', targetId: 'player2' };
      const options = { strict: true, validationRules: ['player_alive'] };

      const command = ValidationCommand.create('player1', 'action_submission', actionData, options);

      expect(command.playerId).toBe('player1');
      expect(command.validationType).toBe('action_submission');
      expect(command.actionData).toBe(actionData);
      expect(command.strict).toBe(true);
      expect(command.validationRules).toEqual(['player_alive']);
    });

    it('should create ValidationCommand with minimal parameters', () => {
      const actionData = { actionType: 'heal' };

      const command = ValidationCommand.create('player1', 'ability_usage', actionData);

      expect(command.playerId).toBe('player1');
      expect(command.validationType).toBe('ability_usage');
      expect(command.actionData).toBe(actionData);
      expect(command.strict).toBe(false);
      expect(command.validationRules).toEqual([]);
    });
  });

  describe('utility methods', () => {
    it('should identify valid validation types', () => {
      const command = new ValidationCommand('player1', 'action_submission');

      expect((command as any)._isValidValidationType('action_submission')).toBe(true);
      expect((command as any)._isValidValidationType('game_state')).toBe(true);
      expect((command as any)._isValidValidationType('invalid')).toBe(false);
    });

    it('should identify valid action types', () => {
      const command = new ValidationCommand('player1', 'action_submission');

      expect((command as any)._isValidActionType('ability')).toBe(true);
      expect((command as any)._isValidActionType('defend')).toBe(true);
      expect((command as any)._isValidActionType('invalid')).toBe(false);
    });

    it('should validate race/class combinations', () => {
      const command = new ValidationCommand('player1', 'player_readiness');

      expect((command as any)._isValidRaceClassCombo('Human', 'Warrior')).toBe(true);
      // Since no prohibited combos are defined, all should be valid
      expect((command as any)._isValidRaceClassCombo('Elf', 'Mage')).toBe(true);
    });
  });
});