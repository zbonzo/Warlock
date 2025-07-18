/**
 * @fileoverview Tests for ThemeContext
 * Tests theme switching, CSS variable updates, and system preference detection
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@client/contexts/ThemeContext';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock matchMedia
const mockMatchMedia = {
  matches: false,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.defineProperty(window, 'matchMedia', {
  value: jest.fn(() => mockMatchMedia),
  writable: true,
});

// Mock document.documentElement
const mockDocumentElement = {
  style: {
    setProperty: jest.fn(),
  },
};

Object.defineProperty(document, 'documentElement', {
  value: mockDocumentElement,
  writable: true,
});

// Mock document.body
const mockBody = {
  className: '',
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
  },
};

Object.defineProperty(document, 'body', {
  value: mockBody,
  writable: true,
});

// Test component that uses the context
const TestComponent = () => {
  const theme = useTheme();
  
  return (
    <div>
      <div data-testid="current-theme">{theme.currentTheme}</div>
      <div data-testid="is-dark">{theme.isDark ? 'true' : 'false'}</div>
      <div data-testid="is-light">{theme.isLight ? 'true' : 'false'}</div>
      <div data-testid="is-colorblind">{theme.isColorblind ? 'true' : 'false'}</div>
      <div data-testid="available-themes">{theme.availableThemes.join(',')}</div>
      <button onClick={() => theme.switchTheme('dark')}>Switch to Dark</button>
      <button onClick={() => theme.switchTheme('light')}>Switch to Light</button>
      <button onClick={() => theme.switchTheme('colorblind')}>Switch to Colorblind</button>
      <button onClick={() => theme.toggleTheme()}>Toggle Theme</button>
      <div data-testid="primary-color">{theme.colors.primary}</div>
      <div data-testid="background-color">{theme.colors.background}</div>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockMatchMedia.matches = false;
    mockBody.className = '';
    mockDocumentElement.style.setProperty.mockClear();
    mockBody.classList.add.mockClear();
    mockMatchMedia.addEventListener.mockClear();
    mockMatchMedia.removeEventListener.mockClear();
  });

  it('should provide default light theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
    expect(screen.getByTestId('is-light')).toHaveTextContent('true');
    expect(screen.getByTestId('is-colorblind')).toHaveTextContent('false');
  });

  it('should load saved theme from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
    expect(screen.getByTestId('is-light')).toHaveTextContent('false');
  });

  it('should use system preference when no saved theme', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    mockMatchMedia.matches = true;

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
  });

  it('should provide available themes', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('available-themes')).toHaveTextContent('light,dark,colorblind');
  });

  it('should switch themes and update localStorage', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const switchButton = screen.getByText('Switch to Dark');
    act(() => {
      switchButton.click();
    });

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme_preference', 'dark');
  });

  it('should toggle between light and dark themes', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleButton = screen.getByText('Toggle Theme');
    
    // Start with light, should switch to dark
    act(() => {
      toggleButton.click();
    });
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');

    // Now dark, should switch to light
    act(() => {
      toggleButton.click();
    });
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
  });

  it('should handle invalid theme switch gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const theme = screen.getByTestId('current-theme');
    expect(theme).toHaveTextContent('light');

    // Try to switch to invalid theme
    act(() => {
      // This would normally be done through switchTheme function
      // We'll need to access it differently for testing
    });

    expect(consoleSpy).toHaveBeenCalledWith('Theme "invalid" not found');
    expect(theme).toHaveTextContent('light'); // Should remain unchanged

    consoleSpy.mockRestore();
  });

  it('should switch to colorblind theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const switchButton = screen.getByText('Switch to Colorblind');
    act(() => {
      switchButton.click();
    });

    expect(screen.getByTestId('current-theme')).toHaveTextContent('colorblind');
    expect(screen.getByTestId('is-colorblind')).toHaveTextContent('true');
  });

  it('should provide theme colors', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('primary-color')).toHaveTextContent('#4a2c82');
    expect(screen.getByTestId('background-color')).toHaveTextContent('#ffffff');
  });

  it('should provide dark theme colors when switched', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const switchButton = screen.getByText('Switch to Dark');
    act(() => {
      switchButton.click();
    });

    expect(screen.getByTestId('primary-color')).toHaveTextContent('#7c5fb0');
    expect(screen.getByTestId('background-color')).toHaveTextContent('#121212');
  });

  it('should update CSS variables when theme changes', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const switchButton = screen.getByText('Switch to Dark');
    act(() => {
      switchButton.click();
    });

    // Check that CSS variables were updated
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-primary', '#7c5fb0');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--color-background', '#121212');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--shadow-card', '0 4px 8px rgba(0,0,0,0.4)');
  });

  it('should add theme class to body', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const switchButton = screen.getByText('Switch to Dark');
    act(() => {
      switchButton.click();
    });

    expect(mockBody.classList.add).toHaveBeenCalledWith('theme-dark');
  });

  it('should listen for system theme changes', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(mockMatchMedia.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    unmount();

    expect(mockMatchMedia.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should handle system theme change when no saved preference', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    let changeHandler;

    mockMatchMedia.addEventListener.mockImplementation((event, handler) => {
      if (event === 'change') {
        changeHandler = handler;
      }
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Simulate system theme change to dark
    act(() => {
      changeHandler({ matches: true });
    });

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
  });

  it('should not auto-switch when user has saved preference', () => {
    mockLocalStorage.getItem.mockReturnValue('light');
    let changeHandler;

    mockMatchMedia.addEventListener.mockImplementation((event, handler) => {
      if (event === 'change') {
        changeHandler = handler;
      }
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Simulate system theme change to dark
    act(() => {
      changeHandler({ matches: true });
    });

    // Should remain light because user has saved preference
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
  });

  it('should throw error when useTheme is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });

  it('should handle SSR environment gracefully', () => {
    // Mock window as undefined to simulate SSR
    const originalWindow = global.window;
    delete global.window;

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');

    // Restore window
    global.window = originalWindow;
  });

  it('should ignore invalid saved theme from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-theme');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
  });

  it('should provide all theme properties', () => {
    const ThemePropertiesComponent = () => {
      const theme = useTheme();
      
      return (
        <div>
          <div data-testid="fonts-heading">{theme.fonts.heading}</div>
          <div data-testid="fonts-body">{theme.fonts.body}</div>
          <div data-testid="spacing-medium">{theme.spacing.medium}</div>
          <div data-testid="border-radius">{theme.borderRadius}</div>
          <div data-testid="shadows-card">{theme.shadows.card}</div>
        </div>
      );
    };

    render(
      <ThemeProvider>
        <ThemePropertiesComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('fonts-heading')).toHaveTextContent("'Cinzel', serif");
    expect(screen.getByTestId('fonts-body')).toHaveTextContent("'Source Sans Pro', sans-serif");
    expect(screen.getByTestId('spacing-medium')).toHaveTextContent('16px');
    expect(screen.getByTestId('border-radius')).toHaveTextContent('8px');
    expect(screen.getByTestId('shadows-card')).toHaveTextContent('0 4px 8px rgba(0,0,0,0.2)');
  });
});