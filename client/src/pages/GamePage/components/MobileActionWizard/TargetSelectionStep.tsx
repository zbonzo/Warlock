import React, { useEffect, useRef, useState } from 'react';
import './TargetSelectionStep.css';
import MobilePlayerHeader from './MobilePlayerHeader';
import type { Player, Ability, Monster } from '../../../../shared/types';

interface TargetSelectionStepProps {
  me: Player;
  monster?: Monster;
  alivePlayers: Player[];
  selectedAbility: Ability;
  selectedTarget?: string;
  keenSensesActive: boolean;
  lastEvent?: {
    turn?: number;
    events?: any[];
  };
  onTargetSelect: (targetId: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  onClose: () => void;
}

interface MonsterAvatarProps {
  monster: Monster;
}

interface CustomAvatarProps {
  player: Player;
}

/**
 * Draws a 40×40 circle with race color background, class emoji, and player initial on top
 */
function drawPlayerBadge(canvas: HTMLCanvasElement, classEmoji: string, letter: string, raceColor: string): void {
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
  const healthPercent = monster.hp / monster.maxHp;
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

  // Monster emoji/symbol
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${r * 1.4}px serif`;

  let monsterEmoji = '👹'; // Default
  if (healthPercent < 0.3) {
    monsterEmoji = '💀'; // Nearly dead
  } else if (healthPercent < 0.7) {
    monsterEmoji = '😡'; // Wounded and angry
  }

  ctx.fillText(monsterEmoji, cx, cy);
}

/**
 * Monster avatar component
 */
const MonsterAvatar: React.FC<MonsterAvatarProps> = ({ monster }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    drawMonsterBadge(canvasRef.current, monster);
  }, [monster.hp, monster.maxHp]);

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
 * Custom avatar component
 */
const CustomAvatar: React.FC<CustomAvatarProps> = ({ player }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Class icons mapping
    const classIcons: Record<string, string> = {
      'Warrior': '⚔️',
      'Ranger': '🏹',
      'Paladin': '🛡️',
      'Sorcerer': '🔮',
      'Warlock': '🌑',
      'Barbarian': '🪓',
      'Monk': '👊',
      'Rogue': '🗡️'
    };

    const classEmoji = classIcons[player.class] || '❓';
    const letter = player.name.charAt(0).toUpperCase();

    // Get race color
    const raceColors: Record<string, string> = {
      Artisan: '#4169E1',
      Rockhewn: '#8B4513',
      Crestfallen: '#228B22',
      Orc: '#8B0000',
      Kinfolk: '#9932CC',
      Lich: '#36454F',
    };

    const raceColor = raceColors[player.race] || '#666666';

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

const TargetSelectionStep: React.FC<TargetSelectionStepProps> = ({
  me,
  monster,
  alivePlayers,
  selectedAbility,
  selectedTarget,
  keenSensesActive,
  lastEvent,
  onTargetSelect,
  onBack,
  onSubmit,
  onClose
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Measure header height
  useEffect(() => {
    if (headerRef.current) {
      const height = headerRef.current.offsetHeight;
      setHeaderHeight(height);
    }
  }, [me]);
  
  const handleSubmit = () => {
    if (!selectedTarget) {
      alert('Please select a target first');
      return;
    }
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    onSubmit();
    
    // Reset after a short delay in case the submission fails
    setTimeout(() => {
      setIsSubmitting(false);
    }, 3000);
  };
  
  const getAbilityIcon = (ability: Ability): string => {
    const icons: Record<string, string> = {
      'Attack': '⚔️',
      'Defense': '🛡️',
      'Heal': '💚',
      'Special': '✨'
    };
    return icons[ability.category || ''] || '📜';
  };
  
  const getHealthPercent = (current: number, max: number): number => {
    return (current / max) * 100;
  };
  
  const getHealthClass = (percent: number): string => {
    if (percent < 30) return 'health-low';
    if (percent < 70) return 'health-medium';
    return 'health-high';
  };
  
  // Determine valid targets based on ability type
  const isValidTarget = (targetId: string, targetType: 'player' | 'monster'): boolean => {
    if (!selectedAbility) return false;
    
    // Self-targeting abilities
    if (selectedAbility.target === 'Self') {
      return targetId === me.id;
    }
    
    // Healing abilities typically target allies
    if (selectedAbility.category === 'Heal') {
      return targetType === 'player';
    }
    
    // Attack abilities can target monster or enemies (but not self)
    if (selectedAbility.category === 'Attack') {
      if (targetType === 'player') {
        return targetId !== me.id; // Can't attack yourself
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
    <div className="target-selection-step">
      <div ref={headerRef}>
        <MobilePlayerHeader 
          me={me} 
          round={lastEvent?.turn || 1}
          currentStep={2}
          totalSteps={2}
        />
      </div>
      
      <div 
        className="step-content"
        style={{ paddingTop: headerHeight ? `${headerHeight + 8}px` : '16px' }}
      >
        <h2 className="step-title">Choose Your Target</h2>
        
        {/* Selected ability reminder */}
        <div className="selected-ability-reminder">
          <div className="ability-icon">{getAbilityIcon(selectedAbility)}</div>
          <div className="ability-info">
            <strong>{selectedAbility.name}</strong>
            <div className="ability-category">{selectedAbility.category}</div>
          </div>
          <button className="change-ability-btn" onClick={onBack}>
            Change
          </button>
        </div>
        
        {/* Target options */}
        <div className="targets-section">
          {/* Monster target */}
          {!keenSensesActive && monster && monster.hp > 0 && isValidTarget('__monster__', 'monster') && (
            <div 
              className={`monster-target-wide ${selectedTarget === '__monster__' ? 'selected' : ''}`}
              onClick={() => onTargetSelect('__monster__')}
            >
              <MonsterAvatar monster={monster} />
              <div className="monster-info">
                <div className="monster-name">Monster</div>
                <div className="monster-stats">
                  <span className="hp-text">{monster.hp}/{monster.maxHp}</span>
                  {monster.nextAttack && <span className="next-attack">Next Attack: {monster.nextAttack}</span>}
                </div>
                <div className="health-bar-wide">
                  <div 
                    className={`health-fill ${getHealthClass(getHealthPercent(monster.hp, monster.maxHp))}`}
                    style={{ width: `${getHealthPercent(monster.hp, monster.maxHp)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Player targets */}
          <div className="player-targets-grid">
            {alivePlayers.map(player => {
              const isValid = isValidTarget(player.id, 'player');
              
              return (
                <div
                  key={player.id}
                  className={`
                    player-target-card 
                    ${selectedTarget === player.id ? 'selected' : ''} 
                    ${player.hasSubmittedAction ? 'ready' : ''}
                    ${player.id === me.id ? 'self' : ''}
                    ${!isValid ? 'invalid-target' : ''}
                  `}
                  onClick={() => isValid && onTargetSelect(player.id)}
                >
                  <div className="player-name">{player.name}</div>
                  <CustomAvatar player={player} />
                  <div className="player-hp">{player.hp}/{player.maxHp}</div>
                  <div className="health-bar-compact">
                    <div 
                      className={`health-fill ${getHealthClass(getHealthPercent(player.hp, player.maxHp))}`}
                      style={{ width: `${getHealthPercent(player.hp, player.maxHp)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="step-navigation">
        <button className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button 
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!selectedTarget || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Action'}
        </button>
      </div>
    </div>
  );
};

export default TargetSelectionStep;