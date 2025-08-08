/**
 * @fileoverview Tests for messages index configuration
 * Tests message aggregation, formatting, and helper functions
 */

// Mock all message file imports
jest.mock('../../../../server/config/messages/core.js', () => ({
  success: { gameCreated: 'Game created successfully' },
  error: { gameNotFound: 'Game not found' },
  events: { playerJoined: 'Player joined game' },
  winConditions: { goodWins: 'Good team wins!' }
}), { virtual: true });

jest.mock('../../../../server/config/messages/abilities/attacks.js', () => ({
  fireball: 'Casts a powerful fireball',
  lightning: 'Strikes with lightning'
}), { virtual: true });

jest.mock('../../../../server/config/messages/abilities/defense.js', () => ({
  shield: 'Raises a protective shield',
  armor: 'Increases armor protection'
}), { virtual: true });

jest.mock('../../../../server/config/messages/abilities/healing.js', () => ({
  heal: 'Restores health points',
  regeneration: 'Grants health regeneration'
}), { virtual: true });

jest.mock('../../../../server/config/messages/abilities/special.js', () => ({
  teleport: 'Teleports to safety',
  invisibility: 'Becomes invisible'
}), { virtual: true });

jest.mock('../../../../server/config/messages/abilities/racial.js', () => ({
  berserk: 'Enters berserker rage',
  adaptation: 'Adapts to situation'
}), { virtual: true });

jest.mock('../../../../server/config/messages/combat.js', () => ({
  damage: '{attacker} deals {damage} damage to {target}',
  kill: '{attacker} kills {target}'
}), { virtual: true });

jest.mock('../../../../server/config/messages/status-effects.js', () => ({}), { virtual: true });

jest.mock('../../../../server/config/messages/warlock.js', () => ({
  conversion: 'Player converted to warlock',
  victory: 'Warlocks achieve victory'
}), { virtual: true });

jest.mock('../../../../server/config/messages/monster.js', () => ({
  attack: 'Monster attacks player',
  spawn: 'Monster spawns'
}), { virtual: true });

jest.mock('../../../../server/config/messages/player.js', () => ({
  levelUp: 'Player levels up',
  death: 'Player has died'
}), { virtual: true });

jest.mock('../../../../server/config/messages/ui.js', () => ({
  loading: 'Loading...',
  error: 'An error occurred'
}), { virtual: true });

jest.mock('../../../../server/config/messages/logs.js', () => ({
  info: { gameStart: 'Game started' },
  error: { connection: 'Connection error' }
}), { virtual: true });

import messagesModule, {
  formatMessage,
  getMessage,
  getError,
  getSuccess,
  getEvent,
  getAbilityMessage
} from '../../../../server/config/messages/index';

describe('Messages Index Configuration', () => {
  describe('Messages Module Structure', () => {
    it('should export messages module', () => {
      expect(messagesModule).toBeDefined();
      expect(typeof messagesModule).toBe('object');
    });

    it('should have all message categories', () => {
      expect(messagesModule).toHaveProperty('success');
      expect(messagesModule).toHaveProperty('error');
      expect(messagesModule).toHaveProperty('events');
      expect(messagesModule).toHaveProperty('abilities');
      expect(messagesModule).toHaveProperty('combat');
      expect(messagesModule).toHaveProperty('statusEffects');
      expect(messagesModule).toHaveProperty('warlock');
      expect(messagesModule).toHaveProperty('monster');
      expect(messagesModule).toHaveProperty('player');
      expect(messagesModule).toHaveProperty('ui');
      expect(messagesModule).toHaveProperty('serverLogMessages');
      expect(messagesModule).toHaveProperty('winConditions');
    });

    it('should have helper functions', () => {
      expect(messagesModule).toHaveProperty('formatMessage');
      expect(messagesModule).toHaveProperty('getMessage');
      expect(messagesModule).toHaveProperty('getError');
      expect(messagesModule).toHaveProperty('getSuccess');
      expect(messagesModule).toHaveProperty('getEvent');
      expect(messagesModule).toHaveProperty('getAbilityMessage');

      expect(typeof messagesModule.formatMessage).toBe('function');
      expect(typeof messagesModule.getMessage).toBe('function');
      expect(typeof messagesModule.getError).toBe('function');
      expect(typeof messagesModule.getSuccess).toBe('function');
      expect(typeof messagesModule.getEvent).toBe('function');
      expect(typeof messagesModule.getAbilityMessage).toBe('function');
    });
  });

  describe('Core Messages', () => {
    it('should include core success messages', () => {
      expect(messagesModule.success).toBeDefined();
      expect(messagesModule.success.gameCreated).toBe('Game created successfully');
    });

    it('should include core error messages', () => {
      expect(messagesModule.error).toBeDefined();
      expect(messagesModule.error.gameNotFound).toBe('Game not found');
    });

    it('should include core event messages', () => {
      expect(messagesModule.events).toBeDefined();
      expect(messagesModule.events.playerJoined).toBe('Player joined game');
    });

    it('should include win condition messages', () => {
      expect(messagesModule.winConditions).toBeDefined();
      expect(messagesModule.winConditions.goodWins).toBe('Good team wins!');
    });
  });

  describe('Ability Messages', () => {
    it('should organize abilities by category', () => {
      expect(messagesModule.abilities).toBeDefined();
      expect(messagesModule.abilities).toHaveProperty('attacks');
      expect(messagesModule.abilities).toHaveProperty('defense');
      expect(messagesModule.abilities).toHaveProperty('healing');
      expect(messagesModule.abilities).toHaveProperty('special');
      expect(messagesModule.abilities).toHaveProperty('racial');
    });

    it('should include attack ability messages', () => {
      expect(messagesModule.abilities.attacks.fireball).toBe('Casts a powerful fireball');
      expect(messagesModule.abilities.attacks.lightning).toBe('Strikes with lightning');
    });

    it('should include defense ability messages', () => {
      expect(messagesModule.abilities.defense.shield).toBe('Raises a protective shield');
      expect(messagesModule.abilities.defense.armor).toBe('Increases armor protection');
    });

    it('should include healing ability messages', () => {
      expect(messagesModule.abilities.healing.heal).toBe('Restores health points');
      expect(messagesModule.abilities.healing.regeneration).toBe('Grants health regeneration');
    });

    it('should include special ability messages', () => {
      expect(messagesModule.abilities.special.teleport).toBe('Teleports to safety');
      expect(messagesModule.abilities.special.invisibility).toBe('Becomes invisible');
    });

    it('should include racial ability messages', () => {
      expect(messagesModule.abilities.racial.berserk).toBe('Enters berserker rage');
      expect(messagesModule.abilities.racial.adaptation).toBe('Adapts to situation');
    });
  });

  describe('System Messages', () => {
    it('should include combat messages', () => {
      expect(messagesModule.combat).toBeDefined();
      expect(messagesModule.combat.damage).toBe('{attacker} deals {damage} damage to {target}');
      expect(messagesModule.combat.kill).toBe('{attacker} kills {target}');
    });

    it('should include warlock messages', () => {
      expect(messagesModule.warlock).toBeDefined();
      expect(messagesModule.warlock.conversion).toBe('Player converted to warlock');
      expect(messagesModule.warlock.victory).toBe('Warlocks achieve victory');
    });

    it('should include monster messages', () => {
      expect(messagesModule.monster).toBeDefined();
      expect(messagesModule.monster.attack).toBe('Monster attacks player');
      expect(messagesModule.monster.spawn).toBe('Monster spawns');
    });

    it('should include player messages', () => {
      expect(messagesModule.player).toBeDefined();
      expect(messagesModule.player.levelUp).toBe('Player levels up');
      expect(messagesModule.player.death).toBe('Player has died');
    });

    it('should include UI messages', () => {
      expect(messagesModule.ui).toBeDefined();
      expect(messagesModule.ui.loading).toBe('Loading...');
      expect(messagesModule.ui.error).toBe('An error occurred');
    });

    it('should include server log messages', () => {
      expect(messagesModule.serverLogMessages).toBeDefined();
      expect(messagesModule.serverLogMessages.info.gameStart).toBe('Game started');
      expect(messagesModule.serverLogMessages.error.connection).toBe('Connection error');
    });
  });

  describe('formatMessage Function', () => {
    it('should format message with single parameter', () => {
      const template = 'Hello {name}!';
      const params = { name: 'World' };
      const result = formatMessage(template, params);

      expect(result).toBe('Hello World!');
    });

    it('should format message with multiple parameters', () => {
      const template = '{attacker} deals {damage} damage to {target}';
      const params = { attacker: 'Player1', damage: '25', target: 'Monster' };
      const result = formatMessage(template, params);

      expect(result).toBe('Player1 deals 25 damage to Monster');
    });

    it('should handle missing parameters gracefully', () => {
      const template = 'Hello {name}!';
      const params = {};
      const result = formatMessage(template, params);

      expect(result).toBe('Hello {name}!');
    });

    it('should handle empty parameters object', () => {
      const template = 'No parameters here';
      const result = formatMessage(template);

      expect(result).toBe('No parameters here');
    });

    it('should handle multiple occurrences of same parameter', () => {
      const template = '{name} says hello to {name}';
      const params = { name: 'Bob' };
      const result = formatMessage(template, params);

      expect(result).toBe('Bob says hello to Bob');
    });

    it('should convert non-string values to strings', () => {
      const template = 'Score: {points}';
      const params = { points: 100 };
      const result = formatMessage(template, params);

      expect(result).toBe('Score: 100');
    });
  });

  describe('getMessage Function', () => {
    it('should retrieve message by dot notation path', () => {
      const message = getMessage('success.gameCreated');
      expect(message).toBe('Game created successfully');
    });

    it('should retrieve nested ability message', () => {
      const message = getMessage('abilities.attacks.fireball');
      expect(message).toBe('Casts a powerful fireball');
    });

    it('should return null for non-existent path', () => {
      const message = getMessage('nonexistent.path');
      expect(message).toBeNull();
    });

    it('should return null for partial path that points to object', () => {
      const message = getMessage('abilities.attacks');
      expect(message).toBeNull();
    });

    it('should handle empty path', () => {
      const message = getMessage('');
      expect(message).toBeNull();
    });

    it('should handle deep nested paths', () => {
      const message = getMessage('serverLogMessages.info.gameStart');
      expect(message).toBe('Game started');
    });
  });

  describe('Helper Functions', () => {
    it('should get error message with getError', () => {
      const error = getError('gameNotFound');
      expect(error).toBe('Game not found');
    });

    it('should provide fallback for missing error', () => {
      const error = getError('nonexistent');
      expect(error).toBe('Error: nonexistent');
    });

    it('should get success message with getSuccess', () => {
      const success = getSuccess('gameCreated');
      expect(success).toBe('Game created successfully');
    });

    it('should provide fallback for missing success', () => {
      const success = getSuccess('nonexistent');
      expect(success).toBe('Success: nonexistent');
    });

    it('should get event message with getEvent', () => {
      const event = getEvent('playerJoined');
      expect(event).toBe('Player joined game');
    });

    it('should provide fallback for missing event', () => {
      const event = getEvent('nonexistent');
      expect(event).toBe('Event: nonexistent');
    });

    it('should get ability message with getAbilityMessage', () => {
      const ability = getAbilityMessage('attacks', 'fireball');
      expect(ability).toBe('Casts a powerful fireball');
    });

    it('should provide fallback for missing ability', () => {
      const ability = getAbilityMessage('attacks', 'nonexistent');
      expect(ability).toBe('Ability: attacks.nonexistent');
    });
  });

  describe('Module Exports', () => {
    it('should export default object with all properties', () => {
      const defaultExport = require('../../../../server/config/messages/index').default;
      expect(defaultExport).toBe(messagesModule);
    });

    it('should export named functions', () => {
      const module = require('../../../../server/config/messages/index');
      expect(module.formatMessage).toBe(formatMessage);
      expect(module.getMessage).toBe(getMessage);
      expect(module.getError).toBe(getError);
      expect(module.getSuccess).toBe(getSuccess);
      expect(module.getEvent).toBe(getEvent);
      expect(module.getAbilityMessage).toBe(getAbilityMessage);
    });

    it('should be importable as TypeScript module', () => {
      expect(() => {
        const imported = require('../../../../server/config/messages/index');
        expect(imported).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should have consistent message structure', () => {
      expect(typeof messagesModule.success).toBe('object');
      expect(typeof messagesModule.error).toBe('object');
      expect(typeof messagesModule.events).toBe('object');
      expect(typeof messagesModule.abilities).toBe('object');
    });

    it('should not have circular references', () => {
      expect(() => {
        JSON.stringify(messagesModule);
      }).not.toThrow();
    });

    it('should have string values for all leaf nodes', () => {
      const checkStringValues = (obj: any, path = ''): void => {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;

          if (typeof value === 'string') {
            expect(value.length).toBeGreaterThan(0);
          } else if (typeof value === 'object' && value !== null) {
            // Skip functions and continue with objects
            if (typeof value !== 'function') {
              checkStringValues(value, currentPath);
            }
          }
        });
      };

      // Check core message structures
      checkStringValues(messagesModule.success, 'success');
      checkStringValues(messagesModule.error, 'error');
      checkStringValues(messagesModule.events, 'events');
    });
  });

  describe('Message Path Resolution', () => {
    it('should handle complex nested paths', () => {
      const deepMessage = getMessage('serverLogMessages.error.connection');
      expect(deepMessage).toBe('Connection error');
    });

    it('should handle paths with non-string intermediate values', () => {
      const message = getMessage('abilities.attacks.fireball');
      expect(message).toBe('Casts a powerful fireball');
    });

    it('should be case sensitive', () => {
      const message1 = getMessage('success.gameCreated');
      const message2 = getMessage('success.gamecreated');

      expect(message1).toBe('Game created successfully');
      expect(message2).toBeNull();
    });
  });

  describe('Template Processing', () => {
    it('should handle complex template strings', () => {
      const template = 'Player {player} used {ability} on {target} for {damage} damage!';
      const params = {
        player: 'Alice',
        ability: 'Fireball',
        target: 'Monster',
        damage: 42
      };

      const result = formatMessage(template, params);
      expect(result).toBe('Player Alice used Fireball on Monster for 42 damage!');
    });

    it('should preserve unmatched placeholders', () => {
      const template = 'Hello {name}, your score is {score} and {unmatchedPlaceholder}';
      const params = { name: 'Player', score: 100 };

      const result = formatMessage(template, params);
      expect(result).toBe('Hello Player, your score is 100 and {unmatchedPlaceholder}');
    });
  });
});
