/**
 * @fileoverview Card component that displays player information, stats,
 * and status effects in a compact, visual format.
 */
import React from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { Player, StatusEffects } from '@/types/game';
import './PlayerCard.css';

interface PlayerCardProps {
  player: Player;
  isCurrentPlayer: boolean;
  canSeeWarlock?: boolean;
}

interface StatusEffectDetails {
  icon: string;
  label: string;
}

/**
 * PlayerCard component displays detailed player information
 */
const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  isCurrentPlayer, 
  canSeeWarlock = false 
}) => {
  const theme = useTheme();
  const healthPercent = (player.hp / player.maxHp) * 100;

  // Determine health bar color based on percentage
  const healthStatus =
    healthPercent < 30 ? 'low' : healthPercent < 70 ? 'medium' : 'high';

  /**
   * Convert text to Zalgo text (corrupted appearance)
   */
  const toZalgo = (text: string): string => {
    // Zalgo combining characters (above, middle, below)
    const zalgoAbove = [
      '\u030d',
      '\u030e',
      '\u0304',
      '\u0305',
      '\u033f',
      '\u0311',
      '\u0306',
      '\u0310',
      '\u0352',
      '\u0357',
      '\u0351',
      '\u0307',
      '\u0308',
      '\u030a',
      '\u0342',
      '\u0343',
      '\u0344',
      '\u034a',
      '\u034b',
      '\u034c',
      '\u0303',
      '\u0302',
      '\u030c',
      '\u0350',
      '\u0300',
      '\u0301',
      '\u030b',
      '\u030f',
      '\u0312',
      '\u0313',
      '\u0314',
      '\u033d',
      '\u0309',
      '\u0363',
      '\u0364',
      '\u0365',
      '\u0366',
      '\u0367',
      '\u0368',
      '\u0369',
      '\u036a',
      '\u036b',
      '\u036c',
      '\u036d',
      '\u036e',
      '\u036f',
      '\u033e',
      '\u035b',
      '\u0346',
      '\u031a',
    ];
    const zalgoMiddle = [
      '\u0315',
      '\u031b',
      '\u0340',
      '\u0341',
      '\u0358',
      '\u0321',
      '\u0322',
      '\u0327',
      '\u0328',
      '\u0334',
      '\u0335',
      '\u0336',
      '\u034f',
      '\u035c',
      '\u035d',
      '\u035e',
      '\u035f',
      '\u0360',
      '\u0362',
      '\u0338',
      '\u0337',
      '\u0361',
      '\u0489',
    ];
    const zalgoBelow = [
      '\u0316',
      '\u0317',
      '\u0318',
      '\u0319',
      '\u031c',
      '\u031d',
      '\u031e',
      '\u031f',
      '\u0320',
      '\u0324',
      '\u0325',
      '\u0326',
      '\u0329',
      '\u032a',
      '\u032b',
      '\u032c',
      '\u032d',
      '\u032e',
      '\u032f',
      '\u0330',
      '\u0331',
      '\u0332',
      '\u0333',
      '\u0339',
      '\u033a',
      '\u033b',
      '\u033c',
      '\u0345',
      '\u0347',
      '\u0348',
      '\u0349',
      '\u034d',
      '\u034e',
      '\u0353',
      '\u0354',
      '\u0355',
      '\u0356',
      '\u0359',
      '\u035a',
      '\u0323',
    ];

    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += text[i];

      // Add random zalgo characters
      for (let j = 0; j < Math.floor(Math.random() * 3) + 1; j++) {
        const charType = Math.floor(Math.random() * 3);
        if (charType === 0 && zalgoAbove.length > 0) {
          result += zalgoAbove[Math.floor(Math.random() * zalgoAbove.length)];
        } else if (charType === 1 && zalgoMiddle.length > 0) {
          result += zalgoMiddle[Math.floor(Math.random() * zalgoMiddle.length)];
        } else if (zalgoBelow.length > 0) {
          result += zalgoBelow[Math.floor(Math.random() * zalgoBelow.length)];
        }
      }
    }
    return result;
  };

  // Create the character display string
  const characterString = `${player.name} - ${player.race || 'Unknown'} ${player.class || 'Unknown'}`;

  // Determine if we should show warlock text
  const shouldShowAsWarlock = canSeeWarlock && player.isWarlock;
  const displayName = shouldShowAsWarlock
    ? toZalgo(characterString)
    : characterString;

  return (
    <div
      className={`player-card ${isCurrentPlayer ? 'current-player' : ''} ${!player.isAlive ? 'dead' : ''} ${shouldShowAsWarlock ? 'warlock-player' : ''}`}
    >
      {/* Character name and class at the top */}
      <div className="character-header">
        <h3
          className={`character-name ${shouldShowAsWarlock ? 'warlock-text' : ''}`}
        >
          {displayName}
          {isCurrentPlayer && ' (You)'}
        </h3>
      </div>

      {/* Health display */}
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

      {/* Armor display */}
      {player.armor > 0 && (
        <div className="armor-indicator">
          <span className="armor-icon">🛡️</span>
          <span>Base Armor: {player.armor}</span>
        </div>
      )}

      {/* Status effects */}
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
                <span className="status-label">
                  {label}
                  {additionalInfo}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Dead overlay */}
      {!player.isAlive && <div className="dead-overlay">💀 Dead</div>}
    </div>
  );
};

/**
 * Get details for a specific status effect
 */
function getStatusEffectDetails(effect: string): StatusEffectDetails {
  switch (effect) {
    case 'poison':
      return { icon: '☠️', label: 'Poison' };
    case 'shielded':
      return { icon: '🛡️', label: 'Shielded' };
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
 */
function getStatusEffectInfo(effect: string, data: any): string {
  let additionalInfo = '';

  if (effect === 'shielded' && data.armor) {
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

export default PlayerCard;