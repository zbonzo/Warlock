/**
 * @fileoverview Combat-focused racial abilities
 * Handles racial abilities that enhance combat performance
 */

import { createActionLog } from '../../../../../utils/logEntry.js';
import { secureId } from '../../../../../utils/secureRandom.js';
import type { Player, Monster, Ability } from '../../../../../types/generated.js';
import type {
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from '../../abilityRegistryUtils.js';
import type { GameSystems } from '../../../SystemsFactory.js';

import messages from '../../../../../config/messages/index.js';

/**
 * Handle Blood Rage - Orc racial ability
 */
export const handleBloodRage: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  _coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !ability) {
    return false;
  }

  // Blood rage is triggered by taking damage or seeing allies hurt
  const params = (ability as any).params || {};
  const damageBonus = params.damageBonus || 0.4; // 40% damage bonus
  const duration = params.duration || 4;
  const healthCost = params.healthCost || 10; // Costs health to use

  // Check if actor has enough health
  const currentHp = (actor as any).hp || 0;
  if (currentHp <= healthCost) {
    log.push(createActionLog(
      actor.id,
      '',
      messages.getAbilityMessage('racial', 'blood_rage_insufficient_health') || `${actor.name} doesn't have enough health for Blood Rage (needs ${healthCost}, has ${currentHp})!`,
      {
        details: {
          healthCost,
          currentHp,
          reason: 'insufficient_health'
        },
        priority: 'medium'
      }
    ));
    return false;
  }

  // Pay health cost
  const healthCostResult = systems.combatSystem?.applyDamage?.(actor, healthCost, {
    source: actor.id,
    type: 'true', // True damage (bypasses armor)
    ability: ability.id,
    isSelfDamage: true
  });

  if (healthCostResult.success) {
    log.push(createActionLog(
      actor.id,
      actor.id,
      messages.getAbilityMessage('racial', 'blood_rage_health_cost') || `${actor.name} pays ${healthCostResult?.finalDamage || healthCost} health to activate Blood Rage!`,
      {
        details: { healthCost: healthCostResult.finalDamage },
        priority: 'medium'
      }
    ));
  }

  // Apply blood rage buff
  const statusResult = systems.statusEffectManager.applyStatusEffect(actor, {
    id: secureId('blood-rage'),
    name: 'blood_rage',
    type: 'buff',
    duration,
    params: {
      damageBonus,
      sourceId: actor.id,
      sourceName: actor.name
    }
  });

  if (statusResult.success) {
    log.push(createActionLog(
      actor.id,
      '',
      messages.getAbilityMessage('blood_rage', 'success') || `${actor.name} enters Blood Rage! +${Math.round(damageBonus * 100)}% damage for ${duration} rounds`,
      {
        details: {
          damageBonus,
          duration,
          healthCost: healthCostResult?.finalDamage || healthCost
        },
        priority: 'high'
      }
    ));

    return true;
  }

  return false;
};

/**
 * Handle Undying - Lich racial ability
 */
export const handleUndying: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  _coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !ability) {
    return false;
  }

  const params = (ability as any).params || {};
  const duration = params.duration || 3;
  const damageReduction = params.damageReduction || 0.5; // 50% damage reduction
  const healthThreshold = params.healthThreshold || 0.25; // Activates when below 25% health

  const currentHp = (actor as any).hp || 0;
  const maxHp = (actor as any).maxHp || 100;
  const healthRatio = currentHp / maxHp;

  // Check if health is low enough to activate undying
  if (healthRatio > healthThreshold) {
    log.push(createActionLog(
      actor.id,
      '',
      messages.getAbilityMessage('undying', 'health_too_high') || `${actor.name} has too much health (${Math.round(healthRatio * 100)}%) to activate Undying (requires <${Math.round(healthThreshold * 100)}%)`,
      {
        details: {
          currentHealthRatio: healthRatio,
          requiredThreshold: healthThreshold
        },
        priority: 'medium'
      }
    ));
    return false;
  }

  // Apply undying effect
  const statusResult = systems.statusEffectManager.applyStatusEffect(actor, {
    id: secureId('undying'),
    name: 'undying',
    type: 'buff',
    duration,
    params: {
      damageReduction,
      preventDeath: true,
      sourceId: actor.id,
      sourceName: actor.name
    }
  });

  if (statusResult.success) {
    log.push(createActionLog(
      actor.id,
      '',
      messages.getAbilityMessage('undying', 'success') || `${actor.name} activates Undying! ${Math.round(damageReduction * 100)}% damage reduction for ${duration} rounds`,
      {
        details: {
          damageReduction,
          duration,
          healthWhenActivated: healthRatio
        },
        priority: 'high'
      }
    ));

    return true;
  }

  return false;
};

/**
 * Handle Stone Armor - Rockhewn racial passive ability
 * This is typically handled passively by the damage calculation system
 * but can be activated for enhanced protection
 */
export const handleStoneArmor: AbilityHandler = (
  actor: Player,
  target: Player | Monster,
  ability: Ability,
  log: LogEntry[],
  systems: GameSystems,
  _coordinationInfo?: CoordinationInfo
): boolean => {
  if (!actor || !ability) {
    return false;
  }

  const params = (ability as any).params || {};
  const armorBonus = params.armorBonus || 10;
  const duration = params.duration || 5;
  const damageReduction = params.damageReduction || 0.2; // 20% damage reduction

  // Apply enhanced stone armor
  const statusResult = systems.statusEffectManager.applyStatusEffect(actor, {
    id: secureId('stone-armor-enhanced'),
    name: 'stone_armor_enhanced',
    type: 'buff',
    duration,
    params: {
      armorBonus,
      damageReduction,
      sourceId: actor.id,
      sourceName: actor.name
    }
  });

  if (statusResult.success) {
    log.push(createActionLog(
      actor.id,
      '',
      messages.getAbilityMessage('stone_armor', 'enhanced') || `${actor.name}'s Stone Armor enhanced! +${armorBonus} armor, ${Math.round(damageReduction * 100)}% damage reduction for ${duration} rounds`,
      {
        details: {
          armorBonus,
          damageReduction,
          duration
        },
        priority: 'high'
      }
    ));

    return true;
  }

  return false;
};
