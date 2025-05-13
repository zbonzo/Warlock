/**
 * @fileoverview Specialized card component for displaying racial abilities
 * with usage limits, cooldowns, and availability states.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import { RACE_TO_ABILITY, ABILITY_ICONS } from './racialAbilityData';
import './RacialAbilityCard.css';

/**
 * RacialAbilityCard component displays a racial ability with its availability status
 * 
 * @param {Object} props - Component props
 * @param {Object} props.ability - The racial ability data
 * @param {number} props.usesLeft - Number of uses remaining
 * @param {number} props.cooldown - Cooldown turns remaining
 * @param {boolean} props.disabled - Whether the ability is disabled for other reasons
 * @param {Function} props.onUse - Callback when the ability is used
 * @returns {React.ReactElement|null} The rendered component or null if no ability
 */
const RacialAbilityCard = ({ ability, usesLeft, cooldown, disabled, onUse }) => {
  const theme = useTheme();
  
  // Skip if no ability provided
  if (!ability) return null;
  
  // Determine if ability is available
  const isAvailable = usesLeft > 0 && cooldown === 0 && !disabled;
  
  // Derive race from ability type
  const race = getRaceFromAbilityType(ability.type);
  
  // Get status message
  const statusMessage = getStatusMessage(usesLeft, cooldown, disabled);
  
  // Card color based on race
  const raceColor = getRaceColor(race, theme);
  
  return (
    <div 
      className={`racial-ability-card ${isAvailable ? 'available' : 'unavailable'}`}
      onClick={() => isAvailable && onUse()}
    >
      <div className="ability-header">
        <div className="ability-title" style={{ backgroundColor: raceColor }}>
          {ability.name}
        </div>
        
        <div className="ability-icon-container" style={{ backgroundColor: `${raceColor}30` }}>
          {ABILITY_ICONS[ability.type] || '✨'}
        </div>
      </div>
      
      <div className="ability-description">
        {ability.description}
      </div>
      
      <div className="ability-status">
        <div className="usage-limit">
          <strong>Limit:</strong> {ability.usageLimit === 'perGame' ? 'Once per game' : 'Once per round'}
        </div>
        
        <div className={`status-indicator ${isAvailable ? 'available' : 'unavailable'}`}>
          {statusMessage}
        </div>
      </div>
      
      {ability.usageLimit === 'perGame' && (
        <div className="usage-indicators">
          <div className="usage-dots">
            {[...Array(ability.maxUses || 1)].map((_, i) => (
              <div
                key={i}
                className={`usage-dot ${i < usesLeft ? 'active' : 'inactive'}`}
                style={{ backgroundColor: i < usesLeft ? raceColor : undefined }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Get the race associated with an ability type
 * 
 * @param {string} abilityType - The ability type to look up
 * @returns {string} The race name, or 'Unknown' if not found
 */
function getRaceFromAbilityType(abilityType) {
  for (const [race, type] of Object.entries(RACE_TO_ABILITY)) {
    if (type === abilityType) return race;
  }
  return 'Unknown';
}

/**
 * Get race-specific color
 * 
 * @param {string} race - Race name
 * @param {Object} theme - Theme object
 * @returns {string} Color code for the race
 */
function getRaceColor(race, theme) {
  switch (race) {
    case 'Human': return '#4169E1'; // Royal Blue
    case 'Dwarf': return '#8B4513'; // Saddle Brown
    case 'Elf': return '#228B22'; // Forest Green
    case 'Orc': return '#8B0000'; // Dark Red
    case 'Satyr': return '#9932CC'; // Dark Orchid
    case 'Skeleton': return '#36454F'; // Charcoal
    default: return theme.colors.primary;
  }
}

/**
 * Get status message based on ability availability
 * 
 * @param {number} usesLeft - Number of uses remaining
 * @param {number} cooldown - Cooldown turns remaining
 * @param {boolean} disabled - Whether ability is disabled
 * @returns {string} Status message
 */
function getStatusMessage(usesLeft, cooldown, disabled) {
  if (usesLeft <= 0) return 'No uses remaining';
  if (cooldown > 0) return `Available in ${cooldown} turn${cooldown !== 1 ? 's' : ''}`;
  if (disabled) return 'Cannot use now';
  return 'Ready to use';
}

RacialAbilityCard.propTypes = {
  ability: PropTypes.shape({
    type: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    usageLimit: PropTypes.string.isRequired,
    maxUses: PropTypes.number
  }),
  usesLeft: PropTypes.number.isRequired,
  cooldown: PropTypes.number.isRequired,
  disabled: PropTypes.bool,
  onUse: PropTypes.func.isRequired
};

RacialAbilityCard.defaultProps = {
  disabled: false
};

export default RacialAbilityCard;