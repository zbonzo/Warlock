import React, { useState, useEffect, useRef } from 'react';
import './AbilitySelectionStep.css';
import MobilePlayerHeader from './MobilePlayerHeader';
import { useConfig } from '../../../../contexts/ConfigContext';
import AbilityCard from '../../../../components/game/AbilityCard/AbilityCard';
import RacialAbilityCard from '../../../../components/game/RacialAbilityCard/RacialAbilityCard';
import type { Player, Ability } from '../../../../shared/types';

interface AbilitySelectionStepProps {
  me: Player;
  unlocked: Ability[];
  racialAbility?: Ability;
  lastEvent?: {
    turn?: number;
    events?: any[];
  };
  selectedAbility?: Ability | null;
  bloodRageActive: boolean;
  keenSensesActive: boolean;
  racialSelected: boolean;
  onAbilitySelect: (ability: Ability) => void;
  onRacialAbilityUse: (abilityType: string) => void;
  onNext: (ability: Ability) => void;
  onClose: () => void;
}

interface MobileAbilityCardProps {
  ability: Ability;
  selected: boolean;
  onSelect: () => void;
  locked?: boolean;
  cooldown?: number;
  player: Player;
  isSelectable?: boolean;
}

const AbilitySelectionStep: React.FC<AbilitySelectionStepProps> = ({
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
  const [selectedAbility, setSelectedAbility] = useState<Ability | null>(initialSelectedAbility || null);
  const [allClassAbilities, setAllClassAbilities] = useState<Ability[]>([]);
  const [loadingAbilities, setLoadingAbilities] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
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
  
  // Measure header height and update padding
  useEffect(() => {
    if (headerRef.current) {
      const height = headerRef.current.offsetHeight;
      setHeaderHeight(height);
    }
  }, [me]); // Re-measure if player data changes
  
  const handleAbilitySelect = (ability: Ability) => {
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
  
  const isAbilityUnlocked = (ability: Ability, unlockedAbilities: Ability[]): boolean => {
    return unlockedAbilities.some(u => u.type === ability.type);
  };
  
  const isAbilityOnCooldown = (ability: Ability): boolean => {
    return (me.abilityCooldowns?.[ability.type] || 0) > 0;
  };
  
  // Sort abilities by unlock level
  const sortAbilitiesByLevel = (abilities: Ability[]): Ability[] => {
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
                  cooldown={onCooldown ? me.abilityCooldowns?.[ability.type] || 0 : 0}
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
const MobileAbilityCard: React.FC<MobileAbilityCardProps> = ({ 
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
  
  const getAbilityIcon = (ability: Ability): React.ReactElement | string => {
    // Map ability types to their PNG file names
    const abilityImageMap: Record<string, string> = {
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
    const categoryIcons: Record<string, string> = {
      'Attack': '⚔️',
      'Defense': '🛡️',
      'Heal': '💚',
      'Special': '✨'
    };
    return categoryIcons[ability.category || ''] || '📜';
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