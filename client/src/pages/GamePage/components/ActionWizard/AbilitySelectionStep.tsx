/**
 * @fileoverview Unified Ability Selection Step - works for both mobile and desktop
 * No header included - just the ability selection interface
 */
import React, { useState, useEffect } from 'react';
import { useConfig } from '../../../../contexts/ConfigContext';
import RacialAbilityCard from '../../../../components/game/RacialAbilityCard/RacialAbilityCard';
import { Player, Ability, GameEvent } from '@/types/game';
import './AbilitySelectionStep.css';

interface LastEventData {
  turn: number;
  events: GameEvent[];
  [key: string]: any;
}

interface UnifiedAbilityCardProps {
  ability: Ability;
  selected: boolean;
  onSelect: (ability: Ability) => void;
  locked?: boolean;
  cooldown?: number;
  player: Player;
  isSelectable?: boolean;
  isMobile?: boolean;
}

interface AbilitySelectionStepProps {
  me: Player;
  unlocked: Ability[];
  racialAbility?: Ability;
  lastEvent: LastEventData;
  selectedAbility?: Ability | null;
  bloodRageActive: boolean;
  keenSensesActive: boolean;
  racialSelected: boolean;
  onAbilitySelect: (ability: Ability) => void;
  onRacialAbilityUse: (abilityType: string) => void;
  onClose: () => void;
  isMobile: boolean;
}

/**
 * Unified ability card component that works for both mobile and desktop
 */
const UnifiedAbilityCard: React.FC<UnifiedAbilityCardProps> = ({ 
  ability, 
  selected, 
  onSelect, 
  locked = false, 
  cooldown = 0, 
  player,
  isSelectable = true,
  isMobile = false
}) => {
  const handleClick = (): void => {
    if (!locked && !cooldown && isSelectable) {
      onSelect(ability);
    }
  };
  
  const getAbilityIcon = (ability: Ability): string => {
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

    return abilityImageMap[ability.type] || 'default.png';
  };

  const currentCooldown = player.abilityCooldowns?.[ability.type] || 0;
  const isLocked = locked || currentCooldown > 0;
  const isDisabled = isLocked || !isSelectable;

  return (
    <div
      className={`unified-ability-card ${selected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''} ${isMobile ? 'mobile' : 'desktop'}`}
      onClick={handleClick}
    >
      <div className="ability-icon">
        <img
          src={`/images/abilities/${getAbilityIcon(ability)}`}
          alt={ability.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/abilities/default.png';
          }}
        />
      </div>
      
      <div className="ability-info">
        <h4 className="ability-name">{ability.name}</h4>
        {ability.description && (
          <p className="ability-description">{ability.description}</p>
        )}
        
        {currentCooldown > 0 && (
          <div className="cooldown-indicator">
            Cooldown: {currentCooldown} turns
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Ability Selection Step component
 */
const AbilitySelectionStep: React.FC<AbilitySelectionStepProps> = ({
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
  isMobile
}) => {
  const config = useConfig();
  const [showEnhancements, setShowEnhancements] = useState<boolean>(false);

  useEffect(() => {
    setShowEnhancements(bloodRageActive || keenSensesActive);
  }, [bloodRageActive, keenSensesActive]);

  if (!me.isAlive) {
    return (
      <div className="ability-selection-step dead-player">
        <div className="dead-message">
          <h3>You are dead</h3>
          <p>You can only watch as the remaining players continue the battle.</p>
          <div className="skull-icon">💀</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`ability-selection-step ${isMobile ? 'mobile' : 'desktop'}`}>
      {isMobile && (
        <div className="step-header">
          <h2>Choose Your Action</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
      )}
      
      <div className="step-content">
        {/* Racial Ability Section */}
        {racialAbility && (
          <div className="racial-ability-section">
            <h3>Racial Ability</h3>
            <RacialAbilityCard
              ability={racialAbility}
              usesLeft={me.racialUsesLeft}
              cooldown={me.racialCooldown}
              disabled={false}
              onUse={onRacialAbilityUse}
            />
          </div>
        )}

        {/* Enhancement Status */}
        {showEnhancements && (
          <div className="enhancement-status">
            {bloodRageActive && (
              <div className="enhancement-indicator blood-rage">
                <span className="icon">💢</span>
                <span>Blood Rage Active</span>
              </div>
            )}
            {keenSensesActive && (
              <div className="enhancement-indicator keen-senses">
                <span className="icon">👁️</span>
                <span>Keen Senses Active</span>
              </div>
            )}
          </div>
        )}

        {/* Class Abilities Section */}
        <div className="class-abilities-section">
          <h3>Your Abilities</h3>
          <div className="abilities-grid">
            {unlocked.map(ability => (
              <UnifiedAbilityCard
                key={ability.type}
                ability={ability}
                selected={selectedAbility?.type === ability.type}
                onSelect={onAbilitySelect}
                player={me}
                isMobile={isMobile}
              />
            ))}
          </div>
        </div>

        {!isMobile && (
          <div className="step-instructions">
            <p>Select an ability to continue to target selection.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AbilitySelectionStep;