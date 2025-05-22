/**
 * @fileoverview Modal component for the Human race's Adaptability ability
 * Allows players to replace one ability with another from a different class
 */
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import { STEPS } from './constants';
import './AdaptabilityModal.css';

/**
 * AdaptabilityModal component for ability replacement interface
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is currently open
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Object} props.socket - Socket.io client instance
 * @param {string} props.gameCode - Current game code
 * @param {string} props.className - Current class of the player
 * @param {Array} props.initialAbilities - Initial abilities data
 * @returns {React.ReactElement|null} The rendered component or null if closed
 */
const AdaptabilityModal = ({
  isOpen,
  onClose,
  socket,
  gameCode,
  className,
  initialAbilities,
}) => {
  const theme = useTheme();

  // State
  const [currentStep, setCurrentStep] = useState(STEPS.SELECT_ABILITY);
  const [abilities, setAbilities] = useState([]);
  const [selectedAbility, setSelectedAbility] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [newAbilities, setNewAbilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use refs to track if event listeners are already set up
  const listenersSetUpRef = useRef(false);

  // Close the modal when ESC is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Set up socket event listeners only once on mount
  useEffect(() => {
    // If not open or socket is missing, don't set up
    if (!isOpen || !socket) return;

    // If listeners already set up, don't do it again
    if (listenersSetUpRef.current) return;

    console.log('Setting up adaptability socket listeners');
    listenersSetUpRef.current = true;

    const handleAbilityData = (data) => {
      console.log('Received adaptabilityChooseAbility event:', data);

      try {
        // Check if we have abilities data
        let playerAbilities = [];

        if (data && data.abilities) {
          // It could be an array or an object
          if (Array.isArray(data.abilities)) {
            console.log('Received abilities as array');
            playerAbilities = data.abilities;
          } else if (typeof data.abilities === 'object') {
            console.log('Received abilities as object');

            // Check if it's an object with numeric keys (levels)
            const numericKeys = Object.keys(data.abilities).filter(
              (key) => !isNaN(parseInt(key))
            );

            if (numericKeys.length > 0) {
              // It's an object with level keys, flatten it
              numericKeys.forEach((level) => {
                const levelAbilities = data.abilities[level];
                if (
                  Array.isArray(levelAbilities) &&
                  levelAbilities.length > 0
                ) {
                  playerAbilities = [...playerAbilities, ...levelAbilities];
                }
              });
            } else {
              // Check for ability properties directly
              if (data.abilities.type && data.abilities.name) {
                playerAbilities = [data.abilities]; // Single ability object
              }
            }
          }
        }

        console.log('Processed abilities:', playerAbilities);

        // If we still don't have any abilities, use fallback
        if (!playerAbilities || playerAbilities.length === 0) {
          console.warn('No abilities found, using fallback');
          playerAbilities = [
            { type: 'attack', name: 'Slash', category: 'Attack', unlockAt: 1 },
            {
              type: 'shieldWall',
              name: 'Shield Wall',
              category: 'Defense',
              unlockAt: 2,
            },
            { type: 'bandage', name: 'Bandage', category: 'Heal', unlockAt: 3 },
            {
              type: 'battleCry',
              name: 'Battle Cry',
              category: 'Special',
              unlockAt: 4,
            },
          ];
        }

        setAbilities(playerAbilities);
      } catch (err) {
        console.error('Error processing abilities:', err);
        // Fallback to mock abilities
        setAbilities([
          { type: 'attack', name: 'Slash', category: 'Attack', unlockAt: 1 },
          {
            type: 'shieldWall',
            name: 'Shield Wall',
            category: 'Defense',
            unlockAt: 2,
          },
          { type: 'bandage', name: 'Bandage', category: 'Heal', unlockAt: 3 },
          {
            type: 'battleCry',
            name: 'Battle Cry',
            category: 'Special',
            unlockAt: 4,
          },
        ]);
      }

      setLoading(false);
    };

    const handleComplete = (data) => {
      console.log('Received adaptabilityComplete event:', data);
      setLoading(false);

      if (data && data.success) {
        onClose();
      } else {
        setError((data && data.message) || 'Failed to replace ability');
      }
    };

    // Add socket event listeners
    socket.on('adaptabilityChooseAbility', handleAbilityData);

    socket.on('classAbilitiesResponse', (data) => {
      console.log(
        `Received ability response for ${data.className} level ${data.level}:`,
        data
      );

      if (data && data.success && data.abilities && data.abilities.length > 0) {
        // We have an ability
        setNewAbilities(data.abilities);
        console.log(`Setting ability: ${data.abilities[0].name}`);
      } else {
        // No ability found
        setNewAbilities([]);
        console.log(
          `No ability found for ${data.className} level ${data.level}`
        );
      }

      setLoading(false);
    });

    socket.on('adaptabilityComplete', handleComplete);

    // Set up available classes for second step
    setAvailableClasses(
      [
        'Warrior',
        'Pyromancer',
        'Wizard',
        'Assassin',
        'Alchemist',
        'Priest',
        'Oracle',
        'Seer',
        'Shaman',
        'Gunslinger',
        'Tracker',
        'Druid',
      ].filter((cls) => cls !== className)
    );

    // Clean up function - will run when component unmounts
    return () => {
      console.log('Cleaning up adaptability socket listeners');
      socket.off('adaptabilityChooseAbility', handleAbilityData);
      socket.off('classAbilitiesResponse');
      socket.off('adaptabilityComplete', handleComplete);
      listenersSetUpRef.current = false;
    };
  }, [isOpen, socket, className, onClose, selectedAbility, selectedClass]);

  // Use initialAbilities if provided
  useEffect(() => {
    if (initialAbilities && initialAbilities.length > 0 && loading) {
      console.log(
        'Setting abilities from initialAbilities prop:',
        initialAbilities
      );
      setAbilities(initialAbilities);
      setLoading(false);
    }
  }, [initialAbilities, loading]);

  // Handler for selecting an ability
  const handleSelectAbility = (ability) => {
    console.log('Selected ability:', ability);
    setSelectedAbility(ability);
    setCurrentStep(STEPS.SELECT_CLASS);
  };

  // Handler for selecting a class
  const handleSelectClass = (cls) => {
    console.log('Selected class:', cls);
    setSelectedClass(cls);
    setLoading(true);

    // Log detailed information about the request
    console.log(
      `Requesting abilities for ${cls}, level ${selectedAbility?.unlockAt || 1}`
    );

    // Request abilities for the selected class with detailed parameters
    socket.emit('getClassAbilities', {
      gameCode,
      className: cls,
      level: selectedAbility?.unlockAt || 1,
      abilityLevel: selectedAbility?.unlockAt || 1, // Add explicit ability level parameter
      currentAbilityType: selectedAbility?.type, // Send the ability being replaced
    });

    setCurrentStep(STEPS.SELECT_NEW_ABILITY);
  };

  // Handler for selecting a new ability
  const handleSelectNewAbility = (ability) => {
    setLoading(true);

    // Send replacement request to server with detailed logging
    const requestData = {
      gameCode,
      oldAbilityType: selectedAbility.type,
      newAbilityType: ability.type,
      level: selectedAbility.unlockAt || 1,
      newClassName: selectedClass,
    };

    socket.emit('adaptabilityReplaceAbility', requestData);
  };

  // Handler for going back to the previous step
  const handleBack = () => {
    if (currentStep === STEPS.SELECT_CLASS) {
      setCurrentStep(STEPS.SELECT_ABILITY);
      setSelectedAbility(null);
    } else if (currentStep === STEPS.SELECT_NEW_ABILITY) {
      setCurrentStep(STEPS.SELECT_CLASS);
      setSelectedClass(null);
      setNewAbilities([]);
    }
  };

  // Helper function to get category icons
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Attack':
        return '⚔️';
      case 'Defense':
        return '🛡️';
      case 'Heal':
        return '💚';
      case 'Special':
        return '✨';
      default:
        return '📜';
    }
  };

  // Helper function to get class icons
  const getClassIcon = (className) => {
    const icons = {
      Warrior: '⚔️',
      Pyromancer: '🔥',
      Wizard: '🧙',
      Assassin: '🥷',
      Alchemist: '🧪',
      Priest: '✨',
      Oracle: '🔮',
      Barbarian: '🪓', // Added Barbarian with axe icon
      Shaman: '🌀',
      Gunslinger: '💥',
      Tracker: '🏹',
      Druid: '🌿',
    };

    return icons[className] || '📚';
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <div className="adaptability-modal-overlay">
      <div className="adaptability-modal-content">
        <h2 className="modal-title">Human Adaptability</h2>

        {error && (
          <div className="error-message">
            {error}
            <button
              onClick={() => setError(null)}
              className="clear-error-button"
            >
              ✕
            </button>
          </div>
        )}

        {/* Step 1: Select ability to replace */}
        {currentStep === STEPS.SELECT_ABILITY && (
          <div className="modal-step">
            <h3 className="step-title">
              Choose an ability you want to replace:
            </h3>

            <div className="ability-list">
              {loading ? (
                <div className="loading-message">Loading your abilities...</div>
              ) : abilities.length === 0 ? (
                <div>
                  <div className="error-message">
                    No abilities available. Using fallback options:
                  </div>
                  <div className="ability-list">
                    {[
                      {
                        type: 'attack',
                        name: 'Slash',
                        category: 'Attack',
                        unlockAt: 1,
                      },
                      {
                        type: 'shieldWall',
                        name: 'Shield Wall',
                        category: 'Defense',
                        unlockAt: 2,
                      },
                      {
                        type: 'bandage',
                        name: 'Bandage',
                        category: 'Heal',
                        unlockAt: 3,
                      },
                      {
                        type: 'battleCry',
                        name: 'Battle Cry',
                        category: 'Special',
                        unlockAt: 4,
                      },
                    ].map((ability, index) => (
                      <div
                        key={ability.type || index}
                        className="ability-card"
                        onClick={() => handleSelectAbility(ability)}
                      >
                        <div className="ability-name">
                          {ability.name || 'Unknown Ability'}
                        </div>
                        <div className="ability-category">
                          {ability.category || 'Ability'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                abilities.map((ability, index) => (
                  <div
                    key={ability.type || index}
                    className="ability-card"
                    onClick={() => handleSelectAbility(ability)}
                  >
                    <div className="ability-name">
                      {ability.name || 'Unknown Ability'}
                    </div>
                    <div className="ability-category">
                      {ability.category || 'Ability'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select class */}
        {currentStep === STEPS.SELECT_CLASS && (
          <div className="modal-step">
            <h3 className="step-title">
              You selected: {selectedAbility?.name}. Now choose a class to take
              an ability from:
            </h3>

            <div className="class-list">
              {availableClasses.map((cls) => (
                <div
                  key={cls}
                  className="class-card"
                  onClick={() => handleSelectClass(cls)}
                >
                  {cls}
                </div>
              ))}
            </div>

            <button className="back-button" onClick={handleBack}>
              Back
            </button>
          </div>
        )}

        {/* Step 3: Select new ability */}
        {currentStep === STEPS.SELECT_NEW_ABILITY && (
          <div className="modal-step">
            <h3 className="step-title">
              Replace {selectedAbility?.name} (Level{' '}
              {selectedAbility?.unlockAt || 1}) with a {selectedClass} ability:
            </h3>

            <div className="ability-list">
              {loading ? (
                <div className="loading-message">
                  Loading available abilities...
                </div>
              ) : newAbilities.length === 0 ? (
                <div className="error-message">
                  No {selectedClass} abilities available at level{' '}
                  {selectedAbility?.unlockAt || 1}. Please select a different
                  class.
                </div>
              ) : (
                newAbilities.map((ability, index) => (
                  <div
                    key={ability.type || index}
                    className="ability-card"
                    onClick={() => handleSelectNewAbility(ability)}
                  >
                    <div className="ability-header">
                      <span className="class-icon">
                        {getClassIcon(selectedClass)}
                      </span>
                      <span className="ability-name">
                        {ability.name || `${selectedClass} Ability`}
                      </span>
                      <span className="ability-category">
                        {getCategoryIcon(ability.category)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button className="back-button" onClick={handleBack}>
              Back
            </button>
          </div>
        )}

        <div className="modal-footer">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={loading && currentStep === STEPS.SELECT_NEW_ABILITY}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

AdaptabilityModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  socket: PropTypes.object.isRequired,
  gameCode: PropTypes.string.isRequired,
  className: PropTypes.string.isRequired,
  initialAbilities: PropTypes.array,
  groupAbilitiesByLevel: PropTypes.func,
};

export default AdaptabilityModal;
