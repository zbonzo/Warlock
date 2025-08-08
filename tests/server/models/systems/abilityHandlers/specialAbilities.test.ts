/**
 * @fileoverview Tests for specialAbilities handlers
 */

import { register } from '../../../../../server/models/systems/abilityHandlers/specialAbilities';

jest.mock('@config', () => ({
  MONSTER_ID: '__monster__'
}));

jest.mock('@messages', () => ({
  getAbilityMessage: jest.fn(() => 'Test message'),
  formatMessage: jest.fn(() => 'Formatted message')
}));

describe('specialAbilities', () => {
  let mockRegistry: any;

  beforeEach(() => {
    mockRegistry = {
      registerClassAbility: jest.fn(),
      executeClassAbility: jest.fn()
    };
  });

  describe('register', () => {
    it('should register special abilities with registry', () => {
      register(mockRegistry);

      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('fatesEye', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('primalRoar', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('bloodFrenzy', expect.any(Function));
      expect(mockRegistry.registerClassAbility).toHaveBeenCalledWith('controlMonster', expect.any(Function));
    });
  });
});
