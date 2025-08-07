/**
 * @fileoverview Unified Target Selection Step - works for both mobile and desktop
 * No header included - just the target selection interface
 */
import React, { useEffect, useRef } from 'react';
import { PlayerCard } from '../../../../components/common/PlayerCard';
import RuneButton from '../../../../components/ui/RuneButton';
import { getActionButtonText } from '../../../../utils/actionButtonText';
import { Player, Monster, Ability, GameEvent } from '@/types/game';
import './TargetSelectionStep.css';

interface LastEventData {
  turn: number;
  events: GameEvent[];
  [key: string]: any;
}

interface MonsterAvatarProps {
  monster: Monster;
}

interface TargetSelectionStepProps {
  me: Player;
  monster: Monster | null;
  alivePlayers: Player[];
  selectedAbility: Ability | null;
  selectedTarget?: string | null;
  keenSensesActive: boolean;
  lastEvent: LastEventData;
  onTargetSelect: (targetId: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  onClose: () => void;
  isMobile: boolean;
  isSubmitting: boolean;
  submitted?: boolean;
  submittedPlayers?: string[];
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
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);

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
  }, [monster['hp'], monster['maxHp']]);

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
 * Target Selection Step component
 */
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
  onClose,
  isMobile,
  isSubmitting,
  submitted = false,
  submittedPlayers = []
}) => {
  // Handle case where selectedAbility might be null after submission
  if (!selectedAbility && !submitted) {
    return (
      <div className={`target-selection-step ${isMobile ? 'mobile' : 'desktop'}`}>
        <div className="step-content">
          <p>No ability selected. Please go back and select an ability.</p>
        </div>
      </div>
    );
  }

  const canTargetSelf = selectedAbility?.target === 'Self' || 
    (selectedAbility?.target === 'Single' && selectedAbility?.category === 'Heal');
  
  const canTargetOthers = selectedAbility?.target === 'Single' || selectedAbility?.target === 'Multi';
  
  const canTargetMonster = monster && !keenSensesActive && 
    (selectedAbility?.category === 'Attack' || selectedAbility?.category === 'Special');

  // Show all players, but determine if they can be targeted
  const getPlayerTargetability = (player: Player): { canTarget: boolean; reason?: string } => {
    const isSelf = player['id'] === me['id'];
    
    if (isSelf && canTargetSelf) return { canTarget: true };
    if (!isSelf && canTargetOthers) return { canTarget: true };
    
    if (isSelf && !canTargetSelf) {
      return { canTarget: false, reason: 'Cannot target yourself with this ability' };
    }
    if (!isSelf && !canTargetOthers) {
      return { canTarget: false, reason: 'This ability cannot target other players' };
    }
    
    return { canTarget: false };
  };

  const handlePlayerSelect = (player: Player): void => {
    const targetability = getPlayerTargetability(player);
    if (targetability.canTarget) {
      onTargetSelect(player['id']);
    }
  };

  const handleMonsterSelect = (): void => {
    if (monster && canTargetMonster) {
      onTargetSelect('monster');
    }
  };

  const handleSubmit = (): void => {
    if (selectedTarget && !isSubmitting) {
      onSubmit();
    }
  };

  return (
    <div className={`target-selection-step ${isMobile ? 'mobile' : 'desktop'}`}>
      {isMobile && (
        <div className="step-header">
          <button className="back-button" onClick={onBack}>←</button>
          <h2>Select Target</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
      )}
      
      <div className="step-content">
        {selectedAbility && (
          <div className="selected-ability-info">
            <h3>Using: {selectedAbility.name}</h3>
            {selectedAbility.description && (
              <p>{selectedAbility.description}</p>
            )}
          </div>
        )}

        {submitted && !selectedAbility && (
          <div className="selected-ability-info">
            <h3>Action Submitted</h3>
            <p>Waiting for other players to complete their turn...</p>
          </div>
        )}

        <div className="target-selection-area">
          {/* Player targets */}
          {alivePlayers.length > 0 && (
            <div className="player-targets">
              <h4>Players</h4>
              <div className="targets-grid">
                {alivePlayers.map(player => {
                  const targetability = getPlayerTargetability(player);
                  return (
                    <div
                      key={player['id']}
                      className={`target-option ${selectedTarget === player['id'] ? 'selected' : ''} ${!targetability.canTarget ? 'non-targetable' : ''}`}
                      onClick={() => handlePlayerSelect(player)}
                      title={!targetability.canTarget ? targetability.reason : undefined}
                    >
                      <PlayerCard
                        player={player}
                        isCurrentPlayer={player['id'] === me['id']}
                        size="medium"
                        customStyles={{ 
                          width: '150px', 
                          height: '200px',
                          opacity: !targetability.canTarget ? 0.5 : 1,
                          filter: !targetability.canTarget ? 'grayscale(50%)' : 'none'
                        }}
                      />
                      {submitted && submittedPlayers.includes(player['id']) && (
                        <div className="submitted-indicator">
                          <div className="check-mark">✓</div>
                        </div>
                      )}
                      {!targetability.canTarget && (
                        <div className="non-targetable-overlay">
                          <div className="non-targetable-icon">🚫</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monster target */}
          {canTargetMonster && monster && (
            <div className="monster-target">
              <h4>Monster</h4>
              <div
                className={`target-option monster-option ${selectedTarget === 'monster' ? 'selected' : ''}`}
                onClick={handleMonsterSelect}
              >
                <div className="monster-card">
                  <MonsterAvatar monster={monster} />
                  <div className="monster-info">
                    <h5>{monster['name'] || 'Monster'}</h5>
                    <div className="monster-health">
                      {monster['hp']}/{monster['maxHp']} HP
                    </div>
                    {monster.nextDamage && monster.nextDamage > 0 && (
                      <div className="monster-damage">
                        Next damage: {monster.nextDamage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="step-actions">
          {!isMobile && !submitted && (
            <button className="back-button" onClick={onBack}>
              Back
            </button>
          )}
          
          <RuneButton
            onClick={handleSubmit}
            disabled={(!selectedTarget || isSubmitting) && !submitted}
            variant={submitted ? 'secondary' : 'primary'}
          >
            {isSubmitting ? 'Submitting...' : 
             submitted ? (selectedAbility ? getActionButtonText(selectedAbility.type, true) : 'Action Locked') :
             (selectedAbility ? getActionButtonText(selectedAbility.type, false) : 'Submit Action')}
          </RuneButton>
        </div>

        {!selectedTarget && !submitted && (
          <div className="selection-hint">
            Please select a target for your ability.
          </div>
        )}

        {submitted && (
          <div className="waiting-message">
            <p>Action submitted! Waiting for other players...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TargetSelectionStep;