import React, { useState, useEffect } from 'react';
import reconnectionStorage from '../../utils/reconnectionStorage';
import './ReconnectionToggle.css';

const ReconnectionToggle = ({ className = '' }) => {
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    setIsEnabled(reconnectionStorage.getReconnectionEnabled());
  }, []);

  const handleToggle = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    reconnectionStorage.setReconnectionEnabled(newState);
    
    // If disabling reconnection, clear any existing session
    if (!newState) {
      reconnectionStorage.clearCharacterSession();
    }
  };

  return (
    <div className={`reconnection-toggle ${className}`}>
      <label className="toggle-label">
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