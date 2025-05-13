/**
 * @fileoverview Character selection page where players choose their race and class
 * Handles compatibility between races and classes and provides suggestions
 */
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import { RACES, CLASSES, CLASS_TO_RACES } from './constants';
import './CharacterSelectPage.css';

/**
 * CharacterSelectPage component allows players to select their race and class
 * 
 * @param {Object} props - Component props
 * @param {string} props.playerName - Player's name
 * @param {string} props.gameCode - Game room code
 * @param {string|null} props.selectedRace - Currently selected race
 * @param {string|null} props.selectedClass - Currently selected class
 * @param {Function} props.onSelectRace - Callback when race is selected
 * @param {Function} props.onSelectClass - Callback when class is selected
 * @param {Function} props.onConfirm - Callback when selection is confirmed
 * @returns {React.ReactElement} The rendered component
 */
const CharacterSelectPage = ({
  playerName,
  gameCode,
  selectedRace,
  selectedClass,
  onSelectRace,
  onSelectClass,
  onConfirm
}) => {
  const theme = useTheme();
  const [suggestedRace, setSuggestedRace] = useState(null);
  const [suggestedClass, setSuggestedClass] = useState(null);
  const [lastTouched, setLastTouched] = useState(null);

  // Create inverse mapping: race to compatible classes
  const raceToClasses = useMemo(() => {
    const mapping = {};
    Object.entries(CLASS_TO_RACES).forEach(([cls, raceList]) => {
      raceList.forEach(race => {
        mapping[race] = mapping[race] || [];
        mapping[race].push(cls);
      });
    });
    return mapping;
  }, []);

  // On mount, suggest a random valid combination if nothing is selected
  useEffect(() => {
    if (!selectedRace && !selectedClass) {
      const randomClass = CLASSES[Math.floor(Math.random() * CLASSES.length)].id;
      const validRaces = CLASS_TO_RACES[randomClass];
      const randomRace = validRaces[Math.floor(Math.random() * validRaces.length)];
      
      setSuggestedRace(randomRace);
      setSuggestedClass(randomClass);
      onSelectRace(randomRace);
      onSelectClass(randomClass);
    }
  }, [selectedRace, selectedClass, onSelectRace, onSelectClass]);

  /**
   * Handle race selection
   * 
   * @param {string} raceId - Selected race ID
   */
  const handleRaceSelect = (raceId) => {
    setLastTouched('race');
    onSelectRace(raceId);
    
    // Reset class selection if incompatible
    if (selectedClass && !raceToClasses[raceId].includes(selectedClass)) {
      onSelectClass(null);
    }
  };

  /**
   * Handle class selection
   * 
   * @param {string} classId - Selected class ID
   */
  const handleClassSelect = (classId) => {
    setLastTouched('class');
    onSelectClass(classId);
    
    // Reset race selection if incompatible
    if (selectedRace && !CLASS_TO_RACES[classId].includes(selectedRace)) {
      onSelectRace(null);
    }
  };

  /**
   * Check if a race is valid for the selected class
   * 
   * @param {string} raceId - Race ID to check
   * @returns {boolean} Whether the race is valid
   */
  const isRaceValid = (raceId) => {
    if (!lastTouched || lastTouched !== 'class' || !selectedClass) return true;
    return CLASS_TO_RACES[selectedClass].includes(raceId);
  };

  /**
   * Check if a class is valid for the selected race
   * 
   * @param {string} classId - Class ID to check
   * @returns {boolean} Whether the class is valid
   */
  const isClassValid = (classId) => {
    if (!lastTouched || lastTouched !== 'race' || !selectedRace) return true;
    return raceToClasses[selectedRace].includes(classId);
  };

  // Check if the current selection is valid for confirmation
  const canConfirm = selectedRace && selectedClass && CLASS_TO_RACES[selectedClass].includes(selectedRace);

  return (
    <div className="character-select-container">
      <h1 className="game-code-title">
        Game Code: {gameCode}
      </h1>
      
      <h2 className="welcome-title">
        Welcome, {playerName}!
      </h2>
      
      {suggestedRace && suggestedClass && (
        <div className="suggestion-box">
          <strong>Suggested:</strong> {suggestedRace} {suggestedClass}
        </div>
      )}
      
      <div className="section-container">
        <h3 className="section-title">
          <span>Select Your Race</span>
        </h3>
        
        <div className="cards-grid">
          {RACES.map(race => {
            const isSelected = selectedRace === race.id;
            const isDisabled = !isRaceValid(race.id);
            
            return (
              <div
                key={race.id}
                className={`selection-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                onClick={() => !isDisabled && handleRaceSelect(race.id)}
              >
                <div className="card-icon">{race.icon}</div>
                <div className="card-label">{race.label}</div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="section-container">
        <h3 className="section-title">
          <span>Select Your Class</span>
        </h3>
        
        <div className="cards-grid">
          {CLASSES.map(cls => {
            const isSelected = selectedClass === cls.id;
            const isDisabled = !isClassValid(cls.id);
            
            return (
              <div
                key={cls.id}
                className={`selection-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                onClick={() => !isDisabled && handleClassSelect(cls.id)}
              >
                <div className="card-icon" style={{ color: cls.color }}>{cls.icon}</div>
                <div className="card-label">{cls.label}</div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="confirm-container">
        <button
          className={`confirm-button ${!canConfirm ? 'disabled' : ''}`}
          onClick={() => canConfirm && onConfirm(selectedRace, selectedClass)}
          disabled={!canConfirm}
        >
          Confirm Selection
        </button>
      </div>
      
      {/* Visual indicator for compatibility */}
      {(selectedRace || selectedClass) && (
        <div className={`status-message ${canConfirm ? 'valid' : 'invalid'}`}>
          {canConfirm ? (
            <span>
              ✓ Valid combination: {selectedRace} {selectedClass}
            </span>
          ) : (
            <span>
              {!selectedRace && selectedClass ? 
                `Please select a race compatible with ${selectedClass}` :
                !selectedClass && selectedRace ?
                `Please select a class compatible with ${selectedRace}` :
                'This race and class combination is not compatible'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

CharacterSelectPage.propTypes = {
  playerName: PropTypes.string.isRequired,
  gameCode: PropTypes.string.isRequired,
  selectedRace: PropTypes.string,
  selectedClass: PropTypes.string,
  onSelectRace: PropTypes.func.isRequired,
  onSelectClass: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired
};

export default CharacterSelectPage;