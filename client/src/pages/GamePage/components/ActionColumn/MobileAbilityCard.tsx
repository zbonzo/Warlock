/**
 * @fileoverview Mobile ability card component for action selection
 * Extracted from ActionColumn for better component organization
 */
import React from 'react';
import { Ability, Player } from '@/types/game';
import { getAbilityIcon } from '@/utils/abilityUtils';

interface MobileAbilityCardProps {
  ability: Ability;
  selected: boolean;
  onSelect: (abilityType: string) => void;
  locked?: boolean;
  cooldown?: number;
  player: Player;
  isSelectable?: boolean;
}

/**
 * Mobile-optimized ability card component
 */
const MobileAbilityCard: React.FC<MobileAbilityCardProps> = ({ 
  ability, 
  selected, 
  onSelect, 
  locked = false, 
  cooldown = 0, 
  player,
  isSelectable = true 
}) => {
  const handleClick = (): void => {
    if (!locked && !cooldown && isSelectable) {
      onSelect(ability.type);
    }
  };

  return (
    <div
      className={`ability-card-mobile ${selected ? 'selected' : ''} ${locked || cooldown > 0 || !isSelectable ? 'disabled' : ''}`}
      onClick={handleClick}
      style={{
        padding: '8px',
        border: selected ? '2px solid #007bff' : '1px solid #ccc',
        borderRadius: '8px',
        margin: '4px',
        cursor: (locked || cooldown > 0 || !isSelectable) ? 'not-allowed' : 'pointer',
        opacity: (locked || cooldown > 0 || !isSelectable) ? 0.5 : 1,
        backgroundColor: selected ? '#e3f2fd' : 'white',
        minHeight: '80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: '24px', marginBottom: '4px' }}>
        {getAbilityIcon(ability, false)}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
        {ability.name}
      </div>
      {cooldown > 0 && (
        <div style={{ fontSize: '10px', color: 'red' }}>
          Cooldown: {cooldown}
        </div>
      )}
      {locked && (
        <div style={{ fontSize: '10px', color: 'gray' }}>
          Locked
        </div>
      )}
    </div>
  );
};

export default MobileAbilityCard;