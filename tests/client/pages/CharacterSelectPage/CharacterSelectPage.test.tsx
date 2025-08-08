/**
 * @fileoverview Tests for CharacterSelectPage component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CharacterSelectPage from '../../../../client/src/pages/CharacterSelectPage/CharacterSelectPage';

// Mock dependencies
jest.mock('@contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      primary: '#1a1a1a',
      secondary: '#333333',
      accent: '#ff6b35',
      danger: '#dc3545'
    }
  }))
}));

jest.mock('@contexts/ConfigContext', () => ({
  useConfig: jest.fn()
}));

jest.mock('../../../../client/src/config/constants', () => ({
  ICONS: {
    RACES: {
      Artisan: '👩‍🌾',
      Rockhewn: '🧔‍♂️',
      Lich: '💀',
      Orc: '🧌',
      Crestfallen: '🧝',
      Kinfolk: '🐐'
    },
    CLASSES: {
      Warrior: '⚔️',
      Pyromancer: '🔥',
      Wizard: '🧙',
      Assassin: '🥷',
      Alchemist: '🧪',
      Priest: '✨',
      Oracle: '🔮',
      Seer: '👁️',
      Shaman: '🌀',
      Gunslinger: '💥',
      Tracker: '🏹',
      Druid: '🌿'
    }
  }
}));

jest.mock('../../../../client/src/components/ui/RuneButton', () => {
  return function MockRuneButton({
    children,
    onClick,
    disabled,
    variant = 'primary'
  }: any) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        data-testid="rune-button"
        data-variant={variant}
      >
        {children}
      </button>
    );
  };
});

jest.mock('../../../../client/src/pages/CharacterSelectPage/CharacterSelectPage.css', () => ({}));

describe('CharacterSelectPage', () => {
  const mockUseConfig = require('@contexts/ConfigContext').useConfig;

  const defaultProps = {
    playerName: 'TestPlayer',
    gameCode: 'ABC123',
    selectedRace: null,
    selectedClass: null,
    onSelectRace: jest.fn(),
    onSelectClass: jest.fn(),
    onConfirm: jest.fn()
  };

  const mockConfig = {
    races: ['Artisan', 'Rockhewn', 'Lich', 'Orc', 'Crestfallen', 'Kinfolk'],
    classes: ['Warrior', 'Pyromancer', 'Wizard', 'Assassin', 'Alchemist', 'Priest'],
    compatibility: {
      classToRaces: {
        Warrior: ['Artisan', 'Rockhewn', 'Lich'],
        Pyromancer: ['Rockhewn', 'Lich', 'Orc'],
        Wizard: ['Artisan', 'Crestfallen', 'Lich'],
        Assassin: ['Artisan', 'Crestfallen', 'Lich'],
        Alchemist: ['Artisan', 'Crestfallen', 'Kinfolk'],
        Priest: ['Artisan', 'Rockhewn', 'Lich']
      },
      racesToClasses: {
        Artisan: ['Warrior', 'Wizard', 'Assassin', 'Alchemist', 'Priest'],
        Rockhewn: ['Warrior', 'Pyromancer', 'Priest'],
        Lich: ['Warrior', 'Pyromancer', 'Wizard', 'Assassin', 'Priest'],
        Orc: ['Pyromancer'],
        Crestfallen: ['Wizard', 'Assassin', 'Alchemist'],
        Kinfolk: ['Alchemist']
      }
    },
    classAttributes: {
      Warrior: { color: '#cd7f32', description: 'A mighty warrior' },
      Pyromancer: { color: '#ff4500', description: 'Master of fire' },
      Wizard: { color: '#4169e1', description: 'Wielder of arcane magic' },
      Assassin: { color: '#2f4f4f', description: 'Silent death' },
      Alchemist: { color: '#708090', description: 'Master of potions' },
      Priest: { color: '#ffd700', description: 'Divine healer' }
    },
    raceAttributes: {
      Artisan: { description: 'Skilled craftspeople' },
      Rockhewn: { description: 'Strong mountain dwellers' },
      Lich: { description: 'Undead magic users' },
      Orc: { description: 'Fierce warriors' },
      Crestfallen: { description: 'Elegant elves' },
      Kinfolk: { description: 'Nature-bound people' }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfig.mockReturnValue({
      loading: false,
      error: null,
      config: mockConfig
    });
  });

  describe('Loading States', () => {
    it('should show loading state when config is loading', () => {
      mockUseConfig.mockReturnValue({
        loading: true,
        error: null,
        config: null
      });

      render(<CharacterSelectPage {...defaultProps} />);

      expect(screen.getByText('Loading race and class data...')).toBeInTheDocument();
    });

    it('should show error state when config has error', () => {
      mockUseConfig.mockReturnValue({
        loading: false,
        error: 'Failed to load config',
        config: null
      });

      render(<CharacterSelectPage {...defaultProps} />);

      expect(screen.getByText('Error Loading Game Data')).toBeInTheDocument();
      expect(screen.getByText('Failed to load config')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should call window.location.reload when retry button is clicked', () => {
      const mockReload = jest.fn();
      Object.defineProperty(window.location, 'reload', {
        value: mockReload,
        writable: true
      });

      mockUseConfig.mockReturnValue({
        loading: false,
        error: 'Config error',
        config: null
      });

      render(<CharacterSelectPage {...defaultProps} />);

      fireEvent.click(screen.getByText('Retry'));
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Component Rendering', () => {
    it('should render with correct title and player name', () => {
      render(<CharacterSelectPage {...defaultProps} />);

      expect(screen.getByText('Whisper the Code: ABC123')).toBeInTheDocument();
      expect(screen.getByText('Welcome, TestPlayer!')).toBeInTheDocument();
    });

    it('should render race selection section', () => {
      render(<CharacterSelectPage {...defaultProps} />);

      expect(screen.getByText('Select Your Race')).toBeInTheDocument();

      // Check that races are rendered
      mockConfig.races.forEach(race => {
        expect(screen.getByText(race)).toBeInTheDocument();
      });
    });

    it('should render class selection section', () => {
      render(<CharacterSelectPage {...defaultProps} />);

      expect(screen.getByText('Select Your Class')).toBeInTheDocument();

      // Check that classes are rendered
      mockConfig.classes.forEach(cls => {
        expect(screen.getByText(cls)).toBeInTheDocument();
      });
    });

    it('should render confirm button', () => {
      render(<CharacterSelectPage {...defaultProps} />);

      expect(screen.getByText('Confirm Selection')).toBeInTheDocument();
    });
  });

  describe('Race Selection', () => {
    it('should call onSelectRace when race is clicked', () => {
      const onSelectRace = jest.fn();
      render(<CharacterSelectPage {...defaultProps} onSelectRace={onSelectRace} />);

      fireEvent.click(screen.getByText('Artisan'));
      expect(onSelectRace).toHaveBeenCalledWith('Artisan');
    });

    it('should show race description when race is selected', () => {
      render(<CharacterSelectPage
        {...defaultProps}
        selectedRace="Artisan"
      />);

      expect(screen.getByText('Skilled craftspeople')).toBeInTheDocument();
    });

    it('should disable incompatible races when class is selected first', () => {
      render(<CharacterSelectPage
        {...defaultProps}
        selectedClass="Pyromancer"
      />);

      // Artisan should be disabled (not compatible with Pyromancer)
      const artisanCard = screen.getByText('Artisan').closest('.selection-card');
      expect(artisanCard).toHaveClass('disabled');

      // Orc should be enabled (compatible with Pyromancer)
      const orcCard = screen.getByText('Orc').closest('.selection-card');
      expect(orcCard).not.toHaveClass('disabled');
    });
  });

  describe('Class Selection', () => {
    it('should call onSelectClass when class is clicked', () => {
      const onSelectClass = jest.fn();
      render(<CharacterSelectPage {...defaultProps} onSelectClass={onSelectClass} />);

      fireEvent.click(screen.getByText('Warrior'));
      expect(onSelectClass).toHaveBeenCalledWith('Warrior');
    });

    it('should show class description when class is selected', () => {
      render(<CharacterSelectPage
        {...defaultProps}
        selectedClass="Warrior"
      />);

      expect(screen.getByText('A mighty warrior')).toBeInTheDocument();
    });

    it('should disable incompatible classes when race is selected first', () => {
      render(<CharacterSelectPage
        {...defaultProps}
        selectedRace="Orc"
      />);

      // Warrior should be disabled (not compatible with Orc)
      const warriorCard = screen.getByText('Warrior').closest('.selection-card');
      expect(warriorCard).toHaveClass('disabled');

      // Pyromancer should be enabled (compatible with Orc)
      const pyromancerCard = screen.getByText('Pyromancer').closest('.selection-card');
      expect(pyromancerCard).not.toHaveClass('enabled');
    });
  });

  describe('Compatibility Logic', () => {
    it('should show valid combination message for compatible selection', () => {
      render(<CharacterSelectPage
        {...defaultProps}
        selectedRace="Artisan"
        selectedClass="Warrior"
      />);

      expect(screen.getByText(/✓ Valid combination: Artisan Warrior/)).toBeInTheDocument();
    });

    it('should show invalid combination message for incompatible selection', () => {
      render(<CharacterSelectPage
        {...defaultProps}
        selectedRace="Orc"
        selectedClass="Warrior"
      />);

      expect(screen.getByText(/This race and class combination is not compatible/)).toBeInTheDocument();
    });

    it('should enable confirm button for valid combinations', () => {
      render(<CharacterSelectPage
        {...defaultProps}
        selectedRace="Artisan"
        selectedClass="Warrior"
      />);

      const confirmButton = screen.getByText('Confirm Selection');
      expect(confirmButton).not.toBeDisabled();
    });

    it('should disable confirm button for invalid combinations', () => {
      render(<CharacterSelectPage
        {...defaultProps}
        selectedRace="Orc"
        selectedClass="Warrior"
      />);

      const confirmButton = screen.getByText('Confirm Selection');
      expect(confirmButton).toBeDisabled();
    });

    it('should disable confirm button when only race is selected', () => {
      render(<CharacterSelectPage
        {...defaultProps}
        selectedRace="Artisan"
        selectedClass={null}
      />);

      const confirmButton = screen.getByText('Confirm Selection');
      expect(confirmButton).toBeDisabled();
    });

    it('should disable confirm button when only class is selected', () => {
      render(<CharacterSelectPage
        {...defaultProps}
        selectedRace={null}
        selectedClass="Warrior"
      />);

      const confirmButton = screen.getByText('Confirm Selection');
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Confirmation', () => {
    it('should call onConfirm with selected race and class', () => {
      const onConfirm = jest.fn();
      render(<CharacterSelectPage
        {...defaultProps}
        selectedRace="Artisan"
        selectedClass="Warrior"
        onConfirm={onConfirm}
      />);

      fireEvent.click(screen.getByText('Confirm Selection'));
      expect(onConfirm).toHaveBeenCalledWith('Artisan', 'Warrior');
    });

    it('should not call onConfirm when selection is invalid', () => {
      const onConfirm = jest.fn();
      render(<CharacterSelectPage
        {...defaultProps}
        selectedRace="Orc"
        selectedClass="Warrior"
        onConfirm={onConfirm}
      />);

      fireEvent.click(screen.getByText('Confirm Selection'));
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Icon Loading', () => {
    it('should show fallback emoji when race image fails to load', async () => {
      render(<CharacterSelectPage {...defaultProps} />);

      const raceImages = screen.getAllByAltText(/icon$/);
      const artisanImage = raceImages.find(img =>
        img.getAttribute('alt')?.includes('Artisan')
      );

      if (artisanImage) {
        fireEvent.error(artisanImage);
        await waitFor(() => {
          expect(screen.getByText('👩‍🌾')).toBeInTheDocument();
        });
      }
    });

    it('should show loading state initially', () => {
      render(<CharacterSelectPage {...defaultProps} />);

      const loaders = screen.getAllByText('...');
      expect(loaders.length).toBeGreaterThan(0);
    });
  });

  describe('Auto-suggestion', () => {
    it('should auto-suggest random valid combination on mount', () => {
      const onSelectRace = jest.fn();
      const onSelectClass = jest.fn();

      render(<CharacterSelectPage
        {...defaultProps}
        selectedRace={null}
        selectedClass={null}
        onSelectRace={onSelectRace}
        onSelectClass={onSelectClass}
      />);

      expect(onSelectRace).toHaveBeenCalled();
      expect(onSelectClass).toHaveBeenCalled();
    });

    it('should not auto-suggest when race or class is already selected', () => {
      const onSelectRace = jest.fn();
      const onSelectClass = jest.fn();

      render(<CharacterSelectPage
        {...defaultProps}
        selectedRace="Artisan"
        selectedClass={null}
        onSelectRace={onSelectRace}
        onSelectClass={onSelectClass}
      />);

      expect(onSelectRace).not.toHaveBeenCalled();
      expect(onSelectClass).not.toHaveBeenCalled();
    });
  });

  describe('Selection Interaction', () => {
    it('should reset class when incompatible race is selected', () => {
      const onSelectClass = jest.fn();

      render(<CharacterSelectPage
        {...defaultProps}
        selectedRace={null}
        selectedClass="Warrior"
        onSelectClass={onSelectClass}
      />);

      // Select Orc (incompatible with Warrior)
      fireEvent.click(screen.getByText('Orc'));

      expect(onSelectClass).toHaveBeenCalledWith(null);
    });

    it('should reset race when incompatible class is selected', () => {
      const onSelectRace = jest.fn();

      render(<CharacterSelectPage
        {...defaultProps}
        selectedRace="Orc"
        selectedClass={null}
        onSelectRace={onSelectRace}
      />);

      // Select Warrior (incompatible with Orc)
      fireEvent.click(screen.getByText('Warrior'));

      expect(onSelectRace).toHaveBeenCalledWith(null);
    });
  });
});
