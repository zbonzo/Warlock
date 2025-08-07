/**
 * @fileoverview Utility-focused racial abilities
 * Handles racial abilities that provide utility and support functions
 */

import type { Player, Monster, Ability } from '../../../../../types/generated.js';
import type {
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from '../../abilityRegistryUtils.js';
import type { GameSystems } from '../../../SystemsFactory.js';

import config from '../../../../../config/index.js';
import messages from '../../../../../config/messages/index.js';

/**
 * Handle Kinfolk Pack Bond - Kinfolk racial ability
 */
export const handlePackBond: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !ability) {
    return false;
  }

  const game = systems.game;
  if (!game) {
    return false;
  }

  // Find other Kinfolk players
  const kinfolkAllies = Array.from(game.players.values()).filter(
    (p: any) => p.id !== actor.id && 
                p.race === 'Kinfolk' && 
                p.isAlive !== false && 
                p.hp > 0
  );

  if (kinfolkAllies.length === 0) {
    log.push({
      id: `pack-bond-no-allies-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: messages.getAbilityMessage('pack_bond', 'no_kinfolk_allies', {
        actor: actor.name
      }),
      details: { reason: 'no_kinfolk_allies' },
      isPublic: true,
      priority: 'medium'
    });
    return false;
  }

  const params = (ability as any).params || {};
  const bondBonus = params.bondBonus || 0.1; // 10% bonus per Kinfolk ally
  const duration = params.duration || 5;
  const maxBonus = params.maxBonus || 0.4; // Cap at 40%

  const actualBonus = Math.min(bondBonus * kinfolkAllies.length, maxBonus);

  // Apply pack bond to actor and all Kinfolk allies
  const bonusTargets = [actor, ...kinfolkAllies];
  let successfulBonds = 0;

  for (const bondTarget of bonusTargets) {
    const statusResult = systems.statusEffectManager.applyStatusEffect(bondTarget, {
      id: `pack-bond-${Date.now()}-${bondTarget.id}`,
      name: 'pack_bond',
      type: 'buff',
      duration,
      params: {
        damageBonus: actualBonus,
        healingBonus: actualBonus * 0.5,
        packSize: bonusTargets.length,
        sourceId: actor.id,
        sourceName: actor.name
      }
    });

    if (statusResult.success) {
      successfulBonds++;
    }
  }

  if (successfulBonds > 0) {
    log.push({
      id: `pack-bond-success-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: messages.getAbilityMessage('pack_bond', 'success', {
        actor: actor.name,
        packSize: bonusTargets.length,
        bonusPercentage: Math.round(actualBonus * 100),
        duration
      }),
      details: {
        packSize: bonusTargets.length,
        actualBonus,
        duration,
        successfulBonds
      },
      isPublic: true,
      priority: 'high'
    });

    return true;
  }

  return false;
};

/**
 * Handle Crestfallen Despair Aura - Crestfallen racial ability
 */
export const handleDespairAura: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !ability) {
    return false;
  }

  const game = systems.game;
  if (!game) {
    return false;
  }

  // Affect all other players (not self)
  const targets = Array.from(game.players.values()).filter(
    (p: any) => p.id !== actor.id && p.isAlive !== false && p.hp > 0
  );

  if (targets.length === 0) {
    return false;
  }

  const params = (ability as any).params || {};
  const damagePenalty = params.damagePenalty || 0.15; // 15% damage reduction
  const duration = params.duration || 4;
  const selfBonus = params.selfBonus || 0.1; // 10% damage bonus to self

  let affectedTargets = 0;

  // Apply despair to all other players
  for (const despairTarget of targets) {
    const statusResult = systems.statusEffectManager.applyStatusEffect(despairTarget, {
      id: `despair-aura-${Date.now()}-${despairTarget.id}`,
      name: 'despair',
      type: 'debuff',
      duration,
      params: {
        damagePenalty,
        sourceId: actor.id,
        sourceName: actor.name
      }
    });

    if (statusResult.success) {
      affectedTargets++;
    }
  }

  // Apply self-bonus to the Crestfallen
  const selfBonusResult = systems.statusEffectManager.applyStatusEffect(actor, {
    id: `despair-self-bonus-${Date.now()}`,
    name: 'despair_empowerment',
    type: 'buff',
    duration,
    params: {
      damageBonus: selfBonus,
      sourceId: actor.id,
      sourceName: actor.name
    }
  });

  if (affectedTargets > 0 || selfBonusResult.success) {
    log.push({
      id: `despair-aura-success-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: messages.getAbilityMessage('despair_aura', 'success', {
        actor: actor.name,
        affectedTargets,
        damagePenalty: Math.round(damagePenalty * 100),
        selfBonus: Math.round(selfBonus * 100),
        duration
      }),
      details: {
        affectedTargets,
        damagePenalty,
        selfBonus,
        duration
      },
      isPublic: true,
      priority: 'high'
    });

    return true;
  }

  return false;
};

/**
 * Handle Artisan Crafting - Artisan utility racial ability
 */
export const handleArtisanCrafting: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !ability) {
    return false;
  }

  const params = (ability as any).params || {};
  const craftingType = params.craftingType || 'utility_item';
  const itemDuration = params.itemDuration || 6;

  let craftedItem: any = null;
  let craftingSuccess = false;

  switch (craftingType) {
    case 'healing_potion':
      craftedItem = {
        name: 'Healing Potion',
        type: 'consumable',
        healing: 25,
        uses: 1
      };
      break;
    
    case 'smoke_bomb':
      craftedItem = {
        name: 'Smoke Bomb',
        type: 'utility',
        effect: 'area_invisibility',
        duration: 2,
        uses: 1
      };
      break;
    
    case 'reinforcement_kit':
      craftedItem = {
        name: 'Armor Reinforcement',
        type: 'buff',
        armorBonus: 8,
        duration: itemDuration,
        uses: 1
      };
      break;
    
    default:
      // Random crafting
      const randomItems = ['healing_potion', 'smoke_bomb', 'reinforcement_kit'];
      return handleArtisanCrafting(
        actor, target, 
        { ...ability, params: { ...params, craftingType: randomItems[Math.floor(Math.random() * randomItems.length)] } },
        log, systems, coordinationInfo
      );
  }

  if (craftedItem) {
    // Add item to player's inventory (simplified)
    const playerInventory = (actor as any).inventory || [];
    playerInventory.push(craftedItem);
    (actor as any).inventory = playerInventory;

    log.push({
      id: `artisan-crafting-success-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: messages.getAbilityMessage('artisan_crafting', 'success', {
        actor: actor.name,
        itemName: craftedItem.name,
        itemType: craftedItem.type
      }),
      details: {
        craftedItem,
        craftingType
      },
      isPublic: true,
      priority: 'high'
    });

    // Private message with item details
    log.push({
      id: `artisan-crafting-details-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: messages.getPrivateMessage('crafting_item_details', {
        itemName: craftedItem.name,
        itemDetails: JSON.stringify(craftedItem, null, 2)
      }),
      details: {
        isPrivate: true,
        recipientId: actor.id,
        craftedItem
      },
      isPublic: false,
      priority: 'medium'
    });

    return true;
  }

  return false;
};