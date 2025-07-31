/**
 * @fileoverview Tests for EventTypes and event system utilities
 */
import { z } from 'zod';
import {
  EventTypes,
  GameEvent,
  EventHandler,
  EventType,
  EventPayload,
  EventPayloadMap,
  EventSchemas,
  EventCategories,
  validateEventData,
  getEventsByCategory,
  isValidEventType,
  isEventOfType,
  createEvent
} from '../../../../server/models/events/EventTypes';

describe('EventTypes', () => {
  describe('Event Type Constants', () => {
    it('should define all game lifecycle events', () => {
      expect(EventTypes.GAME.CREATED).toBe('game.created');
      expect(EventTypes.GAME.STARTED).toBe('game.started');
      expect(EventTypes.GAME.ENDED).toBe('game.ended');
      expect(EventTypes.GAME.PAUSED).toBe('game.paused');
      expect(EventTypes.GAME.RESUMED).toBe('game.resumed');
      expect(EventTypes.GAME.TIMEOUT).toBe('game.timeout');
      expect(EventTypes.GAME.ERROR).toBe('game.error');
    });

    it('should define all controller events', () => {
      expect(EventTypes.CONTROLLER.GAME_CREATED).toBe('controller.gameCreated');
      expect(EventTypes.CONTROLLER.PLAYER_JOINED).toBe('controller.playerJoined');
      expect(EventTypes.CONTROLLER.ERROR).toBe('controller.error');
    });

    it('should define all phase management events', () => {
      expect(EventTypes.PHASE.CHANGED).toBe('phase.changed');
      expect(EventTypes.PHASE.PREPARATION).toBe('phase.preparation');
      expect(EventTypes.PHASE.ACTION).toBe('phase.action');
      expect(EventTypes.PHASE.RESOLUTION).toBe('phase.resolution');
      expect(EventTypes.PHASE.COUNTDOWN_STARTED).toBe('phase.countdown.started');
      expect(EventTypes.PHASE.COUNTDOWN_TICK).toBe('phase.countdown.tick');
      expect(EventTypes.PHASE.COUNTDOWN_ENDED).toBe('phase.countdown.ended');
    });

    it('should define all player events', () => {
      expect(EventTypes.PLAYER.JOINED).toBe('player.joined');
      expect(EventTypes.PLAYER.LEFT).toBe('player.left');
      expect(EventTypes.PLAYER.DISCONNECTED).toBe('player.disconnected');
      expect(EventTypes.PLAYER.RECONNECTED).toBe('player.reconnected');
      expect(EventTypes.PLAYER.READY).toBe('player.ready');
      expect(EventTypes.PLAYER.NOT_READY).toBe('player.not_ready');
      expect(EventTypes.PLAYER.DIED).toBe('player.died');
      expect(EventTypes.PLAYER.REVIVED).toBe('player.revived');
      expect(EventTypes.PLAYER.STAT_CHANGED).toBe('player.stat.changed');
      expect(EventTypes.PLAYER.STATUS_UPDATED).toBe('player.status.updated');
      expect(EventTypes.PLAYER.RACE_SELECTED).toBe('player.race.selected');
      expect(EventTypes.PLAYER.CLASS_SELECTED).toBe('player.class.selected');
    });

    it('should define all action events', () => {
      expect(EventTypes.ACTION.SUBMITTED).toBe('action.submitted');
      expect(EventTypes.ACTION.VALIDATED).toBe('action.validated');
      expect(EventTypes.ACTION.REJECTED).toBe('action.rejected');
      expect(EventTypes.ACTION.EXECUTED).toBe('action.executed');
      expect(EventTypes.ACTION.CANCELLED).toBe('action.cancelled');
      expect(EventTypes.ACTION.TIMEOUT).toBe('action.timeout');
    });

    it('should define all combat events', () => {
      expect(EventTypes.COMBAT.STARTED).toBe('combat.started');
      expect(EventTypes.COMBAT.ENDED).toBe('combat.ended');
      expect(EventTypes.COMBAT.TURN_STARTED).toBe('combat.turn.started');
      expect(EventTypes.COMBAT.TURN_ENDED).toBe('combat.turn.ended');
    });

    it('should define all damage events', () => {
      expect(EventTypes.DAMAGE.CALCULATED).toBe('damage.calculated');
      expect(EventTypes.DAMAGE.APPLIED).toBe('damage.applied');
      expect(EventTypes.DAMAGE.BLOCKED).toBe('damage.blocked');
      expect(EventTypes.DAMAGE.REDUCED).toBe('damage.reduced');
      expect(EventTypes.DAMAGE.REFLECTED).toBe('damage.reflected');
      expect(EventTypes.DAMAGE.CRITICAL).toBe('damage.critical');
    });

    it('should define all healing events', () => {
      expect(EventTypes.HEAL.CALCULATED).toBe('heal.calculated');
      expect(EventTypes.HEAL.APPLIED).toBe('heal.applied');
      expect(EventTypes.HEAL.BLOCKED).toBe('heal.blocked');
      expect(EventTypes.HEAL.ENHANCED).toBe('heal.enhanced');
      expect(EventTypes.HEAL.CRITICAL).toBe('heal.critical');
    });

    it('should define all effect events', () => {
      expect(EventTypes.EFFECT.APPLIED).toBe('effect.applied');
      expect(EventTypes.EFFECT.REMOVED).toBe('effect.removed');
      expect(EventTypes.EFFECT.EXPIRED).toBe('effect.expired');
      expect(EventTypes.EFFECT.TRIGGERED).toBe('effect.triggered');
      expect(EventTypes.EFFECT.STACKED).toBe('effect.stacked');
      expect(EventTypes.EFFECT.IMMUNITY_ACTIVATED).toBe('effect.immunity.activated');
    });

    it('should define all ability events', () => {
      expect(EventTypes.ABILITY.USED).toBe('ability.used');
      expect(EventTypes.ABILITY.VALIDATED).toBe('ability.validated');
      expect(EventTypes.ABILITY.EXECUTED).toBe('ability.executed');
      expect(EventTypes.ABILITY.FAILED).toBe('ability.failed');
      expect(EventTypes.ABILITY.COOLDOWN_STARTED).toBe('ability.cooldown.started');
      expect(EventTypes.ABILITY.COOLDOWN_ENDED).toBe('ability.cooldown.ended');
      expect(EventTypes.ABILITY.BLOCKED).toBe('ability.blocked');
    });

    it('should define all coordination events', () => {
      expect(EventTypes.COORDINATION.CALCULATED).toBe('coordination.calculated');
      expect(EventTypes.COORDINATION.APPLIED).toBe('coordination.applied');
      expect(EventTypes.COORDINATION.BONUS_TRIGGERED).toBe('coordination.bonus.triggered');
    });

    it('should define all monster events', () => {
      expect(EventTypes.MONSTER.SPAWNED).toBe('monster.spawned');
      expect(EventTypes.MONSTER.DEFEATED).toBe('monster.defeated');
      expect(EventTypes.MONSTER.ACTION_SELECTED).toBe('monster.action.selected');
      expect(EventTypes.MONSTER.DAMAGED).toBe('monster.damaged');
      expect(EventTypes.MONSTER.HEALED).toBe('monster.healed');
    });

    it('should define all warlock events', () => {
      expect(EventTypes.WARLOCK.REVEALED).toBe('warlock.revealed');
      expect(EventTypes.WARLOCK.ABILITY_USED).toBe('warlock.ability.used');
      expect(EventTypes.WARLOCK.ELIMINATED).toBe('warlock.eliminated');
    });

    it('should define all system events', () => {
      expect(EventTypes.SYSTEM.INITIALIZED).toBe('system.initialized');
      expect(EventTypes.SYSTEM.ERROR).toBe('system.error');
      expect(EventTypes.SYSTEM.WARNING).toBe('system.warning');
      expect(EventTypes.SYSTEM.PERFORMANCE).toBe('system.performance');
    });

    it('should define all socket events', () => {
      expect(EventTypes.SOCKET.UPDATE_REQUIRED).toBe('socket.update.required');
      expect(EventTypes.SOCKET.BROADCAST_REQUIRED).toBe('socket.broadcast.required');
      expect(EventTypes.SOCKET.PLAYER_UPDATE).toBe('socket.player.update');
      expect(EventTypes.SOCKET.GAME_STATE_UPDATE).toBe('socket.game_state.update');
    });

    it('should have unique event type values', () => {
      const allEventTypes: string[] = [];
      
      function collectEventTypes(obj: any) {
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            allEventTypes.push(obj[key]);
          } else if (typeof obj[key] === 'object') {
            collectEventTypes(obj[key]);
          }
        }
      }
      
      collectEventTypes(EventTypes);
      
      const uniqueTypes = new Set(allEventTypes);
      expect(uniqueTypes.size).toBe(allEventTypes.length);
    });
  });

  describe('Event Schemas', () => {
    it('should validate game created event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        gameCode: 'GAME123',
        createdBy: 'player1'
      };

      expect(() => EventSchemas[EventTypes.GAME.CREATED].parse(validData)).not.toThrow();
    });

    it('should validate game started event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        gameCode: 'GAME123',
        playerCount: 4
      };

      expect(() => EventSchemas[EventTypes.GAME.STARTED].parse(validData)).not.toThrow();
    });

    it('should validate game ended event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        gameCode: 'GAME123',
        winner: 'Good' as const,
        duration: 1800,
        finalStats: { totalActions: 42, totalDamage: 250 }
      };

      expect(() => EventSchemas[EventTypes.GAME.ENDED].parse(validData)).not.toThrow();
    });

    it('should validate player joined event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        playerId: 'player1',
        playerName: 'Alice',
        gameCode: 'GAME123'
      };

      expect(() => EventSchemas[EventTypes.PLAYER.JOINED].parse(validData)).not.toThrow();
    });

    it('should validate player died event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        playerId: 'player1',
        playerName: 'Alice',
        cause: 'damage' as const,
        killedBy: 'monster1'
      };

      expect(() => EventSchemas[EventTypes.PLAYER.DIED].parse(validData)).not.toThrow();
    });

    it('should validate action submitted event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        playerId: 'player1',
        actionType: 'ability',
        targetId: 'player2',
        abilityId: 'fireball',
        metadata: { intensity: 'high' },
        commandId: 'cmd-123'
      };

      expect(() => EventSchemas[EventTypes.ACTION.SUBMITTED].parse(validData)).not.toThrow();
    });

    it('should validate damage calculated event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        attackerId: 'player1',
        targetId: 'player2',
        baseDamage: 25,
        finalDamage: 35,
        modifiers: { criticalHit: 1.4, vulnerability: 1.0 },
        abilityId: 'fireball',
        isCritical: true
      };

      expect(() => EventSchemas[EventTypes.DAMAGE.CALCULATED].parse(validData)).not.toThrow();
    });

    it('should validate damage applied event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        targetId: 'player2',
        targetName: 'Bob',
        attackerId: 'player1',
        attackerName: 'Alice',
        damageAmount: 35,
        originalDamage: 40,
        armor: 5,
        targetHpBefore: 100,
        targetHpAfter: 65
      };

      expect(() => EventSchemas[EventTypes.DAMAGE.APPLIED].parse(validData)).not.toThrow();
    });

    it('should validate heal applied event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        targetId: 'player1',
        healing: 25,
        oldHealth: 50,
        newHealth: 75,
        healerId: 'player2',
        abilityId: 'heal'
      };

      expect(() => EventSchemas[EventTypes.HEAL.APPLIED].parse(validData)).not.toThrow();
    });

    it('should validate effect applied event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        targetId: 'player1',
        effectType: 'poison',
        effectId: 'poison-1',
        duration: 3,
        appliedBy: 'monster1',
        abilityId: 'poisonBite',
        metadata: { damagePerTurn: 5 }
      };

      expect(() => EventSchemas[EventTypes.EFFECT.APPLIED].parse(validData)).not.toThrow();
    });

    it('should validate ability used event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        playerId: 'player1',
        abilityId: 'fireball',
        targetId: 'player2',
        result: 'success' as const,
        metadata: { damageDealt: 35 }
      };

      expect(() => EventSchemas[EventTypes.ABILITY.USED].parse(validData)).not.toThrow();
    });

    it('should validate phase changed event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        oldPhase: 'preparation',
        newPhase: 'action',
        duration: 30,
        reason: 'timeout'
      };

      expect(() => EventSchemas[EventTypes.PHASE.CHANGED].parse(validData)).not.toThrow();
    });

    it('should validate coordination calculated event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        targetId: 'monster1',
        coordinationCount: 3,
        participants: ['player1', 'player2', 'player3'],
        bonusMultiplier: 1.5
      };

      expect(() => EventSchemas[EventTypes.COORDINATION.CALCULATED].parse(validData)).not.toThrow();
    });

    it('should validate socket update required event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        updateType: 'playerStatus',
        targetPlayers: ['player1', 'player2'],
        data: { health: 75, armor: 12 }
      };

      expect(() => EventSchemas[EventTypes.SOCKET.UPDATE_REQUIRED].parse(validData)).not.toThrow();
    });

    it('should reject invalid data for schemas', () => {
      const invalidData = {
        timestamp: 'not-iso-string',
        gameCode: 123, // Should be string
        createdBy: null // Should be string
      };

      expect(() => EventSchemas[EventTypes.GAME.CREATED].parse(invalidData)).toThrow();
    });

    it('should handle optional fields correctly', () => {
      const minimalActionData = {
        timestamp: new Date().toISOString(),
        playerId: 'player1',
        actionType: 'move'
        // targetId, abilityId, metadata, commandId are optional
      };

      expect(() => EventSchemas[EventTypes.ACTION.SUBMITTED].parse(minimalActionData)).not.toThrow();
    });
  });

  describe('Event Categories', () => {
    it('should define game lifecycle category correctly', () => {
      expect(EventCategories.GAME_LIFECYCLE).toContain(EventTypes.GAME.CREATED);
      expect(EventCategories.GAME_LIFECYCLE).toContain(EventTypes.GAME.STARTED);
      expect(EventCategories.GAME_LIFECYCLE).toContain(EventTypes.GAME.ENDED);
      expect(EventCategories.GAME_LIFECYCLE).toContain(EventTypes.GAME.PAUSED);
      expect(EventCategories.GAME_LIFECYCLE).toContain(EventTypes.GAME.RESUMED);
    });

    it('should define player actions category correctly', () => {
      expect(EventCategories.PLAYER_ACTIONS).toContain(EventTypes.ACTION.SUBMITTED);
      expect(EventCategories.PLAYER_ACTIONS).toContain(EventTypes.ACTION.VALIDATED);
      expect(EventCategories.PLAYER_ACTIONS).toContain(EventTypes.ACTION.EXECUTED);
      expect(EventCategories.PLAYER_ACTIONS).toContain(EventTypes.ABILITY.USED);
    });

    it('should define combat effects category correctly', () => {
      expect(EventCategories.COMBAT_EFFECTS).toContain(EventTypes.DAMAGE.CALCULATED);
      expect(EventCategories.COMBAT_EFFECTS).toContain(EventTypes.DAMAGE.APPLIED);
      expect(EventCategories.COMBAT_EFFECTS).toContain(EventTypes.HEAL.APPLIED);
      expect(EventCategories.COMBAT_EFFECTS).toContain(EventTypes.EFFECT.APPLIED);
      expect(EventCategories.COMBAT_EFFECTS).toContain(EventTypes.EFFECT.TRIGGERED);
    });

    it('should define state changes category correctly', () => {
      expect(EventCategories.STATE_CHANGES).toContain(EventTypes.PLAYER.STAT_CHANGED);
      expect(EventCategories.STATE_CHANGES).toContain(EventTypes.PLAYER.STATUS_UPDATED);
      expect(EventCategories.STATE_CHANGES).toContain(EventTypes.PHASE.CHANGED);
      expect(EventCategories.STATE_CHANGES).toContain(EventTypes.COORDINATION.CALCULATED);
    });

    it('should define socket events category correctly', () => {
      expect(EventCategories.SOCKET_EVENTS).toContain(EventTypes.SOCKET.UPDATE_REQUIRED);
      expect(EventCategories.SOCKET_EVENTS).toContain(EventTypes.SOCKET.BROADCAST_REQUIRED);
      expect(EventCategories.SOCKET_EVENTS).toContain(EventTypes.SOCKET.PLAYER_UPDATE);
      expect(EventCategories.SOCKET_EVENTS).toContain(EventTypes.SOCKET.GAME_STATE_UPDATE);
    });
  });

  describe('validateEventData function', () => {
    it('should validate correct event data', () => {
      const validData = {
        timestamp: new Date().toISOString(),
        gameCode: 'GAME123',
        createdBy: 'player1'
      };

      const result = validateEventData(EventTypes.GAME.CREATED, validData);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect invalid event data', () => {
      const invalidData = {
        timestamp: 'invalid-date',
        gameCode: 123, // Should be string
        // missing createdBy
      };

      const result = validateEventData(EventTypes.GAME.CREATED, invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return valid for events without schemas', () => {
      const result = validateEventData('unknown.event' as EventType, {});
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle non-Zod errors gracefully', () => {
      const mockSchema = {
        parse: () => {
          throw new Error('Custom validation error');
        }
      };

      // Temporarily replace schema
      const originalSchema = EventSchemas[EventTypes.GAME.CREATED];
      (EventSchemas as any)[EventTypes.GAME.CREATED] = mockSchema;

      const result = validateEventData(EventTypes.GAME.CREATED, {});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Validation error: Custom validation error');

      // Restore original schema
      (EventSchemas as any)[EventTypes.GAME.CREATED] = originalSchema;
    });
  });

  describe('getEventsByCategory function', () => {
    it('should return events for valid category', () => {
      const gameLifecycleEvents = getEventsByCategory('GAME_LIFECYCLE');
      
      expect(gameLifecycleEvents).toContain(EventTypes.GAME.CREATED);
      expect(gameLifecycleEvents).toContain(EventTypes.GAME.STARTED);
      expect(gameLifecycleEvents).toContain(EventTypes.GAME.ENDED);
    });

    it('should return empty array for invalid category', () => {
      const invalidEvents = getEventsByCategory('INVALID_CATEGORY' as any);
      
      expect(invalidEvents).toEqual([]);
    });

    it('should return readonly array', () => {
      const events = getEventsByCategory('GAME_LIFECYCLE');
      
      // TypeScript should enforce readonly, but we can test runtime behavior
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('isValidEventType function', () => {
    it('should return true for valid event types', () => {
      expect(isValidEventType(EventTypes.GAME.CREATED)).toBe(true);
      expect(isValidEventType(EventTypes.PLAYER.JOINED)).toBe(true);
      expect(isValidEventType(EventTypes.ACTION.SUBMITTED)).toBe(true);
      expect(isValidEventType(EventTypes.DAMAGE.APPLIED)).toBe(true);
    });

    it('should return false for invalid event types', () => {
      expect(isValidEventType('invalid.event')).toBe(false);
      expect(isValidEventType('game.invalid')).toBe(false);
      expect(isValidEventType('')).toBe(false);
      expect(isValidEventType('player')).toBe(false);
    });

    it('should handle all event categories', () => {
      // Test a sample from each category
      expect(isValidEventType(EventTypes.PHASE.CHANGED)).toBe(true);
      expect(isValidEventType(EventTypes.COMBAT.STARTED)).toBe(true);
      expect(isValidEventType(EventTypes.HEAL.APPLIED)).toBe(true);
      expect(isValidEventType(EventTypes.EFFECT.APPLIED)).toBe(true);
      expect(isValidEventType(EventTypes.ABILITY.USED)).toBe(true);
      expect(isValidEventType(EventTypes.COORDINATION.CALCULATED)).toBe(true);
      expect(isValidEventType(EventTypes.MONSTER.SPAWNED)).toBe(true);
      expect(isValidEventType(EventTypes.WARLOCK.REVEALED)).toBe(true);
      expect(isValidEventType(EventTypes.SYSTEM.ERROR)).toBe(true);
      expect(isValidEventType(EventTypes.SOCKET.UPDATE_REQUIRED)).toBe(true);
    });
  });

  describe('isEventOfType function', () => {
    it('should return true for matching event types', () => {
      const gameCreatedEvent: GameEvent = {
        type: EventTypes.GAME.CREATED,
        payload: {
          timestamp: new Date().toISOString(),
          gameCode: 'GAME123',
          createdBy: 'player1'
        }
      };

      expect(isEventOfType(gameCreatedEvent, EventTypes.GAME.CREATED)).toBe(true);
    });

    it('should return false for non-matching event types', () => {
      const gameCreatedEvent: GameEvent = {
        type: EventTypes.GAME.CREATED,
        payload: {
          timestamp: new Date().toISOString(),
          gameCode: 'GAME123',
          createdBy: 'player1'
        }
      };

      expect(isEventOfType(gameCreatedEvent, EventTypes.GAME.STARTED)).toBe(false);
    });

    it('should provide proper type narrowing', () => {
      const gameCreatedEvent: GameEvent = {
        type: EventTypes.GAME.CREATED,
        payload: {
          timestamp: new Date().toISOString(),
          gameCode: 'GAME123',
          createdBy: 'player1'
        }
      };

      if (isEventOfType(gameCreatedEvent, EventTypes.GAME.CREATED)) {
        // TypeScript should infer the correct payload type
        expect(gameCreatedEvent.payload.gameCode).toBe('GAME123');
        expect(gameCreatedEvent.payload.createdBy).toBe('player1');
      }
    });
  });

  describe('createEvent function', () => {
    it('should create type-safe events', () => {
      const gameCreatedEvent = createEvent(EventTypes.GAME.CREATED, {
        timestamp: new Date().toISOString(),
        gameCode: 'GAME123',
        createdBy: 'player1'
      });

      expect(gameCreatedEvent.type).toBe(EventTypes.GAME.CREATED);
      expect(gameCreatedEvent.payload.gameCode).toBe('GAME123');
      expect(gameCreatedEvent.payload.createdBy).toBe('player1');
    });

    it('should create events with different payload types', () => {
      const playerJoinedEvent = createEvent(EventTypes.PLAYER.JOINED, {
        timestamp: new Date().toISOString(),
        playerId: 'player1',
        playerName: 'Alice',
        gameCode: 'GAME123'
      });

      expect(playerJoinedEvent.type).toBe(EventTypes.PLAYER.JOINED);
      expect(playerJoinedEvent.payload.playerId).toBe('player1');
      expect(playerJoinedEvent.payload.playerName).toBe('Alice');
    });

    it('should create action events with optional fields', () => {
      const actionEvent = createEvent(EventTypes.ACTION.SUBMITTED, {
        timestamp: new Date().toISOString(),
        playerId: 'player1',
        actionType: 'move'
        // Optional fields omitted
      });

      expect(actionEvent.type).toBe(EventTypes.ACTION.SUBMITTED);
      expect(actionEvent.payload.playerId).toBe('player1');
      expect(actionEvent.payload.actionType).toBe('move');
    });
  });

  describe('Type System', () => {
    it('should provide proper EventType union', () => {
      const eventType: EventType = EventTypes.GAME.CREATED;
      expect(typeof eventType).toBe('string');
    });

    it('should provide proper EventPayload extraction', () => {
      type GameCreatedPayload = EventPayload<typeof EventTypes.GAME.CREATED>;
      
      const payload: GameCreatedPayload = {
        timestamp: new Date().toISOString(),
        gameCode: 'GAME123',
        createdBy: 'player1'
      };

      expect(payload.gameCode).toBe('GAME123');
    });

    it('should provide proper EventHandler interface', () => {
      const handler: EventHandler<Extract<GameEvent, { type: typeof EventTypes.GAME.CREATED }>> = {
        handle: async (event) => {
          expect(event.type).toBe(EventTypes.GAME.CREATED);
          expect(event.payload.gameCode).toBeDefined();
        }
      };

      expect(typeof handler.handle).toBe('function');
    });
  });

  describe('Schema Coverage', () => {
    it('should have schemas for all mapped event types', () => {
      const schemaEventTypes = Object.keys(EventSchemas);
      
      expect(schemaEventTypes).toContain(EventTypes.GAME.CREATED);
      expect(schemaEventTypes).toContain(EventTypes.GAME.STARTED);
      expect(schemaEventTypes).toContain(EventTypes.GAME.ENDED);
      expect(schemaEventTypes).toContain(EventTypes.PLAYER.JOINED);
      expect(schemaEventTypes).toContain(EventTypes.PLAYER.DIED);
      expect(schemaEventTypes).toContain(EventTypes.ACTION.SUBMITTED);
      expect(schemaEventTypes).toContain(EventTypes.DAMAGE.CALCULATED);
      expect(schemaEventTypes).toContain(EventTypes.DAMAGE.APPLIED);
      expect(schemaEventTypes).toContain(EventTypes.HEAL.APPLIED);
      expect(schemaEventTypes).toContain(EventTypes.EFFECT.APPLIED);
      expect(schemaEventTypes).toContain(EventTypes.ABILITY.USED);
      expect(schemaEventTypes).toContain(EventTypes.PHASE.CHANGED);
      expect(schemaEventTypes).toContain(EventTypes.COORDINATION.CALCULATED);
      expect(schemaEventTypes).toContain(EventTypes.SOCKET.UPDATE_REQUIRED);
    });

    it('should have valid Zod schemas', () => {
      Object.entries(EventSchemas).forEach(([eventType, schema]) => {
        expect(schema).toBeDefined();
        expect(typeof schema.parse).toBe('function');
        expect(typeof schema.safeParse).toBe('function');
      });
    });
  });

  describe('Integration and Real-world Usage', () => {
    it('should handle complete game event workflow', () => {
      // Create game
      const gameCreated = createEvent(EventTypes.GAME.CREATED, {
        timestamp: new Date().toISOString(),
        gameCode: 'GAME123',
        createdBy: 'host1'
      });

      // Validate event
      const validation = validateEventData(gameCreated.type, gameCreated.payload);
      expect(validation.valid).toBe(true);

      // Check event type
      expect(isValidEventType(gameCreated.type)).toBe(true);
      expect(isEventOfType(gameCreated, EventTypes.GAME.CREATED)).toBe(true);
    });

    it('should handle combat event sequences', () => {
      const damageCalculated = createEvent(EventTypes.DAMAGE.CALCULATED, {
        timestamp: new Date().toISOString(),
        attackerId: 'player1',
        targetId: 'player2',
        baseDamage: 25,
        finalDamage: 35,
        modifiers: { criticalHit: 1.4 }
      });

      const damageApplied = createEvent(EventTypes.DAMAGE.APPLIED, {
        timestamp: new Date().toISOString(),
        targetId: 'player2',
        damageAmount: 35,
        targetHpBefore: 100,
        targetHpAfter: 65
      });

      expect(validateEventData(damageCalculated.type, damageCalculated.payload).valid).toBe(true);
      expect(validateEventData(damageApplied.type, damageApplied.payload).valid).toBe(true);
    });

    it('should categorize events correctly for filtering', () => {
      const combatEvents = getEventsByCategory('COMBAT_EFFECTS');
      const gameLifecycleEvents = getEventsByCategory('GAME_LIFECYCLE');
      
      expect(combatEvents).toContain(EventTypes.DAMAGE.APPLIED);
      expect(combatEvents).not.toContain(EventTypes.GAME.CREATED);
      
      expect(gameLifecycleEvents).toContain(EventTypes.GAME.CREATED);
      expect(gameLifecycleEvents).not.toContain(EventTypes.DAMAGE.APPLIED);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null/undefined event data', () => {
      const result1 = validateEventData(EventTypes.GAME.CREATED, null);
      const result2 = validateEventData(EventTypes.GAME.CREATED, undefined);
      
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
    });

    it('should handle empty objects', () => {
      const result = validateEventData(EventTypes.GAME.CREATED, {});
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle extra fields gracefully', () => {
      const dataWithExtra = {
        timestamp: new Date().toISOString(),
        gameCode: 'GAME123',
        createdBy: 'player1',
        extraField: 'should be ignored'
      };

      const result = validateEventData(EventTypes.GAME.CREATED, dataWithExtra);
      expect(result.valid).toBe(true);
    });
  });
});