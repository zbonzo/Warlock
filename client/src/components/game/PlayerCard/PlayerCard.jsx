/**
 * @fileoverview Card component that displays player information, stats, 
 * and status effects in a compact, visual format.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import './PlayerCard.css';

/**
 * PlayerCard component displays detailed player information
 * 
 * @param {Object} props - Component props
 * @param {Object} props.player - Player data object
 * @param {boolean} props.isCurrentPlayer - Whether this card represents the current user
 * @param {boolean} props.canSeeWarlock - Whether warlock status should be visible
 * @returns {React.ReactElement} The rendered component
 */
const PlayerCard = ({ player, isCurrentPlayer, canSeeWarlock }) => {
  const theme = useTheme();
  const healthPercent = (player.hp / player.maxHp) * 100;
  
  // Determine health bar color based on percentage
  const healthStatus = healthPercent < 30 ? 'low' : 
                      healthPercent < 70 ? 'medium' : 'high';
  
  return (
    <div className={`player-card ${isCurrentPlayer ? 'current-player' : ''} ${!player.isAlive ? 'dead' : ''}`}>
      <div className="player-header">
        <h3 className="player-name">{player.name}</h3>
        
        {canSeeWarlock && player.isWarlock && (
          <div className="warlock-indicator" title="This player is a Warlock">
            🔮
          </div>
        )}
      </div>
      
      <div className="player-class">
        {player.race} {player.class}
        {isCurrentPlayer && ' (You)'}
      </div>
      
      <div className="health-container">
        <div className="health-text">
          HP: {player.hp}/{player.maxHp}
        </div>
        <div className="health-bar">
          <div 
            className={`health-fill health-${healthStatus}`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      </div>
      
      {player.armor > 0 && (
        <div className="armor-indicator">
          <span className="armor-icon">🛡️</span>
          <span>Base Armor: {player.armor}</span>
        </div>
      )}
      
      {/* Display status effects with icons and tooltips */}
      {player.statusEffects && Object.keys(player.statusEffects).length > 0 && (
        <div className="status-effects-container">
          {Object.entries(player.statusEffects).map(([effect, data]) => {
            const { icon, label } = getStatusEffectDetails(effect);
            const additionalInfo = getStatusEffectInfo(effect, data);
            
            return (
              <div 
                key={effect} 
                className={`status-effect status-${effect}`}
                title={`${label}${additionalInfo}`}
              >
                <span className="status-icon">{icon}</span>
                <span className="status-label">{label}{additionalInfo}</span>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Dead overlay */}
      {!player.isAlive && (
        <div className="dead-overlay">
          💀 Dead
        </div>
      )}
    </div>
  );
};

/**
 * Get details for a specific status effect
 * 
 * @param {string} effect - Effect type name
 * @returns {Object} Icon and label for the effect
 */
function getStatusEffectDetails(effect) {
  switch(effect) {
    case 'poison':
      return { icon: '☠️', label: 'Poison' };
    case 'protected':
      return { icon: '🛡️', label: 'Protected' };
    case 'invisible':
      return { icon: '👻', label: 'Invisible' };
    case 'stunned':
      return { icon: '⚡', label: 'Stunned' };
    default:
      return { icon: '❓', label: effect };
  }
}

/**
 * Generate additional info text for status effects
 * 
 * @param {string} effect - Effect type
 * @param {Object} data - Effect data
 * @returns {string} Formatted additional information
 */
function getStatusEffectInfo(effect, data) {
  let additionalInfo = '';
  
  if (effect === 'protected' && data.armor) {
    additionalInfo = ` +${data.armor} Armor`;
  }
  
  if (data.turns) {
    additionalInfo += ` (${data.turns} turn${data.turns !== 1 ? 's' : ''})`;
  }
  
  if (effect === 'poison' && data.damage) {
    additionalInfo += ` (${data.damage} dmg)`;
  }
  
  return additionalInfo;
}

PlayerCard.propTypes = {
  player: PropTypes.shape({
    name: PropTypes.string.isRequired,
    race: PropTypes.string,
    class: PropTypes.string,
    hp: PropTypes.number.isRequired,
    maxHp: PropTypes.number.isRequired,
    armor: PropTypes.number,
    isAlive: PropTypes.bool.isRequired,
    isWarlock: PropTypes.bool,
    statusEffects: PropTypes.object
  }).isRequired,
  isCurrentPlayer: PropTypes.bool.isRequired,
  canSeeWarlock: PropTypes.bool
};

PlayerCard.defaultProps = {
  canSeeWarlock: false
};

export default PlayerCard;