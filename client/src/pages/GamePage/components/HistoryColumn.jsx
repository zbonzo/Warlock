/**
 * @fileoverview Enhanced History column component that displays personalized game event log
 * Shows all rounds and their events with personalized messages
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import './HistoryColumn.css';

/**
 * HistoryColumn component displays the personalized game history
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether column is currently visible
 * @param {Array} props.eventsLog - Array of event log entries by round
 * @param {string} props.currentPlayerId - ID of the current player
 * @param {Array} props.players - Array of all players (to get current player name)
 * @param {boolean} props.showAllEvents - Whether to show all events (unredacted)
 * @returns {React.ReactElement|null} The rendered component or null if not visible
 */
const HistoryColumn = ({
  isVisible,
  eventsLog,
  currentPlayerId,
  players = [],
  showAllEvents = false,
}) => {
  const theme = useTheme();

  // Don't render if not visible (mobile view handling)
  if (!isVisible) return null;

  /**
   * Get the appropriate message for the current player
   * @param {Object|string} event - Event object or legacy string
   * @returns {string} Message to display
   */
  const getPersonalizedMessage = (event) => {
    // Handle legacy string events
    if (typeof event === 'string') {
      return event;
    }

    // Handle new enhanced event objects
    if (event.attackerId === currentPlayerId) {
      // Player is the attacker/actor
      return event.attackerMessage || event.message;
    } else if (event.targetId === currentPlayerId) {
      // Player is the target
      return event.privateMessage || event.message;
    } else {
      // Player is observing
      return event.message || '';
    }
  };

  /**
   * Determine if event should be visible to current player
   * Simple filter: show if player's name appears OR if it's a universal message
   * @param {Object|string} event - Event object or string
   * @returns {boolean} Whether event should be shown
   */
  const shouldShowEvent = (event) => {
    // If showing all events (unredacted), show everything
    if (showAllEvents) {
      return true;
    }

    // For new event objects, check if player is directly involved
    if (typeof event !== 'string') {
      // If player is directly the actor or target of the event
      if (
        event.attackerId === currentPlayerId ||
        event.targetId === currentPlayerId
      ) {
        return true;
      }

      // If it's a public event that everyone should see
      if (event.public) {
        return true;
      }
    }

    // Get the message text to check (for both string and object events)
    let message =
      typeof event === 'string' ? event : getPersonalizedMessage(event);

    // Universal messages that everyone should see
    const universalPhrases = [
      'The Monster attacks',
      'The Monster has been defeated',
      'Another hero has been corrupted',
      'activates', // For racial abilities like "Ghost activates Stone Resolve"
      'level up',
    ];

    // Check if it's a universal message
    if (universalPhrases.some((phrase) => message.includes(phrase))) {
      return true;
    }

    // Get player name from players list or use a fallback
    const currentPlayer = players?.find((p) => p.id === currentPlayerId);
    const playerName = currentPlayer?.name || '';

    // Show if the player's name appears in the message
    if (playerName && message.includes(playerName)) {
      return true;
    }

    // Show if the message contains "You" (personalized messages)
    if (
      message.includes('You ') ||
      message.includes('Your ') ||
      message.includes('you ') ||
      message.includes('your ')
    ) {
      return true;
    }

    return false;
  };

  /**
   * Get CSS class for event styling based on type and perspective
   * @param {Object|string} event - Event object or string
   * @returns {string} CSS class names
   */
  const getEventClasses = (event) => {
    let classes = [];

    // Handle legacy events
    if (typeof event === 'string') {
      classes.push(getEventClass(event));
      return classes.join(' ');
    }

    // Base class from event type
    if (event.type) {
      classes.push(`event-${event.type}`);
    }

    // Add perspective-based classes
    if (event.attackerId === currentPlayerId) {
      classes.push('event-you-acted');
    } else if (event.targetId === currentPlayerId) {
      classes.push('event-you-target');
    } else {
      classes.push('event-observer');
    }

    // Add legacy class for backward compatibility
    const message = getPersonalizedMessage(event);
    classes.push(getEventClass(message));

    return classes.join(' ');
  };

  return (
    <div className="history-column">
      <h2 className="section-title">Game History</h2>

      <div className="history-content">
        {eventsLog.length === 0 ? (
          <p className="empty-history">
            No game events yet. Actions will appear here.
          </p>
        ) : (
          [...eventsLog].reverse().map((logEntry, index) => (
            <div key={index} className="history-entry">
              <h3 className="round-title">Round {logEntry.turn}</h3>

              <div className="event-list">
                {
                  logEntry.events
                    .filter(shouldShowEvent)
                    .map((event, eventIndex) => {
                      const message = showAllEvents
                        ? getUnredactedMessage(event)
                        : getPersonalizedMessage(event);

                      // Don't render empty messages
                      if (!message) return null;

                      return (
                        <div
                          key={eventIndex}
                          className={`event-item ${getEventClasses(event)}`}
                        >
                          {message}
                        </div>
                      );
                    })
                    .filter(Boolean) // Remove null entries
                }
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Get all messages for unredacted view (shows public messages from all events)
 * @param {Object|string} event - Event object or string
 * @returns {string} Message to display in unredacted view
 */
const getUnredactedMessage = (event) => {
  // Handle legacy string events
  if (typeof event === 'string') {
    return event;
  }
  // For new event objects, prefer public message, fall back to personalized
  return event.message;
};

/**
 * Legacy function for determining CSS class based on event content
 * @param {string} event - The event message text
 * @returns {string} CSS class name for styling
 */
function getEventClass(event) {
  if (event.includes('Warlock')) return 'warlock-event';
  if (event.includes('attacked') || event.includes('damage'))
    return 'attack-event';
  if (event.includes('healed') || event.includes('healing'))
    return 'heal-event';
  if (event.includes('protected') || event.includes('shield'))
    return 'defense-event';
  if (event.includes('Monster')) return 'monster-event';
  if (
    event.includes('fallen') ||
    event.includes('died') ||
    event.includes('killed')
  )
    return 'death-event';
  if (event.includes('corrupted') || event.includes('converted'))
    return 'corruption-event';
  if (event.includes('Undying') || event.includes('resurrected'))
    return 'resurrect-event';
  if (event.includes('level up')) return 'level-event';
  return '';
}

HistoryColumn.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  eventsLog: PropTypes.arrayOf(
    PropTypes.shape({
      turn: PropTypes.number.isRequired,
      events: PropTypes.arrayOf(
        PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.shape({
            type: PropTypes.string,
            public: PropTypes.bool,
            message: PropTypes.string,
            privateMessage: PropTypes.string,
            attackerMessage: PropTypes.string,
            targetId: PropTypes.string,
            attackerId: PropTypes.string,
          }),
        ])
      ).isRequired,
    })
  ).isRequired,
  currentPlayerId: PropTypes.string.isRequired,
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  showAllEvents: PropTypes.bool,
};

export default HistoryColumn;
