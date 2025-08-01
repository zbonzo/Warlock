/**
 * @fileoverview Tests for GameTutorialModal.tsx
 * Comprehensive test suite for the GameTutorialModal component
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameTutorialModal from '../../../../../client/src/components/modals/GameTutorial/GameTutorialModal';

// Mock CSS
jest.mock('../../../../../client/src/components/modals/GameTutorial/GameTutorialModal.css', () => ({}));

// Mock ThemeContext
const mockUseTheme = jest.fn();
jest.mock('../../../../../client/src/contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme()
}));

// Mock constants
const mockTutorialSteps = [
  {
    title: '🧙‍♂️ Welcome to Warlock!',
    content: 'A multiplayer social deduction game where heroes fight monsters while hidden Warlocks try to corrupt the team.',
    type: 'welcome',
    highlights: [
      {
        icon: '🎯',
        text: 'Good Players: Defeat monsters and eliminate Warlocks',
      },
      { icon: '👹', text: 'Warlocks: Convert or eliminate all good players' },
    ],
  },
  {
    title: '🎮 How Each Round Works',
    content: 'Each round follows a simple 4-step process:',
    type: 'flow',
    steps: [
      '1. Everyone picks actions',
      '2. Actions resolve by speed',
      '3. Monster attacks someone',
      '4. Poison/effects trigger',
    ],
    tips: [
      'Shield abilities go first',
      'Monster uses threat system',
      'Some abilities have cooldowns',
      'Warlocks see everything in battle log',
    ],
  },
  {
    title: '🎮 Ready to Play!',
    content: "You're ready for battle!",
    type: 'ready',
    reminders: [
      'Threat system - not lowest HP',
      'Monster avoids Warlocks',
      'Coordinate attacks for bonuses',
      'Comeback mechanics help losing teams',
      'Detection weakens Warlocks',
      'Watch, learn, adapt',
    ],
  }
];

jest.mock('../../../../../client/src/components/modals/GameTutorial/constants', () => ({
  TUTORIAL_STEPS: mockTutorialSteps
}));

describe('GameTutorialModal', () => {
  const defaultProps = {
    isOpen: true,
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseTheme.mockReturnValue({
      isDarkMode: false,
      toggleTheme: jest.fn()
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<GameTutorialModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('🧙‍♂️ Welcome to Warlock!')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      expect(screen.getByText('🧙‍♂️ Welcome to Warlock!')).toBeInTheDocument();
    });

    it('should render first step initially', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      expect(screen.getByText('A multiplayer social deduction game where heroes fight monsters while hidden Warlocks try to corrupt the team.')).toBeInTheDocument();
    });

    it('should render navigation controls', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      expect(screen.getByText('← Prev')).toBeInTheDocument();
      expect(screen.getByText('Next →')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total steps
    });

    it('should render close button', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      expect(screen.getByLabelText('Close tutorial')).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('should disable prev button on first step', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      const prevButton = screen.getByText('← Prev');
      expect(prevButton).toBeDisabled();
    });

    it('should enable next button on first step', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      const nextButton = screen.getByText('Next →');
      expect(nextButton).not.toBeDisabled();
    });

    it('should navigate to next step when next button is clicked', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Next →'));
      
      expect(screen.getByText('🎮 How Each Round Works')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Step counter
    });

    it('should navigate to previous step when prev button is clicked', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      // Go to step 2
      fireEvent.click(screen.getByText('Next →'));
      
      // Go back to step 1
      fireEvent.click(screen.getByText('← Prev'));
      
      expect(screen.getByText('🧙‍♂️ Welcome to Warlock!')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should show "Play! 🎮" button on last step', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      // Navigate to last step
      fireEvent.click(screen.getByText('Next →'));
      fireEvent.click(screen.getByText('Next →'));
      
      expect(screen.getByText('Play! 🎮')).toBeInTheDocument();
    });

    it('should call onComplete when "Play! 🎮" button is clicked', () => {
      const onComplete = jest.fn();
      render(<GameTutorialModal {...defaultProps} onComplete={onComplete} />);
      
      // Navigate to last step
      fireEvent.click(screen.getByText('Next →'));
      fireEvent.click(screen.getByText('Next →'));
      
      fireEvent.click(screen.getByText('Play! 🎮'));
      
      // Should trigger exit animation first
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Step Content Rendering', () => {
    it('should render highlights for welcome step', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      expect(screen.getByText('🎯')).toBeInTheDocument();
      expect(screen.getByText('Good Players: Defeat monsters and eliminate Warlocks')).toBeInTheDocument();
      expect(screen.getByText('👹')).toBeInTheDocument();
      expect(screen.getByText('Warlocks: Convert or eliminate all good players')).toBeInTheDocument();
    });

    it('should render steps and tips for flow step', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      // Navigate to flow step
      fireEvent.click(screen.getByText('Next →'));
      
      expect(screen.getByText('1. Everyone picks actions')).toBeInTheDocument();
      expect(screen.getByText('2. Actions resolve by speed')).toBeInTheDocument();
      expect(screen.getByText('3. Monster attacks someone')).toBeInTheDocument();
      expect(screen.getByText('4. Poison/effects trigger')).toBeInTheDocument();
      
      expect(screen.getByText('💡 Key Points:')).toBeInTheDocument();
      expect(screen.getByText('Shield abilities go first')).toBeInTheDocument();
      expect(screen.getByText('Monster uses threat system')).toBeInTheDocument();
    });

    it('should render reminders for ready step', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      // Navigate to ready step
      fireEvent.click(screen.getByText('Next →'));
      fireEvent.click(screen.getByText('Next →'));
      
      expect(screen.getByText('🌟 Remember:')).toBeInTheDocument();
      expect(screen.getByText('Threat system - not lowest HP')).toBeInTheDocument();
      expect(screen.getByText('Monster avoids Warlocks')).toBeInTheDocument();
      expect(screen.getByText('Good luck, and may the best team win! 🏆')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close modal when Escape key is pressed', () => {
      const onComplete = jest.fn();
      render(<GameTutorialModal {...defaultProps} onComplete={onComplete} />);
      
      fireEvent.keyDown(window, { key: 'Escape' });
      
      // Should trigger exit animation first
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should go to previous step when left arrow key is pressed', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      // Go to step 2 first
      fireEvent.click(screen.getByText('Next →'));
      
      // Use left arrow to go back
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      
      expect(screen.getByText('🧙‍♂️ Welcome to Warlock!')).toBeInTheDocument();
    });

    it('should go to next step when right arrow key is pressed', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      
      expect(screen.getByText('🎮 How Each Round Works')).toBeInTheDocument();
    });

    it('should not go to previous step from first step with left arrow', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      
      // Should still be on first step
      expect(screen.getByText('🧙‍♂️ Welcome to Warlock!')).toBeInTheDocument();
    });

    it('should complete tutorial from last step with right arrow', () => {
      const onComplete = jest.fn();
      render(<GameTutorialModal {...defaultProps} onComplete={onComplete} />);
      
      // Navigate to last step
      fireEvent.click(screen.getByText('Next →'));
      fireEvent.click(screen.getByText('Next →'));
      
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      
      // Should trigger exit animation first
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = render(<GameTutorialModal {...defaultProps} />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Close Button', () => {
    it('should call onComplete when close button is clicked', () => {
      const onComplete = jest.fn();
      render(<GameTutorialModal {...defaultProps} onComplete={onComplete} />);
      
      fireEvent.click(screen.getByLabelText('Close tutorial'));
      
      // Should trigger exit animation first
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Exit Animation', () => {
    it('should apply exiting class during exit animation', () => {
      const { container } = render(<GameTutorialModal {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Close tutorial'));
      
      expect(container.querySelector('.tutorial-overlay.exiting')).toBeInTheDocument();
    });

    it('should delay onComplete call until after animation', () => {
      const onComplete = jest.fn();
      render(<GameTutorialModal {...defaultProps} onComplete={onComplete} />);
      
      fireEvent.click(screen.getByLabelText('Close tutorial'));
      
      // Should not call onComplete immediately
      expect(onComplete).not.toHaveBeenCalled();
      
      // Should call onComplete after 300ms
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should reset step and exiting state after animation completes', () => {
      const onComplete = jest.fn();
      render(<GameTutorialModal {...defaultProps} onComplete={onComplete} />);
      
      // Navigate to step 2
      fireEvent.click(screen.getByText('Next →'));
      
      fireEvent.click(screen.getByLabelText('Close tutorial'));
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      // State should be reset after onComplete is called
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Step Counter', () => {
    it('should show correct step numbers', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      // Step 1
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // Navigate to step 2
      fireEvent.click(screen.getByText('Next →'));
      expect(screen.getByText('2')).toBeInTheDocument();
      
      // Navigate to step 3
      fireEvent.click(screen.getByText('Next →'));
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should maintain correct counter format', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      const counter = screen.getByText('/');
      expect(counter).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('should work with dark theme', () => {
      mockUseTheme.mockReturnValue({
        isDarkMode: true,
        toggleTheme: jest.fn()
      });
      
      render(<GameTutorialModal {...defaultProps} />);
      
      expect(screen.getByText('🧙‍♂️ Welcome to Warlock!')).toBeInTheDocument();
    });

    it('should work with light theme', () => {
      mockUseTheme.mockReturnValue({
        isDarkMode: false,
        toggleTheme: jest.fn()
      });
      
      render(<GameTutorialModal {...defaultProps} />);
      
      expect(screen.getByText('🧙‍♂️ Welcome to Warlock!')).toBeInTheDocument();
    });
  });

  describe('Component State Management', () => {
    it('should maintain step state correctly', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      // Start at step 0 (first step)
      expect(screen.getByText('1')).toBeInTheDocument();
      
      // Navigate forward
      fireEvent.click(screen.getByText('Next →'));
      expect(screen.getByText('2')).toBeInTheDocument();
      
      // Navigate backward
      fireEvent.click(screen.getByText('← Prev'));
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should handle exiting state correctly', () => {
      const { container } = render(<GameTutorialModal {...defaultProps} />);
      
      // Initially not exiting
      expect(container.querySelector('.exiting')).not.toBeInTheDocument();
      
      // Start exit
      fireEvent.click(screen.getByLabelText('Close tutorial'));
      expect(container.querySelector('.exiting')).toBeInTheDocument();
    });

    it('should handle multiple complete attempts gracefully', () => {
      const onComplete = jest.fn();
      render(<GameTutorialModal {...defaultProps} onComplete={onComplete} />);
      
      // Click multiple times rapidly
      fireEvent.click(screen.getByLabelText('Close tutorial'));
      fireEvent.keyDown(window, { key: 'Escape' });
      
      // Should only trigger one close sequence
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for close button', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      expect(screen.getByLabelText('Close tutorial')).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      const prevButton = screen.getByText('← Prev');
      const nextButton = screen.getByText('Next →');
      const closeButton = screen.getByLabelText('Close tutorial');
      
      // Buttons should be focusable
      prevButton.focus();
      expect(document.activeElement).toBe(prevButton);
      
      nextButton.focus();
      expect(document.activeElement).toBe(nextButton);
      
      closeButton.focus();
      expect(document.activeElement).toBe(closeButton);
    });

    it('should have semantic button elements', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      const prevButton = screen.getByText('← Prev');
      const nextButton = screen.getByText('Next →');
      const closeButton = screen.getByLabelText('Close tutorial');
      
      expect(prevButton.tagName).toBe('BUTTON');
      expect(nextButton.tagName).toBe('BUTTON');
      expect(closeButton.tagName).toBe('BUTTON');
    });
  });

  describe('CSS Classes', () => {
    it('should have correct CSS class structure', () => {
      const { container } = render(<GameTutorialModal {...defaultProps} />);
      
      expect(container.querySelector('.tutorial-overlay')).toBeInTheDocument();
      expect(container.querySelector('.tutorial-modal')).toBeInTheDocument();
      expect(container.querySelector('.tutorial-title')).toBeInTheDocument();
      expect(container.querySelector('.tutorial-content')).toBeInTheDocument();
      expect(container.querySelector('.tutorial-navigation')).toBeInTheDocument();
    });

    it('should apply tutorial button classes', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      const prevButton = screen.getByText('← Prev');
      const nextButton = screen.getByText('Next →');
      
      expect(prevButton).toHaveClass('tutorial-button', 'back-button');
      expect(nextButton).toHaveClass('tutorial-button', 'next-button');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tutorial steps array', () => {
      // Mock empty steps
      jest.doMock('../../../../../client/src/components/modals/GameTutorial/constants', () => ({
        TUTORIAL_STEPS: []
      }));
      
      expect(() => {
        render(<GameTutorialModal {...defaultProps} />);
      }).not.toThrow();
    });

    it('should handle invalid step navigation', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      // Try to go beyond last step (should not crash)
      fireEvent.click(screen.getByText('Next →'));
      fireEvent.click(screen.getByText('Next →'));
      fireEvent.click(screen.getByText('Play! 🎮'));
      
      // Should complete tutorial instead of going to invalid step
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      expect(defaultProps.onComplete).toHaveBeenCalled();
    });

    it('should handle rapid navigation', () => {
      render(<GameTutorialModal {...defaultProps} />);
      
      // Rapidly click next multiple times
      fireEvent.click(screen.getByText('Next →'));
      fireEvent.click(screen.getByText('Next →'));
      fireEvent.click(screen.getByText('← Prev'));
      fireEvent.click(screen.getByText('← Prev'));
      
      // Should end up at first step
      expect(screen.getByText('🧙‍♂️ Welcome to Warlock!')).toBeInTheDocument();
    });
  });
});