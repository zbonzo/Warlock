/**
 * @fileoverview Action column component for game interaction
 * Handles ability selection, targeting, and action submission
 */
import React, { useState, useEffect, useRef } from 'react';
import RacialAbilityCard from '@components/game/RacialAbilityCard';
import TargetSelector from '@components/game/TargetSelector';
import EventsLog from '@components/game/EventsLog';
import { ICONS } from '../../../config/constants';
import { getActionButtonText, getActionButtonVariant } from '../../../utils/actionButtonText';
import RuneButton from '../../../components/ui/RuneButton';
import { Player, Monster, Ability, GameEvent } from '@/types/game';
import './ActionColumn.css';
import './MobileActionWizard/AbilitySelectionStep.css';

interface LastEventData {
  turn: number;
  events: GameEvent[];
  readyPlayers?: string[];
  players?: Player[];
  [key: string]: any;
}

interface CustomAvatarProps {
  player: Player;
  isCurrentPlayer: boolean;
}

interface MobileAbilityCardProps {
  ability: Ability;
  selected: boolean;
  onSelect: (abilityType: string) => void;
  locked?: boolean;
  cooldown?: number;
  player: Player;
  isSelectable?: boolean;
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
  ctx.fillStyle = '#FFF';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.strokeText(letter, cx, cy);
  ctx.fillText(letter, cx, cy);
}

/**
 * Custom avatar component that renders a circle with race color, class emoji, and name initial
 */
const CustomAvatar: React.FC<CustomAvatarProps> = ({ player, isCurrentPlayer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const classEmoji = (ICONS.CLASSES as Record<string, string>)[player.class || ''] || '❓';
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
 * Mobile-style ability card for unified tile system
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
  
  const getAbilityIcon = (ability: Ability): React.ReactNode => {
    // Map ability types to their PNG file names
    const abilityImageMap: Record<string, string> = {
      // Attack abilities
      'lightningBolt': 'lightningbolt.png',
      'magicMissile': 'magicmissile.png',
      'meteorShower': 'meteorshower.png',
      'backstab': 'backstab.png',
      'poisonStrike': 'poisonstrike.png',
      'barbedArrow': 'barbedarrow.png',
      'preciseShot': 'precisearrow.png',
      'clawSwipe': 'clawswipe.png',
      'psychicBolt': 'psychicbolt.png',
      'attack': 'slash.png',
      'fireball': 'fireball.png',
      'holyBolt': 'holybolt.png',
      'infernoBlast': 'infernoblast.png',
      'pistolShot': 'pistolshot.png',
      'pyroblast': 'pyroblast.png',
      'recklessStrike': 'recklessstrike.png',
      'ricochetRound': 'ricochetround.png',
      'shiv': 'shiv.png',
      'twinStrike': 'twinstrike.png',
      'aimedShot': 'aimedshot.png',
      'arcaneBarrage': 'arcanebarrage.png',
      'chainLightning': 'chainlightning.png',
      'deathMark': 'deathmark.png',
      'sweepingStrike': 'sweepingstrike.png',
      
      // Defense abilities
      'shieldWall': 'shieldwall.png',
      'arcaneShield': 'arcaneshield.png',
      'shadowVeil': 'shadowveil.png',
      'smokeBomb': 'smokebomb.png',
      'spiritGuard': 'spiritguard.png',
      'camouflage': 'camouflage.png',
      'barkskin': 'barkskin.png',
      'smokeScreen': 'smokescreen.png',
      'totemShield': 'totemicbarrier.png',
      'divineShield': 'divineshield.png',
      'fatesEye': 'fateseye.png',
      
      // Heal abilities
      'bandage': 'bandage.png',
      'heal': 'heal.png',
      'cauterize': 'cauterize.png',
      'swiftMend': 'swiftmend.png',
      'rejuvenation': 'rejuvenation.png',
      'ancestralHeal': 'ancestralheal.png',
      
      // Special abilities
      'poisonTrap': 'poisontrap.png',
      'relentlessFury': 'relentlessfury.png',
      'thirstyBlade': 'thirstyblade.png',
      'entangle': 'entangle.png',
      'controlMonster': 'controlmonster.png',
      'battleCry': 'battlecry.png',
      'sanctuaryOfTruth': 'sanctuaryoftruth.png'
    };
    
    // Check if we have a PNG for this ability
    const imageName = abilityImageMap[ability.type];
    if (imageName) {
      return (
        <img 
          src={`/images/abilities/${imageName}`} 
          alt={ability.name} 
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/abilities/default.png';
          }}
        />
      );
    }
    
    // Fallback to category icons for abilities without specific images
    const categoryIcons: Record<string, string> = {
      Attack: '⚔️',
      Defense: '🛡️',
      Heal: '❤️',
      Special: '✨'
    };
    
    return categoryIcons[ability.category] || '❓';
  };
  
  return (
    <div 
      className={`mobile-ability-card ${selected ? 'selected' : ''} ${locked ? 'locked' : ''} ${cooldown > 0 ? 'cooldown' : ''} ${!isSelectable ? 'not-selectable' : ''}`}
      onClick={handleClick}
    >
      {/* Background icon */}
      <div className="ability-background-icon">
        {getAbilityIcon(ability)}
      </div>
      
      {/* Overlay gradient based on category */}
      <div className={`ability-content-overlay category-${ability.category?.toLowerCase()}`}>
        {/* Ability name */}
        <div className="ability-name">
          {ability.name}
        </div>
        
        {/* Ability description with class styling */}
        <div className={`ability-description class-${player.class?.toLowerCase()}`}>
          {ability.flavorText || ability.effect}
        </div>
        
        {/* Cooldown indicator */}
        {cooldown > 0 && (
          <div className="ability-cooldown">
            {cooldown} turn{cooldown > 1 ? 's' : ''}
          </div>
        )}
        
        {/* Lock indicator */}
        {locked && (
          <div className="ability-locked">
            🔒 Level {(ability as any).unlockAt}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ActionColumn component handles the main game interaction
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

  // Helper function to check if current selection is valid
  const isCurrentSelectionValid = (): boolean => {
    if (!actionType || !selectedTarget) return false;

    // Check if selected ability is on cooldown
    const selectedAbility = unlocked.find((ability) => ability.type === actionType);
    if (selectedAbility) {
      const cooldown = me.abilityCooldowns?.[selectedAbility.type] || 0;
      if (cooldown > 0) return false;
    }

    // Check if target is still valid
    if (selectedTarget === '__monster__') {
      return monster && monster['hp'] > 0;
    } else {
      const targetPlayer = alivePlayers.find((p) => p['id'] === selectedTarget);
      return targetPlayer && targetPlayer['isAlive'];
    }
  };

  // Enhanced submit action handler with validation
  const handleSubmitAction = (): void => {
    if (!isCurrentSelectionValid() || isSubmitting) {
      if (isSubmitting) return; // Prevent double submission
      
      const issues: string[] = [];
      if (!actionType) issues.push('Select an ability');
      if (!selectedTarget) issues.push('Select a target');

      const selectedAbility = unlocked.find((a) => a.type === actionType);
      const cooldownValue = me?.abilityCooldowns?.[selectedAbility?.type || ''] || 0;
      if (selectedAbility && cooldownValue > 0) {
        issues.push(
          `${selectedAbility.name} is on cooldown (${cooldownValue} turns)`
        );
      }

      if (selectedTarget === '__monster__' && (!monster || monster['hp'] <= 0)) {
        issues.push('Monster is no longer a valid target');
      } else if (selectedTarget !== '__monster__') {
        const targetPlayer = alivePlayers.find((p) => p['id'] === selectedTarget);
        if (!targetPlayer || !targetPlayer['isAlive']) {
          issues.push('Selected player is no longer alive or valid');
        }
      }

      alert(`Cannot submit action:\n• ${issues.join('\n• ')}`);
      return;
    }

    // Set submitting state
    setIsSubmitting(true);
    onSubmitAction();
  };

  // Check if player's action needs to be revalidated
  const needsRevalidation = (): boolean => {
    return (
      (me as any)?.submissionStatus?.validationState === 'invalid' ||
      ((me as any)?.hasSubmittedAction && !(me as any)?.submissionStatus?.isValid)
    );
  };

  // Render based on the current phase
  return (
    <div className="action-column">
      {phase === 'action' ? (
        <div className="action-phase">
          <h2 className="section-title">
            Turn {lastEvent.turn} – Choose Action
          </h2>

          {/* Dead player view */}
          {!me['isAlive'] && (
            <div className="dead-message card">
              <h3 className="section-title danger">You are dead</h3>
              <p>
                You can only watch as the remaining players continue the battle.
              </p>
              <div className="skull-icon">💀</div>
            </div>
          )}

          {/* Stunned player view */}
          {me['isAlive'] && me.statusEffects?.stunned && (
            <div className="stunned-message card">
              <h3 className="section-title warning">Stunned</h3>
              <div className="stun-icon">
                <span className="turn-counter">
                  {me.statusEffects.stunned.turns}
                </span>
                😵
              </div>
              <p>You are stunned and cannot act this turn.</p>
            </div>
          )}

          {/* Enhanced waiting for others view with detailed submission tracking */}
          {me['isAlive'] &&
            !me.statusEffects?.stunned &&
            submitted &&
            !needsRevalidation() && (
              <div className="submit-message card">
                <h3 className="section-title">Action submitted</h3>

                {/* Show current submission status */}
                <div className="submission-status">
                  <p>Waiting for other players to take their actions...</p>
                  
                  {/* Player submission grid */}
                  <div className="player-targets-grid submission-grid">
                    {validPlayers
                      .filter((player) => player['isAlive'])
                      .map((player) => (
                        <div
                          key={player['id']}
                          className={`
                            player-target-card submission-card
                            ${(player as any).hasSubmittedAction ? 'ready' : ''} 
                            ${player['id'] === me['id'] ? 'self' : ''}
                          `}
                        >
                          <div className="player-name">{player['name']}</div>
                          <CustomAvatar player={player} isCurrentPlayer={player['id'] === me['id']} />
                          <div className="submission-status-text">
                            {(player as any).hasSubmittedAction ? '✓ Ready' : '⋯ Waiting'}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="waiting-spinner"></div>
              </div>
            )}

          {/* Action selection view */}
          {me['isAlive'] &&
            !me.statusEffects?.stunned &&
            (!submitted || needsRevalidation()) && (
              <div className="action-selection">
                {/* Racial ability */}
                {me.racialAbility && (
                  <div className="racial-ability-container">
                    <h3 className="section-title secondary">Racial Ability</h3>
                    <RacialAbilityCard
                      ability={me.racialAbility as any}
                      usesLeft={me.racialUsesLeft || 0}
                      cooldown={me.racialCooldown || 0}
                      disabled={false}
                      onUse={() => onRacialAbilityUse(me.racialAbility!.type)}
                    />
                  </div>
                )}

                {/* Class abilities with unified tile system */}
                <h3 className="section-title secondary">Your Abilities</h3>

                <div className="abilities-grid">
                  {unlocked.map((ability) => {
                    const cooldown = me.abilityCooldowns?.[ability.type] || 0;
                    const isSelectable = cooldown === 0;
                    return (
                      <MobileAbilityCard
                        key={ability.type}
                        ability={ability}
                        selected={actionType === ability.type}
                        onSelect={onSetActionType}
                        cooldown={cooldown}
                        player={me}
                        isSelectable={isSelectable}
                      />
                    );
                  })}
                </div>

                {/* Racial enhancement indicators */}
                {(bloodRageActive || keenSensesActive) && (
                  <div
                    className={`racial-enhancement ${bloodRageActive ? 'blood-rage' : ''} ${keenSensesActive ? 'keen-senses' : ''}`}
                  >
                    {bloodRageActive && (
                      <div className="enhancement-badge blood-rage-badge">
                        <span className="enhancement-icon">💢</span>
                        <span className="enhancement-text">
                          Blood Rage Active
                        </span>
                      </div>
                    )}

                    {keenSensesActive && (
                      <div className="enhancement-badge keen-senses-badge">
                        <span className="enhancement-icon">👁️</span>
                        <span className="enhancement-text">
                          Keen Senses Active
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Target selector */}
                <TargetSelector
                  alivePlayers={alivePlayers}
                  monster={monster}
                  currentPlayerId={me['id']}
                  selectedTarget={selectedTarget || undefined}
                  onSelectTarget={onSelectTarget}
                  disableMonster={keenSensesActive}
                  selectedAbility={unlocked.find((ability) => ability.type === actionType)}
                />

                {/* Enhanced submit button with dynamic atmospheric text */}
                <RuneButton
                  variant={getActionButtonVariant(actionType || '', submitted)}
                  onClick={handleSubmitAction}
                  disabled={!isCurrentSelectionValid() || isSubmitting}
                  title={
                    isSubmitting
                      ? 'Casting your spell...'
                      : !isCurrentSelectionValid()
                      ? 'Please select a valid ability (not on cooldown) and target'
                      : 'Cast your chosen ability'
                  }
                >
                  {isSubmitting 
                    ? 'Casting...' 
                    : needsRevalidation() 
                    ? 'Update Action' 
                    : getActionButtonText(actionType || '', submitted, isSubmitting)
                  }
                </RuneButton>
              </div>
            )}
        </div>
      ) : (
        <div className="results-phase">
          <h2 className="section-title">Round {lastEvent.turn} Results</h2>

          {/* Event log */}
          <EventsLog
            events={lastEvent.events}
            currentPlayerId={me['id']}
            players={validPlayers}
          />

          {/* Ready button */}
          {me['isAlive'] && (
            <button
              className={`button ready-button ${readyClicked ? 'clicked' : ''}`}
              onClick={onReadyClick}
              disabled={readyClicked}
            >
              {readyClicked ? (
                <>
                  <span className="ready-text">
                    Waiting for other players...
                  </span>
                  <span className="ready-spinner"></span>
                </>
              ) : (
                <>Ready for Next Round</>
              )}
            </button>
          )}

          {/* Ready player indicators */}
          <div className="ready-players">
            <p className="ready-info">Players ready for next round:</p>
            <div className="ready-indicators">
              {lastEvent.readyPlayers?.map((playerId) => {
                const player = lastEvent.players?.find((p) => p['id'] === playerId);
                return player ? (
                  <div key={playerId} className="ready-player">
                    <div className="ready-player-icon">
                      {player['name'].charAt(0)}
                    </div>
                    <div className="ready-player-name">{player['name']}</div>
                  </div>
                ) : null;
              })}
              {(!lastEvent.readyPlayers ||
                lastEvent.readyPlayers.length === 0) && (
                <p className="no-ready-players">No players ready yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionColumn;