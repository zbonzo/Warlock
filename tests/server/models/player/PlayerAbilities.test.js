/**
 * @fileoverview Tests for PlayerAbilities domain model
 */
const PlayerAbilities = require('../../../../server/models/player/PlayerAbilities');

// Mock messages module
jest.mock('@messages', () => ({
  getError: jest.fn((key) => `Error: ${key}`),
  formatMessage: jest.fn((template, params) => `${template} ${JSON.stringify(params)}`),
  serverLogMessages: {
    debug: {
      MultipleActionsAttempt: 'Multiple actions attempted',
      UnavailableAbilityAttempt: 'Unavailable ability attempted',
      AbilityOnCooldownAttempt: 'Ability on cooldown attempted',
      PlayerActionSubmittedSuccessfully: 'Action submitted successfully',
      PlayerActionInvalidated: 'Action invalidated',
      PlayerActionSubmissionCleared: 'Action submission cleared',
      PlayerAbilityOnCooldown: 'Ability on cooldown',
      PlayerCooldownsExpired: 'Cooldowns expired',
    }
  }
}));

describe('PlayerAbilities', () => {
  let playerAbilities;

  beforeEach(() => {
    playerAbilities = new PlayerAbilities('player1', 'TestPlayer');
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct default values', () => {
      expect(playerAbilities.abilities).toEqual([]);
      expect(playerAbilities.unlocked).toEqual([]);
      expect(playerAbilities.abilityCooldowns).toEqual({});
      expect(playerAbilities.hasSubmittedAction).toBe(false);
      expect(playerAbilities.racialAbility).toBeNull();
      expect(playerAbilities.racialUsesLeft).toBe(0);
      expect(playerAbilities.racialCooldown).toBe(0);
    });
  });

  describe('Action Submission', () => {
    beforeEach(() => {
      playerAbilities.unlocked = [
        { type: 'attack', name: 'Slash', cooldown: 0 },
        { type: 'fireball', name: 'Fireball', cooldown: 2 }
      ];
    });

    test('should submit valid action successfully', () => {
      const result = playerAbilities.submitAction('attack', 'target1', { extra: 'data' });
      
      expect(result.success).toBe(true);
      expect(result.action.actionType).toBe('attack');
      expect(result.action.targetId).toBe('target1');
      expect(result.action.extra).toBe('data');
      expect(playerAbilities.hasSubmittedAction).toBe(true);
    });

    test('should reject duplicate action submission', () => {
      playerAbilities.submitAction('attack', 'target1');
      
      const result = playerAbilities.submitAction('fireball', 'target2');
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('playerActionAlreadySubmittedThisRound');
    });

    test('should reject unavailable ability', () => {
      const result = playerAbilities.submitAction('nonexistent', 'target1');
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('playerAbilityNotAvailable');
    });

    test('should reject ability on cooldown', () => {
      playerAbilities.putAbilityOnCooldown('attack', 2);
      
      const result = playerAbilities.submitAction('attack', 'target1');
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('playerAbilityOnCooldownDetailed');
    });

    test('should reject action without target', () => {
      const result = playerAbilities.submitAction('attack', null);
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('playerNoTargetSpecified');
    });
  });

  describe('Action Validation', () => {
    beforeEach(() => {
      playerAbilities.unlocked = [
        { type: 'attack', name: 'Slash', cooldown: 0 }
      ];
      playerAbilities.submitAction('attack', 'target1');
    });

    test('should validate submitted action successfully', () => {
      const alivePlayers = [{ id: 'target1', isAlive: true }];
      const monster = { hp: 100 };
      
      const result = playerAbilities.validateSubmittedAction(alivePlayers, monster);
      
      expect(result.isValid).toBe(true);
    });

    test('should invalidate action when target is dead', () => {
      const alivePlayers = [{ id: 'target1', isAlive: false }];
      const monster = { hp: 100 };
      
      const result = playerAbilities.validateSubmittedAction(alivePlayers, monster);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('playerTargetInvalidOrDead');
    });

    test('should invalidate action when ability is no longer available', () => {
      playerAbilities.unlocked = []; // Remove abilities
      const alivePlayers = [{ id: 'target1', isAlive: true }];
      const monster = { hp: 100 };
      
      const result = playerAbilities.validateSubmittedAction(alivePlayers, monster);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('playerAbilityNoLongerAvailable');
    });

    test('should handle monster target validation', () => {
      // Submit action targeting monster
      playerAbilities.clearActionSubmission();
      playerAbilities.submitAction('attack', 'MONSTER');
      
      const alivePlayers = [];
      const monster = { hp: 0 }; // Dead monster
      
      const result = playerAbilities.validateSubmittedAction(alivePlayers, monster);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('playerMonsterInvalidTarget');
    });
  });

  describe('Cooldown Management', () => {
    test('should put ability on cooldown correctly', () => {
      playerAbilities.putAbilityOnCooldown('fireball', 2);
      
      expect(playerAbilities.isAbilityOnCooldown('fireball')).toBe(true);
      expect(playerAbilities.getAbilityCooldown('fireball')).toBe(3); // +1 for timing
    });

    test('should not put zero cooldown abilities on cooldown', () => {
      playerAbilities.putAbilityOnCooldown('attack', 0);
      
      expect(playerAbilities.isAbilityOnCooldown('attack')).toBe(false);
      expect(playerAbilities.getAbilityCooldown('attack')).toBe(0);
    });

    test('should process cooldowns correctly', () => {
      playerAbilities.putAbilityOnCooldown('fireball', 2);
      playerAbilities.putAbilityOnCooldown('heal', 1);
      
      // First processing
      playerAbilities.processAbilityCooldowns();
      expect(playerAbilities.getAbilityCooldown('fireball')).toBe(2);
      expect(playerAbilities.getAbilityCooldown('heal')).toBe(1);
      
      // Second processing
      playerAbilities.processAbilityCooldowns();
      expect(playerAbilities.getAbilityCooldown('fireball')).toBe(1);
      expect(playerAbilities.getAbilityCooldown('heal')).toBe(0);
      
      // Third processing - cooldowns should be removed
      playerAbilities.processAbilityCooldowns();
      expect(playerAbilities.isAbilityOnCooldown('fireball')).toBe(false);
      expect(playerAbilities.isAbilityOnCooldown('heal')).toBe(false);
    });
  });

  describe('Ability Availability', () => {
    beforeEach(() => {
      playerAbilities.unlocked = [
        { type: 'attack', name: 'Slash' },
        { type: 'fireball', name: 'Fireball' },
        { type: 'heal', name: 'Heal' }
      ];
    });

    test('should check ability availability correctly', () => {
      expect(playerAbilities.canUseAbility('attack')).toBe(true);
      expect(playerAbilities.canUseAbility('nonexistent')).toBe(false);
      
      playerAbilities.putAbilityOnCooldown('attack', 1);
      expect(playerAbilities.canUseAbility('attack')).toBe(false);
    });

    test('should get available abilities correctly', () => {
      playerAbilities.putAbilityOnCooldown('fireball', 1);
      
      const available = playerAbilities.getAvailableAbilities();
      
      expect(available).toHaveLength(2);
      expect(available.map(a => a.type)).toEqual(['attack', 'heal']);
    });
  });

  describe('Racial Abilities', () => {
    test('should set racial ability correctly', () => {
      const racialAbility = {
        type: 'bloodRage',
        name: 'Blood Rage',
        usageLimit: 'perGame',
        maxUses: 1,
        cooldown: 3
      };
      
      playerAbilities.setRacialAbility(racialAbility);
      
      expect(playerAbilities.racialAbility).toEqual(racialAbility);
      expect(playerAbilities.racialUsesLeft).toBe(1);
      expect(playerAbilities.racialCooldown).toBe(0);
    });

    test('should handle passive racial abilities', () => {
      const passiveAbility = {
        type: 'stoneArmor',
        usageLimit: 'passive',
        maxUses: 0
      };
      
      playerAbilities.setRacialAbility(passiveAbility);
      
      expect(playerAbilities.racialUsesLeft).toBe(0);
    });

    test('should use racial ability correctly', () => {
      const racialAbility = {
        type: 'keenSenses',
        usageLimit: 'perGame',
        maxUses: 1,
        cooldown: 2
      };
      
      playerAbilities.setRacialAbility(racialAbility);
      
      expect(playerAbilities.canUseRacialAbility()).toBe(true);
      
      const success = playerAbilities.useRacialAbility();
      
      expect(success).toBe(true);
      expect(playerAbilities.racialUsesLeft).toBe(0);
      expect(playerAbilities.racialCooldown).toBe(2);
      expect(playerAbilities.canUseRacialAbility()).toBe(false);
    });

    test('should process racial cooldowns', () => {
      playerAbilities.racialCooldown = 2;
      
      playerAbilities.processRacialCooldowns();
      expect(playerAbilities.racialCooldown).toBe(1);
      
      playerAbilities.processRacialCooldowns();
      expect(playerAbilities.racialCooldown).toBe(0);
    });

    test('should reset per-round racial uses', () => {
      const racialAbility = {
        type: 'forestsGrace',
        usageLimit: 'perRound',
        maxUses: 2
      };
      
      playerAbilities.setRacialAbility(racialAbility);
      playerAbilities.useRacialAbility();
      playerAbilities.useRacialAbility();
      
      expect(playerAbilities.racialUsesLeft).toBe(0);
      
      playerAbilities.resetRacialPerRoundUses();
      
      expect(playerAbilities.racialUsesLeft).toBe(2);
    });
  });

  describe('Utility Methods', () => {
    test('should clear action submission correctly', () => {
      playerAbilities.unlocked = [{ type: 'attack', name: 'Slash' }];
      playerAbilities.submitAction('attack', 'target1');
      
      expect(playerAbilities.hasSubmittedAction).toBe(true);
      
      playerAbilities.clearActionSubmission();
      
      expect(playerAbilities.hasSubmittedAction).toBe(false);
      expect(playerAbilities.submittedAction).toBeNull();
      expect(playerAbilities.actionValidationState).toBe('none');
    });

    test('should invalidate action correctly', () => {
      playerAbilities.unlocked = [{ type: 'attack', name: 'Slash' }];
      playerAbilities.submitAction('attack', 'target1');
      
      playerAbilities.invalidateAction('Test reason');
      
      expect(playerAbilities.hasSubmittedAction).toBe(false);
      expect(playerAbilities.actionValidationState).toBe('invalid');
      expect(playerAbilities.submittedAction.isValid).toBe(false);
      expect(playerAbilities.submittedAction.invalidationReason).toBe('Test reason');
    });

    test('should get submission status correctly', () => {
      const status1 = playerAbilities.getSubmissionStatus();
      expect(status1.hasSubmitted).toBe(false);
      expect(status1.action).toBeNull();
      
      playerAbilities.unlocked = [{ type: 'attack', name: 'Slash' }];
      playerAbilities.submitAction('attack', 'target1');
      
      const status2 = playerAbilities.getSubmissionStatus();
      expect(status2.hasSubmitted).toBe(true);
      expect(status2.isValid).toBe(true);
      expect(status2.action.type).toBe('attack');
    });

    test('should update player name correctly', () => {
      playerAbilities.setPlayerName('NewName');
      expect(playerAbilities.playerName).toBe('NewName');
    });

    test('should get ability damage display correctly', () => {
      const ability = {
        params: { damage: 20 }
      };
      
      const display1 = playerAbilities.getAbilityDamageDisplay(ability, 1.0);
      expect(display1.base).toBe(20);
      expect(display1.modified).toBe(20);
      expect(display1.showModified).toBe(false);
      
      const display2 = playerAbilities.getAbilityDamageDisplay(ability, 1.5);
      expect(display2.base).toBe(20);
      expect(display2.modified).toBe(30);
      expect(display2.showModified).toBe(true);
    });

    test('should handle abilities without damage', () => {
      const ability = { params: {} };
      const display = playerAbilities.getAbilityDamageDisplay(ability, 1.0);
      expect(display).toBeNull();
    });
  });
});