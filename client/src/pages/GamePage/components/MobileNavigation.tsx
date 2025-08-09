/**
 * @fileoverview Mobile navigation component for tabbed interface
 * Allows switching between player info, actions, and history views
 */
import React from 'react';
import './MobileNavigation.css';

type TabType = 'action' | 'players' | 'history';

interface MobileNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isAlive?: boolean;
  isStunned?: boolean;
}

/**
 * MobileNavigation component provides tab interface for mobile view
 */
const MobileNavigation: React.FC<MobileNavigationProps> = ({ 
  activeTab, 
  onTabChange,
  isAlive = true,
  isStunned = false
}) => {
  return (
    <div className="tab-navigation">
      <button
        className={`tab-button ${activeTab === 'action' ? 'active' : ''} ${!isAlive || isStunned ? 'disabled' : ''}`}
        onClick={() => onTabChange('action')}
        aria-pressed={activeTab === 'action'}
        disabled={!isAlive || isStunned}
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

export default MobileNavigation;
