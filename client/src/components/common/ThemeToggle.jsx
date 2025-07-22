/**
 * @fileoverview Theme toggle component for switching between light/dark modes
 * Can be used as a simple toggle or dropdown with all themes
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../../contexts/ThemeContext';
import './ThemeToggle.css';

/**
 * ThemeToggle component provides theme switching functionality
 *
 * @param {Object} props - Component props
 * @param {string} props.variant - Toggle variant ('simple', 'dropdown', 'buttons')
 * @param {string} props.size - Size of the toggle ('small', 'medium', 'large')
 * @param {boolean} props.showLabel - Whether to show theme name labels
 * @returns {React.ReactElement} The rendered component
 */
const ThemeToggle = ({
  variant = 'simple',
  size = 'medium',
  showLabel = false,
}) => {
  const { currentTheme, availableThemes, switchTheme, toggleTheme, isDark } =
    useTheme();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const themeIcons = {
    light: '☀️',
    dark: '🌙',
  };

  const themeLabels = {
    light: 'Return to daylight',
    dark: 'Fade to shadow',
  };

  /**
   * Handle theme selection
   */
  const handleThemeSelect = (theme) => {
    switchTheme(theme);
    setDropdownOpen(false);
  };

  /**
   * Simple toggle between light and dark
   */
  if (variant === 'simple') {
    return (
      <button
        className={`theme-toggle theme-toggle--simple theme-toggle--${size}`}
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      >
        <span className="theme-toggle__icon">
          {isDark ? themeIcons.light : themeIcons.dark}
        </span>
        {showLabel && (
          <span className="theme-toggle__label">
            {isDark ? themeLabels.light : themeLabels.dark}
          </span>
        )}
      </button>
    );
  }

  /**
   * Button group with all themes
   */
  if (variant === 'buttons') {
    return (
      <div
        className={`theme-toggle theme-toggle--buttons theme-toggle--${size}`}
      >
        {availableThemes.map((theme) => (
          <button
            key={theme}
            className={`theme-toggle__button ${currentTheme === theme ? 'active' : ''}`}
            onClick={() => handleThemeSelect(theme)}
            aria-label={`Switch to ${themeLabels[theme]} theme`}
            title={`Switch to ${themeLabels[theme]} theme`}
          >
            <span className="theme-toggle__icon">{themeIcons[theme]}</span>
            {showLabel && (
              <span className="theme-toggle__label">{themeLabels[theme]}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  /**
   * Dropdown with all themes
   */
  return (
    <div
      className={`theme-toggle theme-toggle--dropdown theme-toggle--${size}`}
    >
      <button
        className="theme-toggle__trigger"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
        aria-label="Theme selection menu"
      >
        <span className="theme-toggle__icon">{themeIcons[currentTheme]}</span>
        {showLabel && (
          <span className="theme-toggle__label">
            {themeLabels[currentTheme]}
          </span>
        )}
        <span className="theme-toggle__arrow">▼</span>
      </button>

      {dropdownOpen && (
        <>
          <div
            className="theme-toggle__backdrop"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="theme-toggle__dropdown">
            {availableThemes.map((theme) => (
              <button
                key={theme}
                className={`theme-toggle__option ${currentTheme === theme ? 'active' : ''}`}
                onClick={() => handleThemeSelect(theme)}
              >
                <span className="theme-toggle__icon">{themeIcons[theme]}</span>
                <span className="theme-toggle__label">
                  {themeLabels[theme]}
                </span>
                {currentTheme === theme && (
                  <span className="theme-toggle__check">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

ThemeToggle.propTypes = {
  variant: PropTypes.oneOf(['simple', 'dropdown', 'buttons']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showLabel: PropTypes.bool,
};

export default ThemeToggle;


