/**
 * @fileoverview Player column component that displays player information
 * Shows current player status at the top and other players below
 */
import React from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { PlayerCard } from '../../../components/common/PlayerCard';
import { Player } from '@/types/game';
import './PlayerColumn.css';

interface PlayerColumnProps {
  isVisible: boolean;
  me: Player;
  players: Player[];
  alivePlayers: Player[];
  selectedTarget?: string | null;
  onTargetSelect: (targetId: string) => void;
  isMobile: boolean;
}

/**
 * PlayerColumn component handles displaying player information
 */
const PlayerColumn: React.FC<PlayerColumnProps> = ({ 
  isVisible, 
  me, 
  players, 
  alivePlayers,
  selectedTarget,
  onTargetSelect,
  isMobile
}) => {
  const theme = useTheme();
  
  // Don't render if not visible (mobile view handling)
  if (!isVisible) return null;
  
  // Filter players based on current player's warlock status
  const otherPlayers = players.filter(p => p['id'] !== me['id']);
  
  let warlockPlayers: Player[] = [];
  let regularPlayers: Player[] = [];
  
  if (me?.isWarlock) {
    // If current player is a warlock, separate other warlocks from regular players
    warlockPlayers = otherPlayers.filter(p => p.isWarlock);
    regularPlayers = otherPlayers.filter(p => !p.isWarlock);
  } else {
    // If current player is not a warlock, all others are just "Other Players"
    regularPlayers = otherPlayers;
  }

  const handlePlayerSelect = (player: Player): void => {
    onTargetSelect(player['id']);
  };

  return (
    <div className={`player-column ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* Show Other Warlocks section if current player is a warlock */}
      {me?.isWarlock && warlockPlayers.length > 0 && (
        <>
          <h3 className="section-title">Other Warlocks</h3>
          <div className="players-list">
            {warlockPlayers.map(player => (
              <PlayerCard 
                key={player['id']} 
                player={player} 
                isCurrentPlayer={false}
                size="medium"
                showStatusEffects={true}
                isSelected={selectedTarget === player['id']}
                onClick={() => handlePlayerSelect(player)}
              />
            ))}
          </div>
        </>
      )}
      
      {/* Other Players section */}
      {regularPlayers.length > 0 && (
        <>
          <h3 className="section-title">Other Players</h3>
          <div className="players-list">
            {regularPlayers.map(player => (
              <PlayerCard 
                key={player['id']} 
                player={player} 
                isCurrentPlayer={false}
                size="medium"
                showStatusEffects={true}
                isSelected={selectedTarget === player['id']}
                onClick={() => handlePlayerSelect(player)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PlayerColumn;