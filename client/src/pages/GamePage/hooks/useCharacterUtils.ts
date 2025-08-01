/**
 * @fileoverview Custom hook for character-related utilities
 */
import { useMemo, useCallback } from 'react';
import { Player } from '@/types/game';

interface ReadyProgress {
  total: number;
  ready: number;
  percentage: number;
}

interface CharacterUtilsState {
  // Utility functions
  toZalgo: (text: string) => string;
  getCharacterTitle: () => string;
  
  // Computed values
  healthPercent: number;
  alivePlayers: Player[];
  readyProgress: ReadyProgress;
}

/**
 * Custom hook for character utilities and display functions
 */
export const useCharacterUtils = (
  me: Player | null, 
  players: Player[]
): CharacterUtilsState => {
  /**
   * Convert text to Zalgo text (corrupted appearance)
   */
  const toZalgo = useCallback((text: string): string => {
    const zalgoAbove: string[] = [
      '\u030D', '\u030E', '\u0304', '\u0305', '\u033F', '\u0311', '\u0306', '\u0310',
      '\u0352', '\u0357', '\u0351', '\u0307', '\u0308', '\u030A', '\u0342', '\u0343',
      '\u0344', '\u034A', '\u034B', '\u034C', '\u0303', '\u0302', '\u030C', '\u0350',
      '\u0300', '\u0301', '\u030B', '\u030F', '\u0312', '\u0313', '\u0314', '\u033D',
      '\u0309', '\u0363', '\u0364', '\u0365', '\u0366', '\u0367', '\u0368', '\u0369',
      '\u036A', '\u036B', '\u036C', '\u036D', '\u036E', '\u036F', '\u033E', '\u035B',
    ];

    const zalgoBelow: string[] = [
      '\u0316', '\u0317', '\u0318', '\u0319', '\u031C', '\u031D', '\u031E', '\u031F',
      '\u0320', '\u0324', '\u0325', '\u0326', '\u0329', '\u032A', '\u032B', '\u032C',
      '\u032D', '\u032E', '\u032F', '\u0330', '\u0331', '\u0332', '\u0333', '\u0339',
      '\u033A', '\u033B', '\u033C', '\u0345', '\u0347', '\u0348', '\u0349', '\u034D',
      '\u034E', '\u0353', '\u0354', '\u0355', '\u0356', '\u0359', '\u035A', '\u0323',
    ];

    return text
      .split('')
      .map((char) => {
        let corruptedChar = char;
        
        // Add 1-3 combining characters
        const numAbove = Math.floor(Math.random() * 3) + 1;
        const numBelow = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numAbove; i++) {
          const charType = Math.floor(Math.random() * 2);
          const charArray = charType === 0 ? zalgoAbove : zalgoBelow;
          corruptedChar += charArray[Math.floor(Math.random() * charArray.length)];
        }
        
        return corruptedChar;
      })
      .join('');
  }, []);

  /**
   * Get character title with race/class information
   */
  const getCharacterTitle = useCallback((): string => {
    if (!me) return 'Unknown Character';
    
    const characterString = `${me['name']} - ${me.race || 'Unknown'} ${me.class || 'Unknown'}`;
    
    // Apply Zalgo corruption if player is a warlock
    if (me.isWarlock) {
      return toZalgo(characterString);
    }
    
    return characterString;
  }, [me, toZalgo]);

  /**
   * Calculate health percentage
   */
  const healthPercent = useMemo((): number => {
    if (!me?.['hp'] || !me?.['maxHp']) return 0;
    return (me['hp'] / me['maxHp']) * 100;
  }, [me?.['hp'], me?.['maxHp']]);

  /**
   * Get alive players count
   */
  const alivePlayers = useMemo((): Player[] => {
    return players.filter((p) => p['isAlive']);
  }, [players]);

  /**
   * Calculate ready players progress
   */
  const readyProgress = useMemo((): ReadyProgress => {
    const totalPlayers = alivePlayers.length;
    const readyPlayers = alivePlayers.filter((p) => (p as any).isReady).length;
    
    return {
      total: totalPlayers,
      ready: readyPlayers,
      percentage: totalPlayers > 0 ? (readyPlayers / totalPlayers) * 100 : 0,
    };
  }, [alivePlayers]);

  return {
    // Utility functions
    toZalgo,
    getCharacterTitle,
    
    // Computed values
    healthPercent,
    alivePlayers,
    readyProgress,
  };
};