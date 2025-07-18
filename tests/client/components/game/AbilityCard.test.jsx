/**
 * @fileoverview Tests for AbilityCard component
 * Tests ability display, damage calculations, availability, and interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AbilityCard from '@client/components/game/AbilityCard';

// Mock the ThemeContext
const mockThemeContext = {
  currentTheme: 'light',
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
    accent: '#6f42c1'
  }
};

jest.mock('@client/contexts/ThemeContext', () => ({
  useTheme: () => mockThemeContext,
}));

// Mock path imports
jest.mock('@contexts/ThemeContext', () => ({
  useTheme: () => mockThemeContext,
}));

describe('AbilityCard', () => {
  const mockAbility = {
    type: 'slash',
    name: 'Slash',
    category: 'Attack',
    effect: 'damage',
    target: 'Single',
    description: 'A basic sword attack',
    params: {
      damage: 20
    },
    cooldown: 0,
    flavorText: 'A swift blade cuts through the air'
  };

  const mockPlayer = {
    name: 'TestPlayer',
    damageMod: 1.2,
    healingMod: 0.8
  };

  const defaultProps = {
    ability: mockAbility,
    selected: false,
    onSelect: jest.fn(),
    isRacial: false,
    player: mockPlayer
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render ability card with basic information', () => {
    render(<AbilityCard {...defaultProps} />);

    expect(screen.getByText('Slash')).toBeInTheDocument();
    expect(screen.getByText('A swift blade cuts through the air')).toBeInTheDocument();
    expect(screen.getByText('Deals 24 damage')).toBeInTheDocument(); // 20 * 1.2
  });

  it('should display ability icon', () => {
    render(<AbilityCard {...defaultProps} />);

    expect(screen.getByText('⚔️')).toBeInTheDocument();
  });

  it('should call onSelect when clicked and available', () => {
    render(<AbilityCard {...defaultProps} />);

    const card = document.querySelector('.ability-card');
    fireEvent.click(card);

    expect(defaultProps.onSelect).toHaveBeenCalledWith('slash');
  });

  it('should apply selected class when selected', () => {
    render(<AbilityCard {...defaultProps} selected={true} />);

    const card = document.querySelector('.ability-card');
    expect(card).toHaveClass('selected');
  });

  it('should not call onSelect when unavailable', () => {
    render(<AbilityCard {...defaultProps} abilityCooldown={2} />);

    const card = document.querySelector('.ability-card');
    fireEvent.click(card);

    expect(defaultProps.onSelect).not.toHaveBeenCalled();
  });

  describe('Class Abilities', () => {
    it('should display cooldown when ability is on cooldown', () => {
      render(<AbilityCard {...defaultProps} abilityCooldown={3} />);

      expect(screen.getByText('Cooldown: 3 turns')).toBeInTheDocument();
      expect(screen.getByText('⏳')).toBeInTheDocument();
      
      const card = document.querySelector('.ability-card');
      expect(card).toHaveClass('unavailable');
    });

    it('should display base cooldown info when available', () => {
      const cooldownAbility = { ...mockAbility, cooldown: 2 };
      render(<AbilityCard {...defaultProps} ability={cooldownAbility} />);

      expect(screen.getByText('Cooldown: 2 turns')).toBeInTheDocument();
    });

    it('should handle single turn cooldown', () => {
      render(<AbilityCard {...defaultProps} abilityCooldown={1} />);

      expect(screen.getByText('Cooldown: 1 turn')).toBeInTheDocument();
    });

    it('should not display cooldown info for abilities with no cooldown', () => {
      render(<AbilityCard {...defaultProps} />);

      expect(screen.queryByText(/Cooldown:/)).not.toBeInTheDocument();
    });
  });

  describe('Racial Abilities', () => {
    const racialAbility = {
      type: 'adaptability',
      name: 'Adaptability',
      category: 'Racial',
      description: 'Adapt to any situation',
      usageLimit: 'perGame',
      flavorText: 'Versatility is key'
    };

    it('should render racial ability with racial styling', () => {
      render(
        <AbilityCard 
          {...defaultProps} 
          ability={racialAbility}
          isRacial={true}
          raceName="Artisan"
          usesLeft={1}
          cooldown={0}
        />
      );

      expect(screen.getByText('Adaptability')).toBeInTheDocument();
      expect(screen.getByText('(Artisan Ability)')).toBeInTheDocument();
      expect(screen.getByText('Once per game')).toBeInTheDocument();
      
      const card = document.querySelector('.ability-card');
      expect(card).toHaveClass('racial-ability');
    });

    it('should display racial ability icon', () => {
      render(
        <AbilityCard 
          {...defaultProps} 
          ability={racialAbility}
          isRacial={true}
          raceName="Artisan"
          usesLeft={1}
          cooldown={0}
        />
      );

      expect(screen.getByText('🔄')).toBeInTheDocument();
    });

    it('should be unavailable when no uses left', () => {
      render(
        <AbilityCard 
          {...defaultProps} 
          ability={racialAbility}
          isRacial={true}
          raceName="Artisan"
          usesLeft={0}
          cooldown={0}
        />
      );

      expect(screen.getByText('No uses remaining')).toBeInTheDocument();
      
      const card = document.querySelector('.ability-card');
      expect(card).toHaveClass('unavailable');
    });

    it('should be unavailable when on cooldown', () => {
      render(
        <AbilityCard 
          {...defaultProps} 
          ability={racialAbility}
          isRacial={true}
          raceName="Artisan"
          usesLeft={1}
          cooldown={2}
        />
      );

      expect(screen.getByText('2 turns remaining')).toBeInTheDocument();
      
      const card = document.querySelector('.ability-card');
      expect(card).toHaveClass('unavailable');
    });

    it('should display per-round usage limit', () => {
      const perRoundAbility = { ...racialAbility, usageLimit: 'perRound' };
      render(
        <AbilityCard 
          {...defaultProps} 
          ability={perRoundAbility}
          isRacial={true}
          raceName="Artisan"
          usesLeft={1}
          cooldown={0}
        />
      );

      expect(screen.getByText('Once per round')).toBeInTheDocument();
    });

    it('should return null when racial ability has no uses left', () => {
      const { container } = render(
        <AbilityCard 
          {...defaultProps} 
          ability={racialAbility}
          isRacial={true}
          raceName="Artisan"
          usesLeft={0}
          cooldown={0}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should display ready status when available', () => {
      render(
        <AbilityCard 
          {...defaultProps} 
          ability={racialAbility}
          isRacial={true}
          raceName="Artisan"
          usesLeft={1}
          cooldown={0}
        />
      );

      expect(screen.getByText('Ready to use')).toBeInTheDocument();
    });
  });

  describe('Damage Calculations', () => {
    it('should display modified damage when player has damage modifier', () => {
      const damageAbility = { ...mockAbility, params: { damage: 25 } };
      render(<AbilityCard {...defaultProps} ability={damageAbility} />);

      expect(screen.getByText('Deals 30 damage')).toBeInTheDocument(); // 25 * 1.2
    });

    it('should display base damage when no player modifier', () => {
      const damageAbility = { ...mockAbility, params: { damage: 25 } };
      render(<AbilityCard {...defaultProps} ability={damageAbility} player={null} />);

      expect(screen.getByText('Deals 25 damage')).toBeInTheDocument();
    });

    it('should display base damage when modifier is 1.0', () => {
      const damageAbility = { ...mockAbility, params: { damage: 25 } };
      const neutralPlayer = { ...mockPlayer, damageMod: 1.0 };
      render(<AbilityCard {...defaultProps} ability={damageAbility} player={neutralPlayer} />);

      expect(screen.getByText('Deals 25 damage')).toBeInTheDocument();
    });
  });

  describe('Healing Calculations', () => {
    it('should display modified healing when player has damage modifier', () => {
      const healAbility = {
        ...mockAbility,
        category: 'Heal',
        params: { amount: 20 }
      };
      render(<AbilityCard {...defaultProps} ability={healAbility} />);

      // healingMod = 2.0 - 1.2 = 0.8, so 20 * 0.8 = 16
      expect(screen.getByText('Restores 16 HP')).toBeInTheDocument();
    });

    it('should display base healing when no player modifier', () => {
      const healAbility = {
        ...mockAbility,
        category: 'Heal',
        params: { amount: 20 }
      };
      render(<AbilityCard {...defaultProps} ability={healAbility} player={null} />);

      expect(screen.getByText('Restores 20 HP')).toBeInTheDocument();
    });
  });

  describe('Special Abilities', () => {
    it('should display reckless strike description', () => {
      const recklessAbility = {
        ...mockAbility,
        type: 'recklessStrike',
        params: { damage: 30, selfDamage: 5 }
      };
      render(<AbilityCard {...defaultProps} ability={recklessAbility} />);

      expect(screen.getByText('Deals 36 damage but you take 5 recoil damage')).toBeInTheDocument();
    });

    it('should display arcane barrage description', () => {
      const barrageAbility = {
        ...mockAbility,
        type: 'arcaneBarrage',
        params: { damagePerHit: 10, hits: 3, hitChance: 0.8 }
      };
      render(<AbilityCard {...defaultProps} ability={barrageAbility} />);

      expect(screen.getByText('Fires 3 bolts dealing 12 damage each (80% hit chance per bolt)')).toBeInTheDocument();
    });

    it('should display eye of fate description with self damage', () => {
      const eyeAbility = {
        ...mockAbility,
        type: 'eyeOfFate',
        params: { selfDamageOnFailure: 15 }
      };
      render(<AbilityCard {...defaultProps} ability={eyeAbility} />);

      expect(screen.getByText('Detect if target is a Warlock. Take 15 damage if they are not')).toBeInTheDocument();
    });

    it('should display eye of fate description with instant death', () => {
      const eyeAbility = {
        ...mockAbility,
        type: 'eyeOfFate',
        params: { selfDamageOnFailure: 0 }
      };
      render(<AbilityCard {...defaultProps} ability={eyeAbility} />);

      expect(screen.getByText('Detect if target is a Warlock. Die instantly if they are not')).toBeInTheDocument();
    });
  });

  describe('Multi-hit Abilities', () => {
    it('should display multi-hit attack description', () => {
      const multiHitAbility = {
        ...mockAbility,
        params: { hits: 2, damagePerHit: 15 }
      };
      render(<AbilityCard {...defaultProps} ability={multiHitAbility} />);

      expect(screen.getByText('2 hits of 18 damage each')).toBeInTheDocument(); // 15 * 1.2
    });

    it('should display hit chance for multi-hit abilities', () => {
      const multiHitAbility = {
        ...mockAbility,
        params: { hits: 2, damagePerHit: 15, hitChance: 0.7 }
      };
      render(<AbilityCard {...defaultProps} ability={multiHitAbility} />);

      expect(screen.getByText('2 hits of 18 damage each (70% hit chance)')).toBeInTheDocument();
    });
  });

  describe('Status Effects', () => {
    it('should display poison effect description', () => {
      const poisonAbility = {
        ...mockAbility,
        effect: 'poison',
        params: { 
          damage: 20, 
          poison: { damage: 5, turns: 3 } 
        }
      };
      render(<AbilityCard {...defaultProps} ability={poisonAbility} />);

      expect(screen.getByText('Deals 24 damage and poisons for 6 damage over 3 turns')).toBeInTheDocument();
    });

    it('should display vulnerable effect description', () => {
      const vulnerableAbility = {
        ...mockAbility,
        effect: 'vulnerable',
        params: { 
          damage: 20, 
          vulnerable: { damageIncrease: 25, turns: 2 } 
        }
      };
      render(<AbilityCard {...defaultProps} ability={vulnerableAbility} />);

      expect(screen.getByText('Deals 24 damage and makes target vulnerable (+25% damage for 2 turns)')).toBeInTheDocument();
    });
  });

  describe('Fallback Descriptions', () => {
    it('should display fallback description for unknown ability types', () => {
      const unknownAbility = {
        ...mockAbility,
        type: 'unknownAbility',
        category: 'Special',
        params: { damage: 15 }
      };
      render(<AbilityCard {...defaultProps} ability={unknownAbility} />);

      expect(screen.getByText('Deals 18 damage')).toBeInTheDocument();
    });

    it('should display no description available when no params', () => {
      const noParamsAbility = {
        ...mockAbility,
        type: 'unknownAbility',
        category: 'Special',
        params: {}
      };
      render(<AbilityCard {...defaultProps} ability={noParamsAbility} />);

      expect(screen.getByText('Special ability with unique effects')).toBeInTheDocument();
    });

    it('should display no flavor text available when missing', () => {
      const noFlavorAbility = { ...mockAbility, flavorText: undefined };
      render(<AbilityCard {...defaultProps} ability={noFlavorAbility} />);

      expect(screen.getByText('No flavor text available')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle abilities with zero damage', () => {
      const zeroDamageAbility = {
        ...mockAbility,
        params: { damage: 0 }
      };
      render(<AbilityCard {...defaultProps} ability={zeroDamageAbility} />);

      expect(screen.getByText('Deals 0 damage')).toBeInTheDocument();
    });

    it('should handle abilities with no params', () => {
      const noParamsAbility = {
        ...mockAbility,
        params: undefined
      };
      render(<AbilityCard {...defaultProps} ability={noParamsAbility} />);

      expect(screen.getByText('Deals 0 damage')).toBeInTheDocument();
    });

    it('should handle racial abilities without race name', () => {
      const racialAbility = {
        type: 'adaptability',
        name: 'Adaptability',
        category: 'Racial',
        description: 'Adapt to any situation',
        usageLimit: 'perGame'
      };

      render(
        <AbilityCard 
          {...defaultProps} 
          ability={racialAbility}
          isRacial={true}
          raceName={null}
          usesLeft={1}
          cooldown={0}
        />
      );

      expect(screen.getByText('Adaptability')).toBeInTheDocument();
      expect(screen.queryByText('(null Ability)')).not.toBeInTheDocument();
    });

    it('should handle very high damage values', () => {
      const highDamageAbility = {
        ...mockAbility,
        params: { damage: 999999 }
      };
      render(<AbilityCard {...defaultProps} ability={highDamageAbility} />);

      expect(screen.getByText('Deals 1199998 damage')).toBeInTheDocument(); // 999999 * 1.2
    });
  });
});