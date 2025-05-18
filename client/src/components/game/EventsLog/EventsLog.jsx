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
  
  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

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
    let message = '';
    
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
      'level up'
    ];
    
    // Check if it's a universal message
    if (universalPhrases.some(phrase => message.includes(phrase))) {
      return true;
    }
    
    // Get player name from players list or use a fallback
    const currentPlayer = players?.find(p => p.id === currentPlayerId);
    const playerName = currentPlayer?.name || '';
    
    // Show if the player's name appears in the message
    if (playerName && message.includes(playerName)) {
      return true;
    }
    
    // Show if the message contains "You" (personalized messages)
    if (message.includes('You ') || message.includes('Your ') || message.includes('you ') || message.includes('your ')) {
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
  if (event.includes('attacked') || event.includes('damage')) return 'attack-event';
  if (event.includes('healed') || event.includes('healing')) return 'heal-event';
  if (event.includes('protected') || event.includes('shield')) return 'defense-event';
  if (event.includes('Monster')) return 'monster-event';
  if (event.includes('fallen') || event.includes('died') || event.includes('killed')) return 'death-event';
  if (event.includes('corrupted') || event.includes('converted')) return 'corruption-event';
  if (event.includes('Undying') || event.includes('resurrected')) return 'resurrect-event';
  return '';
}

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
        attackerId: PropTypes.string
      })
    ])
  ).isRequired,
  currentPlayerId: PropTypes.string.isRequired,
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    })
  )
};

export default EventsLog;