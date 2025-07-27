/**
 * @fileoverview EffectManager - TypeScript migration
 * Manages status effects, buffs, debuffs, and temporary modifiers
 * Part of Phase 3: Core Domain Models Migration
 */

import { z } from 'zod';
import logger from '@utils/logger';
import messages from '@messages';
import type { Player, StatusEffect } from '../../types/generated';

// Effect schemas
const EffectDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['buff', 'debuff', 'status', 'immunity']),
  duration: z.number().int().min(-1), // -1 for permanent
  stacks: z.number().int().min(0).default(0),
  source: z.string().optional(),
  metadata: z.record(z.any()).default({}),
});

const EffectApplicationResultSchema = z.object({
  success: z.boolean(),
  effect: EffectDataSchema.optional(),
  message: z.string().optional(),
  replaced: z.boolean().default(false),
  stacked: z.boolean().default(false),
});

// Type definitions
export type EffectData = z.infer<typeof EffectDataSchema>;
export type EffectApplicationResult = z.infer<typeof EffectApplicationResultSchema>;

export interface EffectModifiers {
  damage?: number;
  healing?: number;
  armor?: number;
  resistance?: number;
  vulnerability?: number;
}

/**
 * EffectManager handles all status effects and temporary modifiers
 * Centralized management for consistent effect processing
 */
export class EffectManager {
  private activeEffects: Map<string, Map<string, EffectData>> = new Map();

  /**
   * Apply an effect to a player
   * @param playerId - Target player ID
   * @param effect - Effect data to apply
   * @returns Application result
   */
  applyEffect(playerId: string, effect: EffectData): EffectApplicationResult {
    const validatedEffect = EffectDataSchema.parse(effect);
    
    if (!this.activeEffects.has(playerId)) {
      this.activeEffects.set(playerId, new Map());
    }

    const playerEffects = this.activeEffects.get(playerId)!;
    const existingEffect = playerEffects.get(effect.id);

    // Handle stacking
    if (existingEffect) {
      if (this.canStack(effect)) {
        existingEffect.stacks = Math.min(existingEffect.stacks + 1, 5); // Max 5 stacks
        existingEffect.duration = Math.max(existingEffect.duration, effect.duration);
        
        logger.debug('EffectStacked', {
          playerId,
          effectId: effect.id,
          stacks: existingEffect.stacks
        });

        return EffectApplicationResultSchema.parse({
          success: true,
          effect: existingEffect,
          stacked: true,
          message: `${effect.name} stacked (${existingEffect.stacks})`
        });
      } else {
        // Replace existing effect
        playerEffects.set(effect.id, validatedEffect);
        
        logger.debug('EffectReplaced', {
          playerId,
          effectId: effect.id,
          newDuration: effect.duration
        });

        return EffectApplicationResultSchema.parse({
          success: true,
          effect: validatedEffect,
          replaced: true,
          message: `${effect.name} refreshed`
        });
      }
    }

    // Apply new effect
    playerEffects.set(effect.id, validatedEffect);
    
    logger.debug('EffectApplied', {
      playerId,
      effectId: effect.id,
      duration: effect.duration
    });

    return EffectApplicationResultSchema.parse({
      success: true,
      effect: validatedEffect,
      message: `${effect.name} applied`
    });
  }

  /**
   * Remove an effect from a player
   * @param playerId - Target player ID
   * @param effectId - Effect ID to remove
   * @returns Whether effect was removed
   */
  removeEffect(playerId: string, effectId: string): boolean {
    const playerEffects = this.activeEffects.get(playerId);
    if (!playerEffects) return false;

    const removed = playerEffects.delete(effectId);
    
    if (removed) {
      logger.debug('EffectRemoved', { playerId, effectId });
    }

    return removed;
  }

  /**
   * Check if player has a specific effect
   * @param playerId - Player ID
   * @param effectId - Effect ID
   * @returns Whether player has the effect
   */
  hasEffect(playerId: string, effectId: string): boolean {
    const playerEffects = this.activeEffects.get(playerId);
    return playerEffects?.has(effectId) ?? false;
  }

  /**
   * Get a specific effect for a player
   * @param playerId - Player ID
   * @param effectId - Effect ID
   * @returns Effect data or null
   */
  getEffect(playerId: string, effectId: string): EffectData | null {
    const playerEffects = this.activeEffects.get(playerId);
    return playerEffects?.get(effectId) ?? null;
  }

  /**
   * Get all effects for a player
   * @param playerId - Player ID
   * @returns Array of effects
   */
  getPlayerEffects(playerId: string): EffectData[] {
    const playerEffects = this.activeEffects.get(playerId);
    return playerEffects ? Array.from(playerEffects.values()) : [];
  }

  /**
   * Process effect durations at end of turn
   * @param playerId - Player ID
   * @returns Array of expired effects
   */
  processEffectDurations(playerId: string): EffectData[] {
    const playerEffects = this.activeEffects.get(playerId);
    if (!playerEffects) return [];

    const expiredEffects: EffectData[] = [];
    
    for (const [effectId, effect] of playerEffects.entries()) {
      if (effect.duration > 0) {
        effect.duration--;
        
        if (effect.duration <= 0) {
          expiredEffects.push(effect);
          playerEffects.delete(effectId);
          
          logger.debug('EffectExpired', {
            playerId,
            effectId,
            effectName: effect.name
          });
        }
      }
    }

    return expiredEffects;
  }

  /**
   * Calculate effect modifiers for a player
   * @param playerId - Player ID
   * @returns Combined modifiers from all effects
   */
  calculateModifiers(playerId: string): EffectModifiers {
    const effects = this.getPlayerEffects(playerId);
    const modifiers: EffectModifiers = {};

    for (const effect of effects) {
      const stacks = Math.max(1, effect.stacks);
      
      // Apply modifiers based on effect type and metadata
      if (effect.metadata.damageModifier) {
        modifiers.damage = (modifiers.damage ?? 1) * (1 + effect.metadata.damageModifier * stacks);
      }
      
      if (effect.metadata.healingModifier) {
        modifiers.healing = (modifiers.healing ?? 1) * (1 + effect.metadata.healingModifier * stacks);
      }
      
      if (effect.metadata.armorBonus) {
        modifiers.armor = (modifiers.armor ?? 0) + effect.metadata.armorBonus * stacks;
      }
      
      if (effect.metadata.resistance) {
        modifiers.resistance = Math.min((modifiers.resistance ?? 0) + effect.metadata.resistance * stacks, 0.8);
      }
      
      if (effect.metadata.vulnerability) {
        modifiers.vulnerability = (modifiers.vulnerability ?? 0) + effect.metadata.vulnerability * stacks;
      }
    }

    return modifiers;
  }

  /**
   * Clear all effects for a player
   * @param playerId - Player ID
   */
  clearPlayerEffects(playerId: string): void {
    this.activeEffects.delete(playerId);
    logger.debug('PlayerEffectsCleared', { playerId });
  }

  /**
   * Check if an effect can stack
   * @param effect - Effect to check
   * @returns Whether effect can stack
   */
  private canStack(effect: EffectData): boolean {
    // Define which effects can stack
    const stackableEffects = ['poison', 'blessing', 'curse', 'rage'];
    return stackableEffects.includes(effect.id);
  }

  /**
   * Create common status effects
   */
  static createPoisonEffect(duration: number, damage: number): EffectData {
    return EffectDataSchema.parse({
      id: 'poison',
      name: 'Poisoned',
      type: 'debuff',
      duration,
      metadata: { damage }
    });
  }

  static createBlessedEffect(duration: number): EffectData {
    return EffectDataSchema.parse({
      id: 'blessed',
      name: 'Blessed',
      type: 'buff',
      duration,
      metadata: { healingModifier: 0.5, damageModifier: 0.2 }
    });
  }

  static createShieldedEffect(duration: number, armor: number): EffectData {
    return EffectDataSchema.parse({
      id: 'shielded',
      name: 'Shielded',
      type: 'buff',
      duration,
      metadata: { armorBonus: armor }
    });
  }

  static createVulnerableEffect(duration: number, amount: number): EffectData {
    return EffectDataSchema.parse({
      id: 'vulnerable',
      name: 'Vulnerable',
      type: 'debuff',
      duration,
      metadata: { vulnerability: amount }
    });
  }

  /**
   * Type-safe serialization
   * @returns Serializable effect manager state
   */
  toJSON(): Record<string, any> {
    const serializedEffects: Record<string, any> = {};
    
    for (const [playerId, effects] of this.activeEffects.entries()) {
      serializedEffects[playerId] = Array.from(effects.entries());
    }
    
    return { activeEffects: serializedEffects };
  }

  /**
   * Create EffectManager from serialized data
   * @param data - Serialized effect manager data
   * @returns New EffectManager instance
   */
  static fromJSON(data: any): EffectManager {
    const manager = new EffectManager();
    
    if (data.activeEffects) {
      for (const [playerId, effects] of Object.entries(data.activeEffects)) {
        const playerEffectsMap = new Map();
        
        for (const [effectId, effect] of effects as [string, any][]) {
          playerEffectsMap.set(effectId, EffectDataSchema.parse(effect));
        }
        
        manager.activeEffects.set(playerId, playerEffectsMap);
      }
    }
    
    return manager;
  }
}

export default EffectManager;