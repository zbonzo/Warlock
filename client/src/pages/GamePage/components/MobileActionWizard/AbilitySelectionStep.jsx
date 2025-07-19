import React, { useState, useEffect, useRef } from 'react';
import './AbilitySelectionStep.css';
import MobilePlayerHeader from './MobilePlayerHeader';
import { useConfig } from '../../../../contexts/ConfigContext';
import AbilityCard from '../../../../components/game/AbilityCard/AbilityCard';
import RacialAbilityCard from '../../../../components/game/RacialAbilityCard/RacialAbilityCard';

const AbilitySelectionStep = ({
  me,
  unlocked,
  racialAbility,
  lastEvent,
  selectedAbility: initialSelectedAbility,
  bloodRageActive,
  keenSensesActive,
  racialSelected,
  onAbilitySelect,
  onRacialAbilityUse,
  onNext,
  onClose
}) => {
  const [selectedAbility, setSelectedAbility] = useState(initialSelectedAbility);
  const [allClassAbilities, setAllClassAbilities] = useState([]);
  const [loadingAbilities, setLoadingAbilities] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef(null);
  const { getClassAbilities } = useConfig();
  
  // Fetch ALL abilities for the player's class
  useEffect(() => {
    const fetchAllAbilities = async () => {
      try {
        setLoadingAbilities(true);
        const abilities = await getClassAbilities(me.class);
        setAllClassAbilities(abilities || []);
      } catch (error) {
        console.error('Failed to fetch class abilities:', error);
        // Fallback to unlocked abilities if fetch fails
        setAllClassAbilities(unlocked || []);
      } finally {
        setLoadingAbilities(false);
      }
    };
    
    if (me.class) {
      fetchAllAbilities();
    }
  }, [me.class, getClassAbilities]);
  
  // Measure header height and update padding
  useEffect(() => {
    if (headerRef.current) {
      const height = headerRef.current.offsetHeight;
      setHeaderHeight(height);
    }
  }, [me]); // Re-measure if player data changes
  
  const handleAbilitySelect = (ability) => {
    // Only allow selection of unlocked abilities
    if (isAbilityUnlocked(ability, unlocked)) {
      setSelectedAbility(ability);
    }
  };
  
  const handleContinue = () => {
    if (!selectedAbility) {
      alert('Please select an ability first');
      return;
    }
    onNext(selectedAbility);
  };
  
  const isAbilityUnlocked = (ability, unlockedAbilities) => {
    return unlockedAbilities.some(u => u.type === ability.type);
  };
  
  const isAbilityOnCooldown = (ability) => {
    return me.abilityCooldowns?.[ability.type] > 0;
  };
  
  // Sort abilities by unlock level
  const sortAbilitiesByLevel = (abilities) => {
    return [...abilities].sort((a, b) => (a.unlockAt || 1) - (b.unlockAt || 1));
  };
  
  // Show loading state if abilities are still loading
  if (loadingAbilities) {
    return (
      <div className="ability-selection-step">
        <MobilePlayerHeader 
          me={me} 
          round={lastEvent?.turn || 1}
          currentStep={1}
          totalSteps={2}
        />
        <div className="step-content">
          <h2 className="step-title">Loading Abilities...</h2>
          <div className="loading-spinner">Loading...</div>
        </div>
        <div className="step-navigation">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ability-selection-step">
      <div ref={headerRef}>
        <MobilePlayerHeader 
          me={me} 
          round={lastEvent?.turn || 1}
          currentStep={1}
          totalSteps={2}
        />
      </div>
      
      <div 
        className="step-content" 
        style={{ paddingTop: headerHeight ? `${headerHeight + 8}px` : '16px' }}
      >
        <h2 className="step-title">Choose Your Ability</h2>
        
        {/* Racial ability section */}
        {racialAbility && !racialSelected && (
          <div className="racial-section">
            <RacialAbilityCard
              ability={racialAbility}
              usesLeft={me.racialUsesLeft || 1}
              cooldown={me.racialCooldown || 0}
              onUse={() => onRacialAbilityUse(racialAbility.type)}
              isMobile={true}
            />
          </div>
        )}
        
        {/* Class abilities section */}
        <div className="class-abilities-section">
          <div className="abilities-grid">
            {sortAbilitiesByLevel(allClassAbilities).map(ability => {
              const isUnlocked = isAbilityUnlocked(ability, unlocked);
              const onCooldown = isUnlocked && isAbilityOnCooldown(ability);
              const isSelectable = isUnlocked && !onCooldown;
              
              return (
                <MobileAbilityCard
                  key={ability.type}
                  ability={ability}
                  selected={selectedAbility?.type === ability.type}
                  onSelect={() => handleAbilitySelect(ability)}
                  locked={!isUnlocked}
                  cooldown={onCooldown ? me.abilityCooldowns[ability.type] : 0}
                  player={me}
                  isSelectable={isSelectable}
                />
              );
            })}
          </div>
        </div>
        
        {/* Enhancement indicators */}
        {(bloodRageActive || keenSensesActive) && (
          <div className="enhancements-active">
            {bloodRageActive && <div className="enhancement-badge">Blood Rage Active</div>}
            {keenSensesActive && <div className="enhancement-badge">Keen Senses Active</div>}
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <div className="step-navigation">
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button 
          className="btn-primary"
          onClick={handleContinue}
          disabled={!selectedAbility}
        >
          Choose Target →
        </button>
      </div>
    </div>
  );
};

// Mobile-specific ability card component
const MobileAbilityCard = ({ 
  ability, 
  selected, 
  onSelect, 
  locked = false, 
  cooldown = 0, 
  player,
  isSelectable = true 
}) => {
  const handleClick = () => {
    if (!locked && !cooldown && isSelectable) {
      onSelect();
    }
  };
  
  const getAbilityIcon = (ability) => {
    // Specific ability icons with images
    if (ability.type === 'lightningBolt') {
      return (
        <img 
          src="/images/abilities/lightningbolt.png" 
          alt="Lightning Bolt" 
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      );
    }
    
    // Default category icons
    const icons = {
      'Attack': '⚔️',
      'Defense': '🛡️',
      'Heal': '💚',
      'Special': '✨'
    };
    return icons[ability.category] || '📜';
  };
  
  return (
    <div 
      className={`
        mobile-ability-card 
        ${selected ? 'selected' : ''} 
        ${locked ? 'locked' : ''} 
        ${cooldown > 0 ? 'on-cooldown' : ''}
        ${!isSelectable ? 'not-selectable' : ''}
      `}
      onClick={handleClick}
    >
      {/* Lock overlay for locked abilities */}
      {locked && (
        <div className="lock-overlay">
          <div className="lock-icon">🔒</div>
          <div className="unlock-text">Unlocks at Level {ability.unlockAt}</div>
        </div>
      )}
      
      {/* Cooldown overlay for abilities on cooldown */}
      {!locked && cooldown > 0 && (
        <div className="cooldown-overlay">
          <div className="cooldown-number">{cooldown}</div>
          <div className="cooldown-text">rounds</div>
        </div>
      )}
      
      {/* Background icon */}
      <div className="ability-background-icon">
        {getAbilityIcon(ability)}
      </div>
      
      {/* Content overlay */}
      <div className={`ability-content-overlay ability-${ability.category?.toLowerCase()}`}>
        <div className="ability-name">{ability.name}</div>
        
        {/* Show description for all abilities */}
        {console.log('Ability data:', ability)}
        {(ability.description || ability.flavorText) && (
          <div className={`ability-description class-${player.class?.toLowerCase()}`}>
            {ability.description || ability.flavorText}
          </div>
        )}
        
        {/* Show damage/effect for unlocked abilities */}
        {!locked && ability.damage && (
          <div className="ability-damage">
            Damage: {ability.damage}
          </div>
        )}
      </div>
      
      {/* Selection indicator */}
      {selected && isSelectable && (
        <div className="selection-indicator">✓</div>
      )}
    </div>
  );
};

export default AbilitySelectionStep;