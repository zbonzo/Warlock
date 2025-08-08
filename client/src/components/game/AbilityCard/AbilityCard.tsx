/**
 * @fileoverview Fixed AbilityCard component with proper damage modifier display
 * Shows actual modified damage values using server's damage calculation system
 */
import React from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { Ability, Player } from '@/types/game';
import {
  getCategoryColor,
  getRaceColor,
  getAbilityIcon,
  getRacialStatus,
  getEffectDescription,
  type DamageInfo,
  type HealingInfo
} from '@/utils/abilityUtils';
import {
  calculateDamageInfo,
  calculateHealingInfo,
  calculateDamagePerHit,
  calculateShieldInfo,
  getDamageText,
  getHealingText,
  getPoisonDamageText
} from '@/utils/damageCalculations';
import './AbilityCard.css';

interface AbilityCardProps {
  ability: Ability;
  selected: boolean;
  onSelect: (abilityType: string) => void;
  isRacial?: boolean;
  raceName?: string | null;
  usesLeft?: number | null;
  cooldown?: number | null;
  abilityCooldown?: number;
  player?: Player | null;
}


/**
 * AbilityCard component renders ability information with proper damage modifiers
 */
const AbilityCard: React.FC<AbilityCardProps> = ({
  ability,
  selected,
  onSelect,
  isRacial = false,
  raceName = null,
  usesLeft = null,
  cooldown = null,
  abilityCooldown = 0,
  player = null,
}) => {
  const theme = useTheme();

  // Skip rendering if this is a racial ability with no uses left
  if (isRacial && usesLeft === 0) {
    return null;
  }

  // Determine if ability is available
  let isAvailable = true;
  let unavailableReason: string | null = null;

  if (isRacial) {
    // Racial ability availability
    isAvailable = usesLeft !== null && usesLeft > 0 && cooldown === 0;
    if (usesLeft !== null && usesLeft <= 0) {
      unavailableReason = 'No uses remaining';
    } else if (cooldown !== null && cooldown > 0) {
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
        {getEffectDescription(ability, isRacial, player)}
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
      {!isRacial && abilityCooldown === 0 && ability.cooldown && ability.cooldown > 0 && (
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

export default AbilityCard;
