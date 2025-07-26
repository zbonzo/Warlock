/**
 * @fileoverview Utility functions for player card sizing and configuration
 * Centralizes player card sizing logic to avoid duplication across components
 */

/**
 * Get the appropriate player card size based on context and screen size
 * @param {boolean} isMobile - Whether the current screen is mobile
 * @param {string} context - The context where the card is being used ('lobby', 'game', 'target')
 * @returns {string} The size variant to use ('small', 'medium', 'large')
 */
export const getPlayerCardSize = (isMobile, context = 'lobby') => {
  const sizeMap = {
    lobby: {
      desktop: 'large',
      mobile: 'large'  // Use same large size for both mobile and desktop in lobby
    },
    game: {
      desktop: 'medium', 
      mobile: 'small'
    },
    target: {
      desktop: 'small',
      mobile: 'small'
    }
  };

  const contextConfig = sizeMap[context] || sizeMap.lobby;
  return isMobile ? contextConfig.mobile : contextConfig.desktop;
};

/**
 * Get grid gap size for player card grids based on screen size
 * @param {boolean} isMobile - Whether the current screen is mobile
 * @param {boolean} isVerySmall - Whether the screen is very small (max-width: 480px)
 * @returns {string} CSS gap value
 */
export const getPlayerGridGap = (isMobile, isVerySmall = false) => {
  if (isVerySmall) return '12px';
  if (isMobile) return '16px';
  return '20px';
};