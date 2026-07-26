/**
 * @fileoverview Unified Target Selection Step - works for both mobile and desktop
 * No header included - just the target selection interface
 */
import React from 'react';
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
      onTargetSelect('__monster__');
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

          {/* Monster card — always visible; greyed out when ability can't target it */}
          {monster && (
            <div className="monster-section">
              <div
                className={`monster-card-wide${canTargetMonster ? '' : ' non-targetable'}${selectedTarget === '__monster__' ? ' selected' : ''}`}
                onClick={canTargetMonster ? handleMonsterSelect : undefined}
                title={!canTargetMonster ? 'This ability cannot target the monster' : undefined}
                role={canTargetMonster ? 'button' : undefined}
              >
                <img
                  src="/images/monsters/default.png"
                  alt={monster.name || 'Monster'}
                  className="monster-card-image"
                />
                <div className="monster-card-info">
                  <div className="monster-card-name">{monster.name || 'Default Monster'}</div>
                  <div className="monster-card-ability">Default Monster Ability</div>
                  <div className="monster-card-hp">{monster.hp} / {monster.maxHp} HP</div>
                  <div className="monster-card-health-bar">
                    <div
                      className={`monster-card-health-fill ${
                        monster.hp / monster.maxHp > 0.5
                          ? 'health-high'
                          : monster.hp / monster.maxHp > 0.25
                          ? 'health-medium'
                          : 'health-low'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, (monster.hp / monster.maxHp) * 100))}%` }}
                    />
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
            <p>Please select a target for your ability.</p>
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
