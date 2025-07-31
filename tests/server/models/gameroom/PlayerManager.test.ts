/**
 * @fileoverview TypeScript tests for PlayerManager
 * Testing the new modular PlayerManager class with type safety
 */

import { PlayerManager } from '@models/gameroom/PlayerManager';
import { Player } from '@models/Player';
import type { 
  PlayerRace, 
  PlayerClass,
  PlayerInfo,
  PlayerActionSummary
} from '@server/types/generated';

// Mock dependencies
jest.mock('@models/Player');
jest.mock('@config', () => ({
  default: {
    maxPlayers: 4,
    classAbilities: {
      Warrior: [
        { type: 'slash', name: 'Slash', unlockAt: 1, cooldown: 0 }
      ]
    },
    racialAbilities: {
      Dwarf: { type: 'stoneArmor', name: 'Stone Armor', params: { value: 5 } }
    }
  }
}));
jest.mock('@utils/logger', () => ({
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

const MockedPlayer = Player as jest.MockedClass<typeof Player>;

describe('PlayerManager (TypeScript)', () => {
  let playerManager: PlayerManager;
  let mockPlayers: Map<string, Player>;

  beforeEach(() => {
    mockPlayers = new Map();
    playerManager = new PlayerManager(mockPlayers);
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with empty player map', () => {
      const emptyMap = new Map<string, Player>();
      const manager = new PlayerManager(emptyMap);
      
      expect(manager).toBeInstanceOf(PlayerManager);
    });
  });

  describe('Player Addition', () => {
    it('should add player successfully when room not full', () => {
      const mockPlayer = createMockPlayer('player1', 'Alice');
      MockedPlayer.mockImplementation(() => mockPlayer);

      const result = playerManager.addPlayer('player1', 'Alice');

      expect(result).toBe(true);
      expect(MockedPlayer).toHaveBeenCalledWith('player1', 'Alice');
      expect(mockPlayers.has('player1')).toBe(true);
    });

    it('should not add player when room is full', () => {
      // Fill the room to capacity (maxPlayers = 4)
      for (let i = 1; i <= 4; i++) {
        const mockPlayer = createMockPlayer(`player${i}`, `Player${i}`);
        mockPlayers.set(`player${i}`, mockPlayer);
      }

      const result = playerManager.addPlayer('player5', 'Player5');

      expect(result).toBe(false);
      expect(MockedPlayer).not.toHaveBeenCalled();
    });

    it('should not add player with duplicate ID', () => {
      const existingPlayer = createMockPlayer('player1', 'ExistingPlayer');
      mockPlayers.set('player1', existingPlayer);

      const result = playerManager.addPlayer('player1', 'NewPlayer');

      expect(result).toBe(false);
    });
  });

  describe('Player Removal', () => {
    it('should remove player successfully', () => {
      const mockPlayer = createMockPlayer('player1', 'Alice');
      mockPlayers.set('player1', mockPlayer);

      const result = playerManager.removePlayer('player1');

      expect(result).toBe(true);
      expect(mockPlayers.has('player1')).toBe(false);
    });

    it('should return false when removing non-existent player', () => {
      const result = playerManager.removePlayer('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('Player Information', () => {
    it('should get all players info correctly', () => {
      const mockPlayer1 = createMockPlayer('player1', 'Alice');
      const mockPlayer2 = createMockPlayer('player2', 'Bob');
      
      mockPlayer1.toClientData.mockReturnValue({
        id: 'player1',
        name: 'Alice',
        isAlive: true,
        hp: 100,
        maxHp: 100,
        armor: 0,
        race: 'Human' as PlayerRace,
        class: 'Warrior' as PlayerClass,
        isWarlock: false,
        hasSubmittedAction: false,
        statusEffects: [],
        abilities: [],
        racialAbility: null,
        level: 1,
        isReady: true
      });

      mockPlayer2.toClientData.mockReturnValue({
        id: 'player2',
        name: 'Bob',
        isAlive: true,
        hp: 80,
        maxHp: 100,
        armor: 2,
        race: 'Dwarf' as PlayerRace,
        class: 'Warrior' as PlayerClass,
        isWarlock: true,
        hasSubmittedAction: true,
        statusEffects: [],
        abilities: [],
        racialAbility: null,
        level: 1,
        isReady: false
      });

      mockPlayers.set('player1', mockPlayer1);
      mockPlayers.set('player2', mockPlayer2);

      const playersInfo = playerManager.getPlayersInfo();

      expect(playersInfo).toHaveLength(2);
      expect(playersInfo[0].name).toBe('Alice');
      expect(playersInfo[1].name).toBe('Bob');
      expect(mockPlayer1.toClientData).toHaveBeenCalled();
      expect(mockPlayer2.toClientData).toHaveBeenCalled();
    });

    it('should get alive players correctly', () => {
      const alivePlayer = createMockPlayer('alive', 'Alive');
      const deadPlayer = createMockPlayer('dead', 'Dead');
      
      alivePlayer.isAlive = true;
      deadPlayer.isAlive = false;

      mockPlayers.set('alive', alivePlayer);
      mockPlayers.set('dead', deadPlayer);

      const alivePlayers = playerManager.getAlivePlayers();

      expect(alivePlayers).toHaveLength(1);
      expect(alivePlayers[0].id).toBe('alive');
    });

    it('should count alive players correctly', () => {
      const alivePlayer1 = createMockPlayer('alive1', 'Alive1');
      const alivePlayer2 = createMockPlayer('alive2', 'Alive2');
      const deadPlayer = createMockPlayer('dead', 'Dead');
      
      alivePlayer1.isAlive = true;
      alivePlayer2.isAlive = true;
      deadPlayer.isAlive = false;

      mockPlayers.set('alive1', alivePlayer1);
      mockPlayers.set('alive2', alivePlayer2);
      mockPlayers.set('dead', deadPlayer);

      const count = playerManager.getAliveCount();

      expect(count).toBe(2);
    });
  });

  describe('Character Setup', () => {
    it('should set player character correctly', () => {
      const mockPlayer = createMockPlayer('player1', 'Alice');
      mockPlayers.set('player1', mockPlayer);

      const result = playerManager.setPlayerCharacter('player1', 'Elf', 'Druid');

      expect(result).toBe(true);
      expect(mockPlayer.setCharacter).toHaveBeenCalledWith('Elf', 'Druid');
    });

    it('should return false when setting character for non-existent player', () => {
      const result = playerManager.setPlayerCharacter('nonexistent', 'Elf', 'Druid');

      expect(result).toBe(false);
    });
  });

  describe('Ready State Management', () => {
    it('should check if all players are ready', () => {
      const readyPlayer = createMockPlayer('ready', 'Ready');
      const notReadyPlayer = createMockPlayer('notReady', 'NotReady');
      
      readyPlayer.isCharacterReady.mockReturnValue(true);
      notReadyPlayer.isCharacterReady.mockReturnValue(false);

      mockPlayers.set('ready', readyPlayer);
      mockPlayers.set('notReady', notReadyPlayer);

      const allReady = playerManager.areAllPlayersReady();

      expect(allReady).toBe(false);
    });

    it('should return true when all players are ready', () => {
      const readyPlayer1 = createMockPlayer('ready1', 'Ready1');
      const readyPlayer2 = createMockPlayer('ready2', 'Ready2');
      
      readyPlayer1.isCharacterReady.mockReturnValue(true);
      readyPlayer2.isCharacterReady.mockReturnValue(true);

      mockPlayers.set('ready1', readyPlayer1);
      mockPlayers.set('ready2', readyPlayer2);

      const allReady = playerManager.areAllPlayersReady();

      expect(allReady).toBe(true);
    });

    it('should clear ready states', () => {
      const player1 = createMockPlayer('p1', 'Player1');
      const player2 = createMockPlayer('p2', 'Player2');
      
      player1.isReady = true;
      player2.isReady = true;

      mockPlayers.set('p1', player1);
      mockPlayers.set('p2', player2);

      playerManager.clearReadyStates();

      expect(player1.isReady).toBe(false);
      expect(player2.isReady).toBe(false);
    });
  });

  describe('Player Action Summary', () => {
    it('should generate action summary correctly', () => {
      const alivePlayer = createMockPlayer('alive', 'Alive');
      const deadPlayer = createMockPlayer('dead', 'Dead');
      const stunnedPlayer = createMockPlayer('stunned', 'Stunned');
      
      alivePlayer.isAlive = true;
      alivePlayer.hasSubmittedAction = true;
      alivePlayer.hasStatusEffect.mockReturnValue(false);
      
      deadPlayer.isAlive = false;
      deadPlayer.hasSubmittedAction = false;
      deadPlayer.hasStatusEffect.mockReturnValue(false);
      
      stunnedPlayer.isAlive = true;
      stunnedPlayer.hasSubmittedAction = false;
      stunnedPlayer.hasStatusEffect.mockImplementation((effect) => effect === 'stunned');

      mockPlayers.set('alive', alivePlayer);
      mockPlayers.set('dead', deadPlayer);
      mockPlayers.set('stunned', stunnedPlayer);

      const summary = playerManager.getPlayerActionSummary();

      expect(summary.total).toBe(3);
      expect(summary.alive).toBe(2);
      expect(summary.hasSubmittedAction).toBe(1);
      expect(summary.canAct).toBe(1); // alive and not stunned
      expect(summary.stunned).toBe(1);
      expect(summary.details).toHaveLength(3);
    });
  });

  describe('Player ID Transfer', () => {
    it('should transfer player ID successfully', () => {
      const mockPlayer = createMockPlayer('oldId', 'Player');
      mockPlayers.set('oldId', mockPlayer);

      const result = playerManager.transferPlayerId('oldId', 'newId');

      expect(result).toBe(true);
      expect(mockPlayers.has('oldId')).toBe(false);
      expect(mockPlayers.has('newId')).toBe(true);
      expect(mockPlayers.get('newId')).toBe(mockPlayer);
      expect(mockPlayer.id).toBe('newId');
    });

    it('should return false when transferring non-existent player', () => {
      const result = playerManager.transferPlayerId('nonexistent', 'newId');

      expect(result).toBe(false);
    });

    it('should return false when new ID already exists', () => {
      const player1 = createMockPlayer('player1', 'Player1');
      const player2 = createMockPlayer('player2', 'Player2');
      
      mockPlayers.set('player1', player1);
      mockPlayers.set('player2', player2);

      const result = playerManager.transferPlayerId('player1', 'player2');

      expect(result).toBe(false);
      expect(mockPlayers.get('player1')).toBe(player1);
      expect(mockPlayers.get('player2')).toBe(player2);
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types for PlayerInfo', () => {
      const mockPlayer = createMockPlayer('player1', 'Alice');
      
      mockPlayer.toClientData.mockReturnValue({
        id: 'player1',
        name: 'Alice',
        isAlive: true,
        hp: 100,
        maxHp: 100,
        armor: 0,
        race: 'Human' as PlayerRace,
        class: 'Warrior' as PlayerClass,
        isWarlock: false,
        hasSubmittedAction: false,
        statusEffects: [],
        abilities: [],
        racialAbility: null,
        level: 1,
        isReady: true
      });

      mockPlayers.set('player1', mockPlayer);

      const playersInfo: PlayerInfo[] = playerManager.getPlayersInfo();

      expect(playersInfo[0].race).toBe('Human');
      expect(playersInfo[0].class).toBe('Warrior');
    });
  });

  /**
   * Helper function to create mock player instances
   */
  function createMockPlayer(id: string, name: string): jest.Mocked<Player> {
    return {
      id,
      name,
      race: undefined,
      class: undefined,
      isWarlock: false,
      isReady: false,
      hasSubmittedAction: false,
      isAlive: true,
      hp: 100,
      maxHp: 100,
      armor: 0,
      level: 1,
      abilities: {
        abilities: [],
        unlocked: [],
        racialAbility: null,
      },
      effects: {
        statusEffects: new Map(),
      },
      setCharacter: jest.fn(),
      isCharacterReady: jest.fn(),
      hasStatusEffect: jest.fn(),
      toClientData: jest.fn(),
      takeDamage: jest.fn(),
      heal: jest.fn(),
      applyStatusEffect: jest.fn(),
      removeStatusEffect: jest.fn(),
      putAbilityOnCooldown: jest.fn(),
      canUseAbility: jest.fn(),
      processAbilityCooldowns: jest.fn(),
      processStatusEffects: jest.fn(),
    } as any;
  }
});