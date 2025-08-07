/**
 * @fileoverview Trophy system definitions for end-of-game awards
 * Defines all possible trophies that can be awarded to players
 */

// Trophy related interfaces
interface PlayerStats {
  totalDamageDealt: number;
  totalHealingDone: number;
  damageTaken: number;
  highestSingleHit: number;
  timesDied: number;
  selfHeals: number;
  abilitiesUsed: number;
}

interface Player {
  stats: PlayerStats;
  isWarlock: boolean;
  isAlive: boolean;
  isRevealed?: boolean;
}

interface GameResult {
  winner: 'Good' | 'Evil';
}

interface Trophy {
  name: string;
  description: string;
  getWinner: (players: Player[], gameResult?: GameResult) => Player | null;
}

/**
 * Trophy definitions for the random end-of-game trophy system
 * Each trophy has a name, description, and getWinner function that determines eligibility
 */
const trophies = [
  {
    name: "The Participant",
    description: "Participated in the game.",
    getWinner: (players: Player[]): Player | null => {
      // Always award to a random player as a fallback
      if (players.length === 0) return null;
      return players[Math.floor(Math.random() * players.length)] || null;
    }
  },
  {
    name: "The Gladiator",
    description: "Dealt the most damage to the monster.",
    getWinner: (players: Player[]): Player | null => {
      const alivePlayers = players.filter(p => p.stats);
      if (alivePlayers.length === 0) return null;
      
      return alivePlayers.reduce((highest: Player | null, player: Player) => {
        if (!highest) return player;
        return player.stats.totalDamageDealt > highest.stats.totalDamageDealt 
          ? player : highest;
      }, null);
    }
  },
  {
    name: "The Savior",
    description: "Healed the most HP for their teammates.",
    getWinner: (players: Player[]): Player | null => {
      const alivePlayers = players.filter(p => p.stats && p.stats.totalHealingDone > 0);
      if (alivePlayers.length === 0) return null;
      
      return alivePlayers.reduce((highest: Player | null, player: Player) => {
        if (!highest) return player;
        return player.stats.totalHealingDone > highest.stats.totalHealingDone 
          ? player : highest;
      }, null);
    }
  },
  {
    name: "The Punching Bag",
    description: "Took the most damage from the monster.",
    getWinner: (players: Player[]): Player | null => {
      const alivePlayers = players.filter(p => p.stats && p.stats.damageTaken > 0);
      if (alivePlayers.length === 0) return null;
      
      return alivePlayers.reduce((highest: Player | null, player: Player) => {
        if (!highest) return player;
        return player.stats.damageTaken > highest.stats.damageTaken 
          ? player : highest;
      }, null);
    }
  },
  {
    name: "The Pacifist",
    description: "Dealt zero damage the entire game.",
    getWinner: (players: Player[]): Player | null => {
      const pacifists = players.filter(p => p.stats && p.stats.totalDamageDealt === 0);
      if (pacifists.length === 0) return null;
      
      // Return a random pacifist if multiple exist
      return pacifists[Math.floor(Math.random() * pacifists.length)] || null;
    }
  },
  {
    name: "The Berserker",
    description: "Landed the highest single hit of the game.",
    getWinner: (players: Player[]): Player | null => {
      const alivePlayers = players.filter(p => p.stats && p.stats.highestSingleHit > 0);
      if (alivePlayers.length === 0) return null;
      
      return alivePlayers.reduce((highest: Player | null, player: Player) => {
        if (!highest) return player;
        return player.stats.highestSingleHit > highest.stats.highestSingleHit 
          ? player : highest;
      }, null);
    }
  },
  {
    name: "The Phoenix",
    description: "Died but came back to win the game.",
    getWinner: (players: Player[], gameResult?: GameResult): Player | null => {
      if (!gameResult || !gameResult.winner) return null;
      
      const winners = players.filter(p => {
        const isWinner = (gameResult.winner === 'Good' && !p.isWarlock) || 
                         (gameResult.winner === 'Evil' && p.isWarlock);
        return isWinner && p.stats && p.stats.timesDied > 0;
      });
      
      if (winners.length === 0) return null;
      return winners[Math.floor(Math.random() * winners.length)] || null;
    }
  },
  {
    name: "The Healer",
    description: "Healed themselves more than anyone else.",
    getWinner: (players: Player[]): Player | null => {
      const healers = players.filter(p => p.stats && p.stats.selfHeals > 0);
      if (healers.length === 0) return null;
      
      return healers.reduce((highest: Player | null, player: Player) => {
        if (!highest) return player;
        return player.stats.selfHeals > highest.stats.selfHeals 
          ? player : highest;
      }, null);
    }
  },
  {
    name: "The Overachiever",
    description: "Used the most abilities during the game.",
    getWinner: (players: Player[]): Player | null => {
      const activePlayers = players.filter(p => p.stats && p.stats.abilitiesUsed > 0);
      if (activePlayers.length === 0) return null;
      
      return activePlayers.reduce((highest: Player | null, player: Player) => {
        if (!highest) return player;
        return player.stats.abilitiesUsed > highest.stats.abilitiesUsed 
          ? player : highest;
      }, null);
    }
  },
  {
    name: "Master of Deception",
    description: "Survived the entire game as a Warlock without being revealed.",
    getWinner: (players: Player[], gameResult?: GameResult): Player | null => {
      if (!gameResult || gameResult.winner !== 'Evil') return null;
      
      const unrevealedWarlocks = players.filter(p => 
        p.isWarlock && 
        p.isAlive && 
        !p.isRevealed // Assuming there's an isRevealed property
      );
      
      if (unrevealedWarlocks.length === 0) return null;
      return unrevealedWarlocks[Math.floor(Math.random() * unrevealedWarlocks.length)] || null;
    }
  },
  {
    name: "The Last Stand",
    description: "Was the last player alive on their team.",
    getWinner: (players: Player[], gameResult?: GameResult): Player | null => {
      if (!gameResult) return null;
      
      const alivePlayers = players.filter(p => p.isAlive);
      if (alivePlayers.length !== 1) return null;
      
      return alivePlayers[0] || null;
    }
  }
] as Trophy[];

export default trophies;
export { trophies };
export type { Trophy, Player, PlayerStats, GameResult };