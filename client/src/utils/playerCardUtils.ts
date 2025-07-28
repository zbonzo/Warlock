/**
 * @fileoverview Utility functions for player card sizing and configuration
 * Centralizes player card sizing logic to avoid duplication across components
 */

type CardSize = 'small' | 'medium' | 'large';
type CardContext = 'lobby' | 'game' | 'target';

interface CardSizeConfig {
  desktop: CardSize;
  mobile: CardSize;
}

interface SizeMap {
  [key: string]: CardSizeConfig;
}

/**
 * Get the appropriate player card size based on context and screen size
 */
export const getPlayerCardSize = (isMobile: boolean, context: CardContext = 'lobby'): CardSize => {
  const sizeMap: SizeMap = {
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

  const contextConfig = sizeMap[context] || sizeMap['lobby'];
  return isMobile ? contextConfig?.mobile || 'medium' : contextConfig?.desktop || 'medium';
};

/**
 * Get grid gap size for player card grids based on screen size
 */
export const getPlayerGridGap = (isMobile: boolean, isVerySmall: boolean = false): string => {
  if (isVerySmall) return '12px';
  if (isMobile) return '16px';
  return '20px';
};
