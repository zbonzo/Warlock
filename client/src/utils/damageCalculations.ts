/**
 * @fileoverview Damage and healing calculation utilities for ability cards
 * Extracted from AbilityCard component for better maintainability
 */
import { Ability, Player } from '@/types/game';
import { DamageInfo, HealingInfo } from './abilityUtils';

interface StatusEffect {
  type: string;
  [key: string]: any;
}

/**
 * Calculate damage information with modifiers using server's damage modifier system
 */
export function calculateDamageInfo(ability: Ability, player: Player | null): DamageInfo {
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
      ? `${modifiedDamage} damage`
      : `${baseDamage} damage`,
  };
}

/**
 * Calculate healing information with modifiers using server's healing modifier system
 */
export function calculateHealingInfo(ability: Ability, player: Player | null): HealingInfo {
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
      ? `${modifiedHealing} healing`
      : `${baseHealing} healing`,
  };
}

/**
 * Calculate damage per hit for multi-hit abilities
 */
export function calculateDamagePerHit(ability: Ability, player: Player | null): DamageInfo | null {
  const params = ability.params;
  if (!params?.hits || !params?.damagePerHit) return null;

  const damagePerHitAbility: Ability = {
    ...ability,
    params: { damage: params.damagePerHit }
  };

  return calculateDamageInfo(damagePerHitAbility, player);
}

/**
 * Calculate shield/armor value information
 */
export function calculateShieldInfo(ability: Ability, player: Player | null): DamageInfo | null {
  // Shield property doesn't exist in current AbilityParams type, so return null for now
  // This function can be implemented when shield abilities are added
  return null;
}

/**
 * Helper function to get modified damage display for embedding in descriptions
 */
export function getDamageText(ability: Ability, player: Player | null): string {
  if (!ability.params?.damage || !player?.damageMod) {
    return `${ability.params?.damage || 0} damage`;
  }

  const baseDamage = ability.params.damage;
  const modifiedDamage = Math.floor(baseDamage * player.damageMod);

  if (Math.abs(modifiedDamage - baseDamage) >= 1) {
    return `${modifiedDamage} damage`;
  }
  return `${baseDamage} damage`;
}

/**
 * Helper function to get modified healing display for embedding in descriptions
 */
export function getHealingText(ability: Ability, player: Player | null): string {
  if (!ability.params?.amount || !player?.damageMod) {
    return `${ability.params?.amount || 0} HP`;
  }

  const baseHealing = ability.params.amount;
  const healingMod = Math.max(0.1, 2.0 - (player.damageMod || 1.0));
  const modifiedHealing = Math.floor(baseHealing * healingMod);

  if (Math.abs(modifiedHealing - baseHealing) >= 1) {
    return `${modifiedHealing} HP`;
  }
  return `${baseHealing} HP`;
}

/**
 * Helper function to get modified poison damage
 */
export function getPoisonDamageText(poisonDamage: number, player: Player | null): string {
  if (!player?.damageMod || !poisonDamage) {
    return `${poisonDamage}`;
  }

  const modifiedPoison = Math.floor(poisonDamage * player.damageMod);
  return `${modifiedPoison}`;
}