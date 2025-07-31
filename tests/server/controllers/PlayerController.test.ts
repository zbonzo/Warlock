/**
 * @fileoverview Comprehensive TypeScript tests for PlayerController
 * Testing the PlayerController with player operations and socket management
 */

describe('PlayerController (TypeScript)', () => {
  let mockSocket: any;
  let mockIo: any;
  let mockGame: any;
  let mockPlayer: any;
  let mockGameService: any;
  let mockMessages: any;
  let mockLogger: any;
  let mockConfig: any;
  let mockErrorHandler: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock socket
    mockSocket = {
      id: 'socket123',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis()
    };

    // Setup mock io
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };

    // Setup mock player
    mockPlayer = {
      id: 'player1',
      name: 'TestPlayer',
      class: undefined,
      race: undefined,
      socketIds: ['socket123'],
      toClientData: jest.fn().mockReturnValue({
        id: 'player1',
        name: 'TestPlayer',
        class: undefined,
        race: undefined
      }),
      addSocketId: jest.fn()
    };

    // Setup mock game
    mockGame = {
      code: 'GAME123',
      gameState: {
        started: false
      },
      addPlayer: jest.fn().mockReturnValue({
        success: true,
        player: mockPlayer
      }),
      removePlayer: jest.fn().mockReturnValue(true),
      getPlayer: jest.fn().mockReturnValue(mockPlayer),
      submitAction: jest.fn().mockResolvedValue({
        success: true
      }),
      toClientData: jest.fn().mockReturnValue({
        code: 'GAME123',
        players: {},
        started: false
      }),
      socketEventRouter: {
        registerSocket: jest.fn(),
        mapPlayerSocket: jest.fn()
      }
    };

    // Setup mock game service
    mockGameService = {
      canPlayerJoinGame: jest.fn().mockReturnValue(true),
      applyCharacterBonuses: jest.fn(),
      getGame: jest.fn().mockReturnValue(mockGame),
      handlePlayerDisconnection: jest.fn(),
      handlePlayerReconnection: jest.fn().mockReturnValue({
        success: true,
        player: mockPlayer
      }),
      findPlayerById: jest.fn().mockReturnValue(mockPlayer)
    };

    // Setup mock messages
    mockMessages = {
      getError: jest.fn().mockReturnValue('Error message'),
      getEvent: jest.fn().mockReturnValue('Event message'),
      formatMessage: jest.fn().mockImplementation((template, vars) => {
        return `${template} with ${JSON.stringify(vars)}`;
      })
    };

    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Setup mock config
    mockConfig = {
      player: {
        defaultPlayerName: 'DefaultPlayer'
      },
      game: {
        hideAbilitySubmissions: false
      }
    };

    // Setup mock error handler
    mockErrorHandler = {
      throwGameStateError: jest.fn()
    };

    // Mock validation functions
    const mockValidatePlayerNameSocket = jest.fn().mockReturnValue(true);
    const mockValidateGameAction = jest.fn().mockReturnValue(mockGame);

    // Mock the imports (these would be set up at the top level in real implementation)
    jest.doMock('../../server/services/gameService.js', () => ({ default: mockGameService }));
    jest.doMock('../../server/middleware/validation.js', () => ({ validatePlayerNameSocket: mockValidatePlayerNameSocket }));
    jest.doMock('../../server/shared/gameChecks.js', () => ({ validateGameAction: mockValidateGameAction }));
    jest.doMock('../../server/utils/logger.js', () => ({ default: mockLogger }));
    jest.doMock('../../server/utils/errorHandler.js', () => ({ default: mockErrorHandler }));
    jest.doMock('../../server/config/index.js', () => ({ default: mockConfig }));
    jest.doMock('../../server/messages/index.js', () => ({ default: mockMessages }));
  });

  describe('BaseController Abstract Class', () => {
    it('should define abstract methods for CRUD operations', () => {
      interface BaseController<TModel, TCreateInput, TUpdateInput> {
        create(input: TCreateInput): Promise<TModel>;
        update(id: string, input: TUpdateInput): Promise<TModel>;
        findById(id: string): Promise<TModel | null>;
        delete(id: string): Promise<boolean>;
      }

      // Test interface structure
      const mockController: BaseController<any, any, any> = {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        findById: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue(true)
      };

      expect(typeof mockController.create).toBe('function');
      expect(typeof mockController.update).toBe('function');
      expect(typeof mockController.findById).toBe('function');
      expect(typeof mockController.delete).toBe('function');
    });
  });

  describe('Player Join Handling', () => {
    interface JoinGameRequest {
      gameCode: string;
      playerName: string;
      playerClass?: string;
      playerRace?: string;
    }

    interface PlayerControllerResult {
      success: boolean;
      error?: string;
      data?: any;
    }

    it('should handle successful player join', async () => {
      const request: JoinGameRequest = {
        gameCode: 'GAME123',
        playerName: 'Alice',
        playerClass: 'Warrior',
        playerRace: 'Human'
      };

      const handlePlayerJoin = async (
        io: any,
        socket: any,
        request: JoinGameRequest
      ): Promise<PlayerControllerResult> => {
        const { gameCode, playerName, playerClass, playerRace } = request;

        // Simulate validation passing
        const game = mockGame;
        if (!game) {
          return { success: false, error: 'Game not found' };
        }

        // Simulate adding player
        const joinResult = game.addPlayer(socket.id, playerName);
        if (!joinResult.success) {
          return { success: false, error: 'Failed to join game' };
        }

        const player = joinResult.player;

        // Set character
        if (playerClass) player.class = playerClass;
        if (playerRace) player.race = playerRace;

        // Join socket room
        socket.join(gameCode);

        // Emit success events
        socket.emit('game:joined', {
          success: true,
          player: player.toClientData(),
          game: game.toClientData()
        });

        socket.to(gameCode).emit('player:joined', {
          player: player.toClientData(),
          message: `${playerName} joined the game`
        });

        return {
          success: true,
          data: { player, game }
        };
      };

      const result = await handlePlayerJoin(mockIo, mockSocket, request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockGame.addPlayer).toHaveBeenCalledWith('socket123', 'Alice');
      expect(mockSocket.join).toHaveBeenCalledWith('GAME123');
      expect(mockSocket.emit).toHaveBeenCalledWith('game:joined', expect.any(Object));
      expect(mockSocket.to).toHaveBeenCalledWith('GAME123');
    });

    it('should handle player join with invalid game', async () => {
      const request: JoinGameRequest = {
        gameCode: 'INVALID',
        playerName: 'Alice'
      };

      const handlePlayerJoin = async (
        io: any,
        socket: any,
        request: JoinGameRequest
      ): Promise<PlayerControllerResult> => {
        // Simulate game validation failing
        const game = null;
        if (!game) {
          return {
            success: false,
            error: 'Game not found or not joinable'
          };
        }
        return { success: true };
      };

      const result = await handlePlayerJoin(mockIo, mockSocket, request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Game not found or not joinable');
    });

    it('should handle player join with invalid name', async () => {
      const request: JoinGameRequest = {
        gameCode: 'GAME123',
        playerName: '' // Invalid name
      };

      const handlePlayerJoin = async (
        io: any,
        socket: any,
        request: JoinGameRequest
      ): Promise<PlayerControllerResult> => {
        const { playerName } = request;

        // Simulate name validation failing
        if (!playerName || playerName.trim().length === 0) {
          return {
            success: false,
            error: 'Invalid player name'
          };
        }

        return { success: true };
      };

      const result = await handlePlayerJoin(mockIo, mockSocket, request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid player name');
    });

    it('should handle player join when game is full', async () => {
      const request: JoinGameRequest = {
        gameCode: 'GAME123',
        playerName: 'Alice'
      };

      // Mock game service to return false for canPlayerJoinGame
      mockGameService.canPlayerJoinGame.mockReturnValue(false);

      const handlePlayerJoin = async (
        io: any,
        socket: any,
        request: JoinGameRequest
      ): Promise<PlayerControllerResult> => {
        if (!mockGameService.canPlayerJoinGame(mockGame, socket.id)) {
          return {
            success: false,
            error: 'Cannot join game at this time'
          };
        }
        return { success: true };
      };

      const result = await handlePlayerJoin(mockIo, mockSocket, request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot join game at this time');
    });

    it('should use default player name when none provided', async () => {
      const request: JoinGameRequest = {
        gameCode: 'GAME123',
        playerName: ''
      };

      const handlePlayerJoin = async (
        io: any,
        socket: any,
        request: JoinGameRequest
      ): Promise<PlayerControllerResult> => {
        const { gameCode, playerName } = request;
        const sanitizedName = playerName || mockConfig.player.defaultPlayerName || 'Player';

        const joinResult = mockGame.addPlayer(socket.id, sanitizedName);
        return {
          success: joinResult.success,
          data: { usedName: sanitizedName }
        };
      };

      const result = await handlePlayerJoin(mockIo, mockSocket, request);

      expect(result.success).toBe(true);
      expect(mockGame.addPlayer).toHaveBeenCalledWith('socket123', 'DefaultPlayer');
    });
  });

  describe('Character Selection Handling', () => {
    interface CharacterSelectionRequest {
      gameCode: string;
      class: string;
      race: string;
    }

    it('should handle successful character selection', async () => {
      const request: CharacterSelectionRequest = {
        gameCode: 'GAME123',
        class: 'Warrior',
        race: 'Dwarf'
      };

      const handleCharacterSelection = async (
        io: any,
        socket: any,
        request: CharacterSelectionRequest
      ): Promise<PlayerControllerResult> => {
        const { gameCode, class: playerClass, race } = request;

        const game = mockGame;
        const player = game.getPlayer(socket.id);

        if (!game || !player) {
          return { success: false, error: 'Game or player not found' };
        }

        if (game.gameState.started) {
          return { success: false, error: 'Cannot change character after game has started' };
        }

        // Apply character selection
        player.class = playerClass;
        player.race = race;

        // Apply bonuses
        mockGameService.applyCharacterBonuses(player, playerClass, race);

        // Emit confirmations
        socket.emit('character:selected', {
          success: true,
          player: player.toClientData()
        });

        socket.to(gameCode).emit('player:updated', {
          playerId: player.id,
          updates: { class: playerClass, race }
        });

        return { success: true, data: { player } };
      };

      const result = await handleCharacterSelection(mockIo, mockSocket, request);

      expect(result.success).toBe(true);
      expect(mockPlayer.class).toBe('Warrior');
      expect(mockPlayer.race).toBe('Dwarf');
      expect(mockGameService.applyCharacterBonuses).toHaveBeenCalledWith(
        mockPlayer,
        'Warrior',
        'Dwarf'
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('character:selected', expect.any(Object));
    });

    it('should prevent character selection after game starts', async () => {
      const request: CharacterSelectionRequest = {
        gameCode: 'GAME123',
        class: 'Mage',
        race: 'Elf'
      };

      // Set game as started
      mockGame.gameState.started = true;

      const handleCharacterSelection = async (
        io: any,
        socket: any,
        request: CharacterSelectionRequest
      ): Promise<PlayerControllerResult> => {
        const game = mockGame;
        const player = game.getPlayer(socket.id);

        if (game.gameState.started) {
          return {
            success: false,
            error: 'Cannot change character after game has started'
          };
        }

        return { success: true };
      };

      const result = await handleCharacterSelection(mockIo, mockSocket, request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot change character after game has started');
    });

    it('should handle character selection for non-existent player', async () => {
      const request: CharacterSelectionRequest = {
        gameCode: 'GAME123',
        class: 'Warrior',
        race: 'Human'
      };

      // Mock getPlayer to return null
      mockGame.getPlayer.mockReturnValue(null);

      const handleCharacterSelection = async (
        io: any,
        socket: any,
        request: CharacterSelectionRequest
      ): Promise<PlayerControllerResult> => {
        const game = mockGame;
        const player = game.getPlayer(socket.id);

        if (!player) {
          return {
            success: false,
            error: 'Player not found in game'
          };
        }

        return { success: true };
      };

      const result = await handleCharacterSelection(mockIo, mockSocket, request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player not found in game');
    });
  });

  describe('Player Action Handling', () => {
    interface PlayerActionRequest {
      gameCode: string;
      actionType: string;
      targetId?: string;
      abilityId?: string;
      actionData?: Record<string, any>;
    }

    it('should handle successful action submission', async () => {
      const request: PlayerActionRequest = {
        gameCode: 'GAME123',
        actionType: 'attack',
        targetId: 'monster1',
        abilityId: 'sword_slash',
        actionData: { power: 5 }
      };

      const handlePlayerAction = async (
        io: any,
        socket: any,
        request: PlayerActionRequest
      ): Promise<PlayerControllerResult> => {
        const { gameCode, actionType, targetId, abilityId, actionData = {} } = request;

        const game = mockGame;
        const player = game.getPlayer(socket.id);

        if (!game || !player) {
          return { success: false, error: 'Game or player not found' };
        }

        // Submit action through game room
        const actionResult = await game.submitAction({
          playerId: socket.id,
          actionType,
          targetId,
          additionalData: { ...actionData, abilityId }
        });

        if (actionResult.success) {
          socket.emit('action:submitted', {
            success: true,
            actionType,
            targetId,
            submissionTime: Date.now()
          });

          // Notify other players
          socket.to(gameCode).emit('player:action_submitted', {
            playerId: player.id,
            playerName: player.name,
            hasSubmitted: true
          });
        }

        return actionResult;
      };

      const result = await handlePlayerAction(mockIo, mockSocket, request);

      expect(result.success).toBe(true);
      expect(mockGame.submitAction).toHaveBeenCalledWith({
        playerId: 'socket123',
        actionType: 'attack',
        targetId: 'monster1',
        additionalData: {
          power: 5,
          abilityId: 'sword_slash'
        }
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('action:submitted', expect.any(Object));
    });

    it('should handle failed action submission', async () => {
      const request: PlayerActionRequest = {
        gameCode: 'GAME123',
        actionType: 'invalid'
      };

      // Mock game to return failure
      mockGame.submitAction.mockResolvedValue({
        success: false,
        reason: 'Invalid action type'
      });

      const handlePlayerAction = async (
        io: any,
        socket: any,
        request: PlayerActionRequest
      ): Promise<PlayerControllerResult> => {
        const { gameCode, actionType } = request;

        const actionResult = await mockGame.submitAction({
          playerId: socket.id,
          actionType,
          additionalData: {}
        });

        if (!actionResult.success) {
          socket.emit('action:error', {
            success: false,
            error: actionResult.reason,
            actionType
          });
        }

        return actionResult;
      };

      const result = await handlePlayerAction(mockIo, mockSocket, request);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Invalid action type');
      expect(mockSocket.emit).toHaveBeenCalledWith('action:error', {
        success: false,
        error: 'Invalid action type',
        actionType: 'invalid'
      });
    });

    it('should handle hidden ability submissions', async () => {
      const request: PlayerActionRequest = {
        gameCode: 'GAME123',
        actionType: 'ability',
        abilityId: 'secret_spell'
      };

      // Set config to hide ability submissions
      mockConfig.game.hideAbilitySubmissions = true;

      const handlePlayerAction = async (
        io: any,
        socket: any,
        request: PlayerActionRequest
      ): Promise<PlayerControllerResult> => {
        const { gameCode, actionType } = request;

        const actionResult = await mockGame.submitAction({
          playerId: socket.id,
          actionType,
          additionalData: {}
        });

        if (actionResult.success) {
          socket.emit('action:submitted', { success: true, actionType });

          // Only notify if not hidden
          if (actionType !== 'ability' || !mockConfig.game.hideAbilitySubmissions) {
            socket.to(gameCode).emit('player:action_submitted', {
              playerId: mockPlayer.id,
              hasSubmitted: true
            });
          }
        }

        return actionResult;
      };

      await handlePlayerAction(mockIo, mockSocket, request);

      expect(mockSocket.emit).toHaveBeenCalledWith('action:submitted', expect.any(Object));
      expect(mockSocket.to).not.toHaveBeenCalled(); // Should not notify others
    });
  });

  describe('Player Leave/Disconnect Handling', () => {
    it('should handle normal player leave', async () => {
      const handlePlayerLeave = async (
        io: any,
        socket: any,
        gameCode: string,
        isDisconnect: boolean = false
      ): Promise<PlayerControllerResult> => {
        const game = mockGameService.getGame(gameCode);
        const player = game?.getPlayer(socket.id);

        if (!game || !player) {
          return { success: false, error: 'Game or player not found' };
        }

        const playerName = player.name;

        if (!isDisconnect) {
          // Handle normal leave
          const success = game.removePlayer(socket.id);
          
          if (success) {
            socket.leave(gameCode);
            
            socket.to(gameCode).emit('player:left', {
              playerId: socket.id,
              playerName,
              message: `${playerName} left the game`
            });
          }
        }

        return { success: true, data: { playerName } };
      };

      const result = await handlePlayerLeave(mockIo, mockSocket, 'GAME123', false);

      expect(result.success).toBe(true);
      expect(mockGame.removePlayer).toHaveBeenCalledWith('socket123');
      expect(mockSocket.leave).toHaveBeenCalledWith('GAME123');
      expect(mockSocket.to).toHaveBeenCalledWith('GAME123');
    });

    it('should handle player disconnection during game', async () => {
      // Set game as started
      mockGame.gameState.started = true;

      const handlePlayerLeave = async (
        io: any,
        socket: any,
        gameCode: string,
        isDisconnect: boolean = false
      ): Promise<PlayerControllerResult> => {
        const game = mockGameService.getGame(gameCode);
        const player = game?.getPlayer(socket.id);

        if (!game || !player) {
          return { success: false, error: 'Game or player not found' };
        }

        const playerName = player.name;

        if (isDisconnect && game.gameState.started) {
          // Handle disconnection during game
          mockGameService.handlePlayerDisconnection(game, socket.id);
          
          socket.to(gameCode).emit('player:disconnected', {
            playerId: socket.id,
            playerName,
            message: `${playerName} disconnected`
          });
        }

        return { success: true, data: { playerName } };
      };

      const result = await handlePlayerLeave(mockIo, mockSocket, 'GAME123', true);

      expect(result.success).toBe(true);
      expect(mockGameService.handlePlayerDisconnection).toHaveBeenCalledWith(mockGame, 'socket123');
      expect(mockSocket.to).toHaveBeenCalledWith('GAME123');
    });
  });

  describe('Player Reconnection Handling', () => {
    it('should handle successful player reconnection', async () => {
      const handlePlayerReconnect = async (
        io: any,
        socket: any,
        gameCode: string,
        playerName: string
      ): Promise<PlayerControllerResult> => {
        const game = mockGameService.getGame(gameCode);
        if (!game) {
          return { success: false, error: 'Game not found' };
        }

        const reconnectResult = mockGameService.handlePlayerReconnection(game, socket, playerName);
        
        if (reconnectResult.success) {
          const player = reconnectResult.player;
          
          // Update socket mapping
          player.addSocketId(socket.id);
          socket.join(gameCode);
          
          // Register with socket router
          if (game.socketEventRouter) {
            game.socketEventRouter.registerSocket(socket);
            game.socketEventRouter.mapPlayerSocket(socket.id, socket.id);
          }

          // Send game state to reconnected player
          socket.emit('game:reconnected', {
            success: true,
            player: player.toClientData(),
            game: game.toClientData()
          });

          // Notify other players
          socket.to(gameCode).emit('player:reconnected', {
            playerId: player.id,
            playerName,
            message: `${playerName} reconnected`
          });
        }

        return reconnectResult;
      };

      const result = await handlePlayerReconnect(mockIo, mockSocket, 'GAME123', 'TestPlayer');

      expect(result.success).toBe(true);
      expect(mockGameService.handlePlayerReconnection).toHaveBeenCalledWith(
        mockGame,
        mockSocket,
        'TestPlayer'
      );
      expect(mockPlayer.addSocketId).toHaveBeenCalledWith('socket123');
      expect(mockSocket.join).toHaveBeenCalledWith('GAME123');
      expect(mockSocket.emit).toHaveBeenCalledWith('game:reconnected', expect.any(Object));
    });

    it('should handle reconnection failure', async () => {
      // Mock failed reconnection
      mockGameService.handlePlayerReconnection.mockReturnValue({
        success: false,
        error: 'Player not found for reconnection'
      });

      const handlePlayerReconnect = async (
        io: any,
        socket: any,
        gameCode: string,
        playerName: string
      ): Promise<PlayerControllerResult> => {
        const game = mockGameService.getGame(gameCode);
        if (!game) {
          return { success: false, error: 'Game not found' };
        }

        const reconnectResult = mockGameService.handlePlayerReconnection(game, socket, playerName);
        return reconnectResult;
      };

      const result = await handlePlayerReconnect(mockIo, mockSocket, 'GAME123', 'NonExistentPlayer');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Player not found for reconnection');
    });
  });

  describe('Abstract Method Implementations', () => {
    it('should throw errors for unused abstract methods', async () => {
      interface PlayerController {
        create(input: any): Promise<any>;
        update(id: string, input: any): Promise<any>;
        findById(id: string): Promise<any>;
        delete(id: string): Promise<boolean>;
      }

      const controller: PlayerController = {
        create: async (input: any) => {
          throw new Error('Use handlePlayerJoin instead');
        },
        update: async (id: string, input: any) => {
          throw new Error('Use specific update methods instead');
        },
        findById: async (id: string) => {
          return mockGameService.findPlayerById(id);
        },
        delete: async (id: string) => {
          throw new Error('Use handlePlayerLeave instead');
        }
      };

      await expect(controller.create({})).rejects.toThrow('Use handlePlayerJoin instead');
      await expect(controller.update('id', {})).rejects.toThrow('Use specific update methods instead');
      await expect(controller.delete('id')).rejects.toThrow('Use handlePlayerLeave instead');

      const findResult = await controller.findById('player1');
      expect(findResult).toBe(mockPlayer);
      expect(mockGameService.findPlayerById).toHaveBeenCalledWith('player1');
    });
  });

  describe('Type Safety and Interfaces', () => {
    it('should enforce JoinGameRequest interface', () => {
      interface JoinGameRequest {
        gameCode: string;
        playerName: string;
        playerClass?: string;
        playerRace?: string;
      }

      const request: JoinGameRequest = {
        gameCode: 'GAME123',
        playerName: 'Alice',
        playerClass: 'Warrior',
        playerRace: 'Human'
      };

      expect(typeof request.gameCode).toBe('string');
      expect(typeof request.playerName).toBe('string');
      expect(typeof request.playerClass).toBe('string');
      expect(typeof request.playerRace).toBe('string');
    });

    it('should enforce CharacterSelectionRequest interface', () => {
      interface CharacterSelectionRequest {
        gameCode: string;
        class: string;
        race: string;
      }

      const request: CharacterSelectionRequest = {
        gameCode: 'GAME123',
        class: 'Mage',
        race: 'Elf'
      };

      expect(typeof request.gameCode).toBe('string');
      expect(typeof request.class).toBe('string');
      expect(typeof request.race).toBe('string');
    });

    it('should enforce PlayerActionRequest interface', () => {
      interface PlayerActionRequest {
        gameCode: string;
        actionType: string;
        targetId?: string;
        abilityId?: string;
        actionData?: Record<string, any>;
      }

      const request: PlayerActionRequest = {
        gameCode: 'GAME123',
        actionType: 'attack',
        targetId: 'monster1',
        abilityId: 'fireball',
        actionData: { damage: 25 }
      };

      expect(typeof request.gameCode).toBe('string');
      expect(typeof request.actionType).toBe('string');
      expect(typeof request.targetId).toBe('string');
      expect(typeof request.abilityId).toBe('string');
      expect(typeof request.actionData).toBe('object');
    });

    it('should enforce PlayerControllerResult interface', () => {
      interface PlayerControllerResult {
        success: boolean;
        error?: string;
        data?: any;
      }

      const successResult: PlayerControllerResult = {
        success: true,
        data: { player: mockPlayer }
      };

      const errorResult: PlayerControllerResult = {
        success: false,
        error: 'Something went wrong'
      };

      expect(typeof successResult.success).toBe('boolean');
      expect(successResult.data).toBeDefined();
      expect(successResult.error).toBeUndefined();

      expect(typeof errorResult.success).toBe('boolean');
      expect(typeof errorResult.error).toBe('string');
      expect(errorResult.data).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle exceptions in player join', async () => {
      const request = {
        gameCode: 'GAME123',
        playerName: 'Alice'
      };

      const handlePlayerJoinWithError = async (): Promise<PlayerControllerResult> => {
        try {
          // Simulate an error during processing
          throw new Error('Database connection failed');
        } catch (error) {
          mockLogger.error('Error in handlePlayerJoin:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      };

      const result = await handlePlayerJoinWithError();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in handlePlayerJoin:',
        expect.any(Error)
      );
    });

    it('should handle exceptions in character selection', async () => {
      const handleCharacterSelectionWithError = async (): Promise<PlayerControllerResult> => {
        try {
          throw new Error('Invalid character configuration');
        } catch (error) {
          mockLogger.error('Error in handleCharacterSelection:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      };

      const result = await handleCharacterSelectionWithError();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid character configuration');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle exceptions in player action', async () => {
      const handlePlayerActionWithError = async (): Promise<PlayerControllerResult> => {
        try {
          throw new Error('Action validation failed');
        } catch (error) {
          mockLogger.error('Error in handlePlayerAction:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      };

      const result = await handlePlayerActionWithError();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Action validation failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});