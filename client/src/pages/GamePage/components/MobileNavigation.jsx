/**
 * @fileoverview Mobile navigation component for tabbed interface
 * Allows switching between player info, actions, and history views
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import './MobileNavigation.css';

/**
 * MobileNavigation component provides tab interface for mobile view
 * 
 * @param {Object} props - Component props
 * @param {string} props.activeTab - Currently active tab ID
 * @param {Function} props.onTabChange - Callback when tab is changed
 * @returns {React.ReactElement} The rendered component
 */
const MobileNavigation = ({ activeTab, onTabChange }) => {
  const theme = useTheme();
  
  return (
    <div className="tab-navigation">
      <button
        className={`tab-button ${activeTab === 'action' ? 'active' : ''}`}
        onClick={() => onTabChange('action')}
        aria-pressed={activeTab === 'action'}
      >
        <span className="tab-icon">⚔️</span>
        <span className="tab-label">Actions</span>
      </button>
      
      <button
        className={`tab-button ${activeTab === 'players' ? 'active' : ''}`}
        onClick={() => onTabChange('players')}
        aria-pressed={activeTab === 'players'}
      >
        <span className="tab-icon">👤</span>
        <span className="tab-label">Players</span>
      </button>
      
      <button
        className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => onTabChange('history')}
        aria-pressed={activeTab === 'history'}
      >
        <span className="tab-icon">📜</span>
        <span className="tab-label">History</span>
      </button>
    </div>
  );
};

MobileNavigation.propTypes = {
  activeTab: PropTypes.oneOf(['action', 'players', 'history']).isRequired,
  onTabChange: PropTypes.func.isRequired
};

export default MobileNavigation;