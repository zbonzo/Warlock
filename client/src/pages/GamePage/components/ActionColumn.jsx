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
  onReadyClick
}) => {
  const theme = useTheme();
  
  // Don't render if not visible
  if (!isVisible) return null;

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
              <h3 className="section-title danger">
                You are dead
              </h3>
              <p>You can only watch as the remaining players continue the battle.</p>
              <div className="skull-icon">💀</div>
            </div>
          )}
          
          {/* Waiting for others view */}
          {me.isAlive && submitted && (
            <div className="submit-message card">
              <h3 className="section-title">
                Action submitted
              </h3>
              <p>Waiting for other players to take their actions...</p>
              <div className="waiting-spinner"></div>
            </div>
          )}
          
          {/* Action selection view */}
          {me.isAlive && !submitted && (
            <div className="action-selection">
              {/* Racial ability */}
              {me.racialAbility && (
                <div className="racial-ability-container">
                  <h3 className="section-title secondary">
                    Racial Ability
                  </h3>
                  <RacialAbilityCard
                    ability={me.racialAbility}
                    usesLeft={me.racialUsesLeft}
                    cooldown={me.racialCooldown}
                    disabled={false}
                    onUse={() => onRacialAbilityUse(me.racialAbility.type)}
                  />
                </div>
              )}
              
              {/* Class abilities */}
              <h3 className="section-title secondary">
                Your Abilities
              </h3>
              
              <div className="ability-list">
                {unlocked.map(ability => (
                  <AbilityCard
                    key={ability.type}
                    ability={ability}
                    selected={actionType === ability.type}
                    onSelect={onSetActionType}
                    abilityCooldown={me.abilityCooldowns?.[ability.type] || 0}
                  />
                ))}
              </div>
              
              {/* Racial enhancement indicators */}
              {(bloodRageActive || keenSensesActive) && (
                <div className={`racial-enhancement ${bloodRageActive ? 'blood-rage' : ''} ${keenSensesActive ? 'keen-senses' : ''}`}>
                  {bloodRageActive && (
                    <div className="enhancement-badge blood-rage-badge">
                      <span className="enhancement-icon">💢</span>
                      <span className="enhancement-text">Blood Rage Active</span>
                    </div>
                  )}
                  
                  {keenSensesActive && (
                    <div className="enhancement-badge keen-senses-badge">
                      <span className="enhancement-icon">👁️</span>
                      <span className="enhancement-text">Keen Senses Active</span>
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
              
              {/* Submit button */}
              <button
                className="button action-button"
                onClick={onSubmitAction}
                disabled={!actionType || !selectedTarget}
              >
                Submit Action
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="results-phase">
          <h2 className="section-title">
            Round {lastEvent.turn} Results
          </h2>
          
          {/* Event log */}
          <EventsLog 
            events={lastEvent.events} 
            currentPlayerId={me.id}
            players={players}
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
                  <span className="ready-text">Waiting for other players...</span>
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
              {lastEvent.readyPlayers?.map(playerId => {
                const player = lastEvent.players?.find(p => p.id === playerId);
                return player ? (
                  <div key={playerId} className="ready-player">
                    <div className="ready-player-icon">{player.name.charAt(0)}</div>
                    <div className="ready-player-name">{player.name}</div>
                  </div>
                ) : null;
              })}
              {(!lastEvent.readyPlayers || lastEvent.readyPlayers.length === 0) && (
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
    players: PropTypes.array
  }).isRequired,
    players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
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
  onReadyClick: PropTypes.func.isRequired
};

export default ActionColumn;