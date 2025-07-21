/**
 * @fileoverview Action column component for game interaction
 * Handles ability selection, targeting, and action submission
 */
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import RacialAbilityCard from '@components/game/RacialAbilityCard';
import TargetSelector from '@components/game/TargetSelector';
import EventsLog from '@components/game/EventsLog';
import { ICONS } from '../../../config/constants';
import './ActionColumn.css';
// Import mobile ability card CSS for unified styling
import './MobileActionWizard/AbilitySelectionStep.css';

/**
 * Draws a 40×40 circle with race color background, class emoji, and player initial on top
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} classEmoji - emoji representing the class
 * @param {string} letter - single character to center (player initial)
 * @param {string} raceColor - background color for the race
 */
function drawPlayerBadge(canvas, classEmoji, letter, raceColor) {
  const ctx = canvas.getContext('2d');
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
const CustomAvatar = ({ player, isCurrentPlayer }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const classEmoji = ICONS.CLASSES[player.class] || '❓';
    const letter = player.name.charAt(0).toUpperCase();

    // Get race color
    const raceColors = {
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

// Import mobile-style ability card for unified tile system
const MobileAbilityCard = ({ 
  ability, 
  selected, 
  onSelect, 
  locked = false, 
  cooldown = 0, 
  player,
  isSelectable = true 
}) => {
  const handleClick = () => {
    if (!locked && !cooldown && isSelectable) {
      onSelect(ability.type);
    }
  };
  
  const getAbilityIcon = (ability) => {
    // Map ability types to their PNG file names (same as mobile)
    const abilityImageMap = {
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
        />
      );
    }
    
    // Fallback to category icons for abilities without specific images
    const categoryIcons = {
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
            🔒 Level {ability.unlockAt}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ActionColumn component handles the main game interaction
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether this column is currently visible
 * @param {string} props.phase - Current game phase ('action' or 'results')
 * @param {Object} props.me - Current player data
 * @param {Object} props.lastEvent - Most recent event data
 * @param {Array} props.unlocked - Unlocked abilities for the player
 * @param {Array} props.alivePlayers - List of currently alive players
 * @param {Object} props.monster - Monster data object
 * @param {string} props.actionType - Currently selected ability type
 * @param {string} props.selectedTarget - Currently selected target ID
 * @param {boolean} props.submitted - Whether action has been submitted
 * @param {boolean} props.readyClicked - Whether ready button is clicked
 * @param {boolean} props.racialSelected - Whether racial ability is selected
 * @param {boolean} props.bloodRageActive - Whether Blood Rage is active
 * @param {boolean} props.keenSensesActive - Whether Keen Senses is active
 * @param {Function} props.onSetActionType - Callback to set action type
 * @param {Function} props.onSelectTarget - Callback to select target
 * @param {Function} props.onRacialAbilityUse - Callback for racial ability use
 * @param {Function} props.onSubmitAction - Callback to submit action
 * @param {Function} props.onReadyClick - Callback for ready button click
 * @returns {React.ReactElement|null} The rendered component or null if not visible
 */
const ActionColumn = ({
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
  
  // Track submission state like mobile
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset submitting state when submission is completed or failed
  useEffect(() => {
    if (submitted) {
      setIsSubmitting(false);
    }
  }, [submitted]);
  
  // Auto-reset submitting state after timeout (like mobile)
  useEffect(() => {
    if (isSubmitting) {
      const timeout = setTimeout(() => {
        setIsSubmitting(false);
      }, 3000); // 3 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [isSubmitting]);

  const validPlayers =
    Array.isArray(players) && players.length > 0
      ? players
      : lastEvent.players || [];

  // Don't render if not visible
  if (!isVisible) return null;

  // Helper function to check if current selection is valid
  const isCurrentSelectionValid = () => {
    if (!actionType || !selectedTarget) return false;

    // Check if selected ability is on cooldown
    const selectedAbility = unlocked.find(
      (ability) => ability.type === actionType
    );
    if (selectedAbility) {
      const cooldown = me.abilityCooldowns?.[selectedAbility.type] || 0;
      if (cooldown > 0) return false;
    }

    // Check if target is still valid
    if (selectedTarget === '__monster__') {
      return monster && monster.hp > 0;
    } else {
      const targetPlayer = alivePlayers.find((p) => p.id === selectedTarget);
      return targetPlayer && targetPlayer.isAlive;
    }
  };

  // Enhanced submit action handler with validation
  const handleSubmitAction = () => {
    if (!isCurrentSelectionValid() || isSubmitting) {
      if (isSubmitting) return; // Prevent double submission
      
      const issues = [];
      if (!actionType) issues.push('Select an ability');
      if (!selectedTarget) issues.push('Select a target');

      const selectedAbility = unlocked.find((a) => a.type === actionType);
      if (selectedAbility && me?.abilityCooldowns?.[selectedAbility.type] > 0) {
        issues.push(
          `${selectedAbility.name} is on cooldown (${me.abilityCooldowns[selectedAbility.type]} turns)`
        );
      }

      if (selectedTarget === '__monster__' && (!monster || monster.hp <= 0)) {
        issues.push('Monster is no longer a valid target');
      } else if (selectedTarget !== '__monster__') {
        const targetPlayer = alivePlayers.find((p) => p.id === selectedTarget);
        if (!targetPlayer || !targetPlayer.isAlive) {
          issues.push('Selected player is no longer alive or valid');
        }
      }

      alert(`Cannot submit action:\n• ${issues.join('\n• ')}`);
      return;
    }

    // Set submitting state like mobile
    setIsSubmitting(true);
    onSubmitAction();
  };

  // Check if player's action needs to be revalidated
  const needsRevalidation = () => {
    return (
      me?.submissionStatus?.validationState === 'invalid' ||
      (me?.hasSubmittedAction && !me?.submissionStatus?.isValid)
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
          {!me.isAlive && (
            <div className="dead-message card">
              <h3 className="section-title danger">You are dead</h3>
              <p>
                You can only watch as the remaining players continue the battle.
              </p>
              <div className="skull-icon">💀</div>
            </div>
          )}

          {/* Stunned player view */}
          {me.isAlive && me.statusEffects?.stunned && (
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
          {me.isAlive &&
            !me.statusEffects?.stunned &&
            submitted &&
            !needsRevalidation() && (
              <div className="submit-message card">
                <h3 className="section-title">Action submitted</h3>

                {/* Show current submission status - mobile style */}
                <div className="submission-status">
                  <p>Waiting for other players to take their actions...</p>
                  
                  {/* Mobile-style player submission grid */}
                  <div className="player-targets-grid submission-grid">
                    {validPlayers
                      .filter((player) => player.isAlive)
                      .map((player) => (
                        <div
                          key={player.id}
                          className={`
                            player-target-card submission-card
                            ${player.hasSubmittedAction ? 'ready' : ''} 
                            ${player.id === me.id ? 'self' : ''}
                          `}
                        >
                          <div className="player-name">{player.name}</div>
                          <CustomAvatar player={player} isCurrentPlayer={player.id === me.id} />
                          <div className="submission-status-text">
                            {player.hasSubmittedAction ? '✓ Ready' : '⋯ Waiting'}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="waiting-spinner"></div>
              </div>
            )}

          {/* Invalid action warning and reset option */}
          {me.isAlive &&
            !me.statusEffects?.stunned &&
            submitted &&
            needsRevalidation() && (
              <div className="invalid-action-warning card">
                <h3 className="section-title danger">Action needs updating</h3>

                <div className="validation-warning">
                  <p
                    style={{
                      color: 'var(--color-danger)',
                      marginBottom: '10px',
                    }}
                  >
                    ⚠️ Your submitted action is no longer valid.
                    {me?.submissionStatus?.action?.invalidationReason && (
                      <span>
                        {' '}
                        Reason: {me.submissionStatus.action.invalidationReason}
                      </span>
                    )}
                  </p>
                  <p style={{ marginBottom: '15px' }}>
                    Please select a new action and target.
                  </p>
                </div>

                <div className="submission-status">
                  {/* Mobile-style player submission grid */}
                  <div className="player-targets-grid submission-grid">
                    {validPlayers
                      .filter((player) => player.isAlive)
                      .map((player) => (
                        <div
                          key={player.id}
                          className={`
                            player-target-card submission-card
                            ${player.hasSubmittedAction ? 'ready' : ''} 
                            ${player.id === me.id ? 'self' : ''}
                          `}
                        >
                          <div className="player-name">{player.name}</div>
                          <CustomAvatar player={player} isCurrentPlayer={player.id === me.id} />
                          <div className="submission-status-text">
                            {player.hasSubmittedAction ? '✓ Ready' : '⋯ Waiting'}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

          {/* Action selection view */}
          {me.isAlive &&
            !me.statusEffects?.stunned &&
            (!submitted || needsRevalidation()) && (
              <div className="action-selection">
                {/* Racial ability */}
                {me.racialAbility && (
                  <div className="racial-ability-container">
                    <h3 className="section-title secondary">Racial Ability</h3>
                    <RacialAbilityCard
                      ability={me.racialAbility}
                      usesLeft={me.racialUsesLeft}
                      cooldown={me.racialCooldown}
                      disabled={false}
                      onUse={() => onRacialAbilityUse(me.racialAbility.type)}
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

                {/* Enhanced validation message */}
                {actionType && selectedTarget && (
                  <div className="selection-validation">
                    {isCurrentSelectionValid() ? (
                      <div className="validation-success">
                        ✓ Ready to submit action
                      </div>
                    ) : (
                      <div className="validation-error">
                        {!actionType ? '• Select an ability' : ''}
                        {!selectedTarget ? '• Select a target' : ''}
                        {actionType && me.abilityCooldowns?.[actionType] > 0
                          ? `• Ability on cooldown (${me.abilityCooldowns[actionType]} turns)`
                          : ''}
                        {selectedTarget === '__monster__' &&
                        (!monster || monster.hp <= 0)
                          ? '• Monster is no longer a valid target'
                          : ''}
                        {selectedTarget !== '__monster__' &&
                        selectedTarget &&
                        !alivePlayers.find((p) => p.id === selectedTarget)
                          ? '• Selected player is no longer alive'
                          : ''}
                      </div>
                    )}
                  </div>
                )}

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
                  currentPlayerId={me.id}
                  selectedTarget={selectedTarget}
                  onSelectTarget={onSelectTarget}
                  disableMonster={keenSensesActive}
                  selectedAbility={unlocked.find((ability) => ability.type === actionType)}
                />

                {/* Enhanced submit button with mobile-style submission state */}
                <button
                  className={`button action-button ${isSubmitting ? 'submitting' : ''}`}
                  onClick={handleSubmitAction}
                  disabled={!isCurrentSelectionValid() || isSubmitting}
                  title={
                    isSubmitting
                      ? 'Submitting your action...'
                      : !isCurrentSelectionValid()
                      ? 'Please select a valid ability (not on cooldown) and target'
                      : 'Submit your action'
                  }
                >
                  {isSubmitting 
                    ? 'Submitting...' 
                    : needsRevalidation() 
                    ? 'Update Action' 
                    : 'Submit Action'
                  }
                </button>
              </div>
            )}
        </div>
      ) : (
        <div className="results-phase">
          <h2 className="section-title">Round {lastEvent.turn} Results</h2>

          {/* Event log */}
          <EventsLog
            events={lastEvent.events}
            currentPlayerId={me.id}
            players={validPlayers}
          />

          {/* Ready button */}
          {me.isAlive && (
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
                const player = lastEvent.players?.find(
                  (p) => p.id === playerId
                );
                return player ? (
                  <div key={playerId} className="ready-player">
                    <div className="ready-player-icon">
                      {player.name.charAt(0)}
                    </div>
                    <div className="ready-player-name">{player.name}</div>
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


ActionColumn.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  phase: PropTypes.oneOf(['action', 'results']).isRequired,
  me: PropTypes.object.isRequired,
  lastEvent: PropTypes.shape({
    turn: PropTypes.number.isRequired,
    events: PropTypes.array.isRequired,
    readyPlayers: PropTypes.array,
    players: PropTypes.array,
  }).isRequired,
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      hasSubmittedAction: PropTypes.bool,
      submissionStatus: PropTypes.object,
    })
  ).isRequired,
  unlocked: PropTypes.array.isRequired,
  alivePlayers: PropTypes.array.isRequired,
  monster: PropTypes.object.isRequired,
  actionType: PropTypes.string,
  selectedTarget: PropTypes.string,
  submitted: PropTypes.bool.isRequired,
  readyClicked: PropTypes.bool.isRequired,
  bloodRageActive: PropTypes.bool.isRequired,
  keenSensesActive: PropTypes.bool.isRequired,
  onSetActionType: PropTypes.func.isRequired,
  onSelectTarget: PropTypes.func.isRequired,
  onRacialAbilityUse: PropTypes.func.isRequired,
  onSubmitAction: PropTypes.func.isRequired,
  onReadyClick: PropTypes.func.isRequired,
};

export default ActionColumn;
