/**
 * @fileoverview Modal component for the Artisan race's Adaptability ability
 * Allows players to replace one ability with another from a different class
 */
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { STEPS, type StepType } from './constants';
import type { Socket } from 'socket.io-client';
import type { Ability, PlayerClass } from '../../../types/shared';
import './AdaptabilityModal.css';

export interface AdaptabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  socket: Socket;
  gameCode: string;
  className: PlayerClass;
  initialAbilities?: Ability[];
}

interface SocketAbilityData {
  abilities?: Ability[] | Record<string, Ability[]> | Ability;
}

interface ClassAbilitiesResponse {
  className: string;
  level: number;
  success: boolean;
  abilities: Ability[];
}

interface AdaptabilityCompleteResponse {
  success: boolean;
  message?: string;
}

interface ClassIconMap {
  [key: string]: string;
}

const AdaptabilityModal: React.FC<AdaptabilityModalProps> = ({
  isOpen,
  onClose,
  socket,
  gameCode,
  className,
  initialAbilities,
}) => {
  const theme = useTheme();

  const [currentStep, setCurrentStep] = useState<StepType>(STEPS.SELECT_ABILITY);
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [selectedAbility, setSelectedAbility] = useState<Ability | null>(null);
  const [availableClasses, setAvailableClasses] = useState<PlayerClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<PlayerClass | null>(null);
  const [newAbilities, setNewAbilities] = useState<Ability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const listenersSetUpRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || !socket) return;

    if (listenersSetUpRef.current) return;

    console.log('Setting up adaptability socket listeners');
    listenersSetUpRef.current = true;

    const handleAbilityData = (data: SocketAbilityData) => {
      console.log('Received adaptabilityChooseAbility event:', data);

      try {
        let playerAbilities: Ability[] = [];

        if (data && data.abilities) {
          if (Array.isArray(data.abilities)) {
            console.log('Received abilities as array');
            playerAbilities = data.abilities;
          } else if (typeof data.abilities === 'object') {
            console.log('Received abilities as object');

            const numericKeys = Object.keys(data.abilities).filter(
              (key) => !isNaN(parseInt(key))
            );

            if (numericKeys.length > 0) {
              numericKeys.forEach((level) => {
                const levelAbilities = (data.abilities as Record<string, Ability[]>)[level];
                if (Array.isArray(levelAbilities) && levelAbilities.length > 0) {
                  playerAbilities = [...playerAbilities, ...levelAbilities];
                }
              });
            } else {
              const singleAbility = data.abilities as Ability;
              if (singleAbility.type && singleAbility.name) {
                playerAbilities = [singleAbility];
              }
            }
          }
        }

        console.log('Processed abilities:', playerAbilities);

        if (!playerAbilities || playerAbilities.length === 0) {
          console.warn('No abilities found, using fallback');
          playerAbilities = [
            { id: 'slash', type: 'attack', name: 'Slash', category: 'Attack', description: 'Basic attack', unlockAt: 1 },
            { id: 'shieldWall', type: 'shieldWall', name: 'Shield Wall', category: 'Defense', description: 'Defensive ability', unlockAt: 2 },
            { id: 'bandage', type: 'bandage', name: 'Bandage', category: 'Heal', description: 'Healing ability', unlockAt: 3 },
            { id: 'battleCry', type: 'battleCry', name: 'Battle Cry', category: 'Special', description: 'Special ability', unlockAt: 4 },
          ];
        }

        setAbilities(playerAbilities);
      } catch (err) {
        console.error('Error processing abilities:', err);
        setAbilities([
          { id: 'slash', type: 'attack', name: 'Slash', category: 'Attack', description: 'Basic attack', unlockAt: 1 },
          { id: 'shieldWall', type: 'shieldWall', name: 'Shield Wall', category: 'Defense', description: 'Defensive ability', unlockAt: 2 },
          { id: 'bandage', type: 'bandage', name: 'Bandage', category: 'Heal', description: 'Healing ability', unlockAt: 3 },
          { id: 'battleCry', type: 'battleCry', name: 'Battle Cry', category: 'Special', description: 'Special ability', unlockAt: 4 },
        ]);
      }

      setLoading(false);
    };

    const handleComplete = (data: AdaptabilityCompleteResponse) => {
      console.log('Received adaptabilityComplete event:', data);
      setLoading(false);

      if (data && data.success) {
        onClose();
      } else {
        setError((data && data.message) || 'Failed to replace ability');
      }
    };

    const handleClassAbilitiesResponse = (data: ClassAbilitiesResponse) => {
      console.log(
        `Received ability response for ${data.className} level ${data.level}:`,
        data
      );

      if (data && data.success && data.abilities && data.abilities.length > 0) {
        setNewAbilities(data.abilities);
        console.log(`Setting ability: ${data.abilities[0]?.name || 'Unknown'}`);
      } else {
        setNewAbilities([]);
        console.log(
          `No ability found for ${data.className} level ${data.level}`
        );
      }

      setLoading(false);
    };

    socket.on('adaptabilityChooseAbility', handleAbilityData);
    socket.on('classAbilitiesResponse', handleClassAbilitiesResponse);
    socket.on('adaptabilityComplete', handleComplete);

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
      ].filter((cls) => cls !== (className as unknown as string)) as unknown as PlayerClass[]
    );

    return () => {
      console.log('Cleaning up adaptability socket listeners');
      socket.off('adaptabilityChooseAbility', handleAbilityData);
      socket.off('classAbilitiesResponse', handleClassAbilitiesResponse);
      socket.off('adaptabilityComplete', handleComplete);
      listenersSetUpRef.current = false;
    };
  }, [isOpen, socket, className, onClose]);

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

  const handleSelectAbility = (ability: Ability) => {
    console.log('Selected ability:', ability);
    setSelectedAbility(ability);
    setCurrentStep(STEPS.SELECT_CLASS);
  };

  const handleSelectClass = (cls: PlayerClass) => {
    console.log('Selected class:', cls);
    setSelectedClass(cls);
    setLoading(true);

    console.log(
      `Requesting abilities for ${cls}, level ${selectedAbility?.unlockAt || 1}`
    );

    socket.emit('getClassAbilities', {
      gameCode,
      className: cls,
      level: selectedAbility?.unlockAt || 1,
      abilityLevel: selectedAbility?.unlockAt || 1,
      currentAbilityType: selectedAbility?.type,
    });

    setCurrentStep(STEPS.SELECT_NEW_ABILITY);
  };

  const handleSelectNewAbility = (ability: Ability) => {
    setLoading(true);

    const requestData = {
      gameCode,
      oldAbilityType: selectedAbility!.type,
      newAbilityType: ability.type,
      level: selectedAbility!.unlockAt || 1,
      newClassName: selectedClass,
    };

    socket.emit('adaptabilityReplaceAbility', requestData);
  };

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

  const getCategoryIcon = (category?: string): string => {
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

  const getClassIcon = (className: string): string => {
    const icons: ClassIconMap = {
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

    return icons[className] || '📚';
  };

  if (!isOpen) return null;

  const fallbackAbilities: Ability[] = [
    { id: 'slash', type: 'attack', name: 'Slash', category: 'Attack', description: 'Basic attack', unlockAt: 1 },
    { id: 'shieldWall', type: 'shieldWall', name: 'Shield Wall', category: 'Defense', description: 'Defensive ability', unlockAt: 2 },
    { id: 'bandage', type: 'bandage', name: 'Bandage', category: 'Heal', description: 'Healing ability', unlockAt: 3 },
    { id: 'battleCry', type: 'battleCry', name: 'Battle Cry', category: 'Special', description: 'Special ability', unlockAt: 4 },
  ];

  return (
    <div className="adaptability-modal-overlay">
      <div className="adaptability-modal-content">
        <h2 className="modal-title">Artisan Adaptability</h2>

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
                    {fallbackAbilities.map((ability, index) => (
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

        {currentStep === STEPS.SELECT_CLASS && (
          <div className="modal-step">
            <h3 className="step-title">
              You selected: {selectedAbility?.name}. Now choose a class to take
              an ability from:
            </h3>

            <div className="class-list">
              {availableClasses.map((cls) => (
                <div
                  key={cls as unknown as string}
                  className="class-card"
                  onClick={() => handleSelectClass(cls)}
                >
                  {cls.name}
                </div>
              ))}
            </div>

            <button className="back-button" onClick={handleBack}>
              Back
            </button>
          </div>
        )}

        {currentStep === STEPS.SELECT_NEW_ABILITY && (
          <div className="modal-step">
            <h3 className="step-title">
              Replace {selectedAbility?.name} (Level{' '}
              {selectedAbility?.unlockAt || 1}) with a {selectedClass?.name} ability:
            </h3>

            <div className="ability-list">
              {loading ? (
                <div className="loading-message">
                  Loading available abilities...
                </div>
              ) : newAbilities.length === 0 ? (
                <div className="error-message">
                  No {selectedClass?.name} abilities available at level{' '}
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
                        {getClassIcon(selectedClass?.name || '')}
                      </span>
                      <span className="ability-name">
                        {ability.name || `${selectedClass?.name} Ability`}
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

export default AdaptabilityModal;