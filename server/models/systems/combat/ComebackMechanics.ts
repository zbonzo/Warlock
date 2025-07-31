/**
 * @fileoverview Comeback mechanics for balancing gameplay
 * Provides bonuses to the good team when they're struggling
 */

import config from '@config';
import logger from '@utils/logger';
import messages from '@messages';

interface Player {
  id: string;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  isWarlock: boolean;
}

interface Monster {
  hp: number;
  maxHp: number;
}

interface ComebackStatus {
  active: boolean;
  threshold: number;
  bonus: number;
  averageGoodHp: number;
  goodPlayersCount: number;
}

interface ComebackConfig {
  threshold?: number;
  bonus?: number;
}

/**
 * ComebackMechanics manages comeback bonuses and balance mechanics
 */
class ComebackMechanics {
  private players: Map<string, Player>;
  private comebackActive: boolean = false;
  private comebackThreshold: number;
  private comebackBonus: number;

  constructor(players: Map<string, Player>) {
    this.players = players;
    this.comebackThreshold = config.gameBalance.comeback.threshold || 0.3;
    this.comebackBonus = config.gameBalance.comeback.bonus || 0.2;
  }

  /**
   * Update comeback status based on current game state
   */
  updateComebackStatus(monster: Monster): boolean {
    const goodPlayers = Array.from(this.players.values()).filter(p => 
      p.isAlive && !p.isWarlock
    );
    
    const totalGoodPlayers = goodPlayers.length;
    const avgGoodHp = totalGoodPlayers > 0 
      ? goodPlayers.reduce((sum, p) => sum + (p.hp / p.maxHp), 0) / totalGoodPlayers
      : 0;

    const monsterHpRatio = monster.hp / monster.maxHp;
    
    // Comeback is active if good team is struggling
    // (Low average HP and monster still has significant health)
    const shouldActivate = avgGoodHp < this.comebackThreshold && 
                          monsterHpRatio > 0.5 && 
                          totalGoodPlayers > 0;

    const wasActive = this.comebackActive;
    this.comebackActive = shouldActivate;

    if (this.comebackActive && !wasActive) {
      logger.info('Comeback mechanics activated');
      return true;
    } else if (!this.comebackActive && wasActive) {
      logger.info('Comeback mechanics deactivated');
      return true;
    }

    return false;
  }

  /**
   * Check if comeback mechanics are active
   */
  isActive(): boolean {
    return this.comebackActive;
  }

  /**
   * Get comeback bonus for damage calculations
   */
  getComebackBonus(player: Player | null): number {
    if (!this.comebackActive || !player || player.isWarlock) {
      return 0;
    }

    return this.comebackBonus;
  }

  /**
   * Apply comeback healing bonus
   */
  applyComebackHealing(player: Player | null, baseAmount: number): number {
    if (!this.comebackActive || !player || player.isWarlock) {
      return baseAmount;
    }

    const bonus = Math.floor(baseAmount * this.comebackBonus);
    return baseAmount + bonus;
  }

  /**
   * Apply comeback damage bonus
   */
  applyComebackDamage(player: Player | null, baseDamage: number): number {
    if (!this.comebackActive || !player || player.isWarlock) {
      return baseDamage;
    }

    const bonus = Math.floor(baseDamage * this.comebackBonus);
    return baseDamage + bonus;
  }

  /**
   * Get comeback status for display
   */
  getStatus(): ComebackStatus {
    const goodPlayers = Array.from(this.players.values()).filter(p => 
      p.isAlive && !p.isWarlock
    );
    
    const totalGoodPlayers = goodPlayers.length;
    const avgGoodHp = totalGoodPlayers > 0 
      ? goodPlayers.reduce((sum, p) => sum + (p.hp / p.maxHp), 0) / totalGoodPlayers
      : 0;

    return {
      active: this.comebackActive,
      threshold: this.comebackThreshold,
      bonus: this.comebackBonus,
      averageGoodHp: avgGoodHp,
      goodPlayersCount: totalGoodPlayers
    };
  }

  /**
   * Force activate comeback mechanics (for testing)
   */
  forceActivate(active: boolean): void {
    this.comebackActive = active;
    logger.debug(`Comeback mechanics force ${active ? 'activated' : 'deactivated'}`);
  }

  /**
   * Update comeback configuration
   */
  updateConfig(newConfig: ComebackConfig): void {
    if (newConfig.threshold !== undefined) {
      this.comebackThreshold = newConfig.threshold;
    }
    if (newConfig.bonus !== undefined) {
      this.comebackBonus = newConfig.bonus;
    }
  }

  /**
   * Reset comeback state
   */
  reset(): void {
    this.comebackActive = false;
    logger.debug('Comeback mechanics reset');
  }
}

export default ComebackMechanics;