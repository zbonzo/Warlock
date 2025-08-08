/**
 * @fileoverview GameState drawer component for mobile
 * Shows Player and History columns in a drawer format
 */
import React, { useState } from 'react';
import PlayerColumn from '../PlayerColumn';
import HistoryColumn from '../HistoryColumn';
import { Player, GameEvent } from '@/types/game';
import './GameStateDrawer.css';

type DrawerTab = 'players' | 'history';

interface LastEventData {
  turn: number;
  events: GameEvent[];
  [key: string]: any;
}

interface GameStateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToActions: () => void;
  
  // Player column props
  players: Player[];
  me: Player;
  alivePlayers: Player[];
  selectedTarget?: string | null;
  onTargetSelect: (targetId: string) => void;
  
  // History column props
  eventsLog: Array<{ turn: number; events: GameEvent[] }>;
  lastEvent: LastEventData;
  currentPlayerId: string;
}

/**
 * GameState drawer - shows Player and History columns on mobile
 */
const GameStateDrawer: React.FC<GameStateDrawerProps> = ({
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
  const [activeTab, setActiveTab] = useState<DrawerTab>('players');

  if (!isOpen) return null;

  const handleTabChange = (tab: DrawerTab): void => {
    setActiveTab(tab);
  };

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
                onClick={() => handleTabChange('players')}
              >
                <span className="tab-icon">👤</span>
                <span className="tab-label">Players</span>
              </button>
              
              <button
                className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => handleTabChange('history')}
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

export default GameStateDrawer;