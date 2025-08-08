/**
 * @fileoverview Main action column component for game interaction
 * Refactored and split into smaller components for better maintainability
 */
import React, { useState, useEffect } from 'react';
import { useTheme } from '@contexts/ThemeContext';
import RacialAbilityCard from '@components/game/RacialAbilityCard';
import TargetSelector from '@components/game/TargetSelector';
import EventsLog from '@components/game/EventsLog';
import { ICONS } from '../../../../config/constants';
import { getActionButtonText, getActionButtonVariant } from '../../../../utils/actionButtonText';
import RuneButton from '../../../../components/ui/RuneButton';
import { Player, Monster, Ability, GameEvent } from '@/types/game';
import CustomAvatar from './CustomAvatar';
import MobileAbilityCard from './MobileAbilityCard';
import '../ActionColumn.css';
import '../MobileActionWizard/AbilitySelectionStep.css';

interface LastEventData {
  turn: number;
  events: GameEvent[];
  readyPlayers?: string[];
  players?: Player[];
  [key: string]: any;
}

interface ActionColumnProps {
  isVisible: boolean;
  phase: 'action' | 'results';
  me: Player;
  lastEvent: LastEventData;
  players: Player[];
  unlocked: Ability[];
  alivePlayers: Player[];
  monster: Monster;
  actionType?: string | null;
  selectedTarget?: string | null;
  submitted: boolean;
  readyClicked: boolean;
  bloodRageActive: boolean;
  keenSensesActive: boolean;
  onSetActionType: (type: string) => void;
  onSelectTarget: (targetId: string) => void;
  onRacialAbilityUse: (abilityType: string) => void;
  onSubmitAction: () => void;
  onReadyClick: () => void;
}

/**
 * Main ActionColumn component - handles game actions and UI
 */
const ActionColumn: React.FC<ActionColumnProps> = ({
  isVisible,
  phase,
  me,
  lastEvent,
  unlocked,
  alivePlayers,
  monster,
  actionType,
  selectedTarget,
  submitted,
  readyClicked,
  bloodRageActive,
  keenSensesActive,
  players,
  onSetActionType,
  onSelectTarget,
  onRacialAbilityUse,
  onSubmitAction,
  onReadyClick,
}) => {
  const theme = useTheme();
  
  // Track submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Reset submitting state when submission is completed or failed
  useEffect(() => {
    if (submitted) {
      setIsSubmitting(false);
    }
  }, [submitted]);
  
  // Auto-reset submitting state after timeout
  useEffect(() => {
    if (isSubmitting) {
      const timeout = setTimeout(() => {
        setIsSubmitting(false);
      }, 3000); // 3 second timeout
      
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [isSubmitting]);

  const validPlayers = Array.isArray(players) && players.length > 0
    ? players
    : lastEvent.players || [];

  // Don't render if not visible
  if (!isVisible) return null;

  const handleSubmitAction = () => {
    setIsSubmitting(true);
    onSubmitAction();
  };

  return (
    <div className="action-column">
      <div className="action-column-content">
        {/* Action Selection */}
        <div className="action-selection-section">
          <h3>Choose Your Action</h3>
          <div className="abilities-grid">
            {unlocked.map((ability) => (
              <MobileAbilityCard
                key={ability.type}
                ability={ability}
                selected={actionType === ability.type}
                onSelect={onSetActionType}
                player={me}
                isSelectable={!submitted}
              />
            ))}
          </div>
          
          {/* Racial Ability */}
          {me.racialAbility && (
            <div className="racial-ability-section">
              <RacialAbilityCard
                ability={me.racialAbility}
                usesLeft={me.racialUsesLeft ?? 0}
                cooldown={me.racialCooldown ?? 0}
                disabled={submitted}
                onUse={() => onRacialAbilityUse(me.racialAbility?.type || '')}
              />
            </div>
          )}
        </div>

        {/* Target Selection */}
        {actionType && (
          <div className="target-selection-section">
            <TargetSelector
              alivePlayers={alivePlayers}
              monster={monster}
              currentPlayerId={me['id']}
              selectedTarget={selectedTarget || undefined}
              onSelectTarget={onSelectTarget}
            />
          </div>
        )}

        {/* Action Button */}
        <div className="action-button-section">
          {phase === 'action' && (
            <RuneButton
              variant={getActionButtonVariant(actionType || '', submitted)}
              onClick={submitted ? onReadyClick : handleSubmitAction}
              disabled={(!actionType || !selectedTarget) && !submitted || isSubmitting}
            >
              {isSubmitting ? (
                'Submitting...'
              ) : (
                getActionButtonText(actionType || '', submitted, isSubmitting)
              )}
            </RuneButton>
          )}
        </div>

        {/* Player Status */}
        <div className="players-status-section">
          <h4>Players Status</h4>
          <div className="players-avatars">
            {validPlayers.map((player) => (
              <div key={player['id']} className="player-avatar-wrapper">
                <CustomAvatar 
                  player={player}
                  isCurrentPlayer={player['id'] === me['id']}
                />
                <div className="player-name">{player['name']}</div>
                <div className="player-status">
                  {player['hp'] <= 0 ? '💀' : lastEvent.readyPlayers?.includes(player['id']) ? '✅' : '⏳'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Events Log */}
        <div className="events-log-section">
          <EventsLog 
            events={lastEvent.events || []}
            currentPlayerId={me['id']}
          />
        </div>
      </div>
    </div>
  );
};

export default ActionColumn;