/**
 * @fileoverview Action column component for game interaction
 * Handles ability selection, targeting, and action submission
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import AbilityCard from '@components/game/AbilityCard';
import RacialAbilityCard from '@components/game/RacialAbilityCard';
import TargetSelector from '@components/game/TargetSelector';
import EventsLog from '@components/game/EventsLog';
import './ActionColumn.css';

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
  racialSelected,
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
    if (!isCurrentSelectionValid()) {
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

    onSubmitAction();
  };

  // Get submission status for all players with enhanced tracking
  const getSubmissionStatus = () => {
    const submittedPlayers = validPlayers.filter(
      (player) => player.hasSubmittedAction && player.isAlive
    );
    const totalAlivePlayers = validPlayers.filter(
      (player) => player.isAlive
    ).length;

    // Count valid submissions
    const validSubmissions = submittedPlayers.filter(
      (player) => player.submissionStatus?.isValid !== false
    );

    return {
      submitted: submittedPlayers,
      validSubmitted: validSubmissions,
      total: totalAlivePlayers,
      percentage:
        totalAlivePlayers > 0
          ? (validSubmissions.length / totalAlivePlayers) * 100
          : 0,
    };
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

          {/* Enhanced waiting for others view with detailed submission tracking */}
          {me.isAlive && submitted && !needsRevalidation() && (
            <div className="submit-message card">
              <h3 className="section-title">Action submitted</h3>

              {/* Show current submission status */}
              <div className="submission-status">
                <p>Waiting for other players to take their actions...</p>
                <ActionSubmissionTracker players={validPlayers} />
              </div>

              <div className="waiting-spinner"></div>
            </div>
          )}

          {/* Invalid action warning and reset option */}
          {me.isAlive && submitted && needsRevalidation() && (
            <div className="invalid-action-warning card">
              <h3 className="section-title danger">Action needs updating</h3>

              <div className="validation-warning">
                <p
                  style={{ color: 'var(--color-danger)', marginBottom: '10px' }}
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
                <ActionSubmissionTracker players={validPlayers} />
              </div>
            </div>
          )}

          {/* Action selection view */}
          {me.isAlive && (!submitted || needsRevalidation()) && (
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

              {/* Class abilities with enhanced cooldown display */}
              <h3 className="section-title secondary">Your Abilities</h3>

              <div className="ability-list">
                {unlocked.map((ability) => {
                  const cooldown = me.abilityCooldowns?.[ability.type] || 0;
                  return (
                    <AbilityCard
                      key={ability.type}
                      ability={ability}
                      selected={actionType === ability.type}
                      onSelect={onSetActionType}
                      abilityCooldown={cooldown}
                      player={me}
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
              />

              {/* Enhanced submit button with better validation */}
              <button
                className="button action-button"
                onClick={handleSubmitAction}
                disabled={!isCurrentSelectionValid()}
                title={
                  !isCurrentSelectionValid()
                    ? 'Please select a valid ability (not on cooldown) and target'
                    : 'Submit your action'
                }
              >
                {needsRevalidation() ? 'Update Action' : 'Submit Action'}
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

/**
 * Enhanced component to track and display action submission status
 */
const ActionSubmissionTracker = ({ players }) => {
  const alivePlayers = players.filter((p) => p.isAlive);

  // Count different types of submissions
  const submittedPlayers = alivePlayers.filter((p) => p.hasSubmittedAction);
  const validSubmissions = submittedPlayers.filter(
    (p) => p.submissionStatus?.isValid !== false
  );
  const invalidSubmissions = submittedPlayers.filter(
    (p) => p.submissionStatus?.isValid === false
  );

  const percentage =
    alivePlayers.length > 0
      ? (validSubmissions.length / alivePlayers.length) * 100
      : 0;

  return (
    <div className="submission-tracker">
      <div className="submission-progress">
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="progress-text">
          {validSubmissions.length} of {alivePlayers.length} players submitted
          valid actions
          {invalidSubmissions.length > 0 && (
            <span className="invalid-count">
              ({invalidSubmissions.length} need to resubmit)
            </span>
          )}
        </div>
      </div>

      <div className="submitted-players">
        {/* Show valid submissions */}
        {validSubmissions.map((player) => (
          <div key={player.id} className="submitted-player-badge valid">
            <span className="player-initial">{player.name.charAt(0)}</span>
            <span className="checkmark">✓</span>
          </div>
        ))}

        {/* Show invalid submissions */}
        {invalidSubmissions.map((player) => (
          <div key={player.id} className="submitted-player-badge invalid">
            <span className="player-initial">{player.name.charAt(0)}</span>
            <span className="warning">⚠</span>
          </div>
        ))}

        {/* Show pending players */}
        {alivePlayers
          .filter((p) => !p.hasSubmittedAction)
          .map((player) => (
            <div key={player.id} className="submitted-player-badge pending">
              <span className="player-initial">{player.name.charAt(0)}</span>
              <span className="pending">⋯</span>
            </div>
          ))}
      </div>
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
  racialSelected: PropTypes.bool.isRequired,
  bloodRageActive: PropTypes.bool.isRequired,
  keenSensesActive: PropTypes.bool.isRequired,
  onSetActionType: PropTypes.func.isRequired,
  onSelectTarget: PropTypes.func.isRequired,
  onRacialAbilityUse: PropTypes.func.isRequired,
  onSubmitAction: PropTypes.func.isRequired,
  onReadyClick: PropTypes.func.isRequired,
};

export default ActionColumn;
