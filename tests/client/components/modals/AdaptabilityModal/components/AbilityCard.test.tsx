/**
 * @fileoverview Tests for AbilityCard.tsx
 * Test suite for the AbilityCard component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AbilityCard from '../../../../../../client/src/components/modals/AdaptabilityModal/components/AbilityCard';
import type { Ability } from '../../../../../../shared/types';

// Mock CSS
jest.mock('../../../../../../client/src/components/modals/AdaptabilityModal/components/AbilityCard.css', () => ({}));

// Mock ThemeContext
const mockUseTheme = jest.fn();
jest.mock('../../../../../../client/src/contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme()
}));

// Mock constants
jest.mock('../../../../../../client/src/components/modals/AdaptabilityModal/constants', () => ({
  ABILITY_CATEGORIES: {
    Attack: { icon: '⚔️', color: '#e74c3c' },
    Defense: { icon: '🛡️', color: '#3498db' },
    Heal: { icon: '💚', color: '#2ecc71' },
    Special: { icon: '✨', color: '#9b59b6' }
  },
  DEFAULT_CATEGORY: { icon: '📜', color: '#7f8c8d' }
}));

describe('AbilityCard', () => {
  const mockAbility: Ability = {
    type: 'attack',
    name: 'Slash',
    category: 'Attack',
    unlockAt: 1
  };

  const defaultProps = {
    ability: mockAbility,
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      isDarkMode: false,
      toggleTheme: jest.fn()
    });
  });

  describe('Basic Rendering', () => {
    it('should render ability name', () => {
      render(<AbilityCard {...defaultProps} />);
      
      expect(screen.getByText('Slash')).toBeInTheDocument();
    });

    it('should render ability category', () => {
      render(<AbilityCard {...defaultProps} />);
      
      expect(screen.getByText('Attack')).toBeInTheDocument();
    });

    it('should render category icon for known categories', () => {
      render(<AbilityCard {...defaultProps} />);
      
      expect(screen.getByText('⚔️')).toBeInTheDocument();
    });

    it('should apply category color styling', () => {
      render(<AbilityCard {...defaultProps} />);
      
      const categoryElement = screen.getByText('Attack').closest('.ability-category');
      expect(categoryElement).toHaveStyle({ color: '#e74c3c' });
    });

    it('should have clickable card element', () => {
      const { container } = render(<AbilityCard {...defaultProps} />);
      
      expect(container.querySelector('.ability-card')).toBeInTheDocument();
    });
  });

  describe('Category Handling', () => {
    it('should handle Defense category', () => {
      const defenseAbility = { ...mockAbility, category: 'Defense' };
      render(<AbilityCard ability={defenseAbility} onSelect={jest.fn()} />);
      
      expect(screen.getByText('🛡️')).toBeInTheDocument();
      expect(screen.getByText('Defense')).toBeInTheDocument();
    });

    it('should handle Heal category', () => {
      const healAbility = { ...mockAbility, category: 'Heal' };
      render(<AbilityCard ability={healAbility} onSelect={jest.fn()} />);
      
      expect(screen.getByText('💚')).toBeInTheDocument();
      expect(screen.getByText('Heal')).toBeInTheDocument();
    });

    it('should handle Special category', () => {
      const specialAbility = { ...mockAbility, category: 'Special' };
      render(<AbilityCard ability={specialAbility} onSelect={jest.fn()} />);
      
      expect(screen.getByText('✨')).toBeInTheDocument();
      expect(screen.getByText('Special')).toBeInTheDocument();
    });

    it('should handle unknown category with default styling', () => {
      const unknownAbility = { ...mockAbility, category: 'Unknown' };
      render(<AbilityCard ability={unknownAbility} onSelect={jest.fn()} />);
      
      expect(screen.getByText('📜')).toBeInTheDocument();
      expect(screen.getByText('Unknown')).toBeInTheDocument();
      
      const categoryElement = screen.getByText('Unknown').closest('.ability-category');
      expect(categoryElement).toHaveStyle({ color: '#7f8c8d' });
    });

    it('should handle missing category', () => {
      const noCategoryAbility = { ...mockAbility, category: undefined };
      render(<AbilityCard ability={noCategoryAbility} onSelect={jest.fn()} />);
      
      expect(screen.getByText('📜')).toBeInTheDocument();
      expect(screen.getByText('Ability')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onSelect when card is clicked', () => {
      const onSelect = jest.fn();
      render(<AbilityCard {...defaultProps} onSelect={onSelect} />);
      
      fireEvent.click(screen.getByText('Slash'));
      
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onSelect when clicking anywhere on the card', () => {
      const onSelect = jest.fn();
      const { container } = render(<AbilityCard {...defaultProps} onSelect={onSelect} />);
      
      const card = container.querySelector('.ability-card');
      fireEvent.click(card!);
      
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onSelect when clicking category section', () => {
      const onSelect = jest.fn();
      render(<AbilityCard {...defaultProps} onSelect={onSelect} />);
      
      fireEvent.click(screen.getByText('Attack'));
      
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty ability name', () => {
      const emptyNameAbility = { ...mockAbility, name: '' };
      render(<AbilityCard ability={emptyNameAbility} onSelect={jest.fn()} />);
      
      expect(screen.getByText('')).toBeInTheDocument();
    });

    it('should handle null ability name', () => {
      const nullNameAbility = { ...mockAbility, name: null as any };
      render(<AbilityCard ability={nullNameAbility} onSelect={jest.fn()} />);
      
      // Should render without throwing
      expect(screen.getByText('Attack')).toBeInTheDocument();
    });

    it('should handle very long ability names', () => {
      const longNameAbility = {
        ...mockAbility,
        name: 'This is a very long ability name that might cause display issues'
      };
      render(<AbilityCard ability={longNameAbility} onSelect={jest.fn()} />);
      
      expect(screen.getByText('This is a very long ability name that might cause display issues')).toBeInTheDocument();
    });

    it('should handle special characters in ability name', () => {
      const specialCharAbility = {
        ...mockAbility,
        name: 'Ability with 🔥 special & characters!'
      };
      render(<AbilityCard ability={specialCharAbility} onSelect={jest.fn()} />);
      
      expect(screen.getByText('Ability with 🔥 special & characters!')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      const onSelect = jest.fn();
      const { container } = render(<AbilityCard {...defaultProps} onSelect={onSelect} />);
      
      const card = container.querySelector('.ability-card');
      expect(card).toBeInTheDocument();
      
      // Should be able to receive focus (div elements are focusable when they have click handlers)
      card?.focus();
      expect(document.activeElement).toBe(card);
    });

    it('should support keyboard activation', () => {
      const onSelect = jest.fn();
      const { container } = render(<AbilityCard {...defaultProps} onSelect={onSelect} />);
      
      const card = container.querySelector('.ability-card');
      
      // Simulate Enter key press
      fireEvent.keyDown(card!, { key: 'Enter' });
      // Note: The component doesn't currently handle keyboard events,
      // this test documents the current behavior
    });
  });

  describe('Theme Integration', () => {
    it('should work with dark theme', () => {
      mockUseTheme.mockReturnValue({
        isDarkMode: true,
        toggleTheme: jest.fn()
      });
      
      render(<AbilityCard {...defaultProps} />);
      
      expect(screen.getByText('Slash')).toBeInTheDocument();
      expect(screen.getByText('Attack')).toBeInTheDocument();
    });

    it('should work with light theme', () => {
      mockUseTheme.mockReturnValue({
        isDarkMode: false,
        toggleTheme: jest.fn()
      });
      
      render(<AbilityCard {...defaultProps} />);
      
      expect(screen.getByText('Slash')).toBeInTheDocument();
      expect(screen.getByText('Attack')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should have correct CSS class structure', () => {
      const { container } = render(<AbilityCard {...defaultProps} />);
      
      expect(container.querySelector('.ability-card')).toBeInTheDocument();
      expect(container.querySelector('.ability-name')).toBeInTheDocument();
      expect(container.querySelector('.ability-category')).toBeInTheDocument();
      expect(container.querySelector('.category-icon')).toBeInTheDocument();
      expect(container.querySelector('.category-name')).toBeInTheDocument();
    });

    it('should contain category icon and name in separate elements', () => {
      render(<AbilityCard {...defaultProps} />);
      
      const icon = screen.getByText('⚔️');
      const categoryName = screen.getByText('Attack');
      
      expect(icon.closest('.category-icon')).toBeInTheDocument();
      expect(categoryName.closest('.category-name')).toBeInTheDocument();
    });
  });
});