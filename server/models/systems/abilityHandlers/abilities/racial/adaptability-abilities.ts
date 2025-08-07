/**
 * @fileoverview Adaptability and evolution racial abilities
 * Handles racial abilities that provide adaptation and evolution mechanics
 */

import type { Player, Monster, Ability } from '../../../../../types/generated.js';
import type {
  AbilityHandler,
  CoordinationInfo,
  LogEntry
} from '../../abilityRegistryUtils.js';
import type { GameSystems } from '../../../SystemsFactory.js';
import { applyThreatForAbility } from '../../abilityRegistryUtils.js';

import config from '../../../../../config/index.js';
import messages from '../../../../../config/messages/index.js';

/**
 * Handle Adaptability - Artisan racial ability
 */
export const handleAdaptability: AbilityHandler = (
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

  // Get available classes for adaptation
  const availableClasses = config.getClassesByCategory?.('adaptable') || [];
  
  if (availableClasses.length === 0) {
    log.push({
      id: `adaptability-no-classes-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: messages.getAbilityMessage('racial', 'adaptability_no_classes') || `${actor.name} cannot adapt - no classes available!`,
      details: { reason: 'no_adaptable_classes' },
      public: true,
      isPublic: true,
      priority: 'medium'
    });
    return false;
  }

  // Select a random class to adapt to (or based on game conditions)
  const selectedClass = selectAdaptationClass(availableClasses, game, actor);
  
  if (!selectedClass) {
    return false;
  }

  // Apply temporary class adaptation
  const params = (ability as any).params || {};
  const duration = params.duration || 5;
  const adaptationBonus = params.adaptationBonus || 0.2; // 20% bonus to adapted class abilities

  const statusResult = systems.statusEffectManager?.applyStatusEffect?.(actor, {
    id: `adaptability-${Date.now()}`,
    name: 'adapted',
    type: 'buff',
    duration,
    params: {
      adaptedClass: selectedClass.name,
      adaptationBonus,
      sourceId: actor.id,
      sourceName: actor.name,
      newAbilities: selectedClass.abilities || []
    }
  }) || { success: false };

  if (statusResult.success) {
    log.push({
      id: `adaptability-success-${Date.now()}`,
      timestamp: Date.now(),
      type: 'action',
      source: actor.id,
      message: messages.getAbilityMessage('racial', 'adaptability_success') || `${actor.name} adapts to ${selectedClass.name} for ${duration} turns with ${Math.round(adaptationBonus * 100)}% bonus!`,
      details: {
        adaptedClass: selectedClass.name,
        duration,
        adaptationBonus,
        newAbilities: selectedClass.abilities?.length || 0
      },
      public: true,
      isPublic: true,
      priority: 'high'
    });

    // Private message with new abilities available
    if (selectedClass.abilities && selectedClass.abilities.length > 0) {
      log.push({
        id: `adaptability-abilities-${Date.now()}`,
        timestamp: Date.now(),
        type: 'action',
        source: actor.id,
        message: (messages as any).privateMessages?.adaptability_abilities || `You can now use: ${selectedClass.abilities.map((a: any) => a.name).join(', ')}`,
        details: {
          isPrivate: true,
          recipientId: actor.id,
          newAbilities: selectedClass.abilities
        },
        public: false,
        isPublic: false,
        priority: 'high'
      });
    }

    return true;
  }

  return false;
};

/**
 * Select appropriate class for adaptation based on game conditions
 */
function selectAdaptationClass(availableClasses: any[], game: any, actor: Player): any {
  if (availableClasses.length === 0) return null;

  // Simple selection logic - can be enhanced with more sophisticated rules
  
  // Check if we need healing (low health players)
  const lowHealthPlayers = Array.from(game.players.values()).filter(
    (p: any) => p.hp / p.maxHp < 0.5
  ).length;

  if (lowHealthPlayers > 1) {
    const healerClass = availableClasses.find(c => c.category === 'Healer');
    if (healerClass) return healerClass;
  }

  // Check if we need more damage (strong monster present)
  const monster = game.monster;
  if (monster && (monster as any).hp > (monster as any).maxHp * 0.7) {
    const damageClass = availableClasses.find(c => c.category === 'Damage');
    if (damageClass) return damageClass;
  }

  // Check if we need detection (suspected warlocks)
  const suspiciousActivity = game.suspicionLevel || 0;
  if (suspiciousActivity > 0.6) {
    const detectionClass = availableClasses.find(c => 
      c.abilities?.some((a: any) => a.effect === 'detect')
    );
    if (detectionClass) return detectionClass;
  }

  // Default to random selection
  return availableClasses[Math.floor(Math.random() * availableClasses.length)];
}