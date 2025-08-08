import React, { useState, useEffect } from 'react';
import reconnectionStorage from '../../utils/reconnectionStorage';
import './ReconnectionToggle.css';

export interface ReconnectionToggleProps {
  className?: string;
}

const ReconnectionToggle: React.FC<ReconnectionToggleProps> = ({ className = '' }) => {
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    setIsEnabled(reconnectionStorage.getReconnectionEnabled());
  }, []);

  const handleToggle = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    reconnectionStorage.setReconnectionEnabled(newState);
    
    if (!newState) {
      reconnectionStorage.clearCharacterSession();
    }
  };

  return (
    <div className={`reconnection-toggle flex-center-column ${className}`}>
      <label className="toggle-label flex items-center">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={handleToggle}
          className="toggle-input"
        />
        <span className="toggle-slider"></span>
        <span className="toggle-text">
          Reconnection {isEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </label>
      <div className="toggle-description">
        {isEnabled 
          ? 'Character will persist on disconnect for testing'
          : 'Character leaves game on disconnect (multi-window testing)'
        }
      </div>
    </div>
  );
};

export default ReconnectionToggle;