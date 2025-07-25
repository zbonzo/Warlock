/**
 * @fileoverview Unified PlayerCard component
 * Used across all player displays with consistent styling and avatar backgrounds
 */
import React from 'react';
import PropTypes from 'prop-types';
import './PlayerCard.css';

/**
 * Unified PlayerCard component
 * @param {Object} props - Component props
 * @param {Object} props.player - Player data object
 * @param {boolean} props.isSelected - Whether this player is selected
 * @param {boolean} props.isCurrentPlayer - Whether this is the current player
 * @param {Function} props.onClick - Click handler
 * @param {string} props.size - Size variant ('small', 'medium', 'large')
 * @param {boolean} props.showStatusEffects - Whether to show status effects bar
 * @param {Object} props.customStyles - Additional custom styles
 */
const PlayerCard = ({
  player,
  isSelected = false,
  isCurrentPlayer = false,
  onClick,
  size = 'medium',
  showStatusEffects = true,
  customStyles = {},
}) => {
  // Generate avatar image path
  const getAvatarPath = (player) => {
    // If player hasn't selected race and class yet, use random.png
    if (!player?.race || !player?.class) {
      return '/images/races/random.png';
    }
    
    const race = player.race.toLowerCase();
    const playerClass = player.class.toLowerCase();
    
    return `/images/avatars/${race}/${playerClass}.png`;
  };

  // Check if player is unselected (no race/class)
  const isUnselectedPlayer = !player?.race || !player?.class;

  // Calculate health percentage
  const healthPercent = player?.hp && player?.maxHp 
    ? (player.hp / player.maxHp) * 100 
    : 0;

  // Get health bar color based on percentage
  const getHealthColor = (percent) => {
    if (percent > 70) return '#4ade80'; // Green
    if (percent > 30) return '#fbbf24'; // Yellow
    return '#ef4444'; // Red
  };

  // Get default armor value
  const getArmorValue = (player) => {
    // Default armor or from player stats
    return player?.armor || player?.baseArmor || 0;
  };

  // Get active status effects
  const getStatusEffects = (player) => {
    const effects = [];
    
    // Always show armor as default
    effects.push({
      type: 'armor',
      value: getArmorValue(player),
      icon: '🛡️',
      color: '#6b7280'
    });

    // Add other status effects if they exist
    if (player?.statusEffects) {
      Object.entries(player.statusEffects).forEach(([effect, data]) => {
        if (data && data.active !== false) {
          let icon = '✨';
          let color = '#8b5cf6';
          
          switch (effect) {
            case 'poisoned':
              icon = '💀';
              color = '#16a34a';
              break;
            case 'blessed':
              icon = '✨';
              color = '#fbbf24';
              break;
            case 'stunned':
              icon = '😵';
              color = '#ef4444';
              break;
            case 'shielded':
              icon = '🛡️';
              color = '#3b82f6';
              break;
            default:
              break;
          }
          
          effects.push({
            type: effect,
            value: typeof data === 'object' ? data.turns || data.stacks || '' : '',
            icon,
            color
          });
        }
      });
    }

    return effects;
  };

  const avatarPath = getAvatarPath(player);
  const healthColor = getHealthColor(healthPercent);
  const statusEffects = getStatusEffects(player);

  return (
    <div 
      className={`
        unified-player-card 
        unified-player-card--${size}
        ${isSelected ? 'selected' : ''}
        ${isCurrentPlayer ? 'current-player' : ''}
        ${!player?.isAlive ? 'dead' : ''}
        ${onClick ? 'clickable' : ''}
      `}
      onClick={onClick}
      style={customStyles}
    >
      {/* Avatar background image */}
      <div 
        className="player-card-background"
        style={{
          backgroundImage: `url(${avatarPath})`,
          backgroundSize: isUnselectedPlayer ? 'contain' : 'cover',
          backgroundPosition: isUnselectedPlayer ? 'center 20%' : 'top center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Overlay for better text readability */}
      <div className="player-card-overlay" />
      
      {/* Card content */}
      <div className="player-card-content">
        {/* Name plate - across the middle */}
        <div className="name-plate">
          <div className="name-bar">
            <span className="player-name">
              {player?.name || 'Unknown'}
            </span>
            {isCurrentPlayer && <span className="current-indicator">YOU</span>}
          </div>
        </div>

        {/* Status effects bar - above health (hide for unselected players) */}
        {showStatusEffects && !isUnselectedPlayer && (
          <div className="status-effects-bar">
            {statusEffects.map((effect, index) => (
              <div 
                key={`${effect.type}-${index}`}
                className="status-effect"
                style={{ color: effect.color }}
                title={`${effect.type}: ${effect.value}`}
              >
                <span className="status-icon">{effect.icon}</span>
                {effect.value && <span className="status-value">{effect.value}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Health bar - at the bottom (hide for unselected players) */}
        {!isUnselectedPlayer && (
          <div className="health-bar-container">
            <div className="health-bar">
              <div 
                className="health-fill"
                style={{
                  width: `${healthPercent}%`,
                  backgroundColor: healthColor,
                  transform: `scaleX(${healthPercent / 100})`,
                  transformOrigin: 'left'
                }}
              />
              <div className="health-text">
                {player?.hp || 0}/{player?.maxHp || 0}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="selection-indicator">
          ✓
        </div>
      )}

      {/* Dead overlay */}
      {!player?.isAlive && (
        <div className="dead-overlay">
          <div className="dead-icon">💀</div>
        </div>
      )}
    </div>
  );
};

PlayerCard.propTypes = {
  player: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    race: PropTypes.string,
    class: PropTypes.string,
    hp: PropTypes.number,
    maxHp: PropTypes.number,
    armor: PropTypes.number,
    baseArmor: PropTypes.number,
    isAlive: PropTypes.bool,
    statusEffects: PropTypes.object,
  }).isRequired,
  isSelected: PropTypes.bool,
  isCurrentPlayer: PropTypes.bool,
  onClick: PropTypes.func,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showStatusEffects: PropTypes.bool,
  customStyles: PropTypes.object,
};

export default PlayerCard;