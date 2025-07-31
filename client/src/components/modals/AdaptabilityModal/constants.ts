/**
 * Constants for the AdaptabilityModal component
 */

export const STEPS = {
  SELECT_ABILITY: 'selectAbility',
  SELECT_CLASS: 'selectClass',
  SELECT_NEW_ABILITY: 'selectNewAbility'
} as const;

export type StepType = typeof STEPS[keyof typeof STEPS];

export interface AbilityCategory {
  icon: string;
  color: string;
}

export const ABILITY_CATEGORIES: Record<string, AbilityCategory> = {
  Attack: { icon: '⚔️', color: '#e74c3c' },
  Defense: { icon: '🛡️', color: '#3498db' },
  Heal: { icon: '💚', color: '#2ecc71' },
  Special: { icon: '✨', color: '#9b59b6' }
};

export const DEFAULT_CATEGORY: AbilityCategory = { icon: '📜', color: '#7f8c8d' };