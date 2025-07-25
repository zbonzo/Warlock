/**
 * @fileoverview Unified Ability Selection Step - works for both mobile and desktop
 * No header included - just the ability selection interface
 */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useConfig } from '../../../../contexts/ConfigContext';
import RacialAbilityCard from '../../../../components/game/RacialAbilityCard/RacialAbilityCard';
import './AbilitySelectionStep.css';

/**
 * Unified ability card component that works for both mobile and desktop
 */
const UnifiedAbilityCard = ({ 
  ability, 
  selected, 
  onSelect, 
  locked = false, 
  cooldown = 0, 
  player,
  isSelectable = true,
  isMobile = false
}) => {
  const handleClick = () => {
    if (!locked && !cooldown && isSelectable) {
      onSelect(ability);
    }
  };
  
  const getAbilityIcon = (ability) => {
    // Map ability types to their PNG file names
    const abilityImageMap = {
      // Attack abilities
      'lightningBolt': 'lightningbolt.png',
      'magicMissile': 'magicmissile.png',
      'meteorShower': 'meteorshower.png',
      'backstab': 'backstab.png',
      'poisonStrike': 'poisonstrike.png',
      'barbedArrow': 'barbedarrow.png',
      'preciseArrow': 'precisearrow.png',
      'clawSwipe': 'clawswipe.png',
      'psychicBolt': 'psychicbolt.png',
      'slash': 'slash.png',
      'fireball': 'fireball.png',
      'holyBolt': 'holybolt.png',
      'infernoBlast': 'infernoblast.png',
      'pistolShot': 'pistolshot.png',
      'pyroblast': 'pyroblast.png',
      'recklessStrike': 'recklessstrike.png',
      'ricochetRound': 'ricochetround.png',
      'shiv': 'shiv.png',
      'twinStrike': 'twinstrike.png',
      'aimedShot': 'aimedshot.png',
      'arcaneBarrage': 'arcanebarrage.png',
      'chainLightning': 'chainlightning.png',
      'deathMark': 'deathmark.png',
      'sweepingStrike': 'sweepingstrike.png',
      
      // Defense abilities
      'arcaneShield': 'arcaneshield.png',
      'shadowVeil': 'shadowveil.png',
      'smokeBomb': 'smokebomb.png',
      'camouflage': 'camouflage.png',
      'barkskin': 'barkskin.png',
      'shieldWall': 'shieldwall.png',
      'spiritGuard': 'spiritguard.png',
      'divineShield': 'divineshield.png',
      'totemicBarrier': 'totemicbarrier.png',
      'smokeScreen': 'smokescreen.png',
      
      // Heal abilities
      'rejuvenation': 'rejuvenation.png',
      'swiftMend': 'swiftmend.png',
      'cauterize': 'cauterize.png',
      'heal': 'heal.png',
      'bandage': 'bandage.png',
      'ancestralHeal': 'ancestralheal.png',
      
      // Special abilities
      'poisonTrap': 'poisontrap.png',
      'entanglingRoots': 'entanglingroots.png',
      'controlAnimal': 'controlanimal.png',
      'controlMonster': 'controlanimal.png',
      'preciseShot': 'precisearrow.png',
      'totemShield': 'totemicbarrier.png',
      'eyeOfFate': 'eyeoffate.png',
      'battleCry': 'battlecry.png',
      'sanctuaryOfTruth': 'sanctuaryoftruth.png',
      'relentlessFury': 'relentlessfury.png',
      'thirstyBlade': 'thirstyblade.png',
      
      // Racial abilities
      'adaptability': 'adaptability.png',
      'bloodRage': 'bloodrage.png',
      'stoneArmor': 'stonearmor.png',
      'undying': 'undying.png',
      'lifeBond': 'lifebond.png',
      'moonbeam': 'moonbeam.png'
    };

    // Check if we have a PNG for this ability
    const imageName = abilityImageMap[ability.type];
    if (imageName) {
      return (
        <img 
          src={`/images/abilities/${imageName}`} 
          alt={ability.name} 
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      );
    }
    
    // Fallback to category icons for abilities without specific images
    const categoryIcons = {
      'Attack': '⚔️',
      'Defense': '🛡️',
      'Heal': '💚',
      'Special': '✨'
    };
    return categoryIcons[ability.category] || '📜';
  };
  
  return (
    <div 
      className={`
        unified-ability-card 
        ${selected ? 'selected' : ''} 
        ${locked ? 'locked' : ''} 
        ${cooldown > 0 ? 'on-cooldown' : ''}
        ${!isSelectable ? 'not-selectable' : ''}
        ${isMobile ? 'mobile-size' : 'desktop-size'}
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

/**
 * Unified Ability Selection Step component
 */
const AbilitySelectionStep = ({
  me,
  unlocked,
  racialAbility,
  lastEvent,
  selectedAbility,
  bloodRageActive,
  keenSensesActive,
  racialSelected,
  onAbilitySelect,
  onRacialAbilityUse,
  onClose,
  isMobile = false
}) => {
  const [selectedAbilityState, setSelectedAbilityState] = useState(selectedAbility);
  const [allClassAbilities, setAllClassAbilities] = useState([]);
  const [loadingAbilities, setLoadingAbilities] = useState(true);
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
  }, [me.class, getClassAbilities, unlocked]);
  
  const handleAbilitySelect = (ability) => {
    // Only allow selection of unlocked abilities
    if (isAbilityUnlocked(ability, unlocked)) {
      setSelectedAbilityState(ability);
    }
  };
  
  const handleContinue = () => {
    if (!selectedAbilityState) {
      alert('Please select an ability first');
      return;
    }
    onAbilitySelect(selectedAbilityState);
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
      <div className="wizard-step">
        <div className="step-content">
          <h2 className="step-title">Loading Abilities...</h2>
          <div className="loading-spinner">Loading...</div>
        </div>
        <div className="step-navigation">
          <button className="btn-secondary" onClick={onClose}>
            {isMobile ? 'Game State' : 'Cancel'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step">
      {/* Mobile drawer handle */}
      {isMobile && (
        <div className="wizard-handle" onClick={onClose} />
      )}
      
      <div className="wizard-content">
        <div className="step-content">
          <h2 className="step-title">Choose Your Ability</h2>
          
          {/* Racial ability section */}
          {racialAbility && !racialSelected && (
            <div className="racial-section">
              <h3 className="section-subtitle">Racial Ability</h3>
              <RacialAbilityCard
                ability={racialAbility}
                usesLeft={me.racialUsesLeft || 1}
                cooldown={me.racialCooldown || 0}
                onUse={() => onRacialAbilityUse(racialAbility.type)}
                isMobile={isMobile}
              />
            </div>
          )}
          
          {/* Class abilities section */}
          <div className="class-abilities-section">
            <h3 className="section-subtitle">Class Abilities</h3>
            <div className={`abilities-grid ${isMobile ? 'mobile-grid' : 'desktop-grid'}`}>
              {sortAbilitiesByLevel(allClassAbilities).map(ability => {
                const isUnlocked = isAbilityUnlocked(ability, unlocked);
                const onCooldown = isUnlocked && isAbilityOnCooldown(ability);
                const isSelectable = isUnlocked && !onCooldown;
                
                return (
                  <UnifiedAbilityCard
                    key={ability.type}
                    ability={ability}
                    selected={selectedAbilityState?.type === ability.type}
                    onSelect={handleAbilitySelect}
                    locked={!isUnlocked}
                    cooldown={onCooldown ? me.abilityCooldowns[ability.type] : 0}
                    player={me}
                    isSelectable={isSelectable}
                    isMobile={isMobile}
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
            {isMobile ? 'Game State' : 'Cancel'}
          </button>
          <button 
            className="btn-primary"
            onClick={handleContinue}
            disabled={!selectedAbilityState}
          >
            Choose Target →
          </button>
        </div>
      </div>
    </div>
  );
};

AbilitySelectionStep.propTypes = {
  me: PropTypes.object.isRequired,
  unlocked: PropTypes.array.isRequired,
  racialAbility: PropTypes.object,
  lastEvent: PropTypes.object.isRequired,
  selectedAbility: PropTypes.object,
  bloodRageActive: PropTypes.bool,
  keenSensesActive: PropTypes.bool,
  racialSelected: PropTypes.bool,
  onAbilitySelect: PropTypes.func.isRequired,
  onRacialAbilityUse: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isMobile: PropTypes.bool,
};

export default AbilitySelectionStep;