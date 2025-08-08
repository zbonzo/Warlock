/**
 * @fileoverview Tests for AbilityList.tsx
 * Test suite for the AbilityList component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AbilityList from '../../../../../../client/src/components/modals/AdaptabilityModal/components/AbilityList';
import type { Ability } from '../../../../../../shared/types';

// Mock CSS
jest.mock('../../../../../../client/src/components/modals/AdaptabilityModal/components/AbilityList.css', () => ({}));

// Mock ThemeContext
const mockUseTheme = jest.fn();
jest.mock('../../../../../../client/src/contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme()
}));

// Mock AbilityCard component
jest.mock('../../../../../../client/src/components/modals/AdaptabilityModal/components/AbilityCard', () => {
  return function MockAbilityCard({ ability, onSelect }: { ability: Ability; onSelect: () => void }) {
    return (
      <div
        data-testid={`ability-card-${ability.type}`}
        onClick={onSelect}
      >
        {ability.name}
      </div>
    );
  };
});

describe('AbilityList', () => {
  const mockAbilities: Record<string, Ability[]> = {
    '1': [
      {
        type: 'attack',
        name: 'Slash',
        category: 'Attack',
        unlockAt: 1
      },
      {
        type: 'heal',
        name: 'Minor Heal',
        category: 'Heal',
        unlockAt: 1
      }
    ],
    '2': [
      {
        type: 'shield',
        name: 'Shield Wall',
        category: 'Defense',
        unlockAt: 2
      }
    ],
    '3': [
      {
        type: 'fireball',
        name: 'Fireball',
        category: 'Attack',
        unlockAt: 3
      }
    ]
  };

  const defaultProps = {
    abilityOptions: mockAbilities,
    onAbilitySelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      isDarkMode: false,
      toggleTheme: jest.fn()
    });
  });

  describe('Basic Rendering', () => {
    it('should render all ability levels', () => {
      render(<AbilityList {...defaultProps} />);

      expect(screen.getByText('Level 1 Abilities')).toBeInTheDocument();
      expect(screen.getByText('Level 2 Abilities')).toBeInTheDocument();
      expect(screen.getByText('Level 3 Abilities')).toBeInTheDocument();
    });

    it('should render all abilities from all levels', () => {
      render(<AbilityList {...defaultProps} />);

      expect(screen.getByText('Slash')).toBeInTheDocument();
      expect(screen.getByText('Minor Heal')).toBeInTheDocument();
      expect(screen.getByText('Shield Wall')).toBeInTheDocument();
      expect(screen.getByText('Fireball')).toBeInTheDocument();
    });

    it('should render ability cards with correct props', () => {
      render(<AbilityList {...defaultProps} />);

      expect(screen.getByTestId('ability-card-attack')).toBeInTheDocument();
      expect(screen.getByTestId('ability-card-heal')).toBeInTheDocument();
      expect(screen.getByTestId('ability-card-shield')).toBeInTheDocument();
      expect(screen.getByTestId('ability-card-fireball')).toBeInTheDocument();
    });

    it('should group abilities correctly by level', () => {
      const { container } = render(<AbilityList {...defaultProps} />);

      const levelGroups = container.querySelectorAll('.ability-level-group');
      expect(levelGroups).toHaveLength(3);

      // Check that each level group has the correct number of abilities
      const level1Cards = levelGroups[0].querySelectorAll('[data-testid^="ability-card-"]');
      const level2Cards = levelGroups[1].querySelectorAll('[data-testid^="ability-card-"]');
      const level3Cards = levelGroups[2].querySelectorAll('[data-testid^="ability-card-"]');

      expect(level1Cards).toHaveLength(2);
      expect(level2Cards).toHaveLength(1);
      expect(level3Cards).toHaveLength(1);
    });
  });

  describe('Hide Level Functionality', () => {
    it('should hide level titles when hideLevel is true', () => {
      render(<AbilityList {...defaultProps} hideLevel={true} />);

      expect(screen.queryByText('Level 1 Abilities')).not.toBeInTheDocument();
      expect(screen.queryByText('Level 2 Abilities')).not.toBeInTheDocument();
      expect(screen.queryByText('Level 3 Abilities')).not.toBeInTheDocument();
    });

    it('should still render abilities when hideLevel is true', () => {
      render(<AbilityList {...defaultProps} hideLevel={true} />);

      expect(screen.getByText('Slash')).toBeInTheDocument();
      expect(screen.getByText('Minor Heal')).toBeInTheDocument();
      expect(screen.getByText('Shield Wall')).toBeInTheDocument();
      expect(screen.getByText('Fireball')).toBeInTheDocument();
    });

    it('should show level titles by default', () => {
      render(<AbilityList {...defaultProps} />);

      expect(screen.getByText('Level 1 Abilities')).toBeInTheDocument();
      expect(screen.getByText('Level 2 Abilities')).toBeInTheDocument();
      expect(screen.getByText('Level 3 Abilities')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onAbilitySelect when ability card is clicked', () => {
      const onAbilitySelect = jest.fn();
      render(<AbilityList {...defaultProps} onAbilitySelect={onAbilitySelect} />);

      fireEvent.click(screen.getByText('Slash'));

      expect(onAbilitySelect).toHaveBeenCalledTimes(1);
      expect(onAbilitySelect).toHaveBeenCalledWith(mockAbilities['1'][0]);
    });

    it('should call onAbilitySelect with correct ability data', () => {
      const onAbilitySelect = jest.fn();
      render(<AbilityList {...defaultProps} onAbilitySelect={onAbilitySelect} />);

      fireEvent.click(screen.getByText('Fireball'));

      expect(onAbilitySelect).toHaveBeenCalledWith(mockAbilities['3'][0]);
    });

    it('should handle multiple ability selections', () => {
      const onAbilitySelect = jest.fn();
      render(<AbilityList {...defaultProps} onAbilitySelect={onAbilitySelect} />);

      fireEvent.click(screen.getByText('Slash'));
      fireEvent.click(screen.getByText('Shield Wall'));

      expect(onAbilitySelect).toHaveBeenCalledTimes(2);
      expect(onAbilitySelect).toHaveBeenNthCalledWith(1, mockAbilities['1'][0]);
      expect(onAbilitySelect).toHaveBeenNthCalledWith(2, mockAbilities['2'][0]);
    });
  });

  describe('Empty Data Handling', () => {
    it('should handle empty ability options', () => {
      render(<AbilityList abilityOptions={{}} onAbilitySelect={jest.fn()} />);

      // Should render without errors but show no content
      expect(screen.queryByText(/Level \d+ Abilities/)).not.toBeInTheDocument();
    });

    it('should handle levels with empty ability arrays', () => {
      const emptyLevelAbilities = {
        '1': [],
        '2': [mockAbilities['2'][0]]
      };

      render(
        <AbilityList
          abilityOptions={emptyLevelAbilities}
          onAbilitySelect={jest.fn()}
        />
      );

      expect(screen.getByText('Level 1 Abilities')).toBeInTheDocument();
      expect(screen.getByText('Level 2 Abilities')).toBeInTheDocument();
      expect(screen.getByText('Shield Wall')).toBeInTheDocument();

      // Level 1 should have no ability cards
      const { container } = render(
        <AbilityList
          abilityOptions={emptyLevelAbilities}
          onAbilitySelect={jest.fn()}
        />
      );
      const levelGroups = container.querySelectorAll('.ability-level-group');
      const level1Cards = levelGroups[0].querySelectorAll('[data-testid^="ability-card-"]');
      expect(level1Cards).toHaveLength(0);
    });
  });

  describe('Data Structure Variations', () => {
    it('should handle single ability per level', () => {
      const singleAbilityPerLevel = {
        '1': [mockAbilities['1'][0]],
        '2': [mockAbilities['2'][0]]
      };

      render(
        <AbilityList
          abilityOptions={singleAbilityPerLevel}
          onAbilitySelect={jest.fn()}
        />
      );

      expect(screen.getByText('Slash')).toBeInTheDocument();
      expect(screen.getByText('Shield Wall')).toBeInTheDocument();
    });

    it('should handle non-sequential level numbers', () => {
      const nonSequentialLevels = {
        '1': [mockAbilities['1'][0]],
        '5': [mockAbilities['2'][0]],
        '10': [mockAbilities['3'][0]]
      };

      render(
        <AbilityList
          abilityOptions={nonSequentialLevels}
          onAbilitySelect={jest.fn()}
        />
      );

      expect(screen.getByText('Level 1 Abilities')).toBeInTheDocument();
      expect(screen.getByText('Level 5 Abilities')).toBeInTheDocument();
      expect(screen.getByText('Level 10 Abilities')).toBeInTheDocument();
    });

    it('should handle string level keys correctly', () => {
      const stringLevels = {
        'beginner': [mockAbilities['1'][0]],
        'advanced': [mockAbilities['2'][0]]
      };

      render(
        <AbilityList
          abilityOptions={stringLevels}
          onAbilitySelect={jest.fn()}
        />
      );

      expect(screen.getByText('Level beginner Abilities')).toBeInTheDocument();
      expect(screen.getByText('Level advanced Abilities')).toBeInTheDocument();
    });
  });

  describe('CSS Structure', () => {
    it('should have correct CSS class structure', () => {
      const { container } = render(<AbilityList {...defaultProps} />);

      expect(container.querySelector('.ability-list')).toBeInTheDocument();
      expect(container.querySelectorAll('.ability-level-group')).toHaveLength(3);
      expect(container.querySelectorAll('.level-title')).toHaveLength(3);
      expect(container.querySelectorAll('.ability-cards')).toHaveLength(3);
    });

    it('should not render level titles when hideLevel is true', () => {
      const { container } = render(<AbilityList {...defaultProps} hideLevel={true} />);

      expect(container.querySelectorAll('.level-title')).toHaveLength(0);
    });
  });

  describe('Theme Integration', () => {
    it('should work with dark theme', () => {
      mockUseTheme.mockReturnValue({
        isDarkMode: true,
        toggleTheme: jest.fn()
      });

      render(<AbilityList {...defaultProps} />);

      expect(screen.getByText('Level 1 Abilities')).toBeInTheDocument();
      expect(screen.getByText('Slash')).toBeInTheDocument();
    });

    it('should work with light theme', () => {
      mockUseTheme.mockReturnValue({
        isDarkMode: false,
        toggleTheme: jest.fn()
      });

      render(<AbilityList {...defaultProps} />);

      expect(screen.getByText('Level 1 Abilities')).toBeInTheDocument();
      expect(screen.getByText('Slash')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle abilities with missing properties', () => {
      const incompleteAbilities = {
        '1': [
          {
            type: 'incomplete',
            name: 'Incomplete Ability',
            // Missing category and unlockAt
          } as Ability
        ]
      };

      render(
        <AbilityList
          abilityOptions={incompleteAbilities}
          onAbilitySelect={jest.fn()}
        />
      );

      expect(screen.getByText('Incomplete Ability')).toBeInTheDocument();
    });

    it('should handle abilities with null or undefined names', () => {
      const nullNameAbilities = {
        '1': [
          {
            type: 'null-name',
            name: null as any,
            category: 'Attack',
            unlockAt: 1
          }
        ]
      };

      expect(() => {
        render(
          <AbilityList
            abilityOptions={nullNameAbilities}
            onAbilitySelect={jest.fn()}
          />
        );
      }).not.toThrow();
    });
  });
});
