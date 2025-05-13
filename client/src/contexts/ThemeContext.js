/**
 * @fileoverview Theme context provider for consistent styling
 * Provides theme values to all components in the application
 */
import React, { createContext, useContext } from 'react';

// Theme values that match CSS variables in global.css
const gameTheme = {
  colors: {
    primary: '#4a2c82',     // Deep purple
    secondary: '#ff7b25',   // Vibrant orange
    accent: '#2cb978',      // Green for healing/positive actions
    danger: '#e84855',      // Red for damage/negative effects
    neutral: '#f5f5f5',     // Light background
    dark: '#333333',        // Dark text
    monster: '#8b0000',     // Dark red for monster
    warlock: '#220033'      // Dark purple for warlocks
  },
  fonts: {
    heading: "'Cinzel', serif",       // Fantasy-style font for headings
    body: "'Source Sans Pro', sans-serif"  // Clean font for readability
  },
  shadows: {
    card: '0 4px 8px rgba(0,0,0,0.2)',
    button: '0 2px 4px rgba(0,0,0,0.2)'
  },
  spacing: {
    small: '8px',
    medium: '16px',
    large: '24px'
  },
  borderRadius: '8px'
};

// Create context with default theme values
const ThemeContext = createContext(gameTheme);

/**
 * ThemeProvider component provides theme values to all child components
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} The theme provider wrapper
 */
export const ThemeProvider = ({ children }) => {
  return (
    <ThemeContext.Provider value={gameTheme}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Custom hook for accessing theme values
 * 
 * @returns {Object} Theme object with colors, fonts, and other styling values
 * 
 * @example
 * // Use in a component
 * const theme = useTheme();
 * return <div style={{ color: theme.colors.primary }}>Themed Content</div>;
 */
export const useTheme = () => useContext(ThemeContext);

export default gameTheme;