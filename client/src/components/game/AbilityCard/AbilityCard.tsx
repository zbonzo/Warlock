/**
 * @fileoverview Fixed AbilityCard component with proper damage modifier display
 * Shows actual modified damage values using server's damage calculation system
 */
import React from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { Ability, Player } from '@/types/game';
import './AbilityCard.css';

interface AbilityCardProps {
  ability: Ability;
  selected: boolean;
  onSelect: (abilityType: string) => void;
  isRacial?: boolean;
  raceName?: string | null;
  usesLeft?: number | null;
  cooldown?: number | null;
  abilityCooldown?: number;
  player?: Player | null;
}

interface DamageInfo {
  base: number;
  modified: number;
  modifier?: number;
  showModified: boolean;
  displayText: string;
}

interface HealingInfo {
  base: number;
  modified: number;
  modifier?: number;
  showModified: boolean;
  displayText: string;
}

/**
 * AbilityCard component renders ability information with proper damage modifiers
 */
const AbilityCard: React.FC<AbilityCardProps> = ({
  ability,
  selected,
  onSelect,
  isRacial = false,
  raceName = null,
  usesLeft = null,
  cooldown = null,
  abilityCooldown = 0,
  player = null,
}) => {
  const theme = useTheme();

  // Skip rendering if this is a racial ability with no uses left
  if (isRacial && usesLeft === 0) {
    return null;
  }

  // Determine if ability is available
  let isAvailable = true;
  let unavailableReason: string | null = null;

  if (isRacial) {
    // Racial ability availability
    isAvailable = usesLeft !== null && usesLeft > 0 && cooldown === 0;
    if (usesLeft !== null && usesLeft <= 0) {
      unavailableReason = 'No uses remaining';
    } else if (cooldown !== null && cooldown > 0) {
      unavailableReason = `${cooldown} turn${cooldown > 1 ? 's' : ''} remaining`;
    }
  } else {
    // Class ability availability (check cooldown)
    isAvailable = abilityCooldown === 0;
    if (abilityCooldown > 0) {
      unavailableReason = `${abilityCooldown} turn${abilityCooldown > 1 ? 's' : ''} remaining`;
    }
  }

  // Get the right color based on ability type
  const cardColor = isRacial
    ? getRaceColor(raceName, theme)
    : getCategoryColor(ability.category, theme);

  // For racial abilities, get status message
  const racialStatus = getRacialStatus(usesLeft, cooldown);

  // Handle click
  const handleClick = () => {
    if (isAvailable) {
      onSelect(ability.type);
    }
  };

  return (
    <div
      className={`ability-card ${isRacial ? 'racial-ability' : ''} ${selected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
      onClick={handleClick}
    >
      <div className="ability-header" style={{ backgroundColor: cardColor }}>
        <span className="ability-title">
          {ability.name}
          {isRacial && raceName && (
            <span className="ability-subtitle"> ({raceName} Ability)</span>
          )}
        </span>
        <span className="ability-icon">
          {getAbilityIcon(ability, isRacial)}
        </span>
      </div>
      <div className="ability-flavor-text">
        {ability.flavorText || 'No flavor text available'}
      </div>
      <div className="ability-description">
        {getEffectDescription(ability, isRacial, player)}
      </div>
      {/* Cooldown indicator for class abilities */}
      {!isRacial && abilityCooldown > 0 && (
        <div className="ability-cooldown">
          <div className="cooldown-indicator">
            <span className="cooldown-icon">⏳</span>
            <span className="cooldown-text">
              Cooldown: {abilityCooldown} turn{abilityCooldown > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
      {/* Base cooldown info for class abilities (when not on cooldown) */}
      {!isRacial && abilityCooldown === 0 && ability.cooldown && ability.cooldown > 0 && (
        <div className="ability-cooldown-info">
          <span className="cooldown-info-text">
            Cooldown: {ability.cooldown} turn{ability.cooldown > 1 ? 's' : ''}
          </span>
        </div>
      )}
      {/* Racial ability status info */}
      {isRacial && (
        <div className="racial-status">
          <div className="usage-limit">
            <strong>Limit:</strong>{' '}
            {ability.usageLimit === 'perGame'
              ? 'Once per game'
              : 'Once per round'}
          </div>

          {racialStatus && (
            <div
              className={`status-indicator ${isAvailable ? 'available' : 'unavailable'}`}
            >
              {racialStatus}
            </div>
          )}
        </div>
      )}
      {/* Unavailable overlay */}
      {!isAvailable && (
        <div className="ability-unavailable-overlay">
          <div className="unavailable-reason">{unavailableReason}</div>
        </div>
      )}
    </div>
  );
};

/**
 * FIXED: Calculate modified damage using server's damage modifier system
 */
function calculateModifiedDamage(ability: Ability, player: Player | null): DamageInfo {
  if (!ability.params?.damage || !player) {
    return {
      base: ability.params?.damage || 0,
      modified: ability.params?.damage || 0,
      showModified: false,
      displayText: ability.params?.damage
        ? `${ability.params.damage} damage`
        : '0 damage',
    };
  }

  const baseDamage = ability.params.damage;
  // Use the server's damageMod directly (this includes race, class, and level bonuses)
  const damageMod = player.damageMod || 1.0;
  const modifiedDamage = Math.floor(baseDamage * damageMod);

  const showModified = Math.abs(modifiedDamage - baseDamage) >= 1;

  return {
    base: baseDamage,
    modified: modifiedDamage,
    modifier: damageMod,
    showModified,
    displayText: showModified
      ? `${modifiedDamage} damage` // (${baseDamage} base × ${damageMod.toFixed(1)})`
      : `${baseDamage} damage`,
  };
}

/**
 * FIXED: Calculate modified healing using server's healing modifier system
 */
function calculateModifiedHealing(ability: Ability, player: Player | null): HealingInfo {
  if (!ability.params?.amount || !player) {
    return {
      base: ability.params?.amount || 0,
      modified: ability.params?.amount || 0,
      showModified: false,
      displayText: ability.params?.amount
        ? `${ability.params.amount} healing`
        : '0 healing',
    };
  }

  const baseHealing = ability.params.amount;
  // Calculate healing modifier: 2.0 - damageMod (from server logic)
  const healingMod = Math.max(0.1, 2.0 - (player.damageMod || 1.0));
  const modifiedHealing = Math.floor(baseHealing * healingMod);

  const showModified = Math.abs(modifiedHealing - baseHealing) >= 1;

  return {
    base: baseHealing,
    modified: modifiedHealing,
    modifier: healingMod,
    showModified,
    displayText: showModified
      ? `${modifiedHealing} healing` //(${baseHealing} base × ${healingMod.toFixed(1)})`
      : `${baseHealing} healing`,
  };
}

/**
 * Get appropriate color for ability category
 */
function getCategoryColor(category: string, theme: any): string {
  const categoryColors: Record<string, string> = {
    Attack: theme.colors.danger,
    Defense: theme.colors.primary,
    Heal: theme.colors.accent,
    Special: theme.colors.secondary,
    Racial: '#8B5A00', // Bronze/Gold color for racial abilities
  };

  return (categoryColors[category] || categoryColors['Special']) as string;
}

/**
 * Get race-specific color for racial abilities
 */
function getRaceColor(race: string | null, theme: any): string {
  if (!race) return getCategoryColor('Racial', theme);

  switch (race) {
    case 'Artisan':
      return '#4169E1'; // Royal Blue
    case 'Rockhewn':
      return '#8B4513'; // Saddle Brown
    case 'Crestfallen':
      return '#228B22'; // Forest Green
    case 'Orc':
      return '#8B0000'; // Dark Red
    case 'Kinfolk':
      return '#9932CC'; // Dark Orchid
    case 'Lich':
      return '#36454F'; // Charcoal
    default:
      return getCategoryColor('Racial', theme);
  }
}

/**
 * Get appropriate icon for ability type
 */
function getAbilityIcon(ability: Ability, isRacial: boolean): React.ReactElement | string {
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

  // Check if we have a PNG for this ability (for both racial and class abilities)
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

  // Special icons for racial abilities (fallback emojis)
  if (isRacial) {
    switch (ability.type) {
      case 'adaptability':
        return '🔄';
      case 'stoneArmor':
        return '🛡️';
      case 'keenSenses':
        return '👁️';
      case 'bloodRage':
        return '💢';
      case 'forestsGrace':
        return '🌿';
      case 'undying':
        return '💀';
      default:
        return '✨';
    }
  }

  // Handle specific ability types
  const { type, category, effect } = ability;

  switch (type) {
    case 'recklessStrike':
    case 'bloodFrenzy':
    case 'unstoppableRage':
      return '🪓'; // Barbarian abilities
    case 'primalRoar':
      return '🦁';
    case 'psychicBolt':
    case 'fatesEye':
    case 'eyeOfFate':
      return '🔮'; // Oracle abilities
    case 'spiritGuard':
      return '👻';
    case 'sanctuaryOfTruth':
      return '⛩️';
    case 'arcaneBarrage':
    case 'twinStrike':
      return '⚡'; // Multi-hit attacks
    case 'poisonStrike':
    case 'poisonTrap':
    case 'deathMark':
    case 'barbedArrow':
      return '☠️'; // Poison abilities
    case 'shiv':
      return '🗡️';
    case 'meteorShower':
      return '☄️';
    case 'infernoBlast':
    case 'combustion':
      return '🔥';
    case 'chainLightning':
      return '⚡';
    case 'entangle':
      return '🌿';
    case 'aimedShot':
      return '🎯';
    case 'ricochetRound':
      return '💥';
    case 'battleCry':
      return '📢';
    case 'rejuvenation':
      return '🌱';
    case 'shadowstep':
      return '🌫️';
  }

  // Fallback to category-based icons
  if (category === 'Attack') return '⚔️';
  if (category === 'Heal') return '💚';

  if (category === 'Defense') {
    if (effect === 'shielded') return '🛡️';
    if (effect === 'invisible') return '👻';
    return '🛡️';
  }

  if (category === 'Special') {
    if (effect === 'poison') return '☠️';
    if (effect === 'stunned') return '⚡';
    if (effect === 'detect') return '👁️';
    if (effect === 'weakened') return '💔';
    return '✨';
  }

  return '❓';
}

/**
 * Helper function to get modified damage display for embedding in descriptions
 */
function getDamageText(ability: Ability, player: Player | null): string {
  if (!ability.params?.damage || !player?.damageMod) {
    return `${ability.params?.damage || 0} damage`;
  }

  const baseDamage = ability.params.damage;
  const modifiedDamage = Math.floor(baseDamage * player.damageMod);

  if (Math.abs(modifiedDamage - baseDamage) >= 1) {
    return `${modifiedDamage} damage`; // (${baseDamage} base × ${player.damageMod.toFixed(1)})`;
  }
  return `${baseDamage} damage`;
}

/**
 * Helper function to get modified healing display for embedding in descriptions
 */
function getHealingText(ability: Ability, player: Player | null): string {
  if (!ability.params?.amount || !player?.damageMod) {
    return `${ability.params?.amount || 0} HP`;
  }

  const baseHealing = ability.params.amount;
  const healingMod = Math.max(player.damageMod);
  const modifiedHealing = Math.floor(baseHealing * healingMod);

  if (Math.abs(modifiedHealing - baseHealing) >= 1) {
    return `${modifiedHealing} HP`; // (${baseHealing} base × ${healingMod.toFixed(1)})`;
  }
  return `${baseHealing} HP`;
}

/**
 * Helper function to get modified poison damage
 */
function getPoisonDamageText(poisonDamage: number, player: Player | null): string {
  if (!player?.damageMod || !poisonDamage) {
    return poisonDamage.toString();
  }

  const modifiedPoison = Math.floor(poisonDamage * player.damageMod);
  if (Math.abs(modifiedPoison - poisonDamage) >= 1) {
    return `${modifiedPoison} (${poisonDamage} base × ${player.damageMod.toFixed(1)})`;
  }
  return poisonDamage.toString();
}

/**
 * FIXED: Get a descriptive effect text with properly calculated modified values
 */
function getEffectDescription(ability: Ability, isRacial: boolean, player: Player | null): string {
  if (isRacial) {
    return ability.description || '';
  }

  const { category, effect, params, type, target } = ability;

  let description = '';

  // Handle specific ability types first with properly modified values
  switch (type) {
    case 'recklessStrike':
      const selfDamage = params?.selfDamage || 0;
      return `Deals ${getDamageText(ability, player)} but you take ${selfDamage} recoil damage`;

    case 'arcaneBarrage':
      const damagePerHitAbility: Ability = {
        ...ability,
        params: { damage: params?.damagePerHit || 0 },
      };
      const hits = params?.hits || 0;
      const hitChanceText = params?.hitChance
        ? ` (${Math.round(params.hitChance * 100)}% hit chance per bolt)`
        : '';
      return `Fires ${hits} bolts dealing ${getDamageText(damagePerHitAbility, player).replace(' damage', '')} damage each${hitChanceText}`;

    case 'twinStrike':
      return `Strikes twice for ${getDamageText(ability, player).replace(' damage', '')} damage each hit`;

    case 'bloodFrenzy':
      return `Passive: Gain ${Math.round((params?.damageIncreasePerHpMissing || 0.01) * 100)}% more damage for every 1% HP missing`;

    case 'primalRoar':
      return `Weakens target, reducing their damage by ${Math.round((params?.damageReduction || 0.25) * 100)}% for ${params?.duration || 1} turn${params?.duration !== 1 ? 's' : ''}`;

    case 'unstoppableRage':
      const damageBoost = Math.round(((params?.damageBoost || 1.5) - 1) * 100);
      const resistance = Math.round((params?.damageResistance || 0.3) * 100);
      const endDamage = Math.round(
        (params?.effectEnds?.selfDamagePercent || 0.25) * 100
      );
      return `Gain ${damageBoost}% damage and ${resistance}% damage resistance for ${params?.duration || 2} turns. Take ${endDamage}% max HP damage when it ends`;

    case 'fatesEye':
    case 'eyeOfFate':
      if(params?.selfDamageOnFailure && params.selfDamageOnFailure > 0) {
      return `Detect if target is a Warlock. Take ${params.selfDamageOnFailure || 10} damage if they are not`;
      } else {
        return 'Detect if target is a Warlock. Die instantly if they are not';
      }

    case 'spiritGuard':
      return `Gain ${params?.armor || 2} armor. Attackers take ${params?.counterDamage || 15} damage and are revealed if they are Warlocks`;

    case 'sanctuaryOfTruth':
      return `Heal for ${getHealingText(ability, player)}. Warlock attackers take ${params?.counterDamage || 10} damage and are automatically revealed`;

    case 'shiv':
      return `Deals ${getDamageText(ability, player)} and makes target vulnerable (+${params?.vulnerable?.damageIncrease || 25}% damage taken for ${params?.vulnerable?.turns || 3} turns)`;

    case 'barbedArrow':
      const poisonDamage = params?.poison?.damage || 0;
      return `Deals ${getDamageText(ability, player)} and causes bleeding for ${getPoisonDamageText(poisonDamage, player)} damage over ${params?.poison?.turns || 0} turns`;

    case 'combustion':
      const burnDamage = params?.poison?.damage || 0;
      return `Deals ${getDamageText(ability, player)} and burns for ${getPoisonDamageText(burnDamage, player)} damage over ${params?.poison?.turns || 0} turns`;

    case 'infernoBlast':
      const infernoPoison = params?.poison?.damage || 0;
      return `Deals ${getDamageText(ability, player)} to all enemies and burns them for ${getPoisonDamageText(infernoPoison, player)} damage over ${params?.poison?.turns || 0} turns`;

    case 'deathMark':
      const deathMarkPoison = params?.poison?.damage || 0;
      return `Curse target with poison dealing ${getPoisonDamageText(deathMarkPoison, player)} damage over ${params?.poison?.turns || 0} turns and become invisible`;

    case 'poisonTrap':
      const trapPoison = params?.poison?.damage || 0;
      return `Lay multiple traps that poison enemies for ${getPoisonDamageText(trapPoison, player)} damage over ${params?.poison?.turns || 0} turns and make them vulnerable`;

    case 'entangle':
      return `${Math.round((params?.chance || 0.5) * 100)}% chance to stun multiple targets for ${params?.duration || 1} turn${params?.duration !== 1 ? 's' : ''}`;

    case 'aimedShot':
      return `Carefully aimed shot dealing ${getDamageText(ability, player)} (takes longer to execute)`;

    case 'meteorShower':
    case 'ricochetRound':
    case 'chainLightning':
      return `Deals ${getDamageText(ability, player)} to multiple targets`;

    case 'battleCry':
    case 'divineShield':
      return `Grants ${params?.armor || 0} armor to all allies for ${params?.duration || 1} turn${params?.duration !== 1 ? 's' : ''}`;

    case 'rejuvenation':
      return `Heals all allies for ${getHealingText(ability, player)}`;

    case 'shadowstep':
      return `Makes target ally invisible for ${params?.duration || 1} turn${params?.duration !== 1 ? 's' : ''}`;

    case 'controlMonster':
      const damageBoostPercent = params?.damageBoost
        ? Math.round((params.damageBoost - 1) * 100)
        : 50;
      return `Force the Monster to attack your chosen target with ${damageBoostPercent}% more damage`;
  }

  // Fallback to category-based descriptions with properly modified values
  if (category === 'Attack') {
    if (params?.hits && params?.damagePerHit) {
      // Multi-hit attacks
      const damagePerHitAbility: Ability = { ...ability, params: { damage: params.damagePerHit } };
      description = `${params.hits} hits of ${getDamageText(damagePerHitAbility, player).replace(' damage', '')} damage each`;
      if (params.hitChance && params.hitChance < 1) {
        description += ` (${Math.round(params.hitChance * 100)}% hit chance)`;
      }
    } else {
      // Single hit attacks
      description = `Deals ${getDamageText(ability, player)}`;
    }

    if (effect === 'poison' && params?.poison) {
      const poisonDamage = params.poison.damage || 0;
      description += ` and poisons for ${getPoisonDamageText(poisonDamage, player)} damage over ${params.poison.turns || 0} turns`;
    }

    if (effect === 'vulnerable' && params?.vulnerable) {
      description += ` and makes target vulnerable (+${params.vulnerable.damageIncrease || 0}% damage for ${params.vulnerable.turns || 0} turns)`;
    }

    if (target === 'Multi') {
      description += ' to multiple targets';
    }
  } else if (category === 'Heal') {
    description = `Restores ${getHealingText(ability, player)}`;
    if (target === 'Multi') {
      description += ' to multiple allies';
    } else if (target === 'Self') {
      description += ' to yourself';
    }
  } else if (category === 'Defense') {
    if (effect === 'shielded') {
      description = `Adds ${params?.armor || 0} armor`;
      if (params?.counterDamage) {
        description += ` and ${params.counterDamage} counter-damage`;
      }
      description += ` for ${params?.duration || 1} turn${params?.duration !== 1 ? 's' : ''}`;
    } else if (effect === 'invisible') {
      description = `Makes ${target === 'Self' ? 'you' : 'target'} invisible for ${params?.duration || 1} turn${params?.duration !== 1 ? 's' : ''}`;
    }
  } else if (category === 'Special') {
    if (effect === 'poison' && params?.poison) {
      const poisonDamage = params.poison.damage || 0;
      description = `Poisons for ${getPoisonDamageText(poisonDamage, player)} damage over ${params.poison.turns || 0} turns`;
    } else if (effect === 'stunned') {
      const chance = params?.chance ? Math.round(params.chance * 100) : 50;
      description = `${chance}% chance to stun targets for ${params?.duration || 1} turn${params?.duration !== 1 ? 's' : ''}`;
    } else if (effect === 'detect') {
      description = 'Reveals if target is a Warlock';
      if (params?.selfDamageOnFailure) {
        description += ` (${params.selfDamageOnFailure} damage if wrong)`;
      }
    } else if (effect === 'weakened') {
      const reduction = Math.round((params?.damageReduction || 0.25) * 100);
      description = `Reduces target damage by ${reduction}% for ${params?.duration || 1} turn${params?.duration !== 1 ? 's' : ''}`;
    } else if (params?.damage) {
      description = `Deals ${getDamageText(ability, player)}`;
      if (target === 'Multi') {
        description += ' to multiple targets';
      }
    } else {
      description = 'Special ability with unique effects';
    }
  }

  // Add cooldown info if present
  if (ability.cooldown && ability.cooldown > 0) {
    description += ` (${ability.cooldown} turn cooldown)`;
  }

  return description || 'No description available';
}

/**
 * Get status message for racial abilities
 */
function getRacialStatus(usesLeft: number | null, cooldown: number | null): string | null {
  if (usesLeft === null || cooldown === null) return null;

  if (cooldown > 0)
    return `Available in ${cooldown} turn${cooldown !== 1 ? 's' : ''}`;
  return 'Ready to use';
}

export default AbilityCard;