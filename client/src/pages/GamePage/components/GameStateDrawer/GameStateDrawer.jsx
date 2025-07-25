/**
 * @fileoverview GameState drawer component for mobile
 * Shows Player and History columns in a drawer format
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import PlayerColumn from '../PlayerColumn';
import HistoryColumn from '../HistoryColumn';
import './GameStateDrawer.css';

/**
 * GameState drawer - shows Player and History columns on mobile
 */
const GameStateDrawer = ({
  isOpen,
  onClose,
  onBackToActions,
  // Player column props
  players,
  me,
  alivePlayers,
  selectedTarget,
  onTargetSelect,
  // History column props
  eventsLog,
  lastEvent,
  currentPlayerId,
}) => {
  const [activeTab, setActiveTab] = useState('players');

  if (!isOpen) return null;

  return (
    <div className="game-state-drawer-overlay">
      <div className="game-state-drawer">
        {/* Mobile drawer handle */}
        <div className="drawer-handle" onClick={onClose} />
        
        <div className="drawer-content">
          {/* Header with tabs and back button */}
          <div className="drawer-header">
            <div className="drawer-tabs">
              <button
                className={`tab-button ${activeTab === 'players' ? 'active' : ''}`}
                onClick={() => setActiveTab('players')}
              >
                <span className="tab-icon">👤</span>
                <span className="tab-label">Players</span>
              </button>
              
              <button
                className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <span className="tab-icon">📜</span>
                <span className="tab-label">History</span>
              </button>
            </div>
            
            <button className="back-to-actions-btn" onClick={onBackToActions}>
              ← Actions
            </button>
          </div>

          {/* Tab content */}
          <div className="drawer-tab-content">
            {activeTab === 'players' && (
              <PlayerColumn
                isVisible={true}
                players={players}
                me={me}
                alivePlayers={alivePlayers}
                selectedTarget={selectedTarget}
                onTargetSelect={onTargetSelect}
                isMobile={true}
              />
            )}
            
            {activeTab === 'history' && (
              <HistoryColumn
                isVisible={true}
                eventsLog={eventsLog}
                lastEvent={lastEvent}
                currentPlayerId={currentPlayerId}
                players={players}
                showAllEvents={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

GameStateDrawer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onBackToActions: PropTypes.func.isRequired,
  
  // Player column props
  players: PropTypes.array.isRequired,
  me: PropTypes.object,
  alivePlayers: PropTypes.array.isRequired,
  selectedTarget: PropTypes.string,
  onTargetSelect: PropTypes.func.isRequired,
  
  // History column props
  eventsLog: PropTypes.array.isRequired,
  lastEvent: PropTypes.object.isRequired,
  currentPlayerId: PropTypes.string.isRequired,
};

export default GameStateDrawer;