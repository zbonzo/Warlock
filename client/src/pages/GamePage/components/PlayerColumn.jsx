/**
 * @fileoverview Player column component that displays player information
 * Shows current player status at the top and other players below
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import { PlayerCard } from '../../../components/common/PlayerCard';
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
  
  // Filter players based on current player's warlock status
  const otherPlayers = players.filter(p => p.id !== me.id);
  
  let warlockPlayers = [];
  let regularPlayers = [];
  
  if (me?.isWarlock) {
    // If current player is a warlock, separate other warlocks from regular players
    warlockPlayers = otherPlayers.filter(p => p.isWarlock);
    regularPlayers = otherPlayers.filter(p => !p.isWarlock);
  } else {
    // If current player is not a warlock, all others are just "Other Players"
    regularPlayers = otherPlayers;
  }

  return (
    <div className="player-column">
      {/* Show Other Warlocks section if current player is a warlock */}
      {me?.isWarlock && warlockPlayers.length > 0 && (
        <>
          <h3 className="section-title">Other Warlocks</h3>
          <div className="players-list">
            {warlockPlayers.map(player => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                isCurrentPlayer={false}
                size="medium"
                showStatusEffects={true}
              />
            ))}
          </div>
        </>
      )}
      
      {/* Other Players section */}
      {regularPlayers.length > 0 && (
        <>
          <h3 className="section-title">Other Players</h3>
          <div className="players-list">
            {regularPlayers.map(player => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                isCurrentPlayer={false}
                size="medium"
                showStatusEffects={true}
              />
            ))}
          </div>
        </>
      )}
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

