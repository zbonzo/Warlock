/**
 * @fileoverview Tests for ThemeToggle component
 * Tests all variants, theme switching, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '@client/components/common/ThemeToggle';
import { ThemeProvider } from '@client/contexts/ThemeContext';

// Mock the ThemeContext
const mockThemeContext = {
  currentTheme: 'light',
  availableThemes: ['light', 'dark', 'colorblind'],
  switchTheme: jest.fn(),
  toggleTheme: jest.fn(),
  isDark: false,
};

jest.mock('@client/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }) => children,
  useTheme: () => mockThemeContext,
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockThemeContext.currentTheme = 'light';
    mockThemeContext.isDark = false;
  });

  describe('Simple variant', () => {
    it('should render simple toggle button', () => {
      render(<ThemeToggle variant="simple" />);
      
      const button = screen.getByRole('button', { name: /switch to dark theme/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('theme-toggle--simple');
    });

    it('should show dark icon when in light mode', () => {
      render(<ThemeToggle variant="simple" />);
      
      expect(screen.getByText('🌙')).toBeInTheDocument();
    });

    it('should show light icon when in dark mode', () => {
      mockThemeContext.currentTheme = 'dark';
      mockThemeContext.isDark = true;
      
      render(<ThemeToggle variant="simple" />);
      
      expect(screen.getByText('☀️')).toBeInTheDocument();
    });

    it('should call toggleTheme when clicked', () => {
      render(<ThemeToggle variant="simple" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockThemeContext.toggleTheme).toHaveBeenCalledTimes(1);
    });

    it('should show label when showLabel is true', () => {
      render(<ThemeToggle variant="simple" showLabel={true} />);
      
      expect(screen.getByText('Dark')).toBeInTheDocument();
    });

    it('should not show label when showLabel is false', () => {
      render(<ThemeToggle variant="simple" showLabel={false} />);
      
      expect(screen.queryByText('Dark')).not.toBeInTheDocument();
    });

    it('should apply size class', () => {
      render(<ThemeToggle variant="simple" size="large" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('theme-toggle--large');
    });
  });

  describe('Buttons variant', () => {
    it('should render button group with all themes', () => {
      render(<ThemeToggle variant="buttons" />);
      
      expect(screen.getByRole('button', { name: /switch to light theme/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /switch to colorblind theme/i })).toBeInTheDocument();
    });

    it('should mark current theme as active', () => {
      render(<ThemeToggle variant="buttons" />);
      
      const lightButton = screen.getByRole('button', { name: /switch to light theme/i });
      expect(lightButton).toHaveClass('active');
    });

    it('should call switchTheme when theme button is clicked', () => {
      render(<ThemeToggle variant="buttons" />);
      
      const darkButton = screen.getByRole('button', { name: /switch to dark theme/i });
      fireEvent.click(darkButton);
      
      expect(mockThemeContext.switchTheme).toHaveBeenCalledWith('dark');
    });

    it('should show theme labels when showLabel is true', () => {
      render(<ThemeToggle variant="buttons" showLabel={true} />);
      
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('Colorblind')).toBeInTheDocument();
    });

    it('should apply size class', () => {
      render(<ThemeToggle variant="buttons" size="small" />);
      
      const container = screen.getByRole('group', { name: /theme/i }) || 
                       document.querySelector('.theme-toggle--buttons');
      expect(container).toHaveClass('theme-toggle--small');
    });
  });

  describe('Dropdown variant', () => {
    it('should render dropdown trigger', () => {
      render(<ThemeToggle variant="dropdown" />);
      
      const trigger = screen.getByRole('button', { name: /theme selection menu/i });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('should show current theme icon in trigger', () => {
      render(<ThemeToggle variant="dropdown" />);
      
      expect(screen.getByText('☀️')).toBeInTheDocument();
    });

    it('should open dropdown when trigger is clicked', () => {
      render(<ThemeToggle variant="dropdown" />);
      
      const trigger = screen.getByRole('button', { name: /theme selection menu/i });
      fireEvent.click(trigger);
      
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('Colorblind')).toBeInTheDocument();
    });

    it('should close dropdown when backdrop is clicked', () => {
      render(<ThemeToggle variant="dropdown" />);
      
      const trigger = screen.getByRole('button', { name: /theme selection menu/i });
      fireEvent.click(trigger);
      
      const backdrop = document.querySelector('.theme-toggle__backdrop');
      fireEvent.click(backdrop);
      
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('should call switchTheme and close dropdown when option is selected', () => {
      render(<ThemeToggle variant="dropdown" />);
      
      const trigger = screen.getByRole('button', { name: /theme selection menu/i });
      fireEvent.click(trigger);
      
      const darkOption = screen.getByText('Dark').closest('button');
      fireEvent.click(darkOption);
      
      expect(mockThemeContext.switchTheme).toHaveBeenCalledWith('dark');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('should show check mark for current theme', () => {
      render(<ThemeToggle variant="dropdown" />);
      
      const trigger = screen.getByRole('button', { name: /theme selection menu/i });
      fireEvent.click(trigger);
      
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('should show theme label in trigger when showLabel is true', () => {
      render(<ThemeToggle variant="dropdown" showLabel={true} />);
      
      expect(screen.getByText('Light')).toBeInTheDocument();
    });

    it('should apply size class', () => {
      render(<ThemeToggle variant="dropdown" size="large" />);
      
      const container = document.querySelector('.theme-toggle--dropdown');
      expect(container).toHaveClass('theme-toggle--large');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for simple variant', () => {
      render(<ThemeToggle variant="simple" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to dark theme');
      expect(button).toHaveAttribute('title', 'Switch to dark theme');
    });

    it('should have proper ARIA attributes for buttons variant', () => {
      render(<ThemeToggle variant="buttons" />);
      
      const lightButton = screen.getByRole('button', { name: /switch to light theme/i });
      expect(lightButton).toHaveAttribute('aria-label', 'Switch to Light theme');
      expect(lightButton).toHaveAttribute('title', 'Switch to Light theme');
    });

    it('should have proper ARIA attributes for dropdown variant', () => {
      render(<ThemeToggle variant="dropdown" />);
      
      const trigger = screen.getByRole('button', { name: /theme selection menu/i });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'true');
      expect(trigger).toHaveAttribute('aria-label', 'Theme selection menu');
    });

    it('should update aria-expanded when dropdown opens', () => {
      render(<ThemeToggle variant="dropdown" />);
      
      const trigger = screen.getByRole('button', { name: /theme selection menu/i });
      fireEvent.click(trigger);
      
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Default props', () => {
    it('should use default props when none provided', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole('button', { name: /theme selection menu/i });
      expect(button).toBeInTheDocument();
      
      const container = document.querySelector('.theme-toggle--dropdown');
      expect(container).toHaveClass('theme-toggle--medium');
    });
  });
});