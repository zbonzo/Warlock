/**
 * @fileoverview Tests for RacialAbilityCard.tsx
 * Tests the specialized racial ability card component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RacialAbilityCard from '../../../../client/src/components/game/RacialAbilityCard/RacialAbilityCard';

// Mock CSS
jest.mock('../../../../client/src/components/game/RacialAbilityCard/RacialAbilityCard.css', () => ({}));

// Mock ThemeContext
const mockUseTheme = jest.fn();
jest.mock('@contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme()
}));

// Mock the racialAbilityData
jest.mock('../../../../client/src/components/game/RacialAbilityCard/racialAbilityData', () => ({
  RACE_TO_ABILITY: {
    'Artisan': 'adaptability',
    'Rockhewn': 'stoneResolve',
    'Crestfallen': 'keenSenses',
    'Orc': 'bloodRage',
    'Kinfolk': 'forestsGrace',
    'Lich': 'undying'
  },
  ABILITY_ICONS: {
    'adaptability': '🔄',
    'stoneResolve': '🛡️',
    'keenSenses': '👁️',
    'bloodRage': '💢',
    'forestsGrace': '🌿',
    'undying': '💀'
  }
}));

interface Ability {
  id: string;
  name: string;
  type: string;
  description: string;
  usageLimit: 'perGame' | 'perRound';
  maxUses?: number;
}

describe('RacialAbilityCard', () => {
  const mockAbility: Ability = {
    id: 'adaptability',
    name: 'Adaptability',
    type: 'adaptability',
    description: 'Allows you to change your character during the game.',
    usageLimit: 'perGame',
    maxUses: 1
  };

  const mockTheme = {
    colors: {
      primary: '#4a2c82'
    }
  };

  const defaultProps = {
    ability: mockAbility,
    usesLeft: 1,
    cooldown: 0,
    disabled: false,
    onUse: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
  });

  describe('Basic Rendering', () => {
    it('should render ability name and description', () => {
      render(<RacialAbilityCard {...defaultProps} />);
      
      expect(screen.getByText('Adaptability')).toBeInTheDocument();
      expect(screen.getByText('Allows you to change your character during the game.')).toBeInTheDocument();
    });

    it('should not render when no ability is provided', () => {
      const { container } = render(<RacialAbilityCard {...defaultProps} ability={null} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should render usage limit information', () => {
      render(<RacialAbilityCard {...defaultProps} />);
      
      expect(screen.getByText('Limit:')).toBeInTheDocument();
      expect(screen.getByText('Once per game')).toBeInTheDocument();
    });

    it('should show "Once per round" for per-round abilities', () => {
      const perRoundAbility = { ...mockAbility, usageLimit: 'perRound' as const };
      render(<RacialAbilityCard {...defaultProps} ability={perRoundAbility} />);
      
      expect(screen.getByText('Once per round')).toBeInTheDocument();
    });
  });

  describe('Ability Availability', () => {
    it('should show as available when usesLeft > 0, cooldown = 0, and not disabled', () => {
      const { container } = render(<RacialAbilityCard {...defaultProps} />);
      
      expect(container.querySelector('.available')).toBeInTheDocument();
      expect(screen.getByText('Ready to use')).toBeInTheDocument();
    });

    it('should show as unavailable when no uses left', () => {
      const { container } = render(<RacialAbilityCard {...defaultProps} usesLeft={0} />);
      
      expect(container.querySelector('.unavailable')).toBeInTheDocument();
      expect(screen.getByText('No uses remaining')).toBeInTheDocument();
    });

    it('should show cooldown information', () => {
      render(<RacialAbilityCard {...defaultProps} cooldown={2} />);
      
      expect(screen.getByText('Available in 2 turns')).toBeInTheDocument();
    });

    it('should handle single turn cooldown correctly', () => {
      render(<RacialAbilityCard {...defaultProps} cooldown={1} />);
      
      expect(screen.getByText('Available in 1 turn')).toBeInTheDocument();
    });

    it('should show disabled status', () => {
      render(<RacialAbilityCard {...defaultProps} disabled={true} />);
      
      expect(screen.getByText('Cannot use now')).toBeInTheDocument();
    });
  });

  describe('Usage Indicators', () => {
    it('should show usage dots for per-game abilities', () => {
      const { container } = render(<RacialAbilityCard {...defaultProps} />);
      
      expect(container.querySelector('.usage-indicators')).toBeInTheDocument();
      expect(container.querySelector('.usage-dots')).toBeInTheDocument();
    });

    it('should not show usage dots for per-round abilities', () => {
      const perRoundAbility = { ...mockAbility, usageLimit: 'perRound' as const };
      const { container } = render(<RacialAbilityCard {...defaultProps} ability={perRoundAbility} />);
      
      expect(container.querySelector('.usage-indicators')).not.toBeInTheDocument();
    });

    it('should show correct number of usage dots', () => {
      const multiUseAbility = { ...mockAbility, maxUses: 3 };
      const { container } = render(<RacialAbilityCard {...defaultProps} ability={multiUseAbility} usesLeft={2} />);
      
      const dots = container.querySelectorAll('.usage-dot');
      expect(dots).toHaveLength(3);
      
      // First 2 should be active, last should be inactive
      expect(dots[0]).toHaveClass('active');
      expect(dots[1]).toHaveClass('active');
      expect(dots[2]).toHaveClass('inactive');
    });

    it('should handle abilities without maxUses defined', () => {
      const { container } = render(<RacialAbilityCard {...defaultProps} />);
      
      const dots = container.querySelectorAll('.usage-dot');
      expect(dots).toHaveLength(1); // Default to 1 use
    });
  });

  describe('Race-Based Styling', () => {
    const raceTests = [
      { type: 'adaptability', expectedColor: '#4169E1' }, // Artisan
      { type: 'stoneResolve', expectedColor: '#8B4513' }, // Rockhewn
      { type: 'keenSenses', expectedColor: '#228B22' }, // Crestfallen
      { type: 'bloodRage', expectedColor: '#8B0000' }, // Orc
      { type: 'forestsGrace', expectedColor: '#9932CC' }, // Kinfolk
      { type: 'undying', expectedColor: '#36454F' } // Lich
    ];

    raceTests.forEach(({ type, expectedColor }) => {
      it(`should apply correct color for ${type} ability`, () => {
        const ability = { ...mockAbility, type };
        const { container } = render(<RacialAbilityCard {...defaultProps} ability={ability} />);
        
        const title = container.querySelector('.ability-title');
        expect(title).toHaveStyle({ backgroundColor: expectedColor });
      });
    });

    it('should use theme color for unknown race', () => {
      const unknownAbility = { ...mockAbility, type: 'unknown' };
      const { container } = render(<RacialAbilityCard {...defaultProps} ability={unknownAbility} />);
      
      const title = container.querySelector('.ability-title');
      expect(title).toHaveStyle({ backgroundColor: mockTheme.colors.primary });
    });
  });

  describe('Ability Icons', () => {
    it('should show PNG image for known racial abilities', () => {
      const adaptabilityAbility = { ...mockAbility, type: 'adaptability' };
      const { container } = render(<RacialAbilityCard {...defaultProps} ability={adaptabilityAbility} />);
      
      const img = container.querySelector('img[src="/images/abilities/adaptability.png"]');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', 'Adaptability');
    });

    it('should show emoji fallback for abilities without PNG', () => {
      const customAbility = { ...mockAbility, type: 'customType' };
      render(<RacialAbilityCard {...defaultProps} ability={customAbility} />);
      
      expect(screen.getByText('✨')).toBeInTheDocument(); // Default fallback
    });

    it('should show specific emoji for known ability types', () => {
      const bloodRageAbility = { ...mockAbility, type: 'bloodRage' };
      render(<RacialAbilityCard {...defaultProps} ability={bloodRageAbility} />);
      
      // Should try PNG first, but if not found, fallback to emoji
      const { container } = render(<RacialAbilityCard {...defaultProps} ability={bloodRageAbility} />);
      
      // Either should have PNG image or emoji
      const hasImage = container.querySelector('img[src="/images/abilities/bloodrage.png"]');
      const hasEmoji = screen.queryByText('💢');
      
      expect(hasImage || hasEmoji).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onUse when clicked and available', () => {
      const onUse = jest.fn();
      const { container } = render(<RacialAbilityCard {...defaultProps} onUse={onUse} />);
      
      fireEvent.click(container.querySelector('.racial-ability-card'));
      expect(onUse).toHaveBeenCalledTimes(1);
    });

    it('should not call onUse when clicked and unavailable (no uses left)', () => {
      const onUse = jest.fn();
      const { container } = render(<RacialAbilityCard {...defaultProps} onUse={onUse} usesLeft={0} />);
      
      fireEvent.click(container.querySelector('.racial-ability-card'));
      expect(onUse).not.toHaveBeenCalled();
    });

    it('should not call onUse when clicked and on cooldown', () => {
      const onUse = jest.fn();
      const { container } = render(<RacialAbilityCard {...defaultProps} onUse={onUse} cooldown={1} />);
      
      fireEvent.click(container.querySelector('.racial-ability-card'));
      expect(onUse).not.toHaveBeenCalled();
    });

    it('should not call onUse when clicked and disabled', () => {
      const onUse = jest.fn();
      const { container } = render(<RacialAbilityCard {...defaultProps} onUse={onUse} disabled={true} />);
      
      fireEvent.click(container.querySelector('.racial-ability-card'));
      expect(onUse).not.toHaveBeenCalled();
    });
  });

  describe('Status Messages', () => {
    it('should show "Ready to use" when available', () => {
      render(<RacialAbilityCard {...defaultProps} />);
      
      expect(screen.getByText('Ready to use')).toBeInTheDocument();
    });

    it('should show "No uses remaining" when no uses left', () => {
      render(<RacialAbilityCard {...defaultProps} usesLeft={0} />);
      
      expect(screen.getByText('No uses remaining')).toBeInTheDocument();
    });

    it('should show cooldown message with plural', () => {
      render(<RacialAbilityCard {...defaultProps} cooldown={3} />);
      
      expect(screen.getByText('Available in 3 turns')).toBeInTheDocument();
    });

    it('should show cooldown message with singular', () => {
      render(<RacialAbilityCard {...defaultProps} cooldown={1} />);
      
      expect(screen.getByText('Available in 1 turn')).toBeInTheDocument();
    });

    it('should show disabled message', () => {
      render(<RacialAbilityCard {...defaultProps} disabled={true} />);
      
      expect(screen.getByText('Cannot use now')).toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('should apply available class when ability is available', () => {
      const { container } = render(<RacialAbilityCard {...defaultProps} />);
      
      expect(container.querySelector('.racial-ability-card')).toHaveClass('available');
    });

    it('should apply unavailable class when ability is not available', () => {
      const { container } = render(<RacialAbilityCard {...defaultProps} usesLeft={0} />);
      
      expect(container.querySelector('.racial-ability-card')).toHaveClass('unavailable');
    });

    it('should apply correct status indicator classes', () => {
      const { container: availableContainer } = render(<RacialAbilityCard {...defaultProps} />);
      expect(availableContainer.querySelector('.status-indicator')).toHaveClass('available');

      const { container: unavailableContainer } = render(<RacialAbilityCard {...defaultProps} usesLeft={0} />);
      expect(unavailableContainer.querySelector('.status-indicator')).toHaveClass('unavailable');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing ability properties gracefully', () => {
      const incompleteAbility = {
        id: 'test',
        name: 'Test',
        type: '',
        description: '',
        usageLimit: 'perGame' as const
      };
      
      expect(() => {
        render(<RacialAbilityCard {...defaultProps} ability={incompleteAbility} />);
      }).not.toThrow();
    });

    it('should handle undefined ability gracefully', () => {
      const { container } = render(<RacialAbilityCard {...defaultProps} ability={undefined} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should handle zero uses left', () => {
      render(<RacialAbilityCard {...defaultProps} usesLeft={0} />);
      
      expect(screen.getByText('No uses remaining')).toBeInTheDocument();
    });

    it('should handle negative uses left', () => {
      render(<RacialAbilityCard {...defaultProps} usesLeft={-1} />);
      
      expect(screen.getByText('No uses remaining')).toBeInTheDocument();
    });

    it('should handle zero cooldown', () => {
      render(<RacialAbilityCard {...defaultProps} cooldown={0} />);
      
      expect(screen.getByText('Ready to use')).toBeInTheDocument();
    });
  });
});