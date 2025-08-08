/**
 * @fileoverview Tests for RuneButtonTest component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RuneButtonTest from '../../../client/src/pages/RuneButtonTest';

// Mock dependencies
jest.mock('../../../client/src/contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      primary: '#1a1a1a',
      secondary: '#333333',
      accent: '#00ff00',
      danger: '#ff0000'
    }
  }))
}));

jest.mock('../../../client/src/components/ui/RuneButton', () => {
  return function MockRuneButton({
    children,
    onClick,
    disabled,
    variant = 'primary',
    className
  }: any) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        data-testid="rune-button"
        data-variant={variant}
        className={className}
      >
        {children}
      </button>
    );
  };
});

jest.mock('../../../client/src/components/common/ThemeToggle', () => {
  return function MockThemeToggle({ variant, showLabel }: any) {
    return (
      <div data-testid="theme-toggle" data-variant={variant} data-show-label={showLabel}>
        Theme Toggle
      </div>
    );
  };
});

jest.mock('../../../client/src/pages/RuneButtonTest.css', () => ({}));

// Mock window.alert
global.alert = jest.fn();

// Mock console.log
global.console.log = jest.fn();

describe('RuneButtonTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the page title', () => {
      render(<RuneButtonTest />);

      expect(screen.getByText('Rune Button Test')).toBeInTheDocument();
    });

    it('should render theme toggle', () => {
      render(<RuneButtonTest />);

      const themeToggle = screen.getByTestId('theme-toggle');
      expect(themeToggle).toBeInTheDocument();
      expect(themeToggle).toHaveAttribute('data-variant', 'simple');
      expect(themeToggle).toHaveAttribute('data-show-label', 'true');
    });

    it('should render all section headers', () => {
      render(<RuneButtonTest />);

      expect(screen.getByText('Font Showcase - "Cast the First Rune"')).toBeInTheDocument();
      expect(screen.getByText('Color Variants')).toBeInTheDocument();
      expect(screen.getByText('Secondary Variants')).toBeInTheDocument();
      expect(screen.getByText('Danger Variants')).toBeInTheDocument();
      expect(screen.getByText('Current vs Rune Style')).toBeInTheDocument();
    });
  });

  describe('Font Showcase Section', () => {
    it('should render all font demo buttons', () => {
      render(<RuneButtonTest />);

      const expectedFonts = [
        'Uncial Antiqua (Current)',
        'Cinzel',
        'Macondo',
        'Pirata One',
        'Nosifer',
        'MedievalSharp',
        'Celtic Hand',
        'Creepster'
      ];

      expectedFonts.forEach(font => {
        expect(screen.getByText(font)).toBeInTheDocument();
      });
    });

    it('should render font demo buttons with correct classes', () => {
      render(<RuneButtonTest />);

      const expectedClasses = [
        'rune-button--uncial',
        'rune-button--cinzel',
        'rune-button--macondo',
        'rune-button--pirata',
        'rune-button--nosifer',
        'rune-button--medieval',
        'rune-button--celtic',
        'rune-button--creepster'
      ];

      const runeButtons = screen.getAllByTestId('rune-button');

      expectedClasses.forEach(className => {
        const buttonWithClass = runeButtons.find(button =>
          button.className.includes(className)
        );
        expect(buttonWithClass).toBeTruthy();
      });
    });

    it('should have all font demo buttons with same text', () => {
      render(<RuneButtonTest />);

      const fontDemoButtons = screen.getAllByText('Cast the First Rune').filter(
        element => element.tagName === 'BUTTON'
      );

      // 8 font demo buttons + others in different sections
      expect(fontDemoButtons.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Color Variants Section', () => {
    it('should render primary variant button', () => {
      render(<RuneButtonTest />);

      const primaryButtons = screen.getAllByTestId('rune-button').filter(
        button => button.getAttribute('data-variant') === 'primary'
      );

      expect(primaryButtons.length).toBeGreaterThan(0);
    });

    it('should render secondary variant button', () => {
      render(<RuneButtonTest />);

      const secondaryButtons = screen.getAllByTestId('rune-button').filter(
        button => button.getAttribute('data-variant') === 'secondary'
      );

      expect(secondaryButtons.length).toBeGreaterThan(0);
    });

    it('should render danger variant button', () => {
      render(<RuneButtonTest />);

      const dangerButtons = screen.getAllByTestId('rune-button').filter(
        button => button.getAttribute('data-variant') === 'danger'
      );

      expect(dangerButtons.length).toBeGreaterThan(0);
    });

    it('should render disabled button', () => {
      render(<RuneButtonTest />);

      const disabledButton = screen.getByText('Preparing the betrayal...');
      expect(disabledButton).toBeDisabled();
    });
  });

  describe('Secondary Variants Section', () => {
    it('should render secondary variant buttons with correct text', () => {
      render(<RuneButtonTest />);

      expect(screen.getByText('Whisper the Code')).toBeInTheDocument();
      expect(screen.getByText('Channel Magic')).toBeInTheDocument();
      expect(screen.getByText('Ritual in Progress')).toBeInTheDocument();
    });

    it('should have disabled secondary button', () => {
      render(<RuneButtonTest />);

      const disabledSecondaryButton = screen.getByText('Ritual in Progress');
      expect(disabledSecondaryButton).toBeDisabled();
    });
  });

  describe('Danger Variants Section', () => {
    it('should render danger variant buttons with correct text', () => {
      render(<RuneButtonTest />);

      expect(screen.getByText('Break the Seal')).toBeInTheDocument();
      expect(screen.getByText('Embrace Shadow')).toBeInTheDocument();
      expect(screen.getByText('Corruption Spreads...')).toBeInTheDocument();
    });

    it('should have disabled danger button', () => {
      render(<RuneButtonTest />);

      const disabledDangerButton = screen.getByText('Corruption Spreads...');
      expect(disabledDangerButton).toBeDisabled();
    });
  });

  describe('Comparison Section', () => {
    it('should render standard button', () => {
      render(<RuneButtonTest />);

      const standardButton = document.querySelector('.standard-button');
      expect(standardButton).toBeInTheDocument();
      expect(standardButton).toHaveTextContent('Cast the First Rune');
    });

    it('should render comparison headings', () => {
      render(<RuneButtonTest />);

      expect(screen.getByText('Standard Button')).toBeInTheDocument();
      expect(screen.getByText('Rune Button')).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    it('should handle font demo button clicks', () => {
      render(<RuneButtonTest />);

      const uncialButton = screen.getAllByText('Cast the First Rune')[0];
      fireEvent.click(uncialButton);

      expect(console.log).toHaveBeenCalledWith('Uncial Antiqua clicked!');
      expect(global.alert).toHaveBeenCalledWith('Uncial Antiqua activated!');
    });

    it('should handle color variant button clicks', () => {
      render(<RuneButtonTest />);

      const takeYourPlaceButton = screen.getByText('Take your place');
      fireEvent.click(takeYourPlaceButton);

      expect(console.log).toHaveBeenCalledWith('Take your place clicked!');
      expect(global.alert).toHaveBeenCalledWith('Take your place activated!');
    });

    it('should handle secondary variant button clicks', () => {
      render(<RuneButtonTest />);

      const whisperButton = screen.getByText('Whisper the Code');
      fireEvent.click(whisperButton);

      expect(console.log).toHaveBeenCalledWith('Whisper the Code clicked!');
      expect(global.alert).toHaveBeenCalledWith('Whisper the Code activated!');
    });

    it('should handle danger variant button clicks', () => {
      render(<RuneButtonTest />);

      const breakSealButton = screen.getByText('Break the Seal');
      fireEvent.click(breakSealButton);

      expect(console.log).toHaveBeenCalledWith('Break the Seal clicked!');
      expect(global.alert).toHaveBeenCalledWith('Break the Seal activated!');
    });

    it('should handle comparison rune button click', () => {
      render(<RuneButtonTest />);

      // Find the rune button in comparison section (should be the last one with this text)
      const runeButtons = screen.getAllByText('Cast the First Rune').filter(
        element => element.tagName === 'BUTTON' && element.getAttribute('data-testid') === 'rune-button'
      );
      const comparisonRuneButton = runeButtons[runeButtons.length - 1];

      fireEvent.click(comparisonRuneButton);

      expect(console.log).toHaveBeenCalledWith('Rune Style clicked!');
      expect(global.alert).toHaveBeenCalledWith('Rune Style activated!');
    });

    it('should not trigger handlers for disabled buttons', () => {
      render(<RuneButtonTest />);

      const disabledButton = screen.getByText('Preparing the betrayal...');
      fireEvent.click(disabledButton);

      // Should not have been called for this click
      expect(console.log).not.toHaveBeenCalledWith('Preparing the betrayal... clicked!');
      expect(global.alert).not.toHaveBeenCalledWith('Preparing the betrayal... activated!');
    });
  });

  describe('Button Variants Distribution', () => {
    it('should have correct number of each variant', () => {
      render(<RuneButtonTest />);

      const runeButtons = screen.getAllByTestId('rune-button');

      const primaryButtons = runeButtons.filter(button =>
        button.getAttribute('data-variant') === 'primary'
      );
      const secondaryButtons = runeButtons.filter(button =>
        button.getAttribute('data-variant') === 'secondary'
      );
      const dangerButtons = runeButtons.filter(button =>
        button.getAttribute('data-variant') === 'danger'
      );

      // Should have buttons of each type
      expect(primaryButtons.length).toBeGreaterThan(0);
      expect(secondaryButtons.length).toBeGreaterThan(0);
      expect(dangerButtons.length).toBeGreaterThan(0);
    });

    it('should have correct number of disabled buttons', () => {
      render(<RuneButtonTest />);

      const runeButtons = screen.getAllByTestId('rune-button');
      const disabledButtons = runeButtons.filter(button => button.disabled);

      // Should have 3 disabled buttons (one in each variant section)
      expect(disabledButtons.length).toBe(3);
    });
  });

  describe('CSS Classes', () => {
    it('should apply font-specific CSS classes', () => {
      render(<RuneButtonTest />);

      const fontClasses = [
        'rune-button--uncial',
        'rune-button--cinzel',
        'rune-button--macondo',
        'rune-button--pirata',
        'rune-button--nosifer',
        'rune-button--medieval',
        'rune-button--celtic',
        'rune-button--creepster'
      ];

      fontClasses.forEach(className => {
        const buttonWithClass = screen.getAllByTestId('rune-button').find(button =>
          button.className.includes(className)
        );
        expect(buttonWithClass).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper button semantics', () => {
      render(<RuneButtonTest />);

      const runeButtons = screen.getAllByTestId('rune-button');

      runeButtons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
        expect(button).toHaveAttribute('data-testid', 'rune-button');
      });
    });

    it('should properly disable buttons', () => {
      render(<RuneButtonTest />);

      const disabledButtons = [
        'Preparing the betrayal...',
        'Ritual in Progress',
        'Corruption Spreads...'
      ];

      disabledButtons.forEach(buttonText => {
        const button = screen.getByText(buttonText);
        expect(button).toBeDisabled();
      });
    });
  });
});
