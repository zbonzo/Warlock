/**
 * @fileoverview Utility functions for ability card logic and display
 * Extracted from AbilityCard component for better maintainability
 */
import React from 'react';
import { Ability, Player } from '@/types/game';

export interface DamageInfo {
  base: number;
  modified: number;
  modifier?: number;
  showModified: boolean;
  displayText: string;
}

export interface HealingInfo {
  base: number;
  modified: number;
  modifier?: number;
  showModified: boolean;
  displayText: string;
}

/**
 * Get appropriate color for ability category
 */
export function getCategoryColor(category: string, theme: any): string {
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
export function getRaceColor(race: string | null, theme: any): string {
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
 * Map ability types to their PNG file names
 */
export const ABILITY_IMAGE_MAP: Record<string, string> = {
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

/**
 * Get appropriate icon for ability type
 */
export function getAbilityIcon(ability: Ability, isRacial: boolean): React.ReactElement | string {
  // Check if we have a PNG for this ability (for both racial and class abilities)
  const imageName = ABILITY_IMAGE_MAP[ability.type];
  if (imageName) {
    return React.createElement('img', {
      src: `/images/abilities/${imageName}`,
      alt: ability.name,
      style: { width: '100%', height: '100%', objectFit: 'contain' }
    });
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
        return '⚡';
    }
  }

  // Default icons for different categories
  switch (ability.category) {
    case 'Attack':
      return '⚔️';
    case 'Defense':
      return '🛡️';
    case 'Heal':
      return '❤️';
    case 'Special':
      return '🌟';
    default:
      return '🔮';
  }
}

/**
 * Get status message for racial abilities
 */
export function getRacialStatus(usesLeft: number | null, cooldown: number | null): string | null {
  if (usesLeft === null || cooldown === null) return null;

  if (cooldown > 0)
    return `Available in ${cooldown} turn${cooldown !== 1 ? 's' : ''}`;
  return 'Ready to use';
}

/**
 * Get effect description for an ability
 */
export function getEffectDescription(ability: Ability, isRacial: boolean, player: Player | null): string {
  if (ability.description) {
    return ability.description;
  }
  
  // Fallback description based on ability properties
  let description = '';
  
  if (ability.params?.damage) {
    description += `Deals ${ability.params.damage} damage. `;
  }
  
  if (ability.params?.amount) {
    description += `Heals ${ability.params.amount} HP. `;
  }
  
  if (ability.params?.armor) {
    description += `Provides ${ability.params.armor} armor. `;
  }
  
  if (ability.effect) {
    description += `Applies ${ability.effect} effect. `;
  }
  
  return description || 'No description available.';
}