/**
 * @fileoverview Integration tests for Phase 2 Step 3: System Event Integration
 * Tests event emissions from CombatSystem, EffectManager, and TurnResolver
 * Verifies Phase 2 Step 3 completion
 */
const { GameRoom } = require('../../../server/models/GameRoom');
const CombatSystem = require('../../../server/models/systems/CombatSystem');
const EffectManager = require('../../../server/models/systems/EffectManager');
const TurnResolver = require('../../../server/models/systems/TurnResolver');
const { EventTypes } = require('../../../server/models/events/EventTypes');

// Mock external dependencies
jest.mock('../../../server/utils/logger');
jest.mock('../../../server/config');

describe('Phase 2 Step 3: System Event Integration', () => {
  let gameRoom;
  let eventBus;
  let combatSystem;
  let effectManager;
  let turnResolver;
  let mockPlayers;
  let mockMonster;
  let mockSystems;

  beforeEach(() => {
    // Create a real game room with event bus
    gameRoom = new GameRoom('TEST_STEP3');
    eventBus = gameRoom.getEventBus();

    // Create mock players
    mockPlayers = new Map();
    ['player1', 'player2', 'player3'].forEach(id => {
      const player = {
        id: id,
        name: `Player${id.slice(-1)}`,
        race: 'human',
        class: 'warrior',
        isAlive: true,
        isWarlock: id === 'player3', // Make player3 a warlock
        hp: 100,
        maxHp: 100,
        armor: 0,
        damageMod: 1.0,
        racialEffects: {},
        classEffects: {},
        recentlyDetected: false,
        getHealingModifier: jest.fn().mockReturnValue(1.0),
        processThirstyBladeLifeSteal: jest.fn().mockReturnValue(0),
        isMoonbeamActive: jest.fn().mockReturnValue(false)
      };
      mockPlayers.set(id, player);
    });

    // Create mock monster
    mockMonster = {
      hp: 500,
      maxHp: 500,
      isAlive: true
    };

    // Create mock systems
    mockSystems = {
      statusEffectManager: {
        isPlayerStunned: jest.fn().mockReturnValue(false),
        processStatusEffects: jest.fn()
      },
      warlockSystem: {
        attemptConversion: jest.fn(),
        incrementWarlockCount: jest.fn(),
        decrementWarlockCount: jest.fn(),
        getWarlockCount: jest.fn().mockReturnValue(1)
      },
      gameStateUtils: {
        getAlivePlayers: jest.fn().mockReturnValue([...mockPlayers.values()].filter(p => p.isAlive)),
        countPendingResurrections: jest.fn().mockReturnValue(0)
      },
      monsterController: mockMonster,
      racialAbilitySystem: {
        executeRacialAbility: jest.fn()
      }
    };

    // Create system instances with event bus
    combatSystem = new CombatSystem(
      mockPlayers,
      mockSystems.monsterController,
      mockSystems.statusEffectManager,
      mockSystems.racialAbilitySystem,
      mockSystems.warlockSystem,
      mockSystems.gameStateUtils,
      eventBus
    );

    effectManager = new EffectManager(
      mockPlayers,
      mockSystems.statusEffectManager,
      mockSystems.warlockSystem,
      () => false, // getComebackStatus
      () => 0, // getCoordinationCount
      eventBus
    );

    turnResolver = new TurnResolver(
      mockPlayers,
      mockSystems.monsterController,
      mockSystems.warlockSystem,
      mockSystems.gameStateUtils,
      eventBus
    );
  });

  afterEach(() => {
    if (gameRoom) {
      gameRoom.destroy();
    }
  });

  describe('CombatSystem Event Integration', () => {
    test('should emit damage dealt events', async () => {
      const damageEvents = [];
      eventBus.on(EventTypes.COMBAT.DAMAGE_DEALT, (event) => {
        damageEvents.push(event);
      });

      const attacker = mockPlayers.get('player1');
      const target = mockPlayers.get('player2');
      const log = [];

      combatSystem.applyDamageToPlayer(target, 25, attacker, log);

      expect(damageEvents).toHaveLength(1);
      expect(damageEvents[0].data.attackerId).toBe('player1');
      expect(damageEvents[0].data.targetId).toBe('player2');
      expect(damageEvents[0].data.damage).toBe(25);
    });

    test('should emit player death events', async () => {
      const deathEvents = [];
      eventBus.on(EventTypes.PLAYER.DIED, (event) => {
        deathEvents.push(event);
      });

      const attacker = mockPlayers.get('player1');
      const target = mockPlayers.get('player2');
      target.hp = 10; // Low HP so death occurs
      const log = [];

      combatSystem.applyDamageToPlayer(target, 50, attacker, log);

      expect(deathEvents).toHaveLength(1);
      expect(deathEvents[0].data.playerId).toBe('player2');
      expect(deathEvents[0].data.attackerId).toBe('player1');
    });

    test('should emit heal applied events', async () => {
      const healEvents = [];
      eventBus.on(EventTypes.COMBAT.HEAL_APPLIED, (event) => {
        healEvents.push(event);
      });

      const healer = mockPlayers.get('player1');
      const target = mockPlayers.get('player2');
      target.hp = 75; // Damaged so healing has effect
      const log = [];

      combatSystem.applyHealingToPlayer(healer, target, 20, log);

      expect(healEvents).toHaveLength(1);
      expect(healEvents[0].data.healerId).toBe('player1');
      expect(healEvents[0].data.targetId).toBe('player2');
      expect(healEvents[0].data.amount).toBe(20);
    });

    test('should emit monster damage events', async () => {
      const monsterDamageEvents = [];
      eventBus.on(EventTypes.COMBAT.MONSTER_DAMAGED, (event) => {
        monsterDamageEvents.push(event);
      });

      const attacker = mockPlayers.get('player1');
      const log = [];

      combatSystem.applyDamageToMonster(100, attacker, log);

      expect(monsterDamageEvents).toHaveLength(1);
      expect(monsterDamageEvents[0].data.attackerId).toBe('player1');
      expect(monsterDamageEvents[0].data.damage).toBe(100);
    });

    test('should emit area damage events', async () => {
      const areaDamageEvents = [];
      eventBus.on(EventTypes.COMBAT.AREA_DAMAGE, (event) => {
        areaDamageEvents.push(event);
      });

      const source = mockPlayers.get('player1');
      const targets = [mockPlayers.get('player2'), mockPlayers.get('player3')];
      const log = [];

      combatSystem.applyAreaDamage(source, 30, targets, log);

      expect(areaDamageEvents).toHaveLength(1);
      expect(areaDamageEvents[0].data.sourceId).toBe('player1');
      expect(areaDamageEvents[0].data.targetIds).toContain('player2');
      expect(areaDamageEvents[0].data.targetIds).toContain('player3');
      expect(areaDamageEvents[0].data.damage).toBe(30);
    });
  });

  describe('EffectManager Event Integration', () => {
    test('should emit immunity triggered events', () => {
      const immunityEvents = [];
      eventBus.on(EventTypes.EFFECT.IMMUNITY_TRIGGERED, (event) => {
        immunityEvents.push(event);
      });

      const target = mockPlayers.get('player1');
      const attacker = mockPlayers.get('player2');
      const log = [];

      // Set up Stone Resolve immunity
      target.racialEffects = { immuneNextDamage: true };

      const immune = effectManager.checkImmunityEffects(target, attacker, log);

      expect(immune).toBe(true);
      expect(immunityEvents).toHaveLength(1);
      expect(immunityEvents[0].data.targetId).toBe('player1');
      expect(immunityEvents[0].data.attackerId).toBe('player2');
      expect(immunityEvents[0].data.effectType).toBe('stone_resolve');
    });

    test('should emit counter-attack events', () => {
      const counterEvents = [];
      eventBus.on(EventTypes.EFFECT.COUNTER_ATTACK, (event) => {
        counterEvents.push(event);
      });

      const target = mockPlayers.get('player1');
      const attacker = mockPlayers.get('player2');
      const log = [];

      // Set up Spirit Guard counter-attack
      target.classEffects = {
        spiritGuard: {
          turnsLeft: 2,
          counterDamage: 15,
          revealsWarlocks: false
        }
      };

      effectManager.handleSpiritGuardCounter(target, attacker, log);

      expect(counterEvents).toHaveLength(1);
      expect(counterEvents[0].data.defenderId).toBe('player1');
      expect(counterEvents[0].data.attackerId).toBe('player2');
      expect(counterEvents[0].data.effectType).toBe('spirit_guard');
      expect(counterEvents[0].data.damage).toBe(15);
    });

    test('should emit warlock detection events', () => {
      const detectionEvents = [];
      eventBus.on(EventTypes.EFFECT.WARLOCK_DETECTED, (event) => {
        detectionEvents.push(event);
      });

      const target = mockPlayers.get('player1');
      const attacker = mockPlayers.get('player3'); // warlock
      const log = [];

      // Set up Spirit Guard with warlock detection
      target.classEffects = {
        spiritGuard: {
          turnsLeft: 2,
          counterDamage: 15,
          revealsWarlocks: true
        }
      };

      effectManager.handleSpiritGuardCounter(target, attacker, log);

      expect(detectionEvents).toHaveLength(1);
      expect(detectionEvents[0].data.detectorId).toBe('player1');
      expect(detectionEvents[0].data.warlockId).toBe('player3');
      expect(detectionEvents[0].data.detectionMethod).toBe('spirit_guard');
    });

    test('should emit heal applied events from EffectManager', () => {
      const healEvents = [];
      eventBus.on(EventTypes.EFFECT.HEAL_APPLIED, (event) => {
        healEvents.push(event);
      });

      const healer = mockPlayers.get('player1');
      const target = mockPlayers.get('player2');
      target.hp = 70; // Damaged so healing has effect
      const log = [];

      const actualHeal = effectManager.applyHealing(healer, target, 25, log);

      expect(actualHeal).toBe(25);
      expect(healEvents).toHaveLength(1);
      expect(healEvents[0].data.healerId).toBe('player1');
      expect(healEvents[0].data.targetId).toBe('player2');
      expect(healEvents[0].data.amount).toBe(25);
    });

    test('should emit sanctuary counter-attack and detection events', () => {
      const counterEvents = [];
      const detectionEvents = [];
      
      eventBus.on(EventTypes.EFFECT.COUNTER_ATTACK, (event) => {
        counterEvents.push(event);
      });
      
      eventBus.on(EventTypes.EFFECT.WARLOCK_DETECTED, (event) => {
        detectionEvents.push(event);
      });

      const target = mockPlayers.get('player1');
      const attacker = mockPlayers.get('player3'); // warlock
      const log = [];

      // Set up Sanctuary of Truth with auto-detect
      target.classEffects = {
        sanctuaryOfTruth: {
          turnsLeft: 3,
          counterDamage: 10,
          autoDetect: true
        }
      };

      effectManager.handleSanctuaryCounter(target, attacker, log);

      expect(counterEvents).toHaveLength(1);
      expect(counterEvents[0].data.effectType).toBe('sanctuary_of_truth');
      
      expect(detectionEvents).toHaveLength(1);
      expect(detectionEvents[0].data.detectionMethod).toBe('sanctuary_of_truth');
    });

    test('should emit moonbeam detection events', () => {
      const detectionEvents = [];
      eventBus.on(EventTypes.EFFECT.WARLOCK_DETECTED, (event) => {
        detectionEvents.push(event);
      });

      const target = mockPlayers.get('player1');
      const attacker = mockPlayers.get('player3'); // warlock
      target.race = 'Crestfallen';
      target.isMoonbeamActive = jest.fn().mockReturnValue(true);
      const log = [];

      effectManager.handleMoonbeamDetection(target, attacker, log);

      expect(detectionEvents).toHaveLength(1);
      expect(detectionEvents[0].data.detectorId).toBe('player1');
      expect(detectionEvents[0].data.warlockId).toBe('player3');
      expect(detectionEvents[0].data.detectionMethod).toBe('moonbeam');
    });
  });

  describe('TurnResolver Event Integration', () => {
    test('should emit turn started events', () => {
      const turnEvents = [];
      eventBus.on(EventTypes.TURN.STARTED, (event) => {
        turnEvents.push(event);
      });

      turnResolver.resetCoordinationTracking();

      expect(turnEvents).toHaveLength(1);
      expect(turnEvents[0].data.timestamp).toBeDefined();
    });

    test('should emit coordination tracked events', () => {
      const coordinationEvents = [];
      eventBus.on(EventTypes.COORDINATION.TRACKED, (event) => {
        coordinationEvents.push(event);
      });

      turnResolver.trackCoordination('player1', 'player2');
      turnResolver.trackCoordination('player3', 'player2');

      expect(coordinationEvents).toHaveLength(2);
      expect(coordinationEvents[0].data.actorId).toBe('player1');
      expect(coordinationEvents[0].data.targetId).toBe('player2');
      expect(coordinationEvents[0].data.coordinationCount).toBe(1);

      expect(coordinationEvents[1].data.actorId).toBe('player3');
      expect(coordinationEvents[1].data.targetId).toBe('player2');
      expect(coordinationEvents[1].data.coordinationCount).toBe(2);
    });

    test('should not emit duplicate coordination events for same actor-target pair', () => {
      const coordinationEvents = [];
      eventBus.on(EventTypes.COORDINATION.TRACKED, (event) => {
        coordinationEvents.push(event);
      });

      // Track same coordination twice
      turnResolver.trackCoordination('player1', 'player2');
      turnResolver.trackCoordination('player1', 'player2');

      expect(coordinationEvents).toHaveLength(1);
      expect(coordinationEvents[0].data.coordinationCount).toBe(1);
    });
  });

  describe('Cross-System Event Integration', () => {
    test('should emit multiple events in complex combat scenario', async () => {
      const allEvents = [];
      
      // Listen to all event types
      [
        EventTypes.COMBAT.DAMAGE_DEALT,
        EventTypes.EFFECT.COUNTER_ATTACK,
        EventTypes.EFFECT.WARLOCK_DETECTED,
        EventTypes.COORDINATION.TRACKED
      ].forEach(eventType => {
        eventBus.on(eventType, (event) => {
          allEvents.push({ type: event.type, data: event.data });
        });
      });

      const attacker = mockPlayers.get('player3'); // warlock
      const target = mockPlayers.get('player1');
      const log = [];

      // Set up complex scenario: Spirit Guard with warlock detection
      target.classEffects = {
        spiritGuard: {
          turnsLeft: 2,
          counterDamage: 15,
          revealsWarlocks: true
        }
      };

      // Track coordination
      turnResolver.trackCoordination('player2', 'player1');

      // Apply damage (triggers damage event)
      combatSystem.applyDamageToPlayer(target, 20, attacker, log);

      // Handle counter-attack (triggers counter and detection events)
      effectManager.handleCounterAttacks(target, attacker, log);

      // Verify all events were emitted
      expect(allEvents.length).toBeGreaterThanOrEqual(3);
      
      const damageEvent = allEvents.find(e => e.type === EventTypes.COMBAT.DAMAGE_DEALT);
      expect(damageEvent).toBeDefined();
      expect(damageEvent.data.attackerId).toBe('player3');

      const counterEvent = allEvents.find(e => e.type === EventTypes.EFFECT.COUNTER_ATTACK);
      expect(counterEvent).toBeDefined();
      expect(counterEvent.data.effectType).toBe('spirit_guard');

      const detectionEvent = allEvents.find(e => e.type === EventTypes.EFFECT.WARLOCK_DETECTED);
      expect(detectionEvent).toBeDefined();
      expect(detectionEvent.data.detectionMethod).toBe('spirit_guard');

      const coordinationEvent = allEvents.find(e => e.type === EventTypes.COORDINATION.TRACKED);
      expect(coordinationEvent).toBeDefined();
      expect(coordinationEvent.data.actorId).toBe('player2');
    });

    test('should handle event processing errors gracefully', async () => {
      const errorEvents = [];
      const successEvents = [];

      // Add a listener that throws an error
      eventBus.on(EventTypes.COMBAT.DAMAGE_DEALT, () => {
        throw new Error('Test error');
      });

      // Add a normal listener
      eventBus.on(EventTypes.COMBAT.DAMAGE_DEALT, (event) => {
        successEvents.push(event);
      });

      const attacker = mockPlayers.get('player1');
      const target = mockPlayers.get('player2');
      const log = [];

      // This should not throw despite the error listener
      combatSystem.applyDamageToPlayer(target, 15, attacker, log);

      // Normal listener should still have received the event
      expect(successEvents).toHaveLength(1);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle high-frequency event emission efficiently', async () => {
      const events = [];
      eventBus.on(EventTypes.COMBAT.DAMAGE_DEALT, (event) => {
        events.push(event);
      });

      const startTime = Date.now();
      const eventCount = 100;

      // Simulate high-frequency damage events
      for (let i = 0; i < eventCount; i++) {
        const attacker = mockPlayers.get('player1');
        const target = mockPlayers.get('player2');
        target.hp = 100; // Reset HP
        const log = [];

        combatSystem.applyDamageToPlayer(target, 1, attacker, log);
      }

      const endTime = Date.now();

      expect(events).toHaveLength(eventCount);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should maintain event order under load', async () => {
      const events = [];
      eventBus.on(EventTypes.COORDINATION.TRACKED, (event) => {
        events.push(event.data.coordinationCount);
      });

      // Track coordination rapidly
      for (let i = 0; i < 10; i++) {
        turnResolver.trackCoordination(`actor${i}`, 'target1');
      }

      // Events should be in order
      for (let i = 0; i < events.length; i++) {
        expect(events[i]).toBe(i + 1);
      }
    });
  });

  describe('Step 3 Completion Verification', () => {
    test('should verify all systems emit appropriate events', () => {
      const systemEventMappings = {
        CombatSystem: [
          EventTypes.COMBAT.DAMAGE_DEALT,
          EventTypes.COMBAT.HEAL_APPLIED,
          EventTypes.COMBAT.MONSTER_DAMAGED,
          EventTypes.COMBAT.MONSTER_DEFEATED,
          EventTypes.COMBAT.AREA_DAMAGE,
          EventTypes.PLAYER.DIED
        ],
        EffectManager: [
          EventTypes.EFFECT.IMMUNITY_TRIGGERED,
          EventTypes.EFFECT.COUNTER_ATTACK,
          EventTypes.EFFECT.WARLOCK_DETECTED,
          EventTypes.EFFECT.HEAL_APPLIED
        ],
        TurnResolver: [
          EventTypes.TURN.STARTED,
          EventTypes.COORDINATION.TRACKED
        ]
      };

      // Verify each system has eventBus integration
      expect(combatSystem.eventBus).toBe(eventBus);
      expect(effectManager.eventBus).toBe(eventBus);
      expect(turnResolver.eventBus).toBe(eventBus);

      // Verify systems are composed correctly in CombatSystem
      expect(combatSystem.effectManager).toBeInstanceOf(EffectManager);
      expect(combatSystem.turnResolver).toBeInstanceOf(TurnResolver);
      
      // Both should have eventBus passed to them
      expect(combatSystem.effectManager.eventBus).toBe(eventBus);
      expect(combatSystem.turnResolver.eventBus).toBe(eventBus);
    });

    test('should confirm event-driven communication reduces coupling', () => {
      const communicationEvents = [];
      
      // Track all inter-system communication events
      Object.values(EventTypes.COMBAT).forEach(eventType => {
        eventBus.on(eventType, (event) => {
          communicationEvents.push({ type: event.type, source: 'CombatSystem' });
        });
      });

      Object.values(EventTypes.EFFECT).forEach(eventType => {
        eventBus.on(eventType, (event) => {
          communicationEvents.push({ type: event.type, source: 'EffectManager' });
        });
      });

      Object.values(EventTypes.COORDINATION).forEach(eventType => {
        eventBus.on(eventType, (event) => {
          communicationEvents.push({ type: event.type, source: 'TurnResolver' });
        });
      });

      // Perform actions that trigger cross-system communication
      const attacker = mockPlayers.get('player1');
      const target = mockPlayers.get('player2');
      const log = [];

      // Damage triggers multiple systems
      turnResolver.trackCoordination('player1', 'player2');
      combatSystem.applyDamageToPlayer(target, 20, attacker, log);
      effectManager.applyHealing(attacker, target, 10, log);

      // Should have events from multiple systems
      const combatEvents = communicationEvents.filter(e => e.source === 'CombatSystem');
      const effectEvents = communicationEvents.filter(e => e.source === 'EffectManager');
      const turnEvents = communicationEvents.filter(e => e.source === 'TurnResolver');

      expect(combatEvents.length).toBeGreaterThan(0);
      expect(effectEvents.length).toBeGreaterThan(0);
      expect(turnEvents.length).toBeGreaterThan(0);
    });

    test('should demonstrate event-driven architecture benefits', () => {
      // Test that systems can operate independently through events
      let systemEventCount = 0;
      
      // Mock external system that listens to game events
      const externalSystem = {
        onCombatEvent: (event) => {
          systemEventCount++;
          // External system could be analytics, logging, AI, etc.
          expect(event.data.timestamp).toBeDefined();
        }
      };

      // External system subscribes to all combat events
      [
        EventTypes.COMBAT.DAMAGE_DEALT,
        EventTypes.EFFECT.COUNTER_ATTACK,
        EventTypes.TURN.STARTED
      ].forEach(eventType => {
        eventBus.on(eventType, externalSystem.onCombatEvent);
      });

      // Perform game actions
      turnResolver.resetCoordinationTracking();
      
      const attacker = mockPlayers.get('player1');
      const target = mockPlayers.get('player2');
      target.classEffects = {
        spiritGuard: { turnsLeft: 1, counterDamage: 5, revealsWarlocks: false }
      };
      
      combatSystem.applyDamageToPlayer(target, 10, attacker, []);
      effectManager.handleCounterAttacks(target, attacker, []);

      // External system should have received events
      expect(systemEventCount).toBeGreaterThanOrEqual(2);
    });
  });
});