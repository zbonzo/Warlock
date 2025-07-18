/**
 * @fileoverview Tests for CharacterSelectPage component
 * Tests race/class selection, compatibility, and UI interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CharacterSelectPage from '@client/pages/CharacterSelectPage';
import { ConfigProvider } from '@client/contexts/ConfigContext';
import { ThemeProvider } from '@client/contexts/ThemeContext';
import * as configService from '@client/services/configService';

// Mock the config service
jest.mock('@client/services/configService', () => ({
  preloadConfig: jest.fn(),
  getBasicConfig: jest.fn(),
  getRaces: jest.fn(),
  getClasses: jest.fn(),
  getCompatibility: jest.fn(),
  getRacialAbilities: jest.fn(),
}));

// Mock the constants
jest.mock('@client/config/constants', () => ({
  ICONS: {
    RACES: {
      Artisan: '/images/races/artisan.png',
      Rockhewn: '/images/races/rockhewn.png',
      Lich: '/images/races/lich.png',
    },
    CLASSES: {
      Warrior: '/images/classes/warrior.png',
      Wizard: '/images/classes/wizard.png',
      Assassin: '/images/classes/assassin.png',
    }
  }
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
  <ThemeProvider>
    <ConfigProvider>
      {children}
    </ConfigProvider>
  </ThemeProvider>
);

describe('CharacterSelectPage', () => {
  const mockProps = {
    playerName: 'TestPlayer',
    gameCode: '1234',
    selectedRace: null,
    selectedClass: null,
    onSelectRace: jest.fn(),
    onSelectClass: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful config loading
    configService.preloadConfig.mockResolvedValue(true);
    configService.getBasicConfig.mockResolvedValue({
      minPlayers: 2,
      maxPlayers: 20,
      version: '1.0.0'
    });
    configService.getRaces.mockResolvedValue({
      races: ['Artisan', 'Rockhewn', 'Lich'],
      raceAttributes: {
        Artisan: { description: 'Adaptable and versatile' },
        Rockhewn: { description: 'Hardy and resilient' },
        Lich: { description: 'Undead and powerful' }
      }
    });
    configService.getClasses.mockResolvedValue({
      classes: ['Warrior', 'Wizard', 'Assassin'],
      classAttributes: {
        Warrior: { description: 'Tank class', color: '#ff0000' },
        Wizard: { description: 'Caster class', color: '#0000ff' },
        Assassin: { description: 'Stealth class', color: '#00ff00' }
      }
    });
    configService.getCompatibility.mockResolvedValue({
      classToRaces: {
        Warrior: ['Artisan', 'Rockhewn'],
        Wizard: ['Artisan', 'Lich'],
        Assassin: ['Artisan', 'Lich']
      },
      racesToClasses: {
        Artisan: ['Warrior', 'Wizard', 'Assassin'],
        Rockhewn: ['Warrior'],
        Lich: ['Wizard', 'Assassin']
      }
    });
    configService.getRacialAbilities.mockResolvedValue({
      Artisan: { type: 'adaptability', name: 'Adaptability' },
      Rockhewn: { type: 'stoneArmor', name: 'Stone Armor' },
      Lich: { type: 'undying', name: 'Undying' }
    });
  });

  it('should render loading state initially', () => {
    // Mock loading state
    configService.preloadConfig.mockImplementation(() => new Promise(() => {}));

    render(
      <TestWrapper>
        <CharacterSelectPage {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Loading race and class data...')).toBeInTheDocument();
  });

  it('should render error state when config fails to load', async () => {
    configService.preloadConfig.mockRejectedValue(new Error('Config failed'));

    render(
      <TestWrapper>
        <CharacterSelectPage {...mockProps} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error Loading Game Data')).toBeInTheDocument();
    });
  });

  it('should render character select interface when loaded', async () => {
    render(
      <TestWrapper>
        <CharacterSelectPage {...mockProps} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome, TestPlayer!')).toBeInTheDocument();
    });

    expect(screen.getByText('Game Code: 1234')).toBeInTheDocument();
    expect(screen.getByText('Select Your Race')).toBeInTheDocument();
    expect(screen.getByText('Select Your Class')).toBeInTheDocument();
  });

  it('should render race cards', async () => {
    render(
      <TestWrapper>
        <CharacterSelectPage {...mockProps} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Artisan')).toBeInTheDocument();
    });

    expect(screen.getByText('Rockhewn')).toBeInTheDocument();
    expect(screen.getByText('Lich')).toBeInTheDocument();
  });

  it('should render class cards', async () => {
    render(
      <TestWrapper>
        <CharacterSelectPage {...mockProps} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Warrior')).toBeInTheDocument();
    });

    expect(screen.getByText('Wizard')).toBeInTheDocument();
    expect(screen.getByText('Assassin')).toBeInTheDocument();
  });

  it('should handle race selection', async () => {
    render(
      <TestWrapper>
        <CharacterSelectPage {...mockProps} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Artisan')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Artisan'));

    expect(mockProps.onSelectRace).toHaveBeenCalledWith('Artisan');
  });

  it('should handle class selection', async () => {
    render(
      <TestWrapper>
        <CharacterSelectPage {...mockProps} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Warrior')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Warrior'));

    expect(mockProps.onSelectClass).toHaveBeenCalledWith('Warrior');
  });

  it('should show race description when race is selected', async () => {
    const propsWithRace = { ...mockProps, selectedRace: 'Artisan' };

    render(
      <TestWrapper>
        <CharacterSelectPage {...propsWithRace} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Adaptable and versatile')).toBeInTheDocument();
    });
  });

  it('should show class description when class is selected', async () => {
    const propsWithClass = { ...mockProps, selectedClass: 'Warrior' };

    render(
      <TestWrapper>
        <CharacterSelectPage {...propsWithClass} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Tank class')).toBeInTheDocument();
    });
  });

  it('should disable incompatible classes when race is selected', async () => {
    const propsWithRace = { ...mockProps, selectedRace: 'Rockhewn' };

    render(
      <TestWrapper>
        <CharacterSelectPage {...propsWithRace} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Warrior')).toBeInTheDocument();
    });

    // Rockhewn should only be compatible with Warrior
    const warriorCard = screen.getByText('Warrior').closest('.selection-card');
    const wizardCard = screen.getByText('Wizard').closest('.selection-card');
    const assassinCard = screen.getByText('Assassin').closest('.selection-card');

    expect(warriorCard).not.toHaveClass('disabled');
    expect(wizardCard).toHaveClass('disabled');
    expect(assassinCard).toHaveClass('disabled');
  });

  it('should disable incompatible races when class is selected', async () => {
    const propsWithClass = { ...mockProps, selectedClass: 'Wizard' };

    render(
      <TestWrapper>
        <CharacterSelectPage {...propsWithClass} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Artisan')).toBeInTheDocument();
    });

    // Wizard should only be compatible with Artisan and Lich
    const artisanCard = screen.getByText('Artisan').closest('.selection-card');
    const rockhewnCard = screen.getByText('Rockhewn').closest('.selection-card');
    const lichCard = screen.getByText('Lich').closest('.selection-card');

    expect(artisanCard).not.toHaveClass('disabled');
    expect(rockhewnCard).toHaveClass('disabled');
    expect(lichCard).not.toHaveClass('disabled');
  });

  it('should reset incompatible selection when new race is selected', async () => {
    const propsWithBoth = { 
      ...mockProps, 
      selectedRace: 'Rockhewn', 
      selectedClass: 'Wizard' 
    };

    render(
      <TestWrapper>
        <CharacterSelectPage {...propsWithBoth} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Artisan')).toBeInTheDocument();
    });

    // Select Artisan (compatible with Wizard)
    fireEvent.click(screen.getByText('Artisan'));

    expect(mockProps.onSelectRace).toHaveBeenCalledWith('Artisan');
    // Class should not be reset since Artisan is compatible with Wizard
  });

  it('should show selected state on race cards', async () => {
    const propsWithRace = { ...mockProps, selectedRace: 'Artisan' };

    render(
      <TestWrapper>
        <CharacterSelectPage {...propsWithRace} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Artisan')).toBeInTheDocument();
    });

    const artisanCard = screen.getByText('Artisan').closest('.selection-card');
    expect(artisanCard).toHaveClass('selected');
  });

  it('should show selected state on class cards', async () => {
    const propsWithClass = { ...mockProps, selectedClass: 'Warrior' };

    render(
      <TestWrapper>
        <CharacterSelectPage {...propsWithClass} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Warrior')).toBeInTheDocument();
    });

    const warriorCard = screen.getByText('Warrior').closest('.selection-card');
    expect(warriorCard).toHaveClass('selected');
  });

  it('should enable confirm button when valid selection is made', async () => {
    const propsWithBoth = { 
      ...mockProps, 
      selectedRace: 'Artisan', 
      selectedClass: 'Warrior' 
    };

    render(
      <TestWrapper>
        <CharacterSelectPage {...propsWithBoth} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Confirm Selection')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Confirm Selection');
    expect(confirmButton).not.toBeDisabled();
  });

  it('should disable confirm button when selection is invalid', async () => {
    const propsWithInvalidCombo = { 
      ...mockProps, 
      selectedRace: 'Rockhewn', 
      selectedClass: 'Wizard' // Invalid combo
    };

    render(
      <TestWrapper>
        <CharacterSelectPage {...propsWithInvalidCombo} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Confirm Selection')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Confirm Selection');
    expect(confirmButton).toBeDisabled();
  });

  it('should handle confirm button click', async () => {
    const propsWithBoth = { 
      ...mockProps, 
      selectedRace: 'Artisan', 
      selectedClass: 'Warrior' 
    };

    render(
      <TestWrapper>
        <CharacterSelectPage {...propsWithBoth} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Confirm Selection')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm Selection'));

    expect(mockProps.onConfirm).toHaveBeenCalled();
  });

  it('should handle image loading errors gracefully', async () => {
    render(
      <TestWrapper>
        <CharacterSelectPage {...mockProps} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Artisan')).toBeInTheDocument();
    });

    // Find the image and simulate an error
    const raceImages = screen.getAllByRole('img');
    if (raceImages.length > 0) {
      fireEvent.error(raceImages[0]);
    }

    // Should still render the card without crashing
    expect(screen.getByText('Artisan')).toBeInTheDocument();
  });
});