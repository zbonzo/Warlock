/**
 * @fileoverview Enhanced AbilityCard component with cooldown support
 * Displays abilities with cooldown information and visual indicators
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import './AbilityCard.css';

/**
 * AbilityCard component renders ability information with cooldown support
 *
 * @param {Object} props - Component props
 * @param {Object} props.ability - The ability data to display
 * @param {boolean} props.selected - Whether this ability is currently selected
 * @param {Function} props.onSelect - Callback when the ability is selected
 * @param {boolean} [props.isRacial=false] - Whether this is a racial ability
 * @param {string} [props.raceName=null] - The name of the race (for racial abilities)
 * @param {number} [props.usesLeft=null] - Number of uses remaining (for racial abilities)
 * @param {number} [props.cooldown=null] - Cooldown turns remaining (for racial abilities)
 * @param {number} [props.abilityCooldown=0] - Class ability cooldown remaining
 * @returns {React.ReactElement|null} The rendered component or null if unavailable
 */
const AbilityCard = ({
  ability,
  selected,
  onSelect,
  isRacial = false,
  raceName = null,
  usesLeft = null,
  cooldown = null,
  abilityCooldown = 0,
}) => {
  const theme = useTheme();

  // Skip rendering if this is a racial ability with no uses left
  if (isRacial && usesLeft === 0) {
    return null;
  }

  // Determine if ability is available
  let isAvailable = true;
  let unavailableReason = null;

  if (isRacial) {
    // Racial ability availability
    isAvailable = usesLeft > 0 && cooldown === 0;
    if (usesLeft <= 0) {
      unavailableReason = 'No uses remaining';
    } else if (cooldown > 0) {
      unavailableReason = `${cooldown} turn${cooldown > 1 ? 's' : ''} remaining`;
    }
  } else {
    // Class ability availability (check cooldown)
    isAvailable = abilityCooldown === 0;
    if (abilityCooldown > 0) {
      unavailableReason = `${abilityCooldown} turn${abilityCooldown > 1 ? 's' : ''} remaining`;
    }
  }

  // Get the right color based on ability type
  const cardColor = isRacial
    ? getRaceColor(raceName, theme)
    : getCategoryColor(ability.category, theme);

  // For racial abilities, get status message
  const racialStatus = getRacialStatus(usesLeft, cooldown);

  // Handle click
  const handleClick = () => {
    if (isAvailable) {
      onSelect(ability.type);
    }
  };

  return (
    <div
      className={`ability-card ${isRacial ? 'racial-ability' : ''} ${selected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
      onClick={handleClick}
    >
      <div className="ability-header" style={{ backgroundColor: cardColor }}>
        <span className="ability-title">
          {ability.name}
          {isRacial && raceName && (
            <span className="ability-subtitle"> ({raceName} Ability)</span>
          )}
        </span>
        <span className="ability-icon">
          {getAbilityIcon(ability, isRacial)}
        </span>
      </div>
      <div className="ability-flavor-text">
        {ability.flavorText || 'No flavor text available'}
      </div>
      <div className="ability-description">
        {getEffectDescription(ability, isRacial)}
      </div>
      {/* Cooldown indicator for class abilities */}
      {!isRacial && abilityCooldown > 0 && (
        <div className="ability-cooldown">
          <div className="cooldown-indicator">
            <span className="cooldown-icon">⏳</span>
            <span className="cooldown-text">
              Cooldown: {abilityCooldown} turn{abilityCooldown > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
      {/* Base cooldown info for class abilities (when not on cooldown) */}
      {!isRacial && abilityCooldown === 0 && ability.cooldown > 0 && (
        <div className="ability-cooldown-info">
          <span className="cooldown-info-text">
            Cooldown: {ability.cooldown} turn{ability.cooldown > 1 ? 's' : ''}
          </span>
        </div>
      )}
      {/* Racial ability status info */}
      {isRacial && (
        <div className="racial-status">
          <div className="usage-limit">
            <strong>Limit:</strong>{' '}
            {ability.usageLimit === 'perGame'
              ? 'Once per game'
              : 'Once per round'}
          </div>

          {racialStatus && (
            <div
              className={`status-indicator ${isAvailable ? 'available' : 'unavailable'}`}
            >
              {racialStatus}
            </div>
          )}
        </div>
      )}
      {/* Unavailable overlay */}
      {!isAvailable && (
        <div className="ability-unavailable-overlay">
          <div className="unavailable-reason">{unavailableReason}</div>
        </div>
      )}
    </div>
  );
};

/**
 * Get appropriate color for ability category
 *
 * @param {string} category - The category of the ability
 * @param {Object} theme - Theme object with color definitions
 * @returns {string} Color code for the category
 */
function getCategoryColor(category, theme) {
  const categoryColors = {
    Attack: theme.colors.danger,
    Defense: theme.colors.primary,
    Heal: theme.colors.accent,
    Special: theme.colors.secondary,
    Racial: '#8B5A00', // Bronze/Gold color for racial abilities
  };

  return categoryColors[category] || categoryColors.Special;
}

/**
 * Get race-specific color for racial abilities
 *
 * @param {string} race - The race name
 * @param {Object} theme - Theme object with color definitions
 * @returns {string} Color code for the race
 */
function getRaceColor(race, theme) {
  if (!race) return getCategoryColor('Racial', theme);

  switch (race) {
    case 'Human':
      return '#4169E1'; // Royal Blue
    case 'Dwarf':
      return '#8B4513'; // Saddle Brown
    case 'Elf':
      return '#228B22'; // Forest Green
    case 'Orc':
      return '#8B0000'; // Dark Red
    case 'Satyr':
      return '#9932CC'; // Dark Orchid
    case 'Skeleton':
      return '#36454F'; // Charcoal
    default:
      return getCategoryColor('Racial', theme);
  }
}

/**
 * Get appropriate icon for ability type
 *
 * @param {Object} ability - The ability object
 * @param {boolean} isRacial - Whether this is a racial ability
 * @returns {string} Icon representation for the ability
 */
function getAbilityIcon(ability, isRacial) {
  // Special icons for racial abilities
  if (isRacial) {
    switch (ability.type) {
      case 'adaptability':
        return '🔄';
      case 'stoneResolve':
        return '🛡️';
      case 'keenSenses':
        return '👁️';
      case 'bloodRage':
        return '💢';
      case 'forestsGrace':
        return '🌿';
      case 'undying':
        return '💀';
      default:
        return '✨';
    }
  }

  // Regular ability icons
  const { category, effect, type } = ability;
  if (category === 'Attack') return '⚔️';
  if (category === 'Heal') return '💚';

  if (category === 'Defense') {
    if (effect === 'protected') return '🛡️';
    if (effect === 'invisible') return '👻';
    return '🛡️';
  }

  if (category === 'Special') {
    if (effect === 'poison') return '☠️';
    if (effect === 'stunned') return '⚡';
    if (effect === 'detect') return '👁️';
    if (type === 'entangle') return '🌿';
    return '✨';
  }

  return '❓';
}

/**
 * Get a descriptive effect text
 *
 * @param {Object} ability - The ability object
 * @param {boolean} isRacial - Whether this is a racial ability
 * @returns {string} Human-readable description of the ability effect
 */
function getEffectDescription(ability, isRacial) {
  if (isRacial) {
    return ability.description;
  }

  const { category, effect, params, type, target } = ability;

  let description = '';

  if (category === 'Attack') {
    description = `Deals ${params.damage || 0} damage`;
    if (effect === 'poison') {
      description += ` and poisons for ${params.poison.damage} damage over ${params.poison.turns} turns`;
    }
  } else if (category === 'Heal') {
    description = `Restores ${params.amount || 0} HP`;
    if (target === 'Multi') {
      description += ' to multiple targets';
    }
  } else if (category === 'Defense') {
    if (effect === 'protected') {
      description = `Adds ${params.armor || 0} armor for ${params.duration || 1} turn${params.duration !== 1 ? 's' : ''}`;
    } else if (effect === 'invisible') {
      description = `Makes target invisible for ${params.duration || 1} turn${params.duration !== 1 ? 's' : ''}`;
    }
  } else if (category === 'Special') {
    if (effect === 'poison') {
      description = `Poisons for ${params.poison?.damage || 0} damage over ${params.poison?.turns || 0} turns`;
    } else if (effect === 'stunned' || type === 'entangle') {
      description = 'Has a 50% chance to stun targets for 1 turn';
    } else if (effect === 'detect') {
      description = 'Reveals hidden information';
    } else if (params.damage) {
      description = `Deals ${params.damage} damage`;
      if (target === 'Multi') {
        description += ' to multiple targets';
      }
    }
  }

  return description;
}

/**
 * Get status message for racial abilities
 *
 * @param {number|null} usesLeft - Number of uses remaining
 * @param {number|null} cooldown - Cooldown turns remaining
 * @returns {string|null} Status message or null if not applicable
 */
function getRacialStatus(usesLeft, cooldown) {
  if (usesLeft === null || cooldown === null) return null;

  if (cooldown > 0)
    return `Available in ${cooldown} turn${cooldown !== 1 ? 's' : ''}`;
  return 'Ready to use';
}

AbilityCard.propTypes = {
  ability: PropTypes.shape({
    type: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    category: PropTypes.string,
    effect: PropTypes.string,
    target: PropTypes.string,
    description: PropTypes.string,
    params: PropTypes.object,
    usageLimit: PropTypes.string,
    cooldown: PropTypes.number,
  }).isRequired,
  selected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  isRacial: PropTypes.bool,
  raceName: PropTypes.string,
  usesLeft: PropTypes.number,
  cooldown: PropTypes.number,
  abilityCooldown: PropTypes.number,
  flavorText: PropTypes.string,
};

export default AbilityCard;
