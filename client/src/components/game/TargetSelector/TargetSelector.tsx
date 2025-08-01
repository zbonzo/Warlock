/**
 * @fileoverview Enhanced TargetSelector with Monster first and custom split-circle avatars
 * Used in game actions to choose where to apply an ability
 */
import React, { useEffect, useRef } from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { Player, Monster, Ability } from '@/types/game';
import { ICONS } from '../../../config/constants';
import './TargetSelector.css';
// Import mobile target card styling for unified interface
import '../../../pages/GamePage/components/MobileActionWizard/TargetSelectionStep.css';

interface TargetSelectorProps {
  alivePlayers: Player[];
  monster: Monster;
  currentPlayerId: string;
  selectedTarget?: string;
  onSelectTarget: (targetId: string) => void;
  disableMonster?: boolean;
  selectedAbility?: Ability | null;
}

interface MonsterAvatarProps {
  monster: Monster;
}

interface CustomAvatarProps {
  player: Player;
  isCurrentPlayer: boolean;
}

/**
 * Draws a 40×40 circle with race color background, class emoji, and player initial on top
 */
function drawPlayerBadge(
  canvas: HTMLCanvasElement, 
  classEmoji: string, 
  letter: string, 
  raceColor: string
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const size = Math.min(canvas.width, canvas.height);
  const cx = size / 2;
  const cy = size / 2;
  const r = cx - 2; // 2px padding

  ctx.clearRect(0, 0, size, size);

  // Race color background circle
  ctx.fillStyle = raceColor;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.fill();

  // Circle outline
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.stroke();

  // Class emoji in the background
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${r * 1.4}px serif`;
  ctx.fillText(classEmoji, cx, cy);

  // Player initial on top
  ctx.font = `${r * 1.2}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Stroke at 100% opacity
  ctx.lineWidth = r * 0.15;
  ctx.strokeStyle = '#000';
  ctx.globalAlpha = 1.0;
  ctx.strokeText(letter, cx, cy);

  // Fill at 60% opacity
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.6;
  ctx.fillText(letter, cx, cy);

  // Reset alpha
  ctx.globalAlpha = 1.0;
}

/**
 * Draws a menacing Monster avatar with gradient background and glowing effects
 */
function drawMonsterBadge(canvas: HTMLCanvasElement, monster: Monster): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = Math.min(canvas.width, canvas.height);
  const cx = size / 2;
  const cy = size / 2;
  const r = cx - 2; // 2px padding

  ctx.clearRect(0, 0, size, size);

  // Create gradient background based on monster health
  const healthPercent = monster['hp'] / monster['maxHp'];
  let gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);

  if (healthPercent > 0.7) {
    // Healthy monster - dark red to black
    gradient.addColorStop(0, '#8B0000');
    gradient.addColorStop(1, '#2D0000');
  } else if (healthPercent > 0.3) {
    // Wounded monster - orange to dark red
    gradient.addColorStop(0, '#FF4500');
    gradient.addColorStop(1, '#8B0000');
  } else {
    // Nearly defeated - bright red with warning colors
    gradient.addColorStop(0, '#FF0000');
    gradient.addColorStop(1, '#8B0000');
  }

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.fill();

  // Add a glowing outer ring for low health
  if (healthPercent < 0.3) {
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  // Main circle outline
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.stroke();

  // Monster emoji/symbol in the background
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${r * 1.4}px serif`;

  // Choose emoji based on health
  let monsterEmoji = '👹'; // Default
  if (healthPercent < 0.3) {
    monsterEmoji = '💀'; // Nearly dead
  } else if (healthPercent < 0.7) {
    monsterEmoji = '👿'; // Wounded and angry
  }

  ctx.fillText(monsterEmoji, cx, cy);

  // "M" letter on top
  ctx.font = `${r * 1.2}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Stroke at 100% opacity
  ctx.lineWidth = r * 0.15;
  ctx.strokeStyle = '#000';
  ctx.globalAlpha = 1.0;
  ctx.strokeText('M', cx, cy);

  // Fill at 80% opacity (slightly more opaque than players for distinction)
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.8;
  ctx.fillText('M', cx, cy);

  // Reset alpha
  ctx.globalAlpha = 1.0;
}

/**
 * Monster avatar component that renders a dynamic avatar based on monster health
 */
const MonsterAvatar: React.FC<MonsterAvatarProps> = ({ monster }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    drawMonsterBadge(canvasRef.current, monster);
  }, [monster['hp'], monster['maxHp']]); // Redraw when monster health changes

  return (
    <canvas
      ref={canvasRef}
      width="40"
      height="40"
      className="monster-avatar"
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
};

/**
 * Custom avatar component that renders a circle with race color, class emoji, and name initial
 */
const CustomAvatar: React.FC<CustomAvatarProps> = ({ player, isCurrentPlayer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Map class names to emojis since ICONS.CLASSES contains image paths
    const classEmojis: Record<string, string> = {
      Warrior: '⚔️',
      Pyromancer: '🔥',
      Wizard: '🧙',
      Assassin: '🗡️',
      Alchemist: '⚗️',
      Priest: '✨',
      Oracle: '🔮',
      Barbarian: '🪓',
      Shaman: '🌿',
      Gunslinger: '🔫',
      Tracker: '🏹',
      Druid: '🌱',
    };

    const classEmoji = classEmojis[player.class || ''] || '❓';
    const letter = player['name'].charAt(0).toUpperCase();

    // Get race color
    const raceColors: Record<string, string> = {
      Artisan: '#4169E1',
      Rockhewn: '#8B4513',
      Crestfallen: '#228B22',
      Orc: '#8B0000',
      Kinfolk: '#9932CC',
      Lich: '#36454F',
    };

    const raceColor = raceColors[player.race || ''] || '#666666';

    drawPlayerBadge(canvasRef.current, classEmoji, letter, raceColor);
  }, [player]);

  return (
    <canvas
      ref={canvasRef}
      width="40"
      height="40"
      className="custom-avatar"
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
};

/**
 * TargetSelector component displays a list of potential targets for abilities
 * Monster appears first, followed by players with custom avatars
 */
const TargetSelector: React.FC<TargetSelectorProps> = ({
  alivePlayers,
  monster,
  currentPlayerId,
  selectedTarget,
  onSelectTarget,
  disableMonster = false,
  selectedAbility = null,
}) => {
  const theme = useTheme();

  // Helper functions for health styling (same as mobile)
  const getHealthPercent = (hp: number, maxHp: number): number => Math.max(0, (hp / maxHp) * 100);
  
  const getHealthClass = (percent: number): string => {
    if (percent > 70) return 'health-high';
    if (percent > 30) return 'health-medium';
    return 'health-low';
  };

  // Target validation logic similar to mobile
  const isValidTarget = (targetId: string, targetType: 'player' | 'monster'): boolean => {
    if (!selectedAbility) return true; // No ability selected, allow all targets
    
    // Self-targeting abilities - restrict to current player only
    if (selectedAbility.target === 'Self') {
      return targetId === currentPlayerId;
    }
    
    // Healing abilities typically target allies (players)
    if (selectedAbility.category === 'Heal') {
      return targetType === 'player';
    }
    
    // Attack abilities can target monster or enemies (but not self)
    if (selectedAbility.category === 'Attack') {
      if (targetType === 'player') {
        return targetId !== currentPlayerId; // Can't attack yourself
      }
      return true; // Can attack monster
    }
    
    // Defense abilities typically target allies (players)
    if (selectedAbility.category === 'Defense') {
      return targetType === 'player';
    }
    
    // Default: allow all targets
    return true;
  };

  return (
    <div className="target-selector">
      <h4 className="target-selector-title">Choose Target</h4>

      <div className="targets-container">
        {/* Monster target card */}
        {!disableMonster && isValidTarget('__monster__', 'monster') && (
          <div
            onClick={() => onSelectTarget('__monster__')}
            className={`player-target-card monster-target ${selectedTarget === '__monster__' ? 'selected' : ''}`}
          >
            <div className="player-name">Monster</div>
            <MonsterAvatar monster={monster} />
            <div className="player-hp">{monster['hp']}/{monster['maxHp']}</div>
            <div className="health-bar-compact">
              <div 
                className={`health-fill ${getHealthClass(getHealthPercent(monster['hp'], monster['maxHp']))}`}
                style={{ width: `${getHealthPercent(monster['hp'], monster['maxHp'])}%` }}
              />
            </div>
          </div>
        )}

        {/* Player targets grid */}
        <div className="player-targets-grid">
          {alivePlayers
            .filter((player) => isValidTarget(player['id'], 'player'))
            .map((player) => {
              const isValid = isValidTarget(player['id'], 'player');
              
              return (
                <div
                  key={player['id']}
                  className={`
                    player-target-card 
                    ${selectedTarget === player['id'] ? 'selected' : ''} 
                    ${(player as any).hasSubmittedAction ? 'ready' : ''}
                    ${player['id'] === currentPlayerId ? 'self' : ''}
                    ${!isValid ? 'invalid-target' : ''}
                  `}
                  onClick={() => isValid && onSelectTarget(player['id'])}
                >
                  <div className="player-name">
                    {player['name']}
                    {player['id'] === currentPlayerId && ' (You)'}
                  </div>
                  {player.race && player.class ? (
                    <CustomAvatar
                      player={player}
                      isCurrentPlayer={player['id'] === currentPlayerId}
                    />
                  ) : (
                    <div className="target-avatar">
                      {player['id'] === currentPlayerId
                        ? 'You'
                        : player['name'].charAt(0)}
                    </div>
                  )}
                  <div className="player-hp">{player['hp']}/{player['maxHp']}</div>
                  <div className="health-bar-compact">
                    <div 
                      className={`health-fill ${getHealthClass(getHealthPercent(player['hp'], player['maxHp']))}`}
                      style={{ width: `${getHealthPercent(player['hp'], player['maxHp'])}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>

        {/* Message when monster is disabled but was previously selected */}
        {disableMonster && selectedTarget === '__monster__' && (
          <div className="target-restriction-message">
            Keen Senses can only target players. Please select a player target.
          </div>
        )}
      </div>
    </div>
  );
};

export default TargetSelector;