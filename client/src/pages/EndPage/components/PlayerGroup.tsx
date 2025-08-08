/**
 * @fileoverview Group component for displaying a team of players
 * Used for good players and warlocks in the end screen
 */
import React from 'react';
import './PlayerGroup.css';

interface Player {
  id: string;
  name: string;
  race?: string;
  class?: string;
  isAlive: boolean;
}

interface PlayerGroupProps {
  title: string;
  players: Player[];
  color: string;
}

/**
 * PlayerGroup component displays a group of players with their info
 */
const PlayerGroup: React.FC<PlayerGroupProps> = ({ title, players, color }) => {
  return (
    <div 
      className="player-group"
      style={{
        backgroundColor: `${color}15`,
        borderLeft: `4px solid ${color}`
      }}
    >
      <h2 
        className="group-title"
        style={{ color }}
      >
        {title}
      </h2>
      
      <div className="player-badges">
        {players.map(player => (
          <div 
            key={player.id} 
            className={`player-badge ${!player.isAlive ? 'dead' : ''}`}
            style={{
              borderColor: player.isAlive ? color : '#ccc'
            }}
          >
            <span className="player-name">{player.name}</span>
            <span className="player-separator">•</span>
            <span className="player-character">
              {player.race} {player.class}
            </span>
            {!player.isAlive && (
              <span className="death-indicator">💀</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerGroup;