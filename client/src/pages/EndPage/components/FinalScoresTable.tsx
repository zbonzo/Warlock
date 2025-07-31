/**
 * @fileoverview Final Scores table component for displaying player statistics at game end
 * Shows all players with their stats, highlighting warlocks in red and players in green
 */
import React from 'react';
import './FinalScoresTable.css';

interface PlayerStats {
  timesDied?: number;
  kills?: number;
  totalDamageDealt?: number;
  totalHealingDone?: number;
  corruptionsPerformed?: number;
}

interface Player {
  id: string;
  name: string;
  race?: string;
  class?: string;
  isWarlock: boolean;
  isAlive: boolean;
  stats?: PlayerStats;
}

interface FinalScoresTableProps {
  players: Player[];
}

/**
 * FinalScoresTable component displays all players with their game statistics
 */
const FinalScoresTable: React.FC<FinalScoresTableProps> = ({ players }) => {
  // Sort players by whether they're alive, then by warlock status, then by name
  const sortedPlayers = [...players].sort((a, b) => {
    // First sort by alive status (alive players first)
    if (a.isAlive !== b.isAlive) {
      return Number(b.isAlive) - Number(a.isAlive);
    }
    // Then sort by warlock status (players first)
    if (a.isWarlock !== b.isWarlock) {
      return Number(a.isWarlock) - Number(b.isWarlock);
    }
    // Finally sort alphabetically by name
    return a.name.localeCompare(b.name);
  });

  const getPlayerRowClass = (player: Player): string => {
    let classes = 'player-row';
    if (player.isWarlock) {
      classes += ' warlock-row';
    } else {
      classes += ' player-row-good';
    }
    if (!player.isAlive) {
      classes += ' dead-row';
    }
    return classes;
  };

  const getClassIcon = (playerClass?: string): React.ReactElement => {
    if (!playerClass) {
      return <span className="class-icon-emoji">⚔️</span>;
    }
    
    const className = playerClass.toLowerCase();
    const imagePath = `/images/classes/${className}.png`;
    
    return (
      <img 
        src={imagePath} 
        alt={playerClass} 
        className="class-icon-image"
        onError={(e) => {
          // Fallback to emoji if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const nextSibling = target.nextSibling as HTMLElement;
          if (nextSibling) {
            nextSibling.style.display = 'inline';
          }
        }}
      />
    );
  };

  return (
    <div className="final-scores-container">
      <h3 className="final-scores-title">FINAL SCORES</h3>
      
      <div className="scores-table">
        <div className="table-header">
          <div className="header-player">PLAYER</div>
          <div className="header-stat">💀</div>
          <div className="header-stat">⚔️</div>
          <div className="header-stat">❤️</div>
          <div className="header-stat">🟣</div>
        </div>
        
        {sortedPlayers.map(player => (
          <div key={player.id} className={getPlayerRowClass(player)}>
            <div className="player-info">
              <span className="class-icon">
                {getClassIcon(player.class)}
                <span className="class-icon-emoji" style={{display: 'none'}}>⚔️</span>
              </span>
              <span className="player-name">{player.name}</span>
              {!player.isAlive && <span className="death-indicator">🪦</span>}
            </div>
            <div className="player-stat">{player.stats?.timesDied || 0}</div>
            <div className="player-stat">{player.stats?.totalDamageDealt || 0}</div>
            <div className="player-stat">{player.stats?.totalHealingDone || 0}</div>
            <div className="player-stat">{player.stats?.corruptionsPerformed || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinalScoresTable;