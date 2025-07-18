/**
 * client/src/pages/CharacterSelectPage/CharacterSelectPage.jsx
 * Updated to use the ConfigContext for race and class data
 */
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import { useConfig } from '@contexts/ConfigContext';
import { ICONS } from '../../config/constants';
import './CharacterSelectPage.css';

/**
 * RaceIcon component handles loading states and fallback for race images
 */
const RaceIcon = ({ race }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  // Emoji fallbacks for each race
  const emojiFallbacks = {
    Artisan: '👩‍🌾',
    Rockhewn: '🧔‍♂️',
    Lich: '💀',
    Orc: '🧌',
    Crestfallen: '🧝',
    Kinfolk: '🐐',
  };

  return (
    <div className="card-icon">
      {!loaded && !error && <div className="icon-loader">...</div>}
      {error && <div className="icon-fallback">{emojiFallbacks[race.id] || '❓'}</div>}
      <img 
        src={race.icon} 
        alt={`${race.label} icon`}
        className={`race-icon-img ${loaded ? 'loaded' : ''}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{ display: loaded && !error ? 'block' : 'none' }}
      />
    </div>
  );
};

/**
 * ClassIcon component handles loading states and fallback for class images
 */
const ClassIcon = ({ cls }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  // Emoji fallbacks for each class
  const emojiFallbacks = {
    Warrior: '⚔️',
    Pyromancer: '🔥',
    Wizard: '🧙',
    Assassin: '🥷',
    Alchemist: '🧪',
    Priest: '✨',
    Oracle: '🔮',
    Barbarian: '🪓',
    Shaman: '🌀',
    Gunslinger: '💥',
    Tracker: '🏹',
    Druid: '🌿',
  };

  return (
    <div className="card-icon">
      {!loaded && !error && <div className="icon-loader">...</div>}
      {error && <div className="icon-fallback" style={{ color: cls.color }}>{emojiFallbacks[cls.id] || '❓'}</div>}
      <img 
        src={cls.icon} 
        alt={`${cls.label} icon`}
        className={`race-icon-img ${loaded ? 'loaded' : ''}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{ display: loaded && !error ? 'block' : 'none' }}
      />
    </div>
  );
};

/**
 * CharacterSelectPage component allows players to select their race and class
 * Now using ConfigContext for race and class data
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
  onConfirm,
}) => {
  const theme = useTheme();
  // Get race and class data from ConfigContext
  const { loading, error, config } = useConfig();

  const [suggestedRace, setSuggestedRace] = useState(null);
  const [suggestedClass, setSuggestedClass] = useState(null);
  const [lastTouched, setLastTouched] = useState(null);

  // On mount, suggest a random valid combination if nothing is selected
  useEffect(() => {
    if (!selectedRace && !selectedClass && config.compatibility) {
      const randomClass =
        config.classes[Math.floor(Math.random() * config.classes.length)];
      const validRaces = config.compatibility.classToRaces[randomClass];

      if (validRaces && validRaces.length > 0) {
        const randomRace =
          validRaces[Math.floor(Math.random() * validRaces.length)];

        setSuggestedRace(randomRace);
        setSuggestedClass(randomClass);
        onSelectRace(randomRace);
        onSelectClass(randomClass);
      }
    }
  }, [selectedRace, selectedClass, config, onSelectRace, onSelectClass]);

  // Show loading state if config is still loading
  if (loading) {
    return (
      <div className="character-select-container loading">
        <div className="loading-indicator">Loading race and class data...</div>
      </div>
    );
  }

  // Show error state if there was a problem loading configuration
  if (error) {
    return (
      <div className="character-select-container error">
        <div className="error-message">
          <h3>Error Loading Game Data</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // Get race and class data from configuration
  const races =
    config.races?.map((raceId) => ({
      id: raceId,
      label: raceId,
      icon: ICONS.RACES[raceId] || '❓',
    })) || [];

  const classes =
    config.classes?.map((classId) => ({
      id: classId,
      label: classId,
      icon: ICONS.CLASSES[classId] || '❓',
      color: config.classAttributes?.[classId]?.color || '#888',
    })) || [];

  /**
   * Handle race selection
   *
   * @param {string} raceId - Selected race ID
   */
  const handleRaceSelect = (raceId) => {
    setLastTouched('race');
    onSelectRace(raceId);

    // Reset class selection if incompatible
    if (
      selectedClass &&
      !config.compatibility.racesToClasses[raceId]?.includes(selectedClass)
    ) {
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
    if (
      selectedRace &&
      !config.compatibility.classToRaces[classId]?.includes(selectedRace)
    ) {
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
    if (
      !lastTouched ||
      lastTouched !== 'class' ||
      !selectedClass ||
      !config.compatibility
    )
      return true;
    return (
      config.compatibility.classToRaces[selectedClass]?.includes(raceId) ||
      false
    );
  };

  /**
   * Check if a class is valid for the selected race
   *
   * @param {string} classId - Class ID to check
   * @returns {boolean} Whether the class is valid
   */
  const isClassValid = (classId) => {
    if (
      !lastTouched ||
      lastTouched !== 'race' ||
      !selectedRace ||
      !config.compatibility
    )
      return true;
    return (
      config.compatibility.racesToClasses[selectedRace]?.includes(classId) ||
      false
    );
  };

  // Check if the current selection is valid for confirmation
  const canConfirm =
    selectedRace &&
    selectedClass &&
    config.compatibility?.classToRaces[selectedClass]?.includes(selectedRace);

  return (
    <div className="character-select-container">
      <h1 className="game-code-title">Game Code: {gameCode}</h1>

      <h2 className="welcome-title">Welcome, {playerName}!</h2>

      <div className="section-container">
        <h3 className="section-title">
          <span>Select Your Race</span>
        </h3>
        {/* Show racial description if available */}
        {selectedRace && (
          <div className="racial-descriptions">
            <p>{config.raceAttributes[selectedRace]?.description || 'None'}</p>
          </div>
        )}

        <div className="cards-grid">
          {races.map((race) => {
            const isSelected = selectedRace === race.id;
            const isDisabled = !isRaceValid(race.id);

            return (
              <div
                key={race.id}
                className={`selection-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                onClick={() => !isDisabled && handleRaceSelect(race.id)}
              >
                <RaceIcon race={race} />
                <div className="card-label-overlay">
                  <span className="race-name">{race.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section-container">
        <h3 className="section-title">
          <span>Select Your Class</span>
        </h3>
        {/* Show class description if available */}
        {selectedClass && (
          <div className="class-descriptions">
            <p>
              {config.classAttributes[selectedClass]?.description || 'None'}
            </p>
          </div>
        )}

        <div className="cards-grid">
          {classes.map((cls) => {
            const isSelected = selectedClass === cls.id;
            const isDisabled = !isClassValid(cls.id);

            return (
              <div
                key={cls.id}
                className={`selection-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                onClick={() => !isDisabled && handleClassSelect(cls.id)}
              >
                <ClassIcon cls={cls} />
                <div className="card-label-overlay">
                  <span className="race-name">{cls.label}</span>
                </div>
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
              {!selectedRace && selectedClass
                ? `Please select a race compatible with ${selectedClass}`
                : !selectedClass && selectedRace
                  ? `Please select a class compatible with ${selectedRace}`
                  : 'This race and class combination is not compatible'}
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
  onConfirm: PropTypes.func.isRequired,
};

export default CharacterSelectPage;


