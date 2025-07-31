/**
 * @fileoverview Tests for game type definitions
 * These tests verify type constraints and interfaces work as expected
 */
import {
  AbilityParams,
  Ability,
  StatusEffectData,
  StatusEffects,
  Player,
  Monster,
  GameState,
  GameEvent,
  SocketEmitEvents,
  SocketListenEvents
} from '../../../client/src/types/game';

describe('Game Types', () => {
  describe('AbilityParams', () => {
    it('should allow all optional properties', () => {
      const params: AbilityParams = {};
      expect(params).toBeDefined();
    });

    it('should allow numeric properties', () => {
      const params: AbilityParams = {
        damage: 50,
        hitChance: 0.8,
        duration: 3,
        armor: 10
      };
      expect(params.damage).toBe(50);
      expect(params.hitChance).toBe(0.8);
    });

    it('should allow complex nested properties', () => {
      const params: AbilityParams = {
        poison: {
          damage: 10,
          turns: 3
        },
        vulnerable: {
          damageIncrease: 1.5,
          turns: 2
        },
        effectEnds: {
          selfDamagePercent: 0.1
        }
      };
      expect(params.poison?.damage).toBe(10);
      expect(params.vulnerable?.damageIncrease).toBe(1.5);
    });
  });

  describe('Ability', () => {
    it('should require core properties', () => {
      const ability: Ability = {
        type: 'fireball',
        name: 'Fireball',
        category: 'Attack'
      };
      expect(ability.type).toBe('fireball');
      expect(ability.name).toBe('Fireball');
      expect(ability.category).toBe('Attack');
    });

    it('should accept all category types', () => {
      const categories: Ability['category'][] = ['Attack', 'Defense', 'Heal', 'Special', 'Racial'];
      
      categories.forEach(category => {
        const ability: Ability = {
          type: 'test',
          name: 'Test',
          category
        };
        expect(ability.category).toBe(category);
      });
    });

    it('should accept all target types', () => {
      const targets: Ability['target'][] = ['Single', 'Multi', 'Self'];
      
      targets.forEach(target => {
        const ability: Ability = {
          type: 'test',
          name: 'Test',
          category: 'Attack',
          target
        };
        expect(ability.target).toBe(target);
      });
    });

    it('should allow optional properties', () => {
      const ability: Ability = {
        type: 'heal',
        name: 'Heal',
        category: 'Heal',
        effect: 'shielded',
        target: 'Self',
        description: 'Heals the caster',
        flavorText: 'A warm glow surrounds you',
        params: { amount: 25 },
        usageLimit: 'perRound',
        cooldown: 2
      };
      expect(ability.description).toBe('Heals the caster');
      expect(ability.params?.amount).toBe(25);
    });
  });

  describe('StatusEffects', () => {
    it('should allow all defined status effects', () => {
      const effects: StatusEffects = {
        poison: { turns: 3, damage: 5 },
        shielded: { turns: 2, armor: 10 },
        invisible: { turns: 1 },
        stunned: { turns: 1 },
        weakened: { turns: 2 },
        vulnerable: { turns: 3 }
      };
      expect(effects.poison?.damage).toBe(5);
      expect(effects.shielded?.armor).toBe(10);
    });

    it('should allow custom status effects with string indexer', () => {
      const effects: StatusEffects = {
        customEffect: { turns: 2, customProp: 'value' }
      };
      expect(effects.customEffect?.turns).toBe(2);
    });
  });

  describe('Player', () => {
    it('should require core properties', () => {
      const player: Player = {
        id: 'player1',
        name: 'John',
        hp: 100,
        maxHp: 100,
        armor: 0,
        isAlive: true,
        isWarlock: false
      };
      expect(player.id).toBe('player1');
      expect(player.name).toBe('John');
      expect(player.hp).toBe(100);
    });

    it('should allow optional properties', () => {
      const player: Player = {
        id: 'player1',
        name: 'John',
        race: 'human',
        class: 'warrior',
        hp: 80,
        maxHp: 100,
        armor: 5,
        isAlive: true,
        isWarlock: false,
        statusEffects: {
          poison: { turns: 2, damage: 3 }
        },
        damageMod: 1.2,
        racialAbility: {
          type: 'adaptability',
          name: 'Adaptability',
          category: 'Racial'
        },
        racialUsesLeft: 1,
        racialCooldown: 0,
        abilityCooldowns: { fireball: 2 }
      };
      expect(player.race).toBe('human');
      expect(player.statusEffects?.poison?.damage).toBe(3);
      expect(player.abilityCooldowns?.fireball).toBe(2);
    });
  });

  describe('Monster', () => {
    it('should require core properties', () => {
      const monster: Monster = {
        hp: 200,
        maxHp: 200,
        nextDamage: 25
      };
      expect(monster.hp).toBe(200);
      expect(monster.nextDamage).toBe(25);
    });

    it('should allow optional properties', () => {
      const monster: Monster = {
        hp: 150,
        maxHp: 200,
        nextDamage: 30,
        name: 'Dragon',
        type: 'fire'
      };
      expect(monster.name).toBe('Dragon');
      expect(monster.type).toBe('fire');
    });
  });

  describe('GameState', () => {
    it('should require all core properties', () => {
      const players: Player[] = [{
        id: 'p1',
        name: 'Player 1',
        hp: 100,
        maxHp: 100,
        armor: 0,
        isAlive: true,
        isWarlock: false
      }];

      const gameState: GameState = {
        round: 1,
        phase: 'action',
        players,
        monster: { hp: 100, maxHp: 100, nextDamage: 20 },
        alivePlayers: players,
        deadPlayers: []
      };
      expect(gameState.round).toBe(1);
      expect(gameState.phase).toBe('action');
    });

    it('should accept all phase types', () => {
      const phases: GameState['phase'][] = ['action', 'results', 'end'];
      
      phases.forEach(phase => {
        const gameState: Partial<GameState> = { phase };
        expect(gameState.phase).toBe(phase);
      });
    });

    it('should accept all winner types', () => {
      const winners: GameState['winner'][] = ['villagers', 'warlocks', 'monster'];
      
      winners.forEach(winner => {
        const gameState: Partial<GameState> = { winner };
        expect(gameState.winner).toBe(winner);
      });
    });
  });

  describe('GameEvent', () => {
    it('should require only type property', () => {
      const event: GameEvent = {
        type: 'playerAction'
      };
      expect(event.type).toBe('playerAction');
    });

    it('should allow all optional properties', () => {
      const event: GameEvent = {
        type: 'damage',
        timestamp: new Date(),
        playerId: 'p1',
        targetId: 'p2',
        attackerId: 'p1',
        damage: { final: 20, initial: 25, reduction: 5 },
        healing: 0,
        amount: 25,
        armor: 5,
        turns: 2,
        abilityName: 'fireball',
        message: 'Player deals damage',
        privateMessage: 'Secret message',
        attackerMessage: 'You cast fireball',
        public: true,
        visibleTo: ['p1', 'p2'],
        customProp: 'custom value'
      };
      expect(event.damage).toEqual({ final: 20, initial: 25, reduction: 5 });
      expect(event.customProp).toBe('custom value');
    });

    it('should allow damage as number or complex object', () => {
      const simpleEvent: GameEvent = {
        type: 'damage',
        damage: 25
      };
      
      const complexEvent: GameEvent = {
        type: 'damage',
        damage: { final: 20, initial: 25, reduction: 5 }
      };
      
      expect(simpleEvent.damage).toBe(25);
      expect(complexEvent.damage).toEqual({ final: 20, initial: 25, reduction: 5 });
    });
  });

  describe('Socket Event Types', () => {
    it('should define emit event signatures', () => {
      // These tests verify the function signatures compile correctly
      const emitEvents: SocketEmitEvents = {
        selectAbility: (abilityType: string, targetId?: string) => {},
        joinGame: (playerName: string, gameCode: string) => {},
        startGame: () => {},
        leaveGame: () => {},
        reconnect: (playerId: string, gameCode: string) => {}
      };
      
      expect(typeof emitEvents.selectAbility).toBe('function');
      expect(typeof emitEvents.joinGame).toBe('function');
    });

    it('should define listen event signatures', () => {
      const mockGameState: GameState = {
        round: 1,
        phase: 'action',
        players: [],
        monster: { hp: 100, maxHp: 100, nextDamage: 20 },
        alivePlayers: [],
        deadPlayers: []
      };

      const mockPlayer: Player = {
        id: 'p1',
        name: 'Player',
        hp: 100,
        maxHp: 100,
        armor: 0,
        isAlive: true,
        isWarlock: false
      };

      const listenEvents: SocketListenEvents = {
        gameUpdate: (gameState: GameState) => {},
        playerJoined: (player: Player) => {},
        playerLeft: (playerId: string) => {},
        gameStarted: () => {},
        gameEnded: (winner: string) => {},
        error: (message: string) => {},
        actionResult: (result: any) => {},
        phaseChange: (phase: string) => {}
      };
      
      expect(typeof listenEvents.gameUpdate).toBe('function');
      expect(typeof listenEvents.playerJoined).toBe('function');
    });
  });
});