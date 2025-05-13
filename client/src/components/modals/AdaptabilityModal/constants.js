/**
 * Constants for the AdaptabilityModal component
 */

/**
 * Modal step identifiers
 * @type {Object}
 */
export const STEPS = {
    SELECT_ABILITY: 'selectAbility',
    SELECT_CLASS: 'selectClass',
    SELECT_NEW_ABILITY: 'selectNewAbility'
  };
  
  /**
   * Categories for abilities with associated icons
   * @type {Object}
   */
  export const ABILITY_CATEGORIES = {
    Attack: { icon: '⚔️', color: '#e74c3c' },
    Defense: { icon: '🛡️', color: '#3498db' },
    Heal: { icon: '💚', color: '#2ecc71' },
    Special: { icon: '✨', color: '#9b59b6' }
  };
  
  /**
   * Default ability category for fallback
   * @type {Object}
   */
  export const DEFAULT_CATEGORY = { icon: '📜', color: '#7f8c8d' };