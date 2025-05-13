/**
 * @fileoverview History column component that displays the game event log
 * Shows all rounds and their events in chronological order
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import './HistoryColumn.css';

/**
 * HistoryColumn component displays the game history
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether column is currently visible
 * @param {Array} props.eventsLog - Array of event log entries by round
 * @returns {React.ReactElement|null} The rendered component or null if not visible
 */
const HistoryColumn = ({ isVisible, eventsLog }) => {
  const theme = useTheme();
  
  // Don't render if not visible (mobile view handling)
  if (!isVisible) return null;
  
  return (
    <div className="history-column">
      <h2 className="section-title">
        Game History
      </h2>
      
      <div className="history-content">
        {eventsLog.length === 0 ? (
          <p className="empty-history">No game events yet. Actions will appear here.</p>
        ) : (
          eventsLog.map((logEntry, index) => (
            <div key={index} className="history-entry">
              <h3 className="round-title">
                Round {logEntry.turn}
              </h3>
              
              <div className="event-list">
                {logEntry.events.map((event, eventIndex) => (
                  <div 
                    key={eventIndex} 
                    className={`event-item ${getEventClass(event)}`}
                  >
                    {event}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Determines the appropriate CSS class based on the event content
 * 
 * @param {string} event - The event message text
 * @returns {string} CSS class name for styling
 */
function getEventClass(event) {
  if (event.includes('Warlock')) return 'warlock-event';
  if (event.includes('attacked') || event.includes('damage')) return 'attack-event';
  if (event.includes('healed') || event.includes('healing')) return 'heal-event';
  if (event.includes('protected') || event.includes('shield')) return 'defense-event';
  if (event.includes('Monster')) return 'monster-event';
  if (event.includes('fallen') || event.includes('died')) return 'death-event';
  if (event.includes('level up')) return 'level-event';
  return '';
}

HistoryColumn.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  eventsLog: PropTypes.arrayOf(
    PropTypes.shape({
      turn: PropTypes.number.isRequired,
      events: PropTypes.arrayOf(PropTypes.string).isRequired
    })
  ).isRequired
};

export default HistoryColumn;