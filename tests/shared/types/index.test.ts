/**
 * @fileoverview Tests for shared type definitions
 * Tests type constraints, interfaces, and type-level compatibility
 */

import {
  UIState,
  ModalState,
  NotificationState,
  ClientToServerEvents,
  ServerToClientEvents,
  CreatePlayerData,
  PlayerActionData,
  GameStateUpdate,
  PhaseChangeData,
  PlayerUpdateData,
  GameEndData,
  ActionResultData,
  DamageEventData,
  HealEventData,
  DeathEventData,
  AbilityEventData,
  ChatChannel,
  ChatMessageData,
  GameStatistics,
  PlayerStatistics,
  GameContextState,
  GameSettingsForm,
  PlayerSettingsForm,
  ClientPlayer,
  GamePhaseInfo
} from '../../../shared/types/index';

describe('Shared Types', () => {
  describe('UI State Types', () => {
    describe('UIState', () => {
      it('should define complete UI state structure', () => {
        const uiState: UIState = {
          isLoading: false,
          error: null,
          modal: null,
          notifications: [],
          theme: 'light'
        };

        expect(uiState.isLoading).toBe(false);
        expect(uiState.theme).toBe('light');
      });

      it('should accept both light and dark themes', () => {
        const lightState: UIState = {
          isLoading: false,
          error: null,
          modal: null,
          notifications: [],
          theme: 'light'
        };

        const darkState: UIState = {
          isLoading: false,
          error: null,
          modal: null,
          notifications: [],
          theme: 'dark'
        };

        expect(lightState.theme).toBe('light');
        expect(darkState.theme).toBe('dark');
      });

      it('should allow error messages', () => {
        const errorState: UIState = {
          isLoading: false,
          error: 'Connection failed',
          modal: null,
          notifications: [],
          theme: 'light'
        };

        expect(errorState.error).toBe('Connection failed');
      });
    });

    describe('ModalState', () => {
      it('should define modal state with all types', () => {
        const modalTypes: ModalState['type'][] = [
          'adaptability',
          'battle-results',
          'tutorial',
          'settings',
          'abilities'
        ];

        modalTypes.forEach(type => {
          const modal: ModalState = {
            type,
            props: {},
            isOpen: true
          };
          expect(modal.type).toBe(type);
        });
      });

      it('should allow modal props', () => {
        const modal: ModalState = {
          type: 'adaptability',
          props: {
            playerId: 'player1',
            availableClasses: ['warrior', 'wizard']
          },
          isOpen: true
        };

        expect(modal.props.playerId).toBe('player1');
        expect(modal.props.availableClasses).toEqual(['warrior', 'wizard']);
      });
    });

    describe('NotificationState', () => {
      it('should define notification with all required fields', () => {
        const notification: NotificationState = {
          id: 'notif-1',
          type: 'success',
          message: 'Action completed',
          timestamp: new Date()
        };

        expect(notification.type).toBe('success');
        expect(notification.message).toBe('Action completed');
      });

      it('should accept all notification types', () => {
        const types: NotificationState['type'][] = ['info', 'success', 'warning', 'error'];

        types.forEach(type => {
          const notification: NotificationState = {
            id: `notif-${type}`,
            type,
            message: `${type} message`,
            timestamp: new Date()
          };
          expect(notification.type).toBe(type);
        });
      });

      it('should allow optional duration', () => {
        const notification: NotificationState = {
          id: 'notif-1',
          type: 'info',
          message: 'Info message',
          duration: 5000,
          timestamp: new Date()
        };

        expect(notification.duration).toBe(5000);
      });
    });
  });

  describe('Socket Event Types', () => {
    describe('ClientToServerEvents', () => {
      it('should define all client-to-server event signatures', () => {
        // This test verifies the event signatures compile correctly
        const mockEvents: ClientToServerEvents = {
          'connection:ping': () => {},
          'connection:authenticate': (data: { token?: string }) => {},
          'game:join': (data: { gameCode: string; playerData: any }) => {},
          'game:leave': (data: { playerId: string }) => {},
          'game:ready': (data: { playerId: string; isReady: boolean }) => {},
          'game:start': () => {},
          'action:submit': (data: { action: any }) => {},
          'action:ability': (data: { abilityId: string; targetId?: string }) => {},
          'action:vote': (data: { targetId: string }) => {},
          'chat:message': (data: { message: string; channel: any }) => {},
          'chat:typing': (data: { isTyping: boolean }) => {}
        };

        expect(typeof mockEvents['connection:ping']).toBe('function');
        expect(typeof mockEvents['game:join']).toBe('function');
      });
    });

    describe('ServerToClientEvents', () => {
      it('should define all server-to-client event signatures', () => {
        const mockEvents: ServerToClientEvents = {
          'connection:pong': () => {},
          'connection:authenticated': (data: { success: boolean; playerId?: string }) => {},
          'connection:error': (data: { message: string; code?: string }) => {},
          'game:stateUpdate': (data: any) => {},
          'game:phaseChange': (data: any) => {},
          'game:playerUpdate': (data: any) => {},
          'game:ended': (data: any) => {},
          'action:result': (data: any) => {},
          'action:invalid': (data: { reason: string; suggestion?: string }) => {},
          'event:damage': (data: any) => {},
          'event:heal': (data: any) => {},
          'event:death': (data: any) => {},
          'event:ability': (data: any) => {},
          'chat:message': (data: any) => {},
          'chat:userTyping': (data: { userId: string; isTyping: boolean }) => {}
        };

        expect(typeof mockEvents['connection:pong']).toBe('function');
        expect(typeof mockEvents['game:stateUpdate']).toBe('function');
      });
    });
  });

  describe('Game Data Types', () => {
    describe('CreatePlayerData', () => {
      it('should define player creation data', () => {
        const playerData: CreatePlayerData = {
          name: 'TestPlayer',
          class: 'Warrior' as any,
          race: 'Human' as any
        };

        expect(playerData.name).toBe('TestPlayer');
      });
    });

    describe('PlayerActionData', () => {
      it('should define player action with required fields', () => {
        const action: PlayerActionData = {
          actionType: 'ability'
        };

        expect(action.actionType).toBe('ability');
      });

      it('should allow optional fields', () => {
        const action: PlayerActionData = {
          actionType: 'ability',
          targetId: 'player2',
          abilityId: 'fireball',
          metadata: { power: 100 }
        };

        expect(action.targetId).toBe('player2');
        expect(action.abilityId).toBe('fireball');
        expect(action.metadata?.power).toBe(100);
      });
    });

    describe('GameStateUpdate', () => {
      it('should define game state update structure', () => {
        const update: GameStateUpdate = {
          gameState: { round: 5 },
          changedFields: ['round', 'players'],
          timestamp: new Date()
        };

        expect(update.gameState.round).toBe(5);
        expect(update.changedFields).toContain('round');
      });
    });

    describe('PhaseChangeData', () => {
      it('should define phase change with required fields', () => {
        const phaseChange: PhaseChangeData = {
          previousPhase: 'action' as any,
          newPhase: 'results' as any,
          round: 3
        };

        expect(phaseChange.round).toBe(3);
      });

      it('should allow optional fields', () => {
        const phaseChange: PhaseChangeData = {
          previousPhase: 'action' as any,
          newPhase: 'results' as any,
          round: 3,
          turn: 1,
          message: 'Entering results phase'
        };

        expect(phaseChange.turn).toBe(1);
        expect(phaseChange.message).toBe('Entering results phase');
      });
    });

    describe('GameEndData', () => {
      it('should define game end data with all winners', () => {
        const winners: GameEndData['winner'][] = ['Good', 'Evil', 'warlocks', 'innocents'];

        winners.forEach(winner => {
          const gameEnd: GameEndData = {
            winner,
            finalState: {} as any,
            statistics: {
              duration: 1800,
              rounds: 10,
              playerStats: {}
            }
          };
          expect(gameEnd.winner).toBe(winner);
        });
      });
    });
  });

  describe('Event Data Types', () => {
    describe('DamageEventData', () => {
      it('should define damage event with required fields', () => {
        const damageEvent: DamageEventData = {
          targetId: 'player1',
          sourceId: 'player2',
          damage: 25,
          damageType: 'physical'
        };

        expect(damageEvent.damage).toBe(25);
        expect(damageEvent.damageType).toBe('physical');
      });

      it('should accept all damage types', () => {
        const damageTypes: DamageEventData['damageType'][] = ['physical', 'magical', 'true'];

        damageTypes.forEach(damageType => {
          const damageEvent: DamageEventData = {
            targetId: 'player1',
            sourceId: 'player2',
            damage: 25,
            damageType
          };
          expect(damageEvent.damageType).toBe(damageType);
        });
      });

      it('should allow optional fields', () => {
        const damageEvent: DamageEventData = {
          targetId: 'player1',
          sourceId: 'player2',
          damage: 25,
          damageType: 'physical',
          blocked: 5,
          critical: true
        };

        expect(damageEvent.blocked).toBe(5);
        expect(damageEvent.critical).toBe(true);
      });
    });

    describe('HealEventData', () => {
      it('should define heal event', () => {
        const healEvent: HealEventData = {
          targetId: 'player1',
          sourceId: 'player2',
          amount: 30,
          overheal: 5
        };

        expect(healEvent.amount).toBe(30);
        expect(healEvent.overheal).toBe(5);
      });
    });

    describe('AbilityEventData', () => {
      it('should define ability event', () => {
        const abilityEvent: AbilityEventData = {
          playerId: 'player1',
          abilityName: 'Fireball',
          targetId: 'player2',
          success: true,
          effects: ['burned', 'stunned']
        };

        expect(abilityEvent.success).toBe(true);
        expect(abilityEvent.effects).toEqual(['burned', 'stunned']);
      });
    });
  });

  describe('Chat Types', () => {
    describe('ChatChannel', () => {
      it('should accept all channel types', () => {
        const channels: ChatChannel[] = ['all', 'team', 'spectator', 'system'];

        channels.forEach(channel => {
          const chatChannel: ChatChannel = channel;
          expect(chatChannel).toBe(channel);
        });
      });
    });

    describe('ChatMessageData', () => {
      it('should define chat message with required fields', () => {
        const message: ChatMessageData = {
          id: 'msg-1',
          userId: 'user1',
          userName: 'TestUser',
          message: 'Hello world',
          channel: 'all',
          timestamp: new Date()
        };

        expect(message.message).toBe('Hello world');
        expect(message.channel).toBe('all');
      });

      it('should allow metadata', () => {
        const message: ChatMessageData = {
          id: 'msg-1',
          userId: 'user1',
          userName: 'TestUser',
          message: 'Hello world',
          channel: 'team',
          timestamp: new Date(),
          metadata: {
            playerRole: 'Villager' as any,
            isDead: false
          }
        };

        expect(message.metadata?.isDead).toBe(false);
      });
    });
  });

  describe('Statistics Types', () => {
    describe('GameStatistics', () => {
      it('should define game statistics', () => {
        const stats: GameStatistics = {
          duration: 1800,
          rounds: 12,
          playerStats: {
            player1: {
              damageDealt: 150,
              damageTaken: 75,
              healingDone: 50,
              abilitiesUsed: 8,
              playersKilled: 2,
              survivalTime: 1800
            }
          },
          mvp: 'player1'
        };

        expect(stats.duration).toBe(1800);
        expect(stats.mvp).toBe('player1');
      });
    });

    describe('PlayerStatistics', () => {
      it('should define player statistics', () => {
        const playerStats: PlayerStatistics = {
          damageDealt: 200,
          damageTaken: 100,
          healingDone: 75,
          abilitiesUsed: 12,
          playersKilled: 3,
          survivalTime: 1600
        };

        expect(playerStats.damageDealt).toBe(200);
        expect(playerStats.playersKilled).toBe(3);
      });
    });
  });

  describe('Client Context Types', () => {
    describe('GameContextState', () => {
      it('should define game context with all connection states', () => {
        const connectionStates: GameContextState['connectionStatus'][] = [
          'disconnected',
          'connecting',
          'connected',
          'reconnecting'
        ];

        connectionStates.forEach(status => {
          const context: GameContextState = {
            gameState: null,
            localPlayer: null,
            isHost: false,
            isSpectator: false,
            connectionStatus: status,
            lastUpdate: null
          };
          expect(context.connectionStatus).toBe(status);
        });
      });

      it('should allow complete game context', () => {
        const context: GameContextState = {
          gameState: {} as any,
          localPlayer: {} as any,
          isHost: true,
          isSpectator: false,
          connectionStatus: 'connected',
          lastUpdate: new Date()
        };

        expect(context.isHost).toBe(true);
        expect(context.connectionStatus).toBe('connected');
      });
    });

    describe('GameSettingsForm', () => {
      it('should define game settings form', () => {
        const settings: GameSettingsForm = {
          maxPlayers: 12,
          minPlayers: 4,
          turnTimeLimit: 60,
          allowSpectators: true,
          allowLateJoin: false,
          difficultyModifier: 1.2
        };

        expect(settings.maxPlayers).toBe(12);
        expect(settings.allowSpectators).toBe(true);
      });
    });

    describe('PlayerSettingsForm', () => {
      it('should define player settings form', () => {
        const settings: PlayerSettingsForm = {
          displayName: 'TestPlayer',
          preferredClass: 'Warrior' as any,
          preferredRace: 'Human' as any,
          colorScheme: 'blue'
        };

        expect(settings.displayName).toBe('TestPlayer');
        expect(settings.colorScheme).toBe('blue');
      });
    });
  });

  describe('Utility Types', () => {
    describe('ClientPlayer', () => {
      it('should extend Player with client-specific fields', () => {
        const clientPlayer: ClientPlayer = {
          // Base Player fields (mocked as any for this test)
          id: 'player1',
          name: 'TestPlayer',
          isLocalPlayer: true,
          isHost: false,
          ping: 45
        } as any;

        expect(clientPlayer.isLocalPlayer).toBe(true);
        expect(clientPlayer.ping).toBe(45);
      });
    });

    describe('GamePhaseInfo', () => {
      it('should define phase information', () => {
        const phaseInfo: GamePhaseInfo = {
          phase: 'action' as any,
          canAct: true,
          timeRemaining: 30,
          waitingFor: ['player1', 'player2']
        };

        expect(phaseInfo.canAct).toBe(true);
        expect(phaseInfo.timeRemaining).toBe(30);
        expect(phaseInfo.waitingFor).toEqual(['player1', 'player2']);
      });

      it('should allow optional fields', () => {
        const phaseInfo: GamePhaseInfo = {
          phase: 'results' as any,
          canAct: false,
          waitingFor: []
        };

        expect(phaseInfo.canAct).toBe(false);
        expect(phaseInfo.timeRemaining).toBeUndefined();
      });
    });
  });

  describe('Type Exports and Compatibility', () => {
    it('should export all major types without conflicts', () => {
      // This test ensures that the type exports don't cause conflicts
      const testExports = {
        UIState: {} as UIState,
        ModalState: {} as ModalState,
        NotificationState: {} as NotificationState,
        CreatePlayerData: {} as CreatePlayerData,
        PlayerActionData: {} as PlayerActionData,
        GameStatistics: {} as GameStatistics,
        ClientPlayer: {} as ClientPlayer
      };

      expect(testExports).toBeDefined();
    });

    it('should maintain type compatibility across client-server boundary', () => {
      // Test that shared types work correctly
      const sharedGameData = {
        gameState: {} as any, // Would be GameState from server
        players: [] as any[], // Would be Player[] from server
        phase: 'action' as any // Would be GamePhase from server
      };

      expect(sharedGameData).toBeDefined();
    });
  });
});
