/**
 * @fileoverview Tests for FinalScoresTable component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FinalScoresTable from '../../../../../client/src/pages/EndPage/components/FinalScoresTable';

// Mock CSS imports
jest.mock('../../../../../client/src/pages/EndPage/components/FinalScoresTable.css', () => ({}));

describe('FinalScoresTable', () => {
  const mockPlayers = [
    {
      id: 'player1',
      name: 'Alice',
      race: 'Human',
      class: 'Warrior',
      isWarlock: false,
      isAlive: true,
      stats: {
        timesDied: 0,
        kills: 2,
        totalDamageDealt: 150,
        totalHealingDone: 50,
        corruptionsPerformed: 0
      }
    },
    {
      id: 'player2',
      name: 'Bob',
      race: 'Orc',
      class: 'Wizard',
      isWarlock: true,
      isAlive: false,
      stats: {
        timesDied: 1,
        kills: 1,
        totalDamageDealt: 100,
        totalHealingDone: 0,
        corruptionsPerformed: 2
      }
    },
    {
      id: 'player3',
      name: 'Charlie',
      race: 'Elf',
      class: 'Priest',
      isWarlock: false,
      isAlive: true,
      stats: {
        timesDied: 0,
        kills: 0,
        totalDamageDealt: 25,
        totalHealingDone: 200,
        corruptionsPerformed: 0
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the final scores title', () => {
      render(<FinalScoresTable players={mockPlayers} />);

      expect(screen.getByText('FINAL SCORES')).toBeInTheDocument();
    });

    it('should render table headers', () => {
      render(<FinalScoresTable players={mockPlayers} />);

      expect(screen.getByText('PLAYER')).toBeInTheDocument();
      expect(screen.getByText('💀')).toBeInTheDocument(); // Deaths header
      expect(screen.getByText('⚔️')).toBeInTheDocument(); // Damage header
      expect(screen.getByText('❤️')).toBeInTheDocument(); // Healing header
      expect(screen.getByText('🟣')).toBeInTheDocument(); // Corruptions header
    });

    it('should render all players', () => {
      render(<FinalScoresTable players={mockPlayers} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('should render with empty players array', () => {
      render(<FinalScoresTable players={[]} />);

      expect(screen.getByText('FINAL SCORES')).toBeInTheDocument();
      expect(screen.getByText('PLAYER')).toBeInTheDocument();
    });
  });

  describe('Player Statistics', () => {
    it('should display player stats correctly', () => {
      render(<FinalScoresTable players={mockPlayers} />);

      const aliceRow = screen.getByText('Alice').closest('.player-row');
      expect(aliceRow).toHaveTextContent('0'); // Deaths
      expect(aliceRow).toHaveTextContent('150'); // Damage
      expect(aliceRow).toHaveTextContent('50'); // Healing
      expect(aliceRow).toHaveTextContent('0'); // Corruptions
    });

    it('should display 0 for missing stats', () => {
      const playerWithoutStats = [{
        id: 'player1',
        name: 'TestPlayer',
        isWarlock: false,
        isAlive: true
      }];

      render(<FinalScoresTable players={playerWithoutStats} />);

      const playerRow = screen.getByText('TestPlayer').closest('.player-row');
      const statCells = playerRow?.querySelectorAll('.player-stat');

      statCells?.forEach(cell => {
        expect(cell).toHaveTextContent('0');
      });
    });

    it('should handle partial stats', () => {
      const playerWithPartialStats = [{
        id: 'player1',
        name: 'TestPlayer',
        isWarlock: false,
        isAlive: true,
        stats: {
          kills: 5,
          totalDamageDealt: 100
          // Missing other stats
        }
      }];

      render(<FinalScoresTable players={playerWithPartialStats} />);

      const playerRow = screen.getByText('TestPlayer').closest('.player-row');
      expect(playerRow).toHaveTextContent('0'); // timesDied (missing)
      expect(playerRow).toHaveTextContent('100'); // totalDamageDealt
      expect(playerRow).toHaveTextContent('0'); // totalHealingDone (missing)
      expect(playerRow).toHaveTextContent('0'); // corruptionsPerformed (missing)
    });
  });

  describe('Player Sorting', () => {
    it('should sort alive players before dead players', () => {
      const players = [
        { id: '1', name: 'Dead', isWarlock: false, isAlive: false },
        { id: '2', name: 'Alive', isWarlock: false, isAlive: true }
      ];

      render(<FinalScoresTable players={players} />);

      const playerRows = screen.getAllByText(/^(Dead|Alive)$/).map(el =>
        el.closest('.player-row')
      );

      expect(playerRows[0]).toHaveTextContent('Alive');
      expect(playerRows[1]).toHaveTextContent('Dead');
    });

    it('should sort good players before warlocks within same alive status', () => {
      const players = [
        { id: '1', name: 'Warlock', isWarlock: true, isAlive: true },
        { id: '2', name: 'Player', isWarlock: false, isAlive: true }
      ];

      render(<FinalScoresTable players={players} />);

      const playerRows = screen.getAllByText(/^(Player|Warlock)$/).map(el =>
        el.closest('.player-row')
      );

      expect(playerRows[0]).toHaveTextContent('Player');
      expect(playerRows[1]).toHaveTextContent('Warlock');
    });

    it('should sort alphabetically by name within same status groups', () => {
      const players = [
        { id: '1', name: 'Zoe', isWarlock: false, isAlive: true },
        { id: '2', name: 'Alice', isWarlock: false, isAlive: true },
        { id: '3', name: 'Bob', isWarlock: false, isAlive: true }
      ];

      render(<FinalScoresTable players={players} />);

      const playerNames = screen.getAllByText(/^(Alice|Bob|Zoe)$/).map(el =>
        el.textContent
      );

      expect(playerNames).toEqual(['Alice', 'Bob', 'Zoe']);
    });

    it('should handle complex sorting correctly', () => {
      const players = [
        { id: '1', name: 'Dead Warlock', isWarlock: true, isAlive: false },
        { id: '2', name: 'Alive Warlock', isWarlock: true, isAlive: true },
        { id: '3', name: 'Dead Player', isWarlock: false, isAlive: false },
        { id: '4', name: 'Alive Player', isWarlock: false, isAlive: true }
      ];

      render(<FinalScoresTable players={players} />);

      const playerNames = screen.getAllByText(/^(Dead|Alive)/).map(el =>
        el.textContent
      );

      expect(playerNames).toEqual([
        'Alive Player',    // Alive good player first
        'Alive Warlock',   // Then alive warlock
        'Dead Player',     // Then dead good player
        'Dead Warlock'     // Finally dead warlock
      ]);
    });
  });

  describe('Player Row Styling', () => {
    it('should apply correct CSS classes for good players', () => {
      const goodPlayer = [{
        id: '1',
        name: 'GoodPlayer',
        isWarlock: false,
        isAlive: true
      }];

      render(<FinalScoresTable players={goodPlayer} />);

      const playerRow = screen.getByText('GoodPlayer').closest('.player-row');
      expect(playerRow).toHaveClass('player-row');
      expect(playerRow).toHaveClass('player-row-good');
      expect(playerRow).not.toHaveClass('warlock-row');
      expect(playerRow).not.toHaveClass('dead-row');
    });

    it('should apply correct CSS classes for warlocks', () => {
      const warlock = [{
        id: '1',
        name: 'Warlock',
        isWarlock: true,
        isAlive: true
      }];

      render(<FinalScoresTable players={warlock} />);

      const playerRow = screen.getByText('Warlock').closest('.player-row');
      expect(playerRow).toHaveClass('player-row');
      expect(playerRow).toHaveClass('warlock-row');
      expect(playerRow).not.toHaveClass('player-row-good');
      expect(playerRow).not.toHaveClass('dead-row');
    });

    it('should apply dead-row class for dead players', () => {
      const deadPlayer = [{
        id: '1',
        name: 'DeadPlayer',
        isWarlock: false,
        isAlive: false
      }];

      render(<FinalScoresTable players={deadPlayer} />);

      const playerRow = screen.getByText('DeadPlayer').closest('.player-row');
      expect(playerRow).toHaveClass('player-row');
      expect(playerRow).toHaveClass('player-row-good');
      expect(playerRow).toHaveClass('dead-row');
    });

    it('should show death indicator for dead players', () => {
      const deadPlayer = [{
        id: '1',
        name: 'DeadPlayer',
        isWarlock: false,
        isAlive: false
      }];

      render(<FinalScoresTable players={deadPlayer} />);

      expect(screen.getByText('🪦')).toBeInTheDocument();
    });

    it('should not show death indicator for alive players', () => {
      const alivePlayer = [{
        id: '1',
        name: 'AlivePlayer',
        isWarlock: false,
        isAlive: true
      }];

      render(<FinalScoresTable players={alivePlayer} />);

      expect(screen.queryByText('🪦')).not.toBeInTheDocument();
    });
  });

  describe('Class Icons', () => {
    it('should render class icon image for known classes', () => {
      const playerWithClass = [{
        id: '1',
        name: 'Player',
        class: 'Warrior',
        isWarlock: false,
        isAlive: true
      }];

      render(<FinalScoresTable players={playerWithClass} />);

      const classIcon = screen.getByAltText('Warrior');
      expect(classIcon).toBeInTheDocument();
      expect(classIcon).toHaveAttribute('src', '/images/classes/warrior.png');
    });

    it('should show fallback emoji when class is unknown', () => {
      const playerWithoutClass = [{
        id: '1',
        name: 'Player',
        isWarlock: false,
        isAlive: true
      }];

      render(<FinalScoresTable players={playerWithoutClass} />);

      expect(screen.getByText('⚔️')).toBeInTheDocument();
    });

    it('should handle image loading error gracefully', () => {
      const playerWithClass = [{
        id: '1',
        name: 'Player',
        class: 'Warrior',
        isWarlock: false,
        isAlive: true
      }];

      render(<FinalScoresTable players={playerWithClass} />);

      const classIcon = screen.getByAltText('Warrior');

      // Simulate image loading error
      fireEvent.error(classIcon);

      // Image should be hidden and fallback emoji should be shown
      expect(classIcon.style.display).toBe('none');
    });

    it('should use lowercase class name for image path', () => {
      const playerWithClass = [{
        id: '1',
        name: 'Player',
        class: 'PyroMancer', // Mixed case
        isWarlock: false,
        isAlive: true
      }];

      render(<FinalScoresTable players={playerWithClass} />);

      const classIcon = screen.getByAltText('PyroMancer');
      expect(classIcon).toHaveAttribute('src', '/images/classes/pyromancer.png');
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined players array gracefully', () => {
      expect(() => render(<FinalScoresTable players={undefined as any} />)).not.toThrow();
    });

    it('should handle null players array gracefully', () => {
      expect(() => render(<FinalScoresTable players={null as any} />)).not.toThrow();
    });

    it('should handle players with missing required properties', () => {
      const malformedPlayers = [
        { id: '1' }, // Missing name, isWarlock, isAlive
        { name: 'Test' }, // Missing id, isWarlock, isAlive
      ] as any[];

      expect(() => render(<FinalScoresTable players={malformedPlayers} />)).not.toThrow();
    });
  });
});
