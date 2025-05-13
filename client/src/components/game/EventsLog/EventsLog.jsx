/**
 * @fileoverview Component for displaying game events in a scrollable log
 * with color-coded entries based on event type.
 */
import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import './EventsLog.css';

/**
 * EventsLog component displays a list of game events with auto-scrolling
 * and color-coded entries.
 * 
 * @param {Object} props - Component props
 * @param {string[]} props.events - Array of event messages to display
 * @returns {React.ReactElement} The rendered component
 */
const EventsLog = ({ events }) => {
  const theme = useTheme();
  const logRef = useRef(null);
  
  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);
  
  return (
    <div className="events-log-container">
      <h3 className="events-log-title">Battle Log</h3>
      
      <div ref={logRef} className="events-log-content">
        {events.length === 0 ? (
          <div className="events-log-empty">No events yet</div>
        ) : (
          events.map((event, index) => (
            <div 
              key={index} 
              className={`events-log-entry ${getEventClass(event)} ${index % 2 === 0 ? 'even' : 'odd'}`}
            >
              {event}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Determines the CSS class to apply based on the event content
 * 
 * @param {string} event - The event message
 * @returns {string} CSS class name for the event type
 */
function getEventClass(event) {
  if (event.includes('Warlock')) return 'warlock-event';
  if (event.includes('attacked')) return 'attack-event';
  if (event.includes('healed')) return 'heal-event';
  if (event.includes('protected')) return 'defense-event';
  if (event.includes('Monster')) return 'monster-event';
  if (event.includes('fallen') || event.includes('died')) return 'death-event';
  return '';
}

EventsLog.propTypes = {
  events: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default EventsLog;