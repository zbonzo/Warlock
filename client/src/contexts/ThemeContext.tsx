/**
 * @fileoverview Enhanced Theme context provider with dark mode support
 * Manages theme switching and CSS variable updates
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { STORAGE_KEYS } from '../config/constants';

type ThemeName = 'light' | 'dark';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  danger: string;
  neutral: string;
  dark: string;
  monster: string;
  warlock: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
}

interface ThemeFonts {
  heading: string;
  body: string;
}

interface ThemeShadows {
  card: string;
  button: string;
}

interface ThemeSpacing {
  small: string;
  medium: string;
  large: string;
}

interface Theme {
  colors: ThemeColors;
  fonts: ThemeFonts;
  shadows: ThemeShadows;
  spacing: ThemeSpacing;
  borderRadius: string;
}

interface ThemeContextValue extends Theme {
  currentTheme: ThemeName;
  availableThemes: ThemeName[];
  switchTheme: (newTheme: ThemeName) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
}

// Define theme configurations
const themes: Record<ThemeName, Theme> = {
  light: {
    colors: {
      primary: '#4a2c82', // Deep purple
      secondary: '#ff7b25', // Vibrant orange
      accent: '#2cb978', // Green for healing/positive actions
      danger: '#e84855', // Red for damage/negative effects
      neutral: '#f5f5f5', // Light background
      dark: '#333333', // Dark text
      monster: '#8b0000', // Dark red for monster
      warlock: '#220033', // Dark purple for warlocks
      background: '#ffffff', // Main background
      surface: '#ffffff', // Card/surface background
      border: '#e0e0e0', // Border color
      text: '#333333', // Primary text
      textMuted: '#666666', // Secondary text
    },
    fonts: {
      heading: "'Cinzel', serif",
      body: "'Source Sans Pro', sans-serif",
    },
    shadows: {
      card: '0 4px 8px rgba(0,0,0,0.2)',
      button: '0 2px 4px rgba(0,0,0,0.2)',
    },
    spacing: {
      small: '8px',
      medium: '16px',
      large: '24px',
    },
    borderRadius: '8px',
  },

  dark: {
    colors: {
      primary: '#7c5fb0', // Lighter purple for dark mode
      secondary: '#ff9554', // Lighter orange
      accent: '#4ed396', // Lighter green
      danger: '#ff6b75', // Lighter red
      neutral: '#1a1a1a', // Dark background
      dark: '#e0e0e0', // Light text (inverted)
      monster: '#ff4444', // Brighter red for monster
      warlock: '#9966cc', // Lighter purple for warlocks
      background: '#121212', // Main dark background
      surface: '#1e1e1e', // Card/surface dark background
      border: '#404040', // Dark border color
      text: '#e0e0e0', // Primary light text
      textMuted: '#b0b0b0', // Secondary light text
    },
    fonts: {
      heading: "'Cinzel', serif",
      body: "'Source Sans Pro', sans-serif",
    },
    shadows: {
      card: '0 4px 8px rgba(0,0,0,0.4)',
      button: '0 2px 4px rgba(0,0,0,0.3)',
    },
    spacing: {
      small: '8px',
      medium: '16px',
      large: '24px',
    },
    borderRadius: '8px',
  },
};

// Create context
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider component provides theme values and switching functionality
 */
export const ThemeProvider = ({ children }: ThemeProviderProps): React.ReactElement => {
  // Get initial theme from localStorage or default to light
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE);
      if (saved && themes[saved as ThemeName]) {
        return saved as ThemeName;
      }

      // Check system preference
      if (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        return 'dark';
      }
    }
    return 'light';
  });

  /**
   * Update CSS variables based on current theme
   */
  const updateCSSVariables = (theme: ThemeName): void => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const themeColors = themes[theme].colors;

    // Update color variables
    Object.entries(themeColors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Update other theme properties
    root.style.setProperty('--shadow-card', themes[theme].shadows.card);
    root.style.setProperty('--shadow-button', themes[theme].shadows.button);

    // Add theme class to body for additional styling
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${theme}`);
  };

  /**
   * Switch to a different theme
   */
  const switchTheme = (newTheme: ThemeName): void => {
    if (!themes[newTheme]) {
      console.warn(`Theme "${newTheme}" not found`);
      return;
    }

    setCurrentTheme(newTheme);
    updateCSSVariables(newTheme);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.THEME_PREFERENCE, newTheme);
    }
  };

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = (): void => {
    const newTheme: ThemeName = currentTheme === 'light' ? 'dark' : 'light';
    switchTheme(newTheme);
  };

  // Update CSS variables when theme changes
  useEffect(() => {
    updateCSSVariables(currentTheme);
  }, [currentTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent): void => {
      // Only auto-switch if user hasn't manually set a preference
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE);
      if (!savedTheme) {
        switchTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const value: ThemeContextValue = {
    // Current theme data
    ...themes[currentTheme],

    // Theme management
    currentTheme,
    availableThemes: Object.keys(themes) as ThemeName[],
    switchTheme,
    toggleTheme,

    // Utility functions
    isDark: currentTheme === 'dark',
    isLight: currentTheme === 'light',
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

/**
 * Custom hook for accessing theme values and functions
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default themes;
