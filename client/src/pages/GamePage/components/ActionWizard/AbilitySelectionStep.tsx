/**
 * @fileoverview Unified Ability Selection Step - works for both mobile and desktop
 * No header included - just the ability selection interface
 */
import React, { useState, useEffect } from 'react';
import RacialAbilityCard from '../../../../components/game/RacialAbilityCard/RacialAbilityCard';
import RuneButton from '../../../../components/ui/RuneButton';
import { Player, Ability, GameEvent } from '@/types/game';
import './AbilitySelectionStep.css';

interface LastEventData {
  turn: number;
  events: GameEvent[];
  [key: string]: any;
}

interface UnifiedAbilityCardProps {
  ability: Ability;
  selected: boolean;
  onSelect: (ability: Ability) => void;
  locked?: boolean;
  cooldown?: number;
  player: Player;
  isSelectable?: boolean;
  isMobile?: boolean;
}

interface AbilitySelectionStepProps {
  me: Player;
  unlocked: Ability[];
  racialAbility?: Ability;
  lastEvent: LastEventData;
  selectedAbility?: Ability | null;
  bloodRageActive: boolean;
  keenSensesActive: boolean;
  racialSelected: boolean;
  onAbilitySelect: (ability: Ability) => void;
  onRacialAbilityUse: (abilityType: string) => void;
  onClose: () => void;
  onContinue?: () => void;
  isMobile: boolean;
}

/**
 * Unified ability card component that works for both mobile and desktop
 */
const UnifiedAbilityCard: React.FC<UnifiedAbilityCardProps> = ({ 
  ability, 
  selected, 
  onSelect, 
  locked = false, 
  cooldown = 0, 
  player,
  isSelectable = true,
  isMobile = false
}) => {
  const handleClick = (): void => {
    if (!locked && !cooldown && isSelectable) {
      onSelect(ability);
    }
  };
  
  const currentCooldown = player.abilityCooldowns?.[ability.type] || 0;
  const isLocked = locked || currentCooldown > 0;

  return (
    <div
      className={`unified-ability-card ${selected ? 'selected' : ''} ${isLocked ? 'locked on-cooldown' : ''} ${!isSelectable ? 'not-selectable' : ''} ${isMobile ? 'mobile-size' : 'desktop-size'}`}
      onClick={handleClick}
    >
      {/* Background icon */}
      <div className="ability-background-icon">
        {ability.category === 'Attack' ? '⚔️' : 
         ability.category === 'Defense' ? '🛡️' : 
         ability.category === 'Heal' ? '💚' : '✨'}
      </div>
      
      {/* Content overlay */}
      <div className={`ability-content-overlay ability-${ability.category?.toLowerCase()}`}>
        <div className="ability-name">{ability.name}</div>
        {ability.description && (
          <div className="ability-description">{ability.description}</div>
        )}
        {ability.params?.damage && (
          <div className="ability-damage">Damage: {ability.params.damage}</div>
        )}
      </div>
      
      {/* Lock overlay for locked abilities */}
      {locked && (
        <div className="lock-overlay">
          <div className="lock-icon">🔒</div>
          <div className="unlock-text">Locked</div>
        </div>
      )}
      
      {/* Cooldown overlay */}
      {currentCooldown > 0 && (
        <div className="cooldown-overlay">
          <div className="cooldown-number">{currentCooldown}</div>
          <div className="cooldown-text">CD</div>
        </div>
      )}
      
      {/* Selection indicator */}
      {selected && (
        <div className="selection-indicator">✓</div>
      )}
    </div>
  );
};

/**
 * Ability Selection Step component
 */
const AbilitySelectionStep: React.FC<AbilitySelectionStepProps> = ({
  me,
  unlocked,
  racialAbility,
  lastEvent,
  selectedAbility,
  bloodRageActive,
  keenSensesActive,
  racialSelected,
  onAbilitySelect,
  onRacialAbilityUse,
  onClose,
  onContinue,
  isMobile
}) => {
  const [showEnhancements, setShowEnhancements] = useState<boolean>(false);

  useEffect(() => {
    setShowEnhancements(bloodRageActive || keenSensesActive);
  }, [bloodRageActive, keenSensesActive]);

  if (!me['isAlive']) {
    return (
      <div className="ability-selection-step dead-player">
        <div className="dead-message">
          <h3>You are dead</h3>
          <p>You can only watch as the remaining players continue the battle.</p>
          <div className="skull-icon">💀</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`ability-selection-step ${isMobile ? 'mobile' : 'desktop'}`}>
      {isMobile && (
        <div className="step-header">
          <h2>Choose Your Action</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
      )}
      
      <div className="step-content">
        {/* Racial Ability Section */}
        {racialAbility && (
          <div className="racial-ability-section">
            <h3>Racial Ability</h3>
            <RacialAbilityCard
              ability={racialAbility as any}
              usesLeft={me['racialUsesLeft'] || 0}
              cooldown={me['racialCooldown'] || 0}
              disabled={false}
              onUse={() => onRacialAbilityUse(racialAbility.type)}
            />
          </div>
        )}

        {/* Enhancement Status */}
        {showEnhancements && (
          <div className="enhancement-status">
            {bloodRageActive && (
              <div className="enhancement-indicator blood-rage">
                <span className="icon">💢</span>
                <span>Blood Rage Active</span>
              </div>
            )}
            {keenSensesActive && (
              <div className="enhancement-indicator keen-senses">
                <span className="icon">👁️</span>
                <span>Keen Senses Active</span>
              </div>
            )}
          </div>
        )}

        {/* Class Abilities Section */}
        <div className="class-abilities-section">
          <h3>Your Abilities</h3>
          <div className={`abilities-grid ${isMobile ? 'mobile-grid' : 'desktop-grid'}`}>
            {/* Fill up to 4 slots for 2x2 grid */}
            {Array.from({ length: 4 }, (_, index) => {
              const ability = unlocked[index];
              if (ability) {
                return (
                  <UnifiedAbilityCard
                    key={ability.type}
                    ability={ability}
                    selected={selectedAbility?.type === ability.type}
                    onSelect={onAbilitySelect}
                    player={me}
                    isMobile={isMobile}
                    locked={false}
                  />
                );
              } else {
                // Show locked placeholder for empty slots
                return (
                  <div
                    key={`locked-${index}`}
                    className={`unified-ability-card locked ${isMobile ? 'mobile-size' : 'desktop-size'}`}
                  >
                    <div className="ability-background-icon">❓</div>
                    <div className="lock-overlay">
                      <div className="lock-icon">🔒</div>
                      <div className="unlock-text">Level Up to Unlock</div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Continue Button */}
        <div className="continue-section">
          <RuneButton
            onClick={onContinue}
            disabled={!selectedAbility}
            variant="primary"
          >
            Continue
          </RuneButton>
        </div>

        {!isMobile && !selectedAbility && (
          <div className="step-instructions">
            <p>Select an ability to continue to target selection.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AbilitySelectionStep;
