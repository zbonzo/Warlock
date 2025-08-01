/**
 * @fileoverview Specialized card component for displaying racial abilities
 * with usage limits, cooldowns, and availability states.
 */
import React from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { Ability } from '../../../types/shared';
import { RACE_TO_ABILITY, ABILITY_ICONS } from './racialAbilityData';
import './RacialAbilityCard.css';

interface RacialAbilityCardProps {
  ability?: Ability | null;
  usesLeft: number;
  cooldown: number;
  disabled?: boolean;
  onUse: () => void;
}

/**
 * Gets the appropriate icon for a racial ability
 */
function getRacialAbilityIcon(ability: Ability): React.ReactElement | string {
  // Map racial ability types to their PNG file names
  const racialImageMap: Record<string, string> = {
    'adaptability': 'adaptability.png',
    'bloodRage': 'bloodrage.png',
    'stoneArmor': 'stonearmor.png',
    'undying': 'undying.png',
    'lifeBond': 'lifebond.png',
    'moonbeam': 'moonbeam.png'
  };

  // Check if we have a PNG for this racial ability
  const imageName = racialImageMap[ability['type']];
  if (imageName) {
    return (
      <img 
        src={`/images/abilities/${imageName}`} 
        alt={ability['name']} 
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }

  // Fallback to emoji icons
  return ABILITY_ICONS[ability['type']] || '✨';
}

/**
 * RacialAbilityCard component displays a racial ability with its availability status
 */
const RacialAbilityCard: React.FC<RacialAbilityCardProps> = ({ 
  ability, 
  usesLeft, 
  cooldown, 
  disabled = false, 
  onUse 
}) => {
  const theme = useTheme();
  
  // Skip if no ability provided
  if (!ability) return null;
  
  // Determine if ability is available
  const isAvailable = usesLeft > 0 && cooldown === 0 && !disabled;
  
  // Derive race from ability type
  const race = getRaceFromAbilityType(ability['type']);
  
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
          {ability['name']}
        </div>
        
        <div className="ability-icon-container" style={{ backgroundColor: `${raceColor}30` }}>
          {getRacialAbilityIcon(ability)}
        </div>
      </div>
      
      <div className="ability-description">
        {ability['description']}
      </div>
      
      <div className="ability-status">
        <div className="usage-limit">
          <strong>Limit:</strong> {ability['usageLimit'] === 'perGame' ? 'Once per game' : 'Once per round'}
        </div>
        
        <div className={`status-indicator ${isAvailable ? 'available' : 'unavailable'}`}>
          {statusMessage}
        </div>
      </div>
      
      {ability['usageLimit'] === 'perGame' && (
        <div className="usage-indicators">
          <div className="usage-dots">
            {[...Array((ability as any).maxUses || 1)].map((_, i) => (
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
 */
function getRaceFromAbilityType(abilityType: string): string {
  for (const [race, type] of Object.entries(RACE_TO_ABILITY)) {
    if (type === abilityType) return race;
  }
  return 'Unknown';
}

/**
 * Get race-specific color
 */
function getRaceColor(race: string, theme: any): string {
  switch (race) {
    case 'Artisan': return '#4169E1'; // Royal Blue
    case 'Rockhewn': return '#8B4513'; // Saddle Brown
    case 'Crestfallen': return '#228B22'; // Forest Green
    case 'Orc': return '#8B0000'; // Dark Red
    case 'Kinfolk': return '#9932CC'; // Dark Orchid
    case 'Lich': return '#36454F'; // Charcoal
    default: return theme.colors.primary;
  }
}

/**
 * Get status message based on ability availability
 */
function getStatusMessage(usesLeft: number, cooldown: number, disabled: boolean): string {
  if (usesLeft <= 0) return 'No uses remaining';
  if (cooldown > 0) return `Available in ${cooldown} turn${cooldown !== 1 ? 's' : ''}`;
  if (disabled) return 'Cannot use now';
  return 'Ready to use';
}

export default RacialAbilityCard;