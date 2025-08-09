/**
 * @fileoverview Unified PlayerCard component
 * Used across all player displays with consistent styling and avatar backgrounds
 */
import React from 'react';
import type { Player } from '../../../types/shared';
import './PlayerCard.css';

export interface PlayerCardProps {
  player: Player;
  isSelected?: boolean;
  isCurrentPlayer?: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  showStatusEffects?: boolean;
  customStyles?: React.CSSProperties;
}

interface StatusEffectDisplay {
  type: string;
  value: string | number;
  icon: string;
  color: string;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isSelected = false,
  isCurrentPlayer = false,
  onClick,
  size = 'medium',
  showStatusEffects = true,
  customStyles = {},
}) => {
  const getAvatarPath = (player: Player): string => {
    if (!player?.['race'] || !player?.['class']) {
      return '/images/races/random.png';
    }
    
    const race = player['race'].toLowerCase();
    const playerClass = player['class'].toLowerCase();
    
    return `/images/avatars/${race}/${playerClass}.png`;
  };

  const isUnselectedPlayer = !player?.['race'] || !player?.['class'];

  const healthPercent = player?.['hp'] && player?.['maxHp'] 
    ? (player['hp'] / player['maxHp']) * 100 
    : 0;

  const getHealthColor = (percent: number): string => {
    if (percent > 70) return '#4ade80';
    if (percent > 30) return '#fbbf24';
    return '#ef4444';
  };

  const getArmorValue = (player: Player): number => {
    return player?.['armor'] || player?.['baseArmor'] || 0;
  };

  const getStatusEffects = (player: Player): StatusEffectDisplay[] => {
    const effects: StatusEffectDisplay[] = [];
    
    effects.push({
      type: 'armor',
      value: getArmorValue(player),
      icon: '🛡️',
      color: '#6b7280'
    });

    if (player?.['statusEffects']) {
      Object.entries(player['statusEffects']).forEach(([effect, data]) => {
        if (data && typeof data === 'object' && 'active' in data && data.active !== false) {
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
            value: typeof data === 'object' && data !== null 
              ? ('turns' in data ? (data as any).turns : 'stacks' in data ? (data as any).stacks : '') 
              : '',
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
        ${!player?.['isAlive'] ? 'dead' : ''}
        ${onClick ? 'clickable' : ''}
      `}
      onClick={onClick}
      style={customStyles}
    >
      <div 
        className="player-card-background"
        style={{
          backgroundImage: `url(${avatarPath})`,
          backgroundSize: isUnselectedPlayer ? 'contain' : 'cover',
          backgroundPosition: isUnselectedPlayer ? 'center 20%' : 'top center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="player-card-overlay" />
      
      <div className="player-card-content">
        <div className="name-plate">
          <div className="name-bar">
            <span className="player-name">
              {player?.['name'] || 'Unknown'}
            </span>
            {isCurrentPlayer && <span className="current-indicator">YOU</span>}
          </div>
        </div>

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
                {player?.['hp'] || 0}/{player?.['maxHp'] || 0}
              </div>
            </div>
          </div>
        )}
      </div>

      {isSelected && (
        <div className="selection-indicator">
          ✓
        </div>
      )}

      {!player?.['isAlive'] && (
        <div className="dead-overlay">
          <div className="dead-icon">💀</div>
        </div>
      )}
    </div>
  );
};

export default PlayerCard;