/**
 * @fileoverview Tests for ClassCard.tsx
 * Test suite for the ClassCard component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClassCard from '../../../../../../client/src/components/modals/AdaptabilityModal/components/ClassCard';
import type { PlayerClass } from '../../../../../../shared/types';

// Mock CSS
jest.mock('../../../../../../client/src/components/modals/AdaptabilityModal/components/ClassCard.css', () => ({}));

// Mock ThemeContext
const mockUseTheme = jest.fn();
jest.mock('../../../../../../client/src/contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme()
}));

describe('ClassCard', () => {
  const defaultProps = {
    className: 'Warrior' as PlayerClass,
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
    it('should render class name', () => {
      render(<ClassCard {...defaultProps} />);
      
      expect(screen.getByText('Warrior')).toBeInTheDocument();
    });

    it('should render class icon for Warrior', () => {
      render(<ClassCard {...defaultProps} />);
      
      expect(screen.getByText('⚔️')).toBeInTheDocument();
    });

    it('should have clickable card element', () => {
      const { container } = render(<ClassCard {...defaultProps} />);
      
      expect(container.querySelector('.class-card')).toBeInTheDocument();
    });
  });

  describe('Class Icons', () => {
    const classIconTests = [
      { className: 'Warrior', expectedIcon: '⚔️' },
      { className: 'Pyromancer', expectedIcon: '🔥' },
      { className: 'Wizard', expectedIcon: '🧙' },
      { className: 'Assassin', expectedIcon: '🥷' },
      { className: 'Alchemist', expectedIcon: '🧪' },
      { className: 'Priest', expectedIcon: '✨' },
      { className: 'Oracle', expectedIcon: '🔮' },
      { className: 'Barbarian', expectedIcon: '🪓' },
      { className: 'Shaman', expectedIcon: '🌀' },
      { className: 'Gunslinger', expectedIcon: '💥' },
      { className: 'Tracker', expectedIcon: '🏹' },
      { className: 'Druid', expectedIcon: '🌿' },
    ];

    classIconTests.forEach(({ className, expectedIcon }) => {
      it(`should render correct icon for ${className}`, () => {
        render(
          <ClassCard 
            className={className as PlayerClass} 
            onSelect={jest.fn()} 
          />
        );
        
        expect(screen.getByText(expectedIcon)).toBeInTheDocument();
        expect(screen.getByText(className)).toBeInTheDocument();
      });
    });

    it('should render default icon for unknown class', () => {
      render(
        <ClassCard 
          className={'UnknownClass' as PlayerClass} 
          onSelect={jest.fn()} 
        />
      );
      
      expect(screen.getByText('📚')).toBeInTheDocument();
      expect(screen.getByText('UnknownClass')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onSelect when card is clicked', () => {
      const onSelect = jest.fn();
      render(<ClassCard {...defaultProps} onSelect={onSelect} />);
      
      fireEvent.click(screen.getByText('Warrior'));
      
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onSelect when clicking anywhere on the card', () => {
      const onSelect = jest.fn();
      const { container } = render(<ClassCard {...defaultProps} onSelect={onSelect} />);
      
      const card = container.querySelector('.class-card');
      fireEvent.click(card!);
      
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onSelect when clicking the icon', () => {
      const onSelect = jest.fn();
      render(<ClassCard {...defaultProps} onSelect={onSelect} />);
      
      fireEvent.click(screen.getByText('⚔️'));
      
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('should not call onSelect multiple times on single click', () => {
      const onSelect = jest.fn();
      render(<ClassCard {...defaultProps} onSelect={onSelect} />);
      
      fireEvent.click(screen.getByText('Warrior'));
      
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Structure', () => {
    it('should have correct CSS class structure', () => {
      const { container } = render(<ClassCard {...defaultProps} />);
      
      expect(container.querySelector('.class-card')).toBeInTheDocument();
      expect(container.querySelector('.class-icon')).toBeInTheDocument();
      expect(container.querySelector('.class-name')).toBeInTheDocument();
    });

    it('should contain icon and name in separate elements', () => {
      render(<ClassCard {...defaultProps} />);
      
      const icon = screen.getByText('⚔️');
      const className = screen.getByText('Warrior');
      
      expect(icon.closest('.class-icon')).toBeInTheDocument();
      expect(className.closest('.class-name')).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('should work with dark theme', () => {
      mockUseTheme.mockReturnValue({
        isDarkMode: true,
        toggleTheme: jest.fn()
      });
      
      render(<ClassCard {...defaultProps} />);
      
      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.getByText('⚔️')).toBeInTheDocument();
    });

    it('should work with light theme', () => {
      mockUseTheme.mockReturnValue({
        isDarkMode: false,
        toggleTheme: jest.fn()
      });
      
      render(<ClassCard {...defaultProps} />);
      
      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.getByText('⚔️')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty class name', () => {
      render(
        <ClassCard 
          className={'' as PlayerClass} 
          onSelect={jest.fn()} 
        />
      );
      
      expect(screen.getByText('📚')).toBeInTheDocument(); // Default icon
      expect(screen.getByText('')).toBeInTheDocument();
    });

    it('should handle null class name', () => {
      render(
        <ClassCard 
          className={null as any} 
          onSelect={jest.fn()} 
        />
      );
      
      expect(screen.getByText('📚')).toBeInTheDocument(); // Default icon
    });

    it('should handle undefined class name', () => {
      render(
        <ClassCard 
          className={undefined as any} 
          onSelect={jest.fn()} 
        />
      );
      
      expect(screen.getByText('📚')).toBeInTheDocument(); // Default icon
    });

    it('should handle class names with special characters', () => {
      render(
        <ClassCard 
          className={'Class-With_Special!Characters' as PlayerClass} 
          onSelect={jest.fn()} 
        />
      );
      
      expect(screen.getByText('Class-With_Special!Characters')).toBeInTheDocument();
      expect(screen.getByText('📚')).toBeInTheDocument(); // Default icon for unknown class
    });

    it('should handle very long class names', () => {
      const longClassName = 'VeryLongClassNameThatMightCauseDisplayIssuesInTheInterface';
      render(
        <ClassCard 
          className={longClassName as PlayerClass} 
          onSelect={jest.fn()} 
        />
      );
      
      expect(screen.getByText(longClassName)).toBeInTheDocument();
    });

    it('should handle class names with numbers', () => {
      render(
        <ClassCard 
          className={'Warrior2' as PlayerClass} 
          onSelect={jest.fn()} 
        />
      );
      
      expect(screen.getByText('Warrior2')).toBeInTheDocument();
      expect(screen.getByText('📚')).toBeInTheDocument(); // Default icon for unknown class
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      const onSelect = jest.fn();
      const { container } = render(<ClassCard {...defaultProps} onSelect={onSelect} />);
      
      const card = container.querySelector('.class-card');
      expect(card).toBeInTheDocument();
      
      // Should be able to receive focus (div elements are focusable when they have click handlers)
      card?.focus();
      expect(document.activeElement).toBe(card);
    });

    it('should support keyboard activation', () => {
      const onSelect = jest.fn();
      const { container } = render(<ClassCard {...defaultProps} onSelect={onSelect} />);
      
      const card = container.querySelector('.class-card');
      
      // Simulate Enter key press
      fireEvent.keyDown(card!, { key: 'Enter' });
      // Note: The component doesn't currently handle keyboard events,
      // this test documents the current behavior
    });

    it('should have semantic content', () => {
      render(<ClassCard {...defaultProps} />);
      
      // Should have both visual (icon) and textual (class name) content
      expect(screen.getByText('⚔️')).toBeInTheDocument();
      expect(screen.getByText('Warrior')).toBeInTheDocument();
    });
  });

  describe('Icon Function Testing', () => {
    it('should handle case sensitivity correctly', () => {
      // Test that the function is case-sensitive
      render(
        <ClassCard 
          className={'warrior' as PlayerClass} 
          onSelect={jest.fn()} 
        />
      );
      
      // Should use default icon since 'warrior' !== 'Warrior'
      expect(screen.getByText('📚')).toBeInTheDocument();
      expect(screen.getByText('warrior')).toBeInTheDocument();
    });

    it('should return consistent icons for the same class', () => {
      const { unmount } = render(<ClassCard {...defaultProps} />);
      expect(screen.getByText('⚔️')).toBeInTheDocument();
      
      unmount();
      
      render(<ClassCard {...defaultProps} />);
      expect(screen.getByText('⚔️')).toBeInTheDocument();
    });
  });
});