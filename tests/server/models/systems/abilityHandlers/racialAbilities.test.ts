/**
 * @fileoverview Tests for racialAbilities handlers
 */

import { register } from '../../../../../server/models/systems/abilityHandlers/racialAbilities';

jest.mock('@config');
jest.mock('@messages', () => ({
  getAbilityMessage: jest.fn(() => 'Test message'),
  formatMessage: jest.fn(() => 'Formatted message')
}));

describe('racialAbilities', () => {
  let mockRegistry: any;

  beforeEach(() => {
    mockRegistry = {
      registerClassAbility: jest.fn(),
      registerRacialAbility: jest.fn()
    };
  });

  describe('register', () => {
    it('should register racial abilities with registry', () => {
      register(mockRegistry);

      expect(mockRegistry.registerRacialAbility || mockRegistry.registerClassAbility)
        .toHaveBeenCalledWith('adaptability', expect.any(Function));
      expect(mockRegistry.registerRacialAbility || mockRegistry.registerClassAbility)
        .toHaveBeenCalledWith('bloodRage', expect.any(Function));
      expect(mockRegistry.registerRacialAbility || mockRegistry.registerClassAbility)
        .toHaveBeenCalledWith('undying', expect.any(Function));
    });

    it('should fallback to class abilities if racial not supported', () => {
      delete mockRegistry.registerRacialAbility;

      register(mockRegistry);

      expect(mockRegistry.registerClassAbility).toHaveBeenCalledTimes(3);
    });
  });
});
