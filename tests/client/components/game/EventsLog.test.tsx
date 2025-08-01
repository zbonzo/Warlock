/**
 * @fileoverview Tests for EventsLog.tsx
 * Tests the enhanced EventsLog component with personalized messages
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventsLog from '../../../../client/src/components/game/EventsLog/EventsLog';

// Mock CSS
jest.mock('../../../../client/src/components/game/EventsLog/EventsLog.css', () => ({}));

// Mock ThemeContext
const mockUseTheme = jest.fn();
jest.mock('@contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme()
}));

interface GameEvent {
  type: string;
  targetId?: string;
  targetName?: string;
  attackerId?: string;
  attackerName?: string;
  damage?: number | { final?: number; initial?: number; reduction?: number };
  amount?: number;
  armor?: number;
  turns?: number;
  abilityName?: string;
  message?: string;
  attackerMessage?: string;
  privateMessage?: string;
  public?: boolean;
  visibleTo?: string[];
}

interface Player {
  id: string;
  name: string;
}

describe('EventsLog', () => {
  const mockPlayers: Player[] = [
    { id: 'player1', name: 'Alice' },
    { id: 'player2', name: 'Bob' },
    { id: 'player3', name: 'Charlie' }
  ];

  const defaultProps = {
    events: [] as (GameEvent | string)[],
    currentPlayerId: 'player1',
    players: mockPlayers
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue('light');
    
    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with title', () => {
      render(<EventsLog {...defaultProps} />);
      
      expect(screen.getByText('Battle Log')).toBeInTheDocument();
    });

    it('should show empty message when no events', () => {
      render(<EventsLog {...defaultProps} />);
      
      expect(screen.getByText('No events yet')).toBeInTheDocument();
    });

    it('should render events container', () => {
      const { container } = render(<EventsLog {...defaultProps} />);
      
      expect(container.querySelector('.events-log-container')).toBeInTheDocument();
      expect(container.querySelector('.events-log-content')).toBeInTheDocument();
    });
  });

  describe('String Events (Legacy)', () => {
    it('should render legacy string events', () => {
      const events = ['Player attacks monster', 'Monster takes damage'];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('Player attacks monster')).toBeInTheDocument();
      expect(screen.getByText('Monster takes damage')).toBeInTheDocument();
    });

    it('should apply correct CSS classes to string events', () => {
      const events = ['Alice attacked the monster', 'Bob healed Charlie'];
      const { container } = render(<EventsLog {...defaultProps} events={events} />);
      
      const attackEvent = container.querySelector('.attack-event');
      const healEvent = container.querySelector('.heal-event');
      
      expect(attackEvent).toBeInTheDocument();
      expect(healEvent).toBeInTheDocument();
    });

    it('should apply alternating even/odd classes', () => {
      const events = ['Event 1', 'Event 2', 'Event 3'];
      const { container } = render(<EventsLog {...defaultProps} events={events} />);
      
      const entries = container.querySelectorAll('.events-log-entry');
      expect(entries[0]).toHaveClass('even');
      expect(entries[1]).toHaveClass('odd');
      expect(entries[2]).toHaveClass('even');
    });
  });

  describe('GameEvent Objects', () => {
    it('should render basic game events', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: 'Alice deals 10 damage to Bob',
        public: true
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('Alice deals 10 damage to Bob')).toBeInTheDocument();
    });

    it('should process template variables in messages', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: '{attackerName} deals {damage} damage to {targetName}',
        attackerId: 'player2',
        targetId: 'player3',
        damage: 15,
        public: true
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('Bob deals 15 damage to Charlie')).toBeInTheDocument();
    });

    it('should handle monster targets correctly', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: '{attackerName} attacks {targetName}',
        attackerId: 'player1',
        targetId: '__monster__',
        public: true
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('Alice attacks the Monster')).toBeInTheDocument();
    });

    it('should handle complex damage objects', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: '{attackerName} deals {damage} damage (reduced from {initialDamage})',
        attackerId: 'player1',
        targetId: 'player2',
        damage: { final: 8, initial: 12, reduction: 4 },
        public: true
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('Alice deals 8 damage (reduced from 12)')).toBeInTheDocument();
    });
  });

  describe('Personalized Messages', () => {
    it('should show attacker message when current player is attacker', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: 'Someone attacks someone',
        attackerMessage: 'You attack Bob for 10 damage',
        privateMessage: 'Alice attacks you for 10 damage',
        attackerId: 'player1',
        targetId: 'player2',
        public: true
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('You attack Bob for 10 damage')).toBeInTheDocument();
    });

    it('should show private message when current player is target', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: 'Someone attacks someone',
        attackerMessage: 'You attack Bob for 10 damage',
        privateMessage: 'Alice attacks you for 10 damage',
        attackerId: 'player2',
        targetId: 'player1',
        public: true
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('Alice attacks you for 10 damage')).toBeInTheDocument();
    });

    it('should show public message when current player is observer', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: 'Bob attacks Charlie',
        attackerMessage: 'You attack Charlie for 10 damage',
        privateMessage: 'Bob attacks you for 10 damage',
        attackerId: 'player2',
        targetId: 'player3',
        public: true
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('Bob attacks Charlie')).toBeInTheDocument();
    });
  });

  describe('Event Visibility', () => {
    it('should show public events to all players', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: 'Public event',
        public: true
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('Public event')).toBeInTheDocument();
    });

    it('should show private events to involved players', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: 'Private event',
        attackerId: 'player1',
        targetId: 'player2',
        public: false
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('Private event')).toBeInTheDocument();
    });

    it('should hide private events from uninvolved players', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: 'Private event',
        attackerId: 'player2',
        targetId: 'player3',
        public: false
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.queryByText('Private event')).not.toBeInTheDocument();
    });

    it('should show events to players in visibleTo list', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: 'Special private event',
        visibleTo: ['player1', 'player3'],
        public: false
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('Special private event')).toBeInTheDocument();
    });

    it('should hide events from players not in visibleTo list', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: 'Special private event',
        visibleTo: ['player2', 'player3'],
        public: false
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.queryByText('Special private event')).not.toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('should apply correct event type classes', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: 'Damage event',
        public: true
      }];
      
      const { container } = render(<EventsLog {...defaultProps} events={events} />);
      
      expect(container.querySelector('.event-damage')).toBeInTheDocument();
    });

    it('should apply perspective classes for attacker', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: 'Attack event',
        attackerId: 'player1',
        targetId: 'player2',
        public: true
      }];
      
      const { container } = render(<EventsLog {...defaultProps} events={events} />);
      
      expect(container.querySelector('.event-you-acted')).toBeInTheDocument();
    });

    it('should apply perspective classes for target', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: 'Target event',
        attackerId: 'player2',
        targetId: 'player1',
        public: true
      }];
      
      const { container } = render(<EventsLog {...defaultProps} events={events} />);
      
      expect(container.querySelector('.event-you-target')).toBeInTheDocument();
    });

    it('should apply observer class for uninvolved player', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: 'Observer event',
        attackerId: 'player2',
        targetId: 'player3',
        public: true
      }];
      
      const { container } = render(<EventsLog {...defaultProps} events={events} />);
      
      expect(container.querySelector('.event-observer')).toBeInTheDocument();
    });

    const eventClassTests = [
      { message: 'Warlock event', expectedClass: 'warlock-event' },
      { message: 'Player attacked monster', expectedClass: 'attack-event' },
      { message: 'Player healed ally', expectedClass: 'heal-event' },
      { message: 'Player shielded ally', expectedClass: 'defense-event' },
      { message: 'Monster attacks', expectedClass: 'monster-event' },
      { message: 'Player died', expectedClass: 'death-event' },
      { message: 'Player corrupted', expectedClass: 'corruption-event' },
      { message: 'Player resurrected', expectedClass: 'resurrect-event' },
      { message: 'Player wandered into the forest', expectedClass: 'disconnect-event' }
    ];

    eventClassTests.forEach(({ message, expectedClass }) => {
      it(`should apply ${expectedClass} for message: "${message}"`, () => {
        const events: GameEvent[] = [{
          type: 'generic',
          message,
          public: true
        }];
        
        const { container } = render(<EventsLog {...defaultProps} events={events} />);
        
        expect(container.querySelector(`.${expectedClass}`)).toBeInTheDocument();
      });
    });
  });

  describe('Template Processing', () => {
    it('should handle missing players list gracefully', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: '{attackerName} attacks {targetName}',
        attackerId: 'player1',
        targetId: 'player2',
        public: true
      }];
      
      render(<EventsLog {...defaultProps} players={[]} events={events} />);
      
      expect(screen.getByText('a player attacks another player')).toBeInTheDocument();
    });

    it('should handle unknown player IDs', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: '{attackerName} attacks {targetName}',
        attackerId: 'unknown1',
        targetId: 'unknown2',
        public: true
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('a player attacks another player')).toBeInTheDocument();
    });

    it('should preserve unmatched template variables', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: '{attackerName} uses {unknownVariable}',
        attackerId: 'player1',
        public: true
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('Alice uses {unknownVariable}')).toBeInTheDocument();
    });

    it('should handle multiple instances of same variable', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: '{attackerName} and {attackerName} attack',
        attackerId: 'player1',
        public: true
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('Alice and Alice attack')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should not render empty messages', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        message: '',
        public: true
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('No events yet')).toBeInTheDocument();
    });

    it('should handle null/undefined events', () => {
      const events = [null, undefined, 'Valid event'] as any[];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('Valid event')).toBeInTheDocument();
    });

    it('should handle events without message', () => {
      const events: GameEvent[] = [{
        type: 'damage',
        public: true
      }];
      
      render(<EventsLog {...defaultProps} events={events} />);
      
      expect(screen.getByText('No events yet')).toBeInTheDocument();
    });

    it('should handle undefined props gracefully', () => {
      const props = {
        events: undefined,
        currentPlayerId: '',
        players: undefined
      } as any;
      
      expect(() => render(<EventsLog {...props} />)).not.toThrow();
    });
  });

  describe('Auto-scrolling', () => {
    it('should scroll to bottom when events are added', () => {
      const mockScrollTo = jest.fn();
      
      // Mock the ref and scrollTop/scrollHeight
      const mockRef = {
        current: {
          scrollTop: 0,
          scrollHeight: 1000,
          set scrollTop(value: number) {
            mockScrollTo(value);
          }
        }
      };
      
      jest.spyOn(React, 'useRef').mockReturnValue(mockRef);
      
      const { rerender } = render(<EventsLog {...defaultProps} events={['Event 1']} />);
      
      rerender(<EventsLog {...defaultProps} events={['Event 1', 'Event 2']} />);
      
      expect(mockScrollTo).toHaveBeenCalledWith(1000);
    });
  });
});