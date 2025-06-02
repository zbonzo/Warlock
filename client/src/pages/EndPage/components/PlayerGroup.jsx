/**
 * @fileoverview Group component for displaying a team of players
 * Used for good players and warlocks in the end screen
 */
import React from 'react';
import PropTypes from 'prop-types';
import './PlayerGroup.css';

/**
 * PlayerGroup component displays a group of players with their info
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Group title
 * @param {Array} props.players - List of players in this group
 * @param {string} props.color - Theme color for this group
 * @returns {React.ReactElement} The rendered component
 */
const PlayerGroup = ({ title, players, color }) => {
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

PlayerGroup.propTypes = {
  title: PropTypes.string.isRequired,
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      race: PropTypes.string,
      class: PropTypes.string,
      isAlive: PropTypes.bool.isRequired
    })
  ).isRequired,
  color: PropTypes.string.isRequired
};

export default PlayerGroup;
