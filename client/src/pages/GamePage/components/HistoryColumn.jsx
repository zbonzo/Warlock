/**
 * @fileoverview Fixed HistoryColumn with proper template processing
 * Now correctly processes {attackerName}, {damage}, etc. placeholders
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import './HistoryColumn.css';

const HistoryColumn = ({
  isVisible,
  eventsLog,
  currentPlayerId,
  players = [],
  showAllEvents = false,
}) => {
  const theme = useTheme();

  // Don't render if not visible
  if (!isVisible) return null;

  // Get current player data
  const currentPlayer = players.find((p) => p.id === currentPlayerId);
  const isWarlock = currentPlayer?.isWarlock || false;
  const playerName = currentPlayer?.name || '';

  /**
   * Process template strings with actual values
   * @param {string} message - Message template with {placeholders}
   * @param {Object} event - Event object with data
   * @param {Array} playersList - List of players for name lookup
   * @returns {string} Processed message
   */
  const processTemplate = (message, event, playersList) => {
    if (!message) return '';

    // Create a fallback for empty players list
    const validPlayersList =
      Array.isArray(playersList) && playersList.length > 0 ? playersList : [];

    // Create a data object for replacements
    const data = {};

    // Check if we can look up player names
    const canLookupNames = validPlayersList.length > 0;

    // Add basic fields
    if (event.targetId) {
      data.targetId = event.targetId;
      // Get target name
      if (event.targetId === '__monster__') {
        data.targetName = 'the Monster';
      } else if (canLookupNames) {
        const targetPlayer = validPlayersList.find(
          (p) => p.id === event.targetId
        );
        data.targetName = targetPlayer ? targetPlayer.name : 'another player';
      } else {
        data.targetName = 'another player';
      }
    }

    if (event.attackerId) {
      data.attackerId = event.attackerId;
      if (canLookupNames) {
        const attackerPlayer = validPlayersList.find(
          (p) => p.id === event.attackerId
        );
        data.attackerName = attackerPlayer ? attackerPlayer.name : 'a player';
      } else {
        data.attackerName = 'a player';
      }
    }

    // Handle damage objects with special care
    if (event.damage) {
      // If damage is a primitive value
      if (typeof event.damage !== 'object') {
        data.damage = event.damage;
      } else {
        // If damage is an object, extract its properties
        if (event.damage.final !== undefined) data.damage = event.damage.final;
        if (event.damage.initial !== undefined)
          data.initialDamage = event.damage.initial;
        if (event.damage.reduction !== undefined)
          data.reduction = event.damage.reduction;
      }
    }

    // Copy all scalar properties from the event
    Object.entries(event).forEach(([key, value]) => {
      // Only copy primitive values and skip objects
      if (typeof value !== 'object' || value === null) {
        data[key] = value;
      }
    });

    // Add other important fields that might be needed
    if (event.amount) data.amount = event.amount;
    if (event.armor) data.armor = event.armor;
    if (event.turns) data.turns = event.turns;
    if (event.abilityName) data.abilityName = event.abilityName;

    // Process the template using our prepared data
    const result = message.replace(/{(\w+)}/g, (match, key) => {
      if (data[key] !== undefined) {
        return data[key];
      }
      return match; // Keep the placeholder if no replacement found
    });

    return result;
  };

  /**
   * Get the appropriate message for the current player with template processing
   * @param {Object|string} event - Event object or legacy string
   * @returns {string} Message to display
   */
  const getDisplayMessage = (event) => {
    // Handle legacy string events
    if (typeof event === 'string') {
      return event;
    }

    // Handle new enhanced event objects
    let message = '';

    if (event.attackerId === currentPlayerId) {
      // Player is the attacker/actor
      message = event.attackerMessage || event.message;
    } else if (event.targetId === currentPlayerId) {
      // Player is the target
      message = event.privateMessage || event.message;
    } else {
      // Player is observing
      message = event.message || '';
    }

    // Process the template with actual values
    return processTemplate(message, event, players);
  };

  /**
   * Strict filtering for regular players
   */
  const shouldShowEvent = (event) => {
    // Always show everything for warlocks or admin view
    if (showAllEvents || isWarlock) {
      return true;
    }

    // Convert event to string for easier processing
    let eventText = '';
    if (typeof event === 'string') {
      eventText = event;
    } else {
      // Process the message first to get the actual text
      eventText = getDisplayMessage(event);
    }

    if (!eventText) {
      return false;
    }

    // Check if event involves the current player
    const involvesPlayer =
      eventText.includes(playerName) ||
      eventText.includes('You ') ||
      eventText.includes(' you ') ||
      eventText.includes('Your ') ||
      eventText.includes(' your ');

    // Check if it's a monster event
    const isMonsterEvent =
      eventText.includes('Monster') || eventText.includes('monster');

    // Check if it's a corruption event
    const isCorruptionEvent =
      eventText.includes('corrupted') ||
      eventText.includes('Warlock') ||
      eventText.includes('converted') ||
      eventText.includes('fallen to darkness');

    // Check if it's a level up event
    const isLevelUpEvent =
      eventText.includes('level up') || eventText.includes('Level up');

    // Check if it's a death/resurrection event
    const isDeathEvent =
      eventText.includes('died') ||
      eventText.includes('fallen') ||
      eventText.includes('Undying') ||
      eventText.includes('resurrected');

    return (
      involvesPlayer ||
      isMonsterEvent ||
      isCorruptionEvent ||
      isLevelUpEvent ||
      isDeathEvent
    );
  };

  /**
   * Get CSS classes for styling
   */
  const getEventClasses = (event) => {
    let classes = ['event-item'];

    const message = getDisplayMessage(event);

    // Add perspective classes
    if (typeof event === 'object') {
      if (event.attackerId === currentPlayerId) {
        classes.push('event-you-acted');
      } else if (event.targetId === currentPlayerId) {
        classes.push('event-you-target');
      } else {
        classes.push('event-observer');
      }
    }

    // Add type-based classes
    if (message.includes('Warlock')) classes.push('warlock-event');
    if (message.includes('attacked') || message.includes('damage'))
      classes.push('attack-event');
    if (message.includes('healed') || message.includes('healing'))
      classes.push('heal-event');
    if (message.includes('Monster')) classes.push('monster-event');
    if (message.includes('died') || message.includes('fallen'))
      classes.push('death-event');
    if (message.includes('corrupted')) classes.push('corruption-event');
    if (message.includes('level up')) classes.push('level-event');

    return classes.join(' ');
  };

  return (
    <div className="history-column">
      <h2 className="section-title">
        Game History
        {isWarlock && (
          <span
            style={{
              fontSize: '0.7em',
              color: 'var(--color-warlock)',
              marginLeft: '8px',
            }}
          >
            👁️ Full View
          </span>
        )}
      </h2>

      <div className="history-content">
        {eventsLog.length === 0 ? (
          <div className="empty-history">
            No game events yet. Actions will appear here.
          </div>
        ) : (
          [...eventsLog].reverse().map((logEntry, index) => {
            const filteredEvents = logEntry.events.filter(shouldShowEvent);

            return (
              <div key={index} className="history-entry">
                <h3 className="round-title">Round {logEntry.turn}</h3>
                <div className="event-list">
                  {filteredEvents
                    .map((event, eventIndex) => {
                      const message = getDisplayMessage(event);

                      if (!message) return null;

                      return (
                        <div
                          key={eventIndex}
                          className={getEventClasses(event)}
                        >
                          {message}
                        </div>
                      );
                    })
                    .filter(Boolean)}

                  {filteredEvents.length === 0 && (
                    <div
                      className="event-item"
                      style={{
                        fontStyle: 'italic',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      No events to show for this round
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

HistoryColumn.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  eventsLog: PropTypes.array.isRequired,
  currentPlayerId: PropTypes.string.isRequired,
  players: PropTypes.array,
  showAllEvents: PropTypes.bool,
};

export default HistoryColumn;
