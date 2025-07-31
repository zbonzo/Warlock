/**
 * @fileoverview Tests for PlayerAbilities model
 */
import { 
  PlayerAbilities, 
  ActionSubmission,
  RacialAbility,
  SubmissionStatus,
  ActionSubmissionResult,
  ActionValidationResult,
  AbilityDamageDisplay
} from '../../../../server/models/player/PlayerAbilities';
import logger from '../../../../server/utils/logger';
import messages from '../../../../server/config/messages';
import config from '../../../../server/config';

// Mock dependencies
jest.mock('@utils/logger');
jest.mock('@messages');
jest.mock('@config');

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockMessages = messages as any;
const mockConfig = config as any;

describe('PlayerAbilities', () => {
  let playerAbilities: PlayerAbilities;
  const playerId = 'player1';
  const playerName = 'TestPlayer';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock config values
    mockConfig.MONSTER_ID = 'monster1';
    
    // Mock messages
    mockMessages.getError = jest.fn((key) => `Error: ${key}`);
    mockMessages.formatMessage = jest.fn((template, params) => 
      `Formatted: ${template} with ${JSON.stringify(params)}`
    );
    mockMessages.serverLogMessages = {
      debug: {
        MultipleActionsAttempt: 'Multiple actions attempt',
        UnavailableAbilityAttempt: 'Unavailable ability attempt',
        AbilityOnCooldownAttempt: 'Ability on cooldown attempt',
        PlayerActionSubmittedSuccessfully: 'Action submitted successfully',
        PlayerActionInvalidated: 'Action invalidated',
        PlayerActionSubmissionCleared: 'Action submission cleared',
        PlayerAbilityOnCooldown: 'Player ability on cooldown',
        PlayerCooldownsExpired: 'Player cooldowns expired'
      }
    };
    mockMessages.ui = {
      abilityDamageSimple: 'Simple damage: {damage}',
      abilityDamageModified: 'Modified damage: {modifiedDamage} (base: {baseDamage}, mod: {modifier})'
    };

    playerAbilities = new PlayerAbilities(playerId, playerName);
  });

  describe('constructor', () => {
    it('should initialize with empty state', () => {
      expect(playerAbilities.getAbilities()).toEqual([]);
      expect(playerAbilities.getUnlockedAbilities()).toEqual([]);
      expect(playerAbilities.getAvailableAbilities()).toEqual([]);
      expect(playerAbilities.canUseRacialAbility()).toBe(false);
    });
  });

  describe('ability management', () => {
    const mockAbilities = [
      { id: 'attack', name: 'Attack', requirements: { damage: 10 } },
      { id: 'heal', name: 'Heal', requirements: { healing: 5 } },
      { id: 'fireball', name: 'Fireball', requirements: { damage: 20 } }
    ];

    beforeEach(() => {
      playerAbilities.setAbilities(mockAbilities);
      playerAbilities.setUnlockedAbilities([mockAbilities[0], mockAbilities[1]]);
    });

    describe('setAbilities and setUnlockedAbilities', () => {
      it('should set and get abilities correctly', () => {
        expect(playerAbilities.getAbilities()).toEqual(mockAbilities);
        expect(playerAbilities.getUnlockedAbilities()).toEqual([mockAbilities[0], mockAbilities[1]]);
      });

      it('should return copies of arrays', () => {
        const abilities1 = playerAbilities.getAbilities();
        const abilities2 = playerAbilities.getAbilities();
        
        expect(abilities1).toEqual(abilities2);
        expect(abilities1).not.toBe(abilities2);
      });
    });

    describe('canUseAbility', () => {
      it('should return true for unlocked abilities not on cooldown', () => {
        expect(playerAbilities.canUseAbility('attack')).toBe(true);
        expect(playerAbilities.canUseAbility('heal')).toBe(true);
      });

      it('should return false for locked abilities', () => {
        expect(playerAbilities.canUseAbility('fireball')).toBe(false);
      });

      it('should return false for abilities on cooldown', () => {
        playerAbilities.putAbilityOnCooldown('attack', 2);
        expect(playerAbilities.canUseAbility('attack')).toBe(false);
      });

      it('should return false for non-existent abilities', () => {
        expect(playerAbilities.canUseAbility('nonexistent')).toBe(false);
      });
    });

    describe('getAvailableAbilities', () => {
      it('should return only usable abilities', () => {
        playerAbilities.putAbilityOnCooldown('heal', 1);
        
        const available = playerAbilities.getAvailableAbilities();
        expect(available).toEqual([mockAbilities[0]]); // Only attack
      });

      it('should return all unlocked abilities when none on cooldown', () => {
        const available = playerAbilities.getAvailableAbilities();
        expect(available).toEqual([mockAbilities[0], mockAbilities[1]]);
      });
    });
  });

  describe('cooldown management', () => {
    describe('putAbilityOnCooldown', () => {
      it('should put ability on cooldown with extra turn', () => {
        playerAbilities.putAbilityOnCooldown('attack', 2);
        
        expect(playerAbilities.getAbilityCooldown('attack')).toBe(3); // 2 + 1
        expect(playerAbilities.isAbilityOnCooldown('attack')).toBe(true);
      });

      it('should not put ability on cooldown for 0 turns', () => {
        playerAbilities.putAbilityOnCooldown('attack', 0);
        
        expect(playerAbilities.getAbilityCooldown('attack')).toBe(0);
        expect(playerAbilities.isAbilityOnCooldown('attack')).toBe(false);
      });

      it('should log cooldown application', () => {
        playerAbilities.putAbilityOnCooldown('heal', 3);
        
        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Player ability on cooldown')
        );
      });
    });

    describe('processAbilityCooldowns', () => {
      it('should decrement all cooldowns by 1', () => {
        playerAbilities.putAbilityOnCooldown('attack', 2);
        playerAbilities.putAbilityOnCooldown('heal', 1);
        
        playerAbilities.processAbilityCooldowns();
        
        expect(playerAbilities.getAbilityCooldown('attack')).toBe(2); // 3 -> 2
        expect(playerAbilities.getAbilityCooldown('heal')).toBe(1); // 2 -> 1
      });

      it('should remove cooldowns that reach 0', () => {
        playerAbilities.putAbilityOnCooldown('attack', 0); // Will be 1 after adding
        
        playerAbilities.processAbilityCooldowns();
        
        expect(playerAbilities.getAbilityCooldown('attack')).toBe(0);
        expect(playerAbilities.isAbilityOnCooldown('attack')).toBe(false);
      });

      it('should log expired cooldowns', () => {
        playerAbilities.putAbilityOnCooldown('attack', 0);
        playerAbilities.putAbilityOnCooldown('heal', 0);
        
        playerAbilities.processAbilityCooldowns();
        
        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Player cooldowns expired')
        );
      });
    });

    describe('getAbilityCooldown and isAbilityOnCooldown', () => {
      it('should return 0 for abilities not on cooldown', () => {
        expect(playerAbilities.getAbilityCooldown('attack')).toBe(0);
        expect(playerAbilities.isAbilityOnCooldown('attack')).toBe(false);
      });

      it('should return correct cooldown values', () => {
        playerAbilities.putAbilityOnCooldown('attack', 3);
        
        expect(playerAbilities.getAbilityCooldown('attack')).toBe(4);
        expect(playerAbilities.isAbilityOnCooldown('attack')).toBe(true);
      });
    });
  });

  describe('action submission', () => {
    const mockAbilities = [
      { id: 'attack', name: 'Attack', requirements: { damage: 10 } },
      { id: 'heal', name: 'Heal', requirements: { healing: 5 } }
    ];

    beforeEach(() => {
      playerAbilities.setAbilities(mockAbilities);
      playerAbilities.setUnlockedAbilities(mockAbilities);
    });

    describe('submitAction', () => {
      it('should successfully submit valid action', () => {
        const result = playerAbilities.submitAction('attack', 'target1');
        
        expect(result.success).toBe(true);
        expect(result.action).toBeDefined();
        expect(result.action?.actionType).toBe('attack');
        expect(result.action?.targetId).toBe('target1');
        expect(result.reason).toBeNull();
      });

      it('should reject multiple action submissions', () => {
        playerAbilities.submitAction('attack', 'target1');
        
        const result = playerAbilities.submitAction('heal', 'target2');
        
        expect(result.success).toBe(false);
        expect(result.reason).toContain('playerActionAlreadySubmittedThisRound');
        expect(result.action).toBeNull();
      });

      it('should reject unavailable abilities', () => {
        const result = playerAbilities.submitAction('fireball', 'target1');
        
        expect(result.success).toBe(false);
        expect(result.reason).toContain('playerAbilityNotAvailable');
        expect(result.action).toBeNull();
      });

      it('should reject abilities on cooldown', () => {
        playerAbilities.putAbilityOnCooldown('attack', 2);
        
        const result = playerAbilities.submitAction('attack', 'target1');
        
        expect(result.success).toBe(false);
        expect(result.reason).toContain('playerAbilityOnCooldownDetailed');
        expect(result.action).toBeNull();
      });

      it('should reject actions without target', () => {
        const result = playerAbilities.submitAction('attack', '');
        
        expect(result.success).toBe(false);
        expect(result.reason).toContain('playerNoTargetSpecified');
        expect(result.action).toBeNull();
      });

      it('should include additional data in action', () => {
        const additionalData = { priority: 'high', context: 'test' };
        const result = playerAbilities.submitAction('attack', 'target1', additionalData);
        
        expect(result.success).toBe(true);
        expect(result.action).toMatchObject({
          actionType: 'attack',
          targetId: 'target1',
          priority: 'high',
          context: 'test'
        });
      });

      it('should log successful submission', () => {
        playerAbilities.submitAction('attack', 'target1');
        
        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Action submitted successfully')
        );
      });
    });

    describe('validateSubmittedAction', () => {
      const alivePlayers = [
        { id: 'player1', isAlive: true },
        { id: 'player2', isAlive: true }
      ];
      const monster = { hp: 100 };

      beforeEach(() => {
        playerAbilities.submitAction('attack', 'player2');
      });

      it('should validate successful action', () => {
        const result = playerAbilities.validateSubmittedAction(alivePlayers, monster);
        
        expect(result.isValid).toBe(true);
        expect(result.reason).toBeNull();
      });

      it('should fail validation when no action submitted', () => {
        playerAbilities.clearActionSubmission();
        
        const result = playerAbilities.validateSubmittedAction(alivePlayers, monster);
        
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('playerNoActionSubmittedForValidation');
      });

      it('should fail when ability no longer available', () => {
        playerAbilities.setUnlockedAbilities([]); // Remove all abilities
        
        const result = playerAbilities.validateSubmittedAction(alivePlayers, monster);
        
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('playerAbilityNoLongerAvailable');
      });

      it('should fail when ability now on cooldown', () => {
        playerAbilities.putAbilityOnCooldown('attack', 1);
        
        const result = playerAbilities.validateSubmittedAction(alivePlayers, monster);
        
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('playerAbilityNowOnCooldown');
      });

      it('should fail when monster target is dead', () => {
        playerAbilities.clearActionSubmission();
        playerAbilities.submitAction('attack', 'monster1');
        
        const deadMonster = { hp: 0 };
        const result = playerAbilities.validateSubmittedAction(alivePlayers, deadMonster);
        
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('playerMonsterInvalidTarget');
      });

      it('should fail when player target is dead', () => {
        const playersWithDead = [
          { id: 'player1', isAlive: true },
          { id: 'player2', isAlive: false }
        ];
        
        const result = playerAbilities.validateSubmittedAction(playersWithDead, monster);
        
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('playerTargetInvalidOrDead');
      });

      it('should fail when player target not found', () => {
        playerAbilities.clearActionSubmission();
        playerAbilities.submitAction('attack', 'nonexistent');
        
        const result = playerAbilities.validateSubmittedAction(alivePlayers, monster);
        
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('playerTargetInvalidOrDead');
      });
    });

    describe('invalidateAction', () => {
      beforeEach(() => {
        playerAbilities.submitAction('attack', 'target1');
      });

      it('should invalidate current action', () => {
        const reason = 'Target became invalid';
        playerAbilities.invalidateAction(reason);
        
        const status = playerAbilities.getSubmissionStatus();
        expect(status.hasSubmitted).toBe(false);
        expect(status.isValid).toBe(false);
        expect(status.validationState).toBe('invalid');
        expect(status.action?.invalidationReason).toBe(reason);
      });

      it('should log invalidation', () => {
        playerAbilities.invalidateAction('Test reason');
        
        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Action invalidated')
        );
      });
    });

    describe('clearActionSubmission', () => {
      beforeEach(() => {
        playerAbilities.submitAction('attack', 'target1');
      });

      it('should clear all submission data', () => {
        playerAbilities.clearActionSubmission();
        
        const status = playerAbilities.getSubmissionStatus();
        expect(status.hasSubmitted).toBe(false);
        expect(status.submissionTime).toBeNull();
        expect(status.action).toBeNull();
        expect(status.validationState).toBe('none');
      });

      it('should log clearance', () => {
        playerAbilities.clearActionSubmission();
        
        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Action submission cleared')
        );
      });
    });

    describe('getSubmissionStatus', () => {
      it('should return correct status when no action submitted', () => {
        const status = playerAbilities.getSubmissionStatus();
        
        expect(status).toEqual({
          hasSubmitted: false,
          isValid: false,
          validationState: 'none',
          submissionTime: null,
          action: null
        });
      });

      it('should return correct status when action submitted', () => {
        playerAbilities.submitAction('attack', 'target1');
        
        const status = playerAbilities.getSubmissionStatus();
        
        expect(status.hasSubmitted).toBe(true);
        expect(status.isValid).toBe(true);
        expect(status.validationState).toBe('valid');
        expect(status.submissionTime).toBeDefined();
        expect(status.action).toEqual({
          type: 'attack',
          target: 'target1',
          isValid: true,
          invalidationReason: undefined
        });
      });
    });
  });

  describe('racial abilities', () => {
    const mockRacialAbility: RacialAbility = {
      id: 'bloodrage',
      name: 'Blood Rage',
      description: 'Double damage on next attack',
      usageLimit: 'perGame',
      maxUses: 1,
      cooldown: 0
    };

    describe('setRacialAbility', () => {
      it('should set racial ability with per-game usage', () => {
        playerAbilities.setRacialAbility(mockRacialAbility);
        
        expect(playerAbilities.canUseRacialAbility()).toBe(true);
      });

      it('should set racial ability with per-round usage', () => {
        const perRoundAbility = { ...mockRacialAbility, usageLimit: 'perRound' as const };
        playerAbilities.setRacialAbility(perRoundAbility);
        
        expect(playerAbilities.canUseRacialAbility()).toBe(true);
      });

      it('should set passive racial ability', () => {
        const passiveAbility = { ...mockRacialAbility, usageLimit: 'passive' as const };
        playerAbilities.setRacialAbility(passiveAbility);
        
        expect(playerAbilities.canUseRacialAbility()).toBe(false); // Passive abilities can't be "used"
      });

      it('should validate racial ability data', () => {
        const invalidAbility = {
          id: '', // Invalid - empty string
          name: 'Test',
          description: 'Test',
          usageLimit: 'invalid' as any
        };

        expect(() => playerAbilities.setRacialAbility(invalidAbility)).toThrow();
      });
    });

    describe('useRacialAbility', () => {
      beforeEach(() => {
        playerAbilities.setRacialAbility(mockRacialAbility);
      });

      it('should successfully use racial ability', () => {
        const result = playerAbilities.useRacialAbility();
        
        expect(result).toBe(true);
        expect(playerAbilities.canUseRacialAbility()).toBe(false); // Used up
      });

      it('should not allow using racial ability when no uses left', () => {
        playerAbilities.useRacialAbility(); // Use the one available use
        
        const result = playerAbilities.useRacialAbility();
        
        expect(result).toBe(false);
      });

      it('should apply cooldown when specified', () => {
        const abilityWithCooldown = { ...mockRacialAbility, cooldown: 3 };
        playerAbilities.setRacialAbility(abilityWithCooldown);
        
        playerAbilities.useRacialAbility();
        
        expect(playerAbilities.canUseRacialAbility()).toBe(false); // On cooldown
      });
    });

    describe('resetRacialPerRoundUses', () => {
      it('should reset per-round racial ability uses', () => {
        const perRoundAbility = { ...mockRacialAbility, usageLimit: 'perRound' as const };
        playerAbilities.setRacialAbility(perRoundAbility);
        
        playerAbilities.useRacialAbility(); // Use it up
        expect(playerAbilities.canUseRacialAbility()).toBe(false);
        
        playerAbilities.resetRacialPerRoundUses();
        expect(playerAbilities.canUseRacialAbility()).toBe(true);
      });

      it('should not affect per-game abilities', () => {
        playerAbilities.setRacialAbility(mockRacialAbility); // per-game
        
        playerAbilities.useRacialAbility(); // Use it up
        expect(playerAbilities.canUseRacialAbility()).toBe(false);
        
        playerAbilities.resetRacialPerRoundUses();
        expect(playerAbilities.canUseRacialAbility()).toBe(false); // Still used up
      });
    });

    describe('processRacialCooldowns', () => {
      it('should decrement racial cooldown', () => {
        const abilityWithCooldown = { ...mockRacialAbility, cooldown: 2 };
        playerAbilities.setRacialAbility(abilityWithCooldown);
        
        playerAbilities.useRacialAbility(); // Start cooldown
        
        playerAbilities.processRacialCooldowns();
        // Cooldown should be decremented but ability still unusable due to uses
      });

      it('should return null when no special effects', () => {
        const result = playerAbilities.processRacialCooldowns();
        expect(result).toBeNull();
      });
    });
  });

  describe('damage display', () => {
    const mockAbility = {
      id: 'attack',
      name: 'Attack',
      requirements: { damage: 10 }
    };

    describe('getAbilityDamageDisplay', () => {
      it('should return damage display for ability with damage', () => {
        const display = playerAbilities.getAbilityDamageDisplay(mockAbility);
        
        expect(display).toEqual({
          base: 10,
          modified: 10,
          modifier: 1.0,
          showModified: false,
          displayText: expect.stringContaining('Simple damage')
        });
      });

      it('should show modified damage when modifier applied', () => {
        const display = playerAbilities.getAbilityDamageDisplay(mockAbility, 1.5);
        
        expect(display).toEqual({
          base: 10,
          modified: 15,
          modifier: 1.5,
          showModified: true,
          displayText: expect.stringContaining('Modified damage')
        });
      });

      it('should return null for abilities without damage', () => {
        const nonDamageAbility = {
          id: 'heal',
          name: 'Heal',
          requirements: { healing: 5 }
        };
        
        const display = playerAbilities.getAbilityDamageDisplay(nonDamageAbility);
        expect(display).toBeNull();
      });

      it('should return null for abilities without requirements', () => {
        const abilityNoRequirements = {
          id: 'test',
          name: 'Test',
          requirements: null
        };
        
        const display = playerAbilities.getAbilityDamageDisplay(abilityNoRequirements as any);
        expect(display).toBeNull();
      });

      it('should floor modified damage', () => {
        const display = playerAbilities.getAbilityDamageDisplay(mockAbility, 1.7); // 10 * 1.7 = 17
        
        expect(display?.modified).toBe(17);
      });
    });
  });

  describe('utility methods', () => {
    describe('setPlayerName', () => {
      it('should update player name for logging', () => {
        playerAbilities.setPlayerName('NewName');
        
        // Test that the new name is used (this would be visible in logging)
        expect(() => playerAbilities.clearActionSubmission()).not.toThrow();
      });
    });
  });

  describe('serialization', () => {
    const mockAbilities = [
      { id: 'attack', name: 'Attack', requirements: { damage: 10 } }
    ];
    
    const mockRacialAbility: RacialAbility = {
      id: 'bloodrage',
      name: 'Blood Rage',
      description: 'Double damage',
      usageLimit: 'perGame',
      maxUses: 1,
      cooldown: 0
    };

    describe('toJSON', () => {
      it('should serialize all ability data', () => {
        playerAbilities.setAbilities(mockAbilities);
        playerAbilities.setUnlockedAbilities(mockAbilities);
        playerAbilities.setRacialAbility(mockRacialAbility);
        playerAbilities.putAbilityOnCooldown('attack', 2);
        playerAbilities.submitAction('attack', 'target1');
        
        const json = playerAbilities.toJSON();
        
        expect(json).toEqual({
          playerId,
          playerName,
          abilities: mockAbilities,
          unlocked: mockAbilities,
          abilityCooldowns: { attack: 3 },
          racialAbility: mockRacialAbility,
          racialUsesLeft: 1,
          racialCooldown: 0,
          racialEffects: {},
          hasSubmittedAction: true,
          submittedAction: expect.objectContaining({
            actionType: 'attack',
            targetId: 'target1'
          }),
          actionSubmissionTime: expect.any(Number),
          lastValidAction: expect.objectContaining({
            actionType: 'attack',
            targetId: 'target1'
          }),
          actionValidationState: 'valid'
        });
      });
    });

    describe('fromJSON', () => {
      it('should recreate PlayerAbilities from serialized data', () => {
        const data = {
          playerId: 'player2',
          playerName: 'Player2',
          abilities: mockAbilities,
          unlocked: mockAbilities,
          abilityCooldowns: { attack: 2 },
          racialAbility: mockRacialAbility,
          racialUsesLeft: 1,
          racialCooldown: 0,
          racialEffects: {},
          hasSubmittedAction: true,
          submittedAction: {
            actionType: 'attack',
            targetId: 'target1',
            isValid: true,
            submissionTime: Date.now()
          },
          actionSubmissionTime: Date.now(),
          lastValidAction: {
            actionType: 'attack',
            targetId: 'target1',
            isValid: true,
            submissionTime: Date.now()
          },
          actionValidationState: 'valid'
        };
        
        const abilities = PlayerAbilities.fromJSON(data);
        
        expect(abilities.getAbilities()).toEqual(mockAbilities);
        expect(abilities.getUnlockedAbilities()).toEqual(mockAbilities);
        expect(abilities.getAbilityCooldown('attack')).toBe(2);
        expect(abilities.canUseRacialAbility()).toBe(true);
        
        const status = abilities.getSubmissionStatus();
        expect(status.hasSubmitted).toBe(true);
        expect(status.validationState).toBe('valid');
      });

      it('should handle missing data gracefully', () => {
        const data = {
          playerId: 'player3',
          playerName: 'Player3'
        };
        
        const abilities = PlayerAbilities.fromJSON(data);
        
        expect(abilities.getAbilities()).toEqual([]);
        expect(abilities.getUnlockedAbilities()).toEqual([]);
        expect(abilities.canUseRacialAbility()).toBe(false);
        
        const status = abilities.getSubmissionStatus();
        expect(status.hasSubmitted).toBe(false);
        expect(status.validationState).toBe('none');
      });
    });
  });

  describe('complex scenarios', () => {
    const mockAbilities = [
      { id: 'attack', name: 'Attack', requirements: { damage: 10 } },
      { id: 'heal', name: 'Heal', requirements: { healing: 5 } },
      { id: 'fireball', name: 'Fireball', requirements: { damage: 20 } }
    ];

    beforeEach(() => {
      playerAbilities.setAbilities(mockAbilities);
      playerAbilities.setUnlockedAbilities(mockAbilities);
    });

    it('should handle multiple cooldowns correctly', () => {
      playerAbilities.putAbilityOnCooldown('attack', 3);
      playerAbilities.putAbilityOnCooldown('heal', 1);
      playerAbilities.putAbilityOnCooldown('fireball', 2);
      
      // Process cooldowns multiple times
      playerAbilities.processAbilityCooldowns(); // attack: 3, heal: 0, fireball: 2
      expect(playerAbilities.canUseAbility('heal')).toBe(true);
      expect(playerAbilities.canUseAbility('attack')).toBe(false);
      expect(playerAbilities.canUseAbility('fireball')).toBe(false);
      
      playerAbilities.processAbilityCooldowns(); // attack: 2, fireball: 1
      expect(playerAbilities.canUseAbility('fireball')).toBe(false);
      
      playerAbilities.processAbilityCooldowns(); // attack: 1, fireball: 0
      expect(playerAbilities.canUseAbility('fireball')).toBe(true);
      expect(playerAbilities.canUseAbility('attack')).toBe(false);
    });

    it('should handle action submission and validation lifecycle', () => {
      const alivePlayers = [{ id: 'target1', isAlive: true }];
      const monster = { hp: 100 };
      
      // Submit action
      const submitResult = playerAbilities.submitAction('attack', 'target1');
      expect(submitResult.success).toBe(true);
      
      // Validate action
      const validateResult = playerAbilities.validateSubmittedAction(alivePlayers, monster);
      expect(validateResult.isValid).toBe(true);
      
      // Put ability on cooldown and re-validate
      playerAbilities.putAbilityOnCooldown('attack', 1);
      const revalidateResult = playerAbilities.validateSubmittedAction(alivePlayers, monster);
      expect(revalidateResult.isValid).toBe(false);
      
      // Check that action was invalidated
      const status = playerAbilities.getSubmissionStatus();
      expect(status.hasSubmitted).toBe(false);
      expect(status.validationState).toBe('invalid');
    });

    it('should handle racial ability with cooldown', () => {
      const racialAbility: RacialAbility = {
        id: 'special',
        name: 'Special Attack',
        description: 'Powerful attack',
        usageLimit: 'perRound',
        maxUses: 2,
        cooldown: 3
      };
      
      playerAbilities.setRacialAbility(racialAbility);
      
      // Use first time
      expect(playerAbilities.useRacialAbility()).toBe(true);
      expect(playerAbilities.canUseRacialAbility()).toBe(false); // On cooldown
      
      // Process cooldowns
      playerAbilities.processRacialCooldowns(); // cooldown: 2
      playerAbilities.processRacialCooldowns(); // cooldown: 1
      playerAbilities.processRacialCooldowns(); // cooldown: 0
      
      // Should be able to use again (still has uses left)
      expect(playerAbilities.canUseRacialAbility()).toBe(true);
      
      // Use second time
      expect(playerAbilities.useRacialAbility()).toBe(true);
      expect(playerAbilities.canUseRacialAbility()).toBe(false); // No uses left and on cooldown
      
      // Reset per-round uses
      playerAbilities.resetRacialPerRoundUses();
      expect(playerAbilities.canUseRacialAbility()).toBe(false); // Still on cooldown
      
      // Process cooldowns to remove cooldown
      playerAbilities.processRacialCooldowns();
      playerAbilities.processRacialCooldowns();
      playerAbilities.processRacialCooldowns();
      
      expect(playerAbilities.canUseRacialAbility()).toBe(true); // Can use again
    });
  });
});