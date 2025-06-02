/**
 * @fileoverview Enhanced EventsLog component that handles personalized messages
 * Shows different information based on player perspective
 */
import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import './EventsLog.css';

/**
 * EventsLog component displays personalized game events
 *
 * @param {Object} props - Component props
 * @param {Array} props.events - Array of event objects or strings
 * @param {string} props.currentPlayerId - ID of the current player
 * @param {Array} props.players - Array of all players (to get current player name)
 * @returns {React.ReactElement} The rendered component
 */
const EventsLog = ({ events, currentPlayerId, players = [] }) => {
  const theme = useTheme();
  const logRef = useRef(null);

  useEffect(() => {
    console.log('EventsLog received props:', {
      eventsCount: events?.length || 0,
      currentPlayerId,
      playersCount: players?.length || 0,
    });

    // Log the first few events to see their structure
    if (events && events.length > 0) {
      console.log('Sample events:', events.slice(0, 3));
    }
  }, [events, currentPlayerId, players]);

  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  const getPersonalizedMessage = (event) => {
    // Debug what type of event we're processing
    console.log('Processing event type:', event.type);

    // Handle legacy string events
    if (typeof event === 'string') {
      return event;
    }

    // Select the appropriate message based on perspective
    let message = '';
    if (event.attackerId === currentPlayerId) {
      // Player is the attacker/actor
      message = event.attackerMessage || event.message;
      console.log('Using attacker message:', message);
    } else if (event.targetId === currentPlayerId) {
      // Player is the target
      message = event.privateMessage || event.message;
      console.log('Using target message:', message);
    } else {
      // Player is observing
      message = event.message || '';
      console.log('Using observer message:', message);
    }

    // Process and return the message
    return processTemplate(message, event, players);
  };

  /**
   * Determine if event should be visible to current player
   * Enhanced to include disconnection events which should always be visible
   * @param {Object|string} event - Event object or string
   * @returns {boolean} Whether event should be shown
   */
  const shouldShowEvent = (event) => {
    let message = '';

    // Debug which events are being filtered
    console.log('Checking if should show event:', event.type || 'string event');

    // Always show disconnection events - they're part of the story!
    if (event.type === 'player_disconnect') {
      console.log('Showing disconnection event');
      return true;
    }

    // Make sure defensive abilities are always shown to the player
    if (
      event.type === 'defense' ||
      (event.message && event.message.includes('shielded')) ||
      (event.message && event.message.includes('invisible'))
    ) {
      console.log('Showing defensive event');
      return true;
    }

    // Get the message text to check
    if (typeof event === 'string') {
      message = event;
    } else {
      // For new event objects, get the appropriate message for this player
      message = getPersonalizedMessage(event);
    }

    // Universal messages that everyone should see
    const universalPhrases = [
      'The Monster attacks',
      'The Monster has been defeated',
      'Another hero has been corrupted',
      'activates', // For racial abilities like "Ghost activates Stone Resolve"
      'level up',
      'wandered into the forest', // Disconnection message
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

  /**
   * Enhanced legacy function for determining CSS class based on event content
   * Now includes disconnection events
   */
  function getEventClass(event) {
    if (event.includes('Warlock')) return 'warlock-event';
    if (event.includes('attacked') || event.includes('damage'))
      return 'attack-event';
    if (event.includes('healed') || event.includes('healing'))
      return 'heal-event';
    if (event.includes('shielded') || event.includes('shield'))
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
    // Add disconnection event styling
    if (event.includes('wandered into the forest')) return 'disconnect-event';
    return '';
  }

  return (
    <div className="events-log-container">
      <h3 className="events-log-title">Battle Log</h3>

      <div ref={logRef} className="events-log-content">
        {events.length === 0 ? (
          <div className="events-log-empty">No events yet</div>
        ) : (
          events
            .filter(shouldShowEvent)
            .map((event, index) => {
              const message = getPersonalizedMessage(event);

              // Don't render empty messages
              if (!message) return null;

              return (
                <div
                  key={index}
                  className={`events-log-entry ${getEventClasses(event)} ${index % 2 === 0 ? 'even' : 'odd'}`}
                >
                  {message}
                </div>
              );
            })
            .filter(Boolean) // Remove null entries
        )}
      </div>
    </div>
  );
};

/**
 * Legacy function for determining CSS class based on event content
 * @param {string} event - The event message
 * @returns {string} CSS class name for the event type
 */
function getEventClass(event) {
  if (event.includes('Warlock')) return 'warlock-event';
  if (event.includes('attacked') || event.includes('damage'))
    return 'attack-event';
  if (event.includes('healed') || event.includes('healing'))
    return 'heal-event';
  if (event.includes('shielded') || event.includes('shield'))
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
  return '';
}

const processTemplate = (message, event, playersList) => {
  if (!message) return '';

  // Create a fallback for empty players list
  const validPlayersList =
    Array.isArray(playersList) && playersList.length > 0 ? playersList : [];

  // Create a flattened data object for replacements
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
      // Fallback when players list is empty
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
      // Fallback when players list is empty
      data.attackerName = 'a player';
    }
  }

  // Handle damage objects with special care
  if (event.damage) {
    // If damage is a primitive value
    if (typeof event.damage !== 'object') {
      data.damage = event.damage;
    }
    // If damage is an object, extract its properties
    else {
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

const getPlayerName = (playerId, playersList) => {
  if (!playerId || playerId === '__monster__') return 'the Monster';
  const player = playersList.find((p) => p.id === playerId);
  return player ? player.name : 'Unknown Player';
};

EventsLog.propTypes = {
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
  currentPlayerId: PropTypes.string.isRequired,
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  processTemplate: PropTypes.func,
  getPlayerName,
};

export default EventsLog;

