/**
 * @fileoverview Player column component that displays player information
 * Shows current player status at the top and other players below
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import PlayerCard from '@components/game/PlayerCard';
import './PlayerColumn.css';

/**
 * PlayerColumn component handles displaying player information
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether column is currently visible
 * @param {Object} props.me - Current player data
 * @param {Array} props.players - List of all players in the game
 * @returns {React.ReactElement|null} The rendered component or null if not visible
 */
const PlayerColumn = ({ isVisible, me, players }) => {
  const theme = useTheme();
  
  // Don't render if not visible (mobile view handling)
  if (!isVisible) return null;
  
  return (
    <div className="player-column">
      <h2 className="section-title">Your Character</h2>
      
      {/* Current player card */}
      <PlayerCard 
        player={me} 
        isCurrentPlayer={true}
        canSeeWarlock={me?.isWarlock}
      />
      
      <h3 className="section-title secondary">
        Other Players
      </h3>
      
      {/* Other players list */}
      <div className="players-list">
        {players
          .filter(p => p.id !== me.id)
          .map(player => (
            <PlayerCard 
              key={player.id} 
              player={player} 
              isCurrentPlayer={false}
              canSeeWarlock={me?.isWarlock}
            />
          ))}
      </div>
    </div>
  );
};

PlayerColumn.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  me: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    race: PropTypes.string,
    class: PropTypes.string,
    hp: PropTypes.number.isRequired,
    maxHp: PropTypes.number.isRequired,
    isAlive: PropTypes.bool.isRequired,
    isWarlock: PropTypes.bool,
    racialAbility: PropTypes.object,
    statusEffects: PropTypes.object
  }).isRequired,
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    })
  ).isRequired
};

export default PlayerColumn;

