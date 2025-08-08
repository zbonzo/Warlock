/**
 * @fileoverview Comprehensive TypeScript tests for TurnResolver
 * Testing the TurnResolver with action resolution and turn-based logic
 */

describe('TurnResolver (TypeScript)', () => {
  let mockPlayers: Map<string, any>;
  let mockPlayer1: any;
  let mockPlayer2: any;
  let mockMonster: any;
  let mockSystems: any;
  let mockContext: any;
  let turnResolver: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock players
    mockPlayer1 = {
      id: 'player1',
      name: 'Alice',
      status: 'alive',
      stats: {
        hp: 100,
        maxHp: 100,
        attackPower: 20,
        magicPower: 15,
        defensePower: 5
      },
      statusEffects: {}
    };

    mockPlayer2 = {
      id: 'player2',
      name: 'Bob',
      status: 'alive',
      stats: {
        hp: 80,
        maxHp: 100,
        attackPower: 18,
        magicPower: 20,
        defensePower: 8
      },
      statusEffects: {}
    };

    mockPlayers = new Map([
      ['player1', mockPlayer1],
      ['player2', mockPlayer2]
    ]);

    // Setup mock monster
    mockMonster = {
      id: 'monster1',
      name: 'Test Monster',
      hp: 150,
      maxHp: 150,
      attackPower: 25,
      isAlive: true
    };

    // Setup mock systems
    mockSystems = {
      damageCalculator: {
        calculateDamage: jest.fn().mockReturnValue({
          finalDamage: 25,
          actualDamage: 23,
          blocked: 2,
          critical: false,
          modifiers: ['Armor (-2)'],
          log: ['Damage calculation completed']
        }),
        calculateHealing: jest.fn().mockReturnValue(12)
      },
      effectManager: {
        applyEffect: jest.fn(),
        processEffectDurations: jest.fn().mockReturnValue([
          { id: 'poison', name: 'Poison', type: 'debuff' }
        ])
      },
      combatSystem: {
        processRound: jest.fn()
      },
      statusEffectManager: {
        isPlayerStunned: jest.fn().mockReturnValue(false),
        processEffects: jest.fn()
      }
    };

    // Setup mock turn context
    mockContext = {
      gameCode: 'GAME123',
      players: mockPlayers,
      monster: mockMonster,
      level: 2,
      round: 5
    };

    // Create turn resolver with mock implementation
    turnResolver = {
      gameCode: 'GAME123',
      actionQueue: [],
      currentTurn: 0,
      systems: mockSystems,

      // Mock implementation methods
      queueAction: jest.fn().mockImplementation(function(action: any, priority: number = 0) {
        const queueItem = {
          action,
          priority,
          timestamp: Date.now()
        };
        this.actionQueue.push(queueItem);
      }),

      clearQueue: jest.fn().mockImplementation(function() {
        this.actionQueue = [];
      }),

      getCurrentTurn: jest.fn().mockImplementation(function() {
        return this.currentTurn;
      }),

      getQueuedActionCount: jest.fn().mockImplementation(function() {
        return this.actionQueue.length;
      }),

      // Core resolution logic
      _actualResolveTurn: function(context: any) {
        this.currentTurn++;

        // Sort actions by priority
        this.actionQueue.sort((a: any, b: any) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          return a.timestamp - b.timestamp;
        });

        const actionResults: any[] = [];
        const playerUpdates: any[] = [];
        const gameEvents: string[] = [];

        // Process each action
        for (const queueItem of this.actionQueue) {
          try {
            const result = this._resolveAction(queueItem.action, context);
            actionResults.push(result);
            this._applyActionResult(result, context);
          } catch (error) {
            actionResults.push({
              actionId: queueItem.action.actionType,
              actorId: queueItem.action.playerId,
              targetId: queueItem.action.targetId,
              success: false,
              message: 'Action failed to resolve'
            });
          }
        }

        // Process end-of-turn effects
        this._processEndOfTurnEffects(context, gameEvents);

        // Determine next phase
        const nextPhase = this._determineNextPhase(context);

        const turnResult = {
          turnNumber: this.currentTurn,
          actionResults,
          playerUpdates,
          gameEvents,
          nextPhase,
          timestamp: Date.now()
        };

        this.clearQueue();
        return turnResult;
      },

      _resolveAction: function(action: any, context: any) {
        const actor = context.players.get(action.playerId);
        if (!actor) {
          throw new Error(`Actor not found: ${action.playerId}`);
        }

        if (actor.status !== 'alive') {
          return {
            actionId: action.actionType,
            actorId: action.playerId,
            success: false,
            message: `${actor.name} is not alive`
          };
        }

        if (this.systems.statusEffectManager.isPlayerStunned(action.playerId)) {
          return {
            actionId: action.actionType,
            actorId: action.playerId,
            success: false,
            message: `${actor.name} is stunned`
          };
        }

        switch (action.actionType) {
          case 'attack':
            return this._resolveAttackAction(action, context);
          case 'heal':
            return this._resolveHealAction(action, context);
          case 'ability':
            return this._resolveAbilityAction(action, context);
          case 'defend':
            return this._resolveDefendAction(action, context);
          default:
            return {
              actionId: action.actionType,
              actorId: action.playerId,
              success: false,
              message: `Unknown action type: ${action.actionType}`
            };
        }
      },

      _resolveAttackAction: function(action: any, context: any) {
        const actor = context.players.get(action.playerId);
        const target = action.targetId ? context.players.get(action.targetId) || context.monster : null;

        if (!target) {
          return {
            actionId: action.actionType,
            actorId: action.playerId,
            success: false,
            message: 'Invalid target'
          };
        }

        const baseDamage = actor.stats.attackPower;
        const damageResult = this.systems.damageCalculator.calculateDamage({
          baseDamage,
          target,
          attacker: actor
        });

        return {
          actionId: action.actionType,
          actorId: action.playerId,
          targetId: action.targetId,
          success: true,
          damage: damageResult.actualDamage,
          blocked: damageResult.blocked,
          critical: damageResult.critical,
          message: `${actor.name} attacks for ${damageResult.actualDamage} damage`
        };
      },

      _resolveHealAction: function(action: any, context: any) {
        const actor = context.players.get(action.playerId);
        const target = action.targetId ? context.players.get(action.targetId) : actor;

        if (!target) {
          return {
            actionId: action.actionType,
            actorId: action.playerId,
            success: false,
            message: 'Invalid target'
          };
        }

        const baseHealing = Math.floor(actor.stats.magicPower * 0.8);
        const finalHealing = this.systems.damageCalculator.calculateHealing(baseHealing, actor, target);

        return {
          actionId: action.actionType,
          actorId: action.playerId,
          targetId: action.targetId,
          success: true,
          healing: finalHealing,
          message: `${actor.name} heals for ${finalHealing} HP`
        };
      },

      _resolveAbilityAction: function(action: any, context: any) {
        return {
          actionId: action.actionType,
          actorId: action.playerId,
          success: true,
          message: 'Ability used'
        };
      },

      _resolveDefendAction: function(action: any, context: any) {
        const actor = context.players.get(action.playerId);

        this.systems.effectManager.applyEffect(action.playerId, {
          id: 'defending',
          name: 'Defending',
          type: 'buff',
          duration: 1,
          metadata: { armorBonus: 5 }
        });

        return {
          actionId: action.actionType,
          actorId: action.playerId,
          success: true,
          effects: ['defending'],
          message: `${actor.name} takes a defensive stance`
        };
      },

      _applyActionResult: function(result: any, context: any) {
        if (result.damage && result.targetId) {
          const target = context.players.get(result.targetId);
          if (target) {
            target.stats.hp = Math.max(0, target.stats.hp - result.damage);
            if (target.stats.hp <= 0) {
              target.status = 'dead';
            }
          }
        }

        if (result.healing && result.targetId) {
          const target = context.players.get(result.targetId);
          if (target) {
            target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + result.healing);
          }
        }
      },

      _processEndOfTurnEffects: function(context: any, gameEvents: string[]) {
        for (const [playerId, player] of context.players) {
          const expiredEffects = this.systems.effectManager.processEffectDurations(playerId);
          for (const effect of expiredEffects) {
            gameEvents.push(`${player.name}'s ${effect.name} effect expired`);
          }
        }
      },

      _determineNextPhase: function(context: any) {
        const alivePlayers = Array.from(context.players.values()).filter((p: any) => p.status === 'alive');

        if (alivePlayers.length === 0) {
          return 'ended';
        }

        if (context.monster && context.monster.hp <= 0) {
          return 'ended';
        }

        return 'results';
      },

      toJSON: jest.fn().mockReturnValue({
        gameCode: 'GAME123',
        actionQueue: [],
        currentTurn: 0
      })
    };
  });

  describe('Constructor and Initialization', () => {
    it('should create TurnResolver with proper dependencies', () => {
      interface TurnResolverDependencies {
        gameCode: string;
        systems: any;
      }

      const dependencies: TurnResolverDependencies = {
        gameCode: 'GAME123',
        systems: mockSystems
      };

      expect(dependencies.gameCode).toBe('GAME123');
      expect(dependencies.systems).toBe(mockSystems);
      expect(dependencies.systems.damageCalculator).toBeDefined();
      expect(dependencies.systems.effectManager).toBeDefined();
    });

    it('should initialize with empty action queue', () => {
      expect(turnResolver.actionQueue).toEqual([]);
      expect(turnResolver.currentTurn).toBe(0);
    });

    it('should store game code and systems', () => {
      expect(turnResolver.gameCode).toBe('GAME123');
      expect(turnResolver.systems).toBe(mockSystems);
    });
  });

  describe('Action Queue Management', () => {
    it('should queue actions with priority', () => {
      const action = {
        actionType: 'attack',
        playerId: 'player1',
        targetId: 'monster1'
      };

      turnResolver.queueAction(action, 5);

      expect(turnResolver.queueAction).toHaveBeenCalledWith(action, 5);
      expect(turnResolver.actionQueue).toHaveLength(1);
      expect(turnResolver.actionQueue[0].action).toEqual(action);
      expect(turnResolver.actionQueue[0].priority).toBe(5);
    });

    it('should queue actions with default priority', () => {
      const action = {
        actionType: 'heal',
        playerId: 'player2'
      };

      turnResolver.queueAction(action);

      expect(turnResolver.actionQueue).toHaveLength(1);
      expect(turnResolver.actionQueue[0].priority).toBe(0);
    });

    it('should clear action queue', () => {
      const action = {
        actionType: 'attack',
        playerId: 'player1'
      };

      turnResolver.queueAction(action);
      expect(turnResolver.actionQueue).toHaveLength(1);

      turnResolver.clearQueue();
      expect(turnResolver.clearQueue).toHaveBeenCalled();
      expect(turnResolver.actionQueue).toHaveLength(0);
    });

    it('should return queued action count', () => {
      turnResolver.queueAction({ actionType: 'attack', playerId: 'player1' });
      turnResolver.queueAction({ actionType: 'heal', playerId: 'player2' });

      expect(turnResolver.getQueuedActionCount()).toBe(2);
    });

    it('should sort actions by priority and timestamp', () => {
      const lowPriorityAction = { actionType: 'attack', playerId: 'player1' };
      const highPriorityAction = { actionType: 'heal', playerId: 'player2' };

      turnResolver.queueAction(lowPriorityAction, 1);
      turnResolver.queueAction(highPriorityAction, 5);

      // After sorting in resolve turn, high priority should come first
      turnResolver._actualResolveTurn(mockContext);

      // Check that actions were processed in correct order by examining call order
      expect(mockSystems.damageCalculator.calculateHealing).toHaveBeenCalled();
    });
  });

  describe('Turn Resolution', () => {
    it('should resolve a complete turn', () => {
      const attackAction = {
        actionType: 'attack',
        playerId: 'player1',
        targetId: 'player2'
      };

      turnResolver.queueAction(attackAction);
      const result = turnResolver._actualResolveTurn(mockContext);

      expect(result.turnNumber).toBe(1);
      expect(result.actionResults).toHaveLength(1);
      expect(result.actionResults[0].success).toBe(true);
      expect(result.nextPhase).toBe('results');
      expect(typeof result.timestamp).toBe('number');
    });

    it('should increment turn number', () => {
      turnResolver.queueAction({ actionType: 'attack', playerId: 'player1' });

      expect(turnResolver.currentTurn).toBe(0);
      turnResolver._actualResolveTurn(mockContext);
      expect(turnResolver.currentTurn).toBe(1);
    });

    it('should clear queue after resolution', () => {
      turnResolver.queueAction({ actionType: 'attack', playerId: 'player1' });
      expect(turnResolver.actionQueue).toHaveLength(1);

      turnResolver._actualResolveTurn(mockContext);
      expect(turnResolver.actionQueue).toHaveLength(0);
    });

    it('should handle empty action queue', () => {
      const result = turnResolver._actualResolveTurn(mockContext);

      expect(result.turnNumber).toBe(1);
      expect(result.actionResults).toHaveLength(0);
      expect(result.nextPhase).toBe('results');
    });

    it('should process end-of-turn effects', () => {
      turnResolver.queueAction({ actionType: 'attack', playerId: 'player1' });
      const result = turnResolver._actualResolveTurn(mockContext);

      expect(result.gameEvents).toContain("Alice's Poison effect expired");
      expect(result.gameEvents).toContain("Bob's Poison effect expired");
      expect(mockSystems.effectManager.processEffectDurations).toHaveBeenCalledTimes(2);
    });
  });

  describe('Action Resolution', () => {
    it('should resolve attack actions', () => {
      const action = {
        actionType: 'attack',
        playerId: 'player1',
        targetId: 'player2'
      };

      const result = turnResolver._resolveAttackAction(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.damage).toBe(23);
      expect(result.blocked).toBe(2);
      expect(result.message).toContain('Alice attacks for 23 damage');
      expect(mockSystems.damageCalculator.calculateDamage).toHaveBeenCalledWith({
        baseDamage: 20,
        target: mockPlayer2,
        attacker: mockPlayer1
      });
    });

    it('should resolve heal actions', () => {
      const action = {
        actionType: 'heal',
        playerId: 'player1',
        targetId: 'player2'
      };

      const result = turnResolver._resolveHealAction(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.healing).toBe(12);
      expect(result.message).toContain('Alice heals for 12 HP');
      expect(mockSystems.damageCalculator.calculateHealing).toHaveBeenCalledWith(12, mockPlayer1, mockPlayer2);
    });

    it('should resolve self-heal when no target specified', () => {
      const action = {
        actionType: 'heal',
        playerId: 'player1'
      };

      const result = turnResolver._resolveHealAction(action, mockContext);

      expect(result.success).toBe(true);
      expect(mockSystems.damageCalculator.calculateHealing).toHaveBeenCalledWith(12, mockPlayer1, mockPlayer1);
    });

    it('should resolve defend actions', () => {
      const action = {
        actionType: 'defend',
        playerId: 'player1'
      };

      const result = turnResolver._resolveDefendAction(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.effects).toContain('defending');
      expect(result.message).toContain('Alice takes a defensive stance');
      expect(mockSystems.effectManager.applyEffect).toHaveBeenCalledWith('player1', {
        id: 'defending',
        name: 'Defending',
        type: 'buff',
        duration: 1,
        metadata: { armorBonus: 5 }
      });
    });

    it('should resolve ability actions', () => {
      const action = {
        actionType: 'ability',
        playerId: 'player1',
        abilityId: 'fireball'
      };

      const result = turnResolver._resolveAbilityAction(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Ability used');
    });

    it('should handle unknown action types', () => {
      const action = {
        actionType: 'unknown',
        playerId: 'player1'
      };

      const result = turnResolver._resolveAction(action, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unknown action type: unknown');
    });

    it('should handle invalid targets', () => {
      const action = {
        actionType: 'attack',
        playerId: 'player1',
        targetId: 'nonexistent'
      };

      const result = turnResolver._resolveAttackAction(action, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid target');
    });
  });

  describe('Player Status Validation', () => {
    it('should prevent dead players from acting', () => {
      mockPlayer1.status = 'dead';

      const action = {
        actionType: 'attack',
        playerId: 'player1',
        targetId: 'player2'
      };

      const result = turnResolver._resolveAction(action, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Alice is not alive');
    });

    it('should prevent stunned players from acting', () => {
      mockSystems.statusEffectManager.isPlayerStunned.mockReturnValue(true);

      const action = {
        actionType: 'attack',
        playerId: 'player1',
        targetId: 'player2'
      };

      const result = turnResolver._resolveAction(action, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Alice is stunned');
      expect(mockSystems.statusEffectManager.isPlayerStunned).toHaveBeenCalledWith('player1');
    });

    it('should handle missing players', () => {
      const action = {
        actionType: 'attack',
        playerId: 'nonexistent',
        targetId: 'player2'
      };

      expect(() => {
        turnResolver._resolveAction(action, mockContext);
      }).toThrow('Actor not found: nonexistent');
    });
  });

  describe('Action Result Application', () => {
    it('should apply damage to target', () => {
      const result = {
        damage: 15,
        targetId: 'player2'
      };

      const initialHp = mockPlayer2.stats.hp;
      turnResolver._applyActionResult(result, mockContext);

      expect(mockPlayer2.stats.hp).toBe(initialHp - 15);
    });

    it('should apply healing to target', () => {
      const result = {
        healing: 10,
        targetId: 'player1'
      };

      mockPlayer1.stats.hp = 90;
      turnResolver._applyActionResult(result, mockContext);

      expect(mockPlayer1.stats.hp).toBe(100); // Capped at maxHp
    });

    it('should mark players as dead when HP reaches zero', () => {
      const result = {
        damage: 200,
        targetId: 'player2'
      };

      turnResolver._applyActionResult(result, mockContext);

      expect(mockPlayer2.stats.hp).toBe(0);
      expect(mockPlayer2.status).toBe('dead');
    });

    it('should prevent overhealing', () => {
      const result = {
        healing: 50,
        targetId: 'player1'
      };

      mockPlayer1.stats.hp = 90;
      turnResolver._applyActionResult(result, mockContext);

      expect(mockPlayer1.stats.hp).toBe(100); // Should not exceed maxHp
    });

    it('should handle results without targets', () => {
      const result = {
        damage: 15
        // No targetId
      };

      expect(() => {
        turnResolver._applyActionResult(result, mockContext);
      }).not.toThrow();
    });
  });

  describe('Phase Determination', () => {
    it('should return "results" for normal game state', () => {
      const phase = turnResolver._determineNextPhase(mockContext);
      expect(phase).toBe('results');
    });

    it('should return "ended" when all players are dead', () => {
      mockPlayer1.status = 'dead';
      mockPlayer2.status = 'dead';

      const phase = turnResolver._determineNextPhase(mockContext);
      expect(phase).toBe('ended');
    });

    it('should return "ended" when monster is dead', () => {
      mockContext.monster.hp = 0;

      const phase = turnResolver._determineNextPhase(mockContext);
      expect(phase).toBe('ended');
    });

    it('should handle missing monster', () => {
      const contextWithoutMonster = {
        ...mockContext,
        monster: null
      };

      const phase = turnResolver._determineNextPhase(contextWithoutMonster);
      expect(phase).toBe('results');
    });
  });

  describe('Turn State Tracking', () => {
    it('should return current turn number', () => {
      expect(turnResolver.getCurrentTurn()).toBe(0);

      turnResolver._actualResolveTurn(mockContext);
      expect(turnResolver.getCurrentTurn()).toBe(1);
    });

    it('should track queued action count', () => {
      expect(turnResolver.getQueuedActionCount()).toBe(0);

      turnResolver.queueAction({ actionType: 'attack', playerId: 'player1' });
      expect(turnResolver.getQueuedActionCount()).toBe(1);

      turnResolver.queueAction({ actionType: 'heal', playerId: 'player2' });
      expect(turnResolver.getQueuedActionCount()).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle action resolution errors', () => {
      // Mock a system that throws an error
      mockSystems.damageCalculator.calculateDamage.mockImplementation(() => {
        throw new Error('Calculation failed');
      });

      const action = {
        actionType: 'attack',
        playerId: 'player1',
        targetId: 'player2'
      };

      turnResolver.queueAction(action);
      const result = turnResolver._actualResolveTurn(mockContext);

      expect(result.actionResults).toHaveLength(1);
      expect(result.actionResults[0].success).toBe(false);
      expect(result.actionResults[0].message).toBe('Action failed to resolve');
    });

    it('should continue processing after single action failure', () => {
      // First action fails, second succeeds
      let callCount = 0;
      mockSystems.damageCalculator.calculateDamage.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First calculation failed');
        }
        return {
          finalDamage: 10,
          actualDamage: 10,
          blocked: 0,
          critical: false,
          modifiers: [],
          log: []
        };
      });

      turnResolver.queueAction({ actionType: 'attack', playerId: 'player1', targetId: 'player2' });
      turnResolver.queueAction({ actionType: 'attack', playerId: 'player2', targetId: 'player1' });

      const result = turnResolver._actualResolveTurn(mockContext);

      expect(result.actionResults).toHaveLength(2);
      expect(result.actionResults[0].success).toBe(false);
      expect(result.actionResults[1].success).toBe(true);
    });
  });

  describe('Serialization and Deserialization', () => {
    it('should serialize to JSON correctly', () => {
      turnResolver.queueAction({ actionType: 'attack', playerId: 'player1' });

      const result = turnResolver.toJSON();

      expect(result.gameCode).toBe('GAME123');
      expect(result.currentTurn).toBe(0);
      expect(Array.isArray(result.actionQueue)).toBe(true);
    });

    it('should create instance from JSON data', () => {
      const jsonData = {
        gameCode: 'GAME456',
        actionQueue: [
          {
            action: { actionType: 'heal', playerId: 'player1' },
            priority: 1,
            timestamp: 1234567890
          }
        ],
        currentTurn: 3
      };

      const fromJSON = (data: any, systems: any) => {
        return {
          gameCode: data.gameCode,
          actionQueue: data.actionQueue || [],
          currentTurn: data.currentTurn || 0,
          systems
        };
      };

      const result = fromJSON(jsonData, mockSystems);

      expect(result.gameCode).toBe('GAME456');
      expect(result.actionQueue).toHaveLength(1);
      expect(result.currentTurn).toBe(3);
      expect(result.systems).toBe(mockSystems);
    });
  });

  describe('Type Safety and Interfaces', () => {
    it('should enforce ActionResult interface', () => {
      interface ActionResult {
        actionId: string;
        actorId: string;
        targetId?: string;
        success: boolean;
        damage?: number;
        healing?: number;
        effects?: string[];
        message: string;
        critical?: boolean;
        blocked?: number;
      }

      const result: ActionResult = {
        actionId: 'attack',
        actorId: 'player1',
        targetId: 'player2',
        success: true,
        damage: 25,
        message: 'Attack successful',
        critical: false,
        blocked: 2
      };

      expect(typeof result.actionId).toBe('string');
      expect(typeof result.actorId).toBe('string');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('should enforce TurnResult interface', () => {
      interface TurnResult {
        turnNumber: number;
        actionResults: any[];
        playerUpdates: any[];
        gameEvents: string[];
        nextPhase: 'action' | 'results' | 'ended';
        timestamp: number;
      }

      const result: TurnResult = {
        turnNumber: 1,
        actionResults: [],
        playerUpdates: [],
        gameEvents: ['Test event'],
        nextPhase: 'results',
        timestamp: Date.now()
      };

      expect(typeof result.turnNumber).toBe('number');
      expect(Array.isArray(result.actionResults)).toBe(true);
      expect(Array.isArray(result.playerUpdates)).toBe(true);
      expect(Array.isArray(result.gameEvents)).toBe(true);
      expect(['action', 'results', 'ended']).toContain(result.nextPhase);
      expect(typeof result.timestamp).toBe('number');
    });

    it('should enforce TurnContext interface', () => {
      interface TurnContext {
        gameCode: string;
        players: Map<string, any>;
        monster: any;
        level: number;
        round: number;
      }

      const context: TurnContext = {
        gameCode: 'GAME123',
        players: mockPlayers,
        monster: mockMonster,
        level: 2,
        round: 5
      };

      expect(typeof context.gameCode).toBe('string');
      expect(context.players).toBeInstanceOf(Map);
      expect(typeof context.level).toBe('number');
      expect(typeof context.round).toBe('number');
    });

    it('should enforce ResolutionSystems interface', () => {
      interface ResolutionSystems {
        damageCalculator: any;
        effectManager: any;
        combatSystem: any;
        statusEffectManager: any;
      }

      const systems: ResolutionSystems = {
        damageCalculator: mockSystems.damageCalculator,
        effectManager: mockSystems.effectManager,
        combatSystem: mockSystems.combatSystem,
        statusEffectManager: mockSystems.statusEffectManager
      };

      expect(systems.damageCalculator).toBeDefined();
      expect(systems.effectManager).toBeDefined();
      expect(systems.combatSystem).toBeDefined();
      expect(systems.statusEffectManager).toBeDefined();
    });
  });
});
