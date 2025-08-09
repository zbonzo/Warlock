/**
 * @fileoverview Fixed HistoryColumn with secure ID-based filtering
 * Now correctly filters events using player IDs instead of exploitable name matching
 */
import React from 'react';
import { Player, GameEvent } from '@/types/game';
import './HistoryColumn.css';

interface LastEventData {
  turn: number;
  events: GameEvent[];
  [key: string]: any;
}

interface HistoryColumnProps {
  isVisible: boolean;
  eventsLog: Array<{ turn: number; events: GameEvent[] }>;
  lastEvent: LastEventData;
  currentPlayerId: string;
  players?: Player[];
  showAllEvents?: boolean;
}

const HistoryColumn: React.FC<HistoryColumnProps> = ({
  isVisible,
  eventsLog,
  lastEvent,
  currentPlayerId,
  players = [],
  showAllEvents = false,
}) => {
  // Don't render if not visible
  if (!isVisible) return null;

  /**
   * Process template strings with actual values
   */
  const processTemplate = (message: string, event: GameEvent, playersList: Player[]): string => {
    if (!message) return '';

    // Create a fallback for empty players list
    const validPlayersList = Array.isArray(playersList) && playersList.length > 0 ? playersList : [];

    // Create a data object for replacements
    const data: Record<string, any> = {};

    // Check if we can look up player names
    const canLookupNames = validPlayersList.length > 0;

    // Add basic fields
    if (event.targetId) {
      data['targetId'] = event.targetId;
      // Get target name
      if (event.targetId === '__monster__') {
        data['targetName'] = 'the Monster';
      } else if (canLookupNames) {
        const targetPlayer = validPlayersList.find((p) => p['id'] === event.targetId);
        data['targetName'] = targetPlayer ? targetPlayer['name'] : 'another player';
      } else {
        data['targetName'] = 'another player';
      }
    }

    if (event.attackerId) {
      data['attackerId'] = event.attackerId;
      if (canLookupNames) {
        const attackerPlayer = validPlayersList.find((p) => p['id'] === event.attackerId);
        data['attackerName'] = attackerPlayer ? attackerPlayer['name'] : 'a player';
      } else {
        data['attackerName'] = 'a player';
      }
    }

    // Handle damage objects
    if (event.damage) {
      if (typeof event.damage !== 'object') {
        data['damage'] = event.damage;
      } else {
        data['damage'] = (event.damage as any).final || (event.damage as any).initial || 0;
        data['damageReduction'] = (event.damage as any).reduction || 0;
      }
    }

    // Add other event properties
    Object.keys(event).forEach(key => {
      if (!data[key] && event[key as keyof GameEvent] !== undefined) {
        data[key] = event[key as keyof GameEvent];
      }
    });

    // Replace placeholders in the message
    let processedMessage = message;
    Object.keys(data).forEach(key => {
      const placeholder = `{${key}}`;
      if (processedMessage.includes(placeholder)) {
        processedMessage = processedMessage.replace(new RegExp(placeholder, 'g'), String(data[key]));
      }
    });

    return processedMessage;
  };

  /**
   * Filter events based on visibility rules
   */
  const filterEvents = (events: GameEvent[]): GameEvent[] => {
    if (showAllEvents) return events;

    return events.filter(event => {
      // Show all public events
      if (event.public !== false) return true;
      
      // Show private events visible to current player
      if (event.visibleTo && event.visibleTo.includes(currentPlayerId)) return true;
      
      // Show events where current player is involved
      if (event.playerId === currentPlayerId || event.targetId === currentPlayerId || event.attackerId === currentPlayerId) {
        return true;
      }
      
      // Hide other private events
      return false;
    });
  };

  /**
   * Render event message
   */
  const renderEventMessage = (event: GameEvent): React.ReactNode => {
    const message = event.message || event.privateMessage || '';
    const processedMessage = processTemplate(message, event, players);
    
    return (
      <div className={`event-message ${event.type}`} key={`${event.timestamp}-${Math.random()}`}>
        <span className="event-text">{processedMessage}</span>
        {event.damage && typeof event.damage === 'object' && (
          <span className="damage-breakdown">
            (Initial: {(event.damage as any).initial}, Final: {(event.damage as any).final})
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="history-column">
      <h3 className="section-title">Battle History</h3>
      
      <div className="events-container">
        {eventsLog.map((roundData, index) => {
          const filteredEvents = filterEvents(roundData.events);
          
          if (filteredEvents.length === 0) return null;
          
          return (
            <div key={`round-${roundData.turn}`} className="round-events">
              <h4 className="round-title">Round {roundData.turn}</h4>
              <div className="events-list">
                {filteredEvents.map((event, eventIndex) => (
                  <div key={`event-${eventIndex}`} className="event-item">
                    {renderEventMessage(event)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {eventsLog.length === 0 && (
          <div className="no-events">
            <p>No events yet. The battle begins soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryColumn;
