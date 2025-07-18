/**
 * @fileoverview Tests for ConfigContext
 * Tests configuration loading, error handling, and context state management
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider, useConfig } from '@client/contexts/ConfigContext';
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

// Test component that uses the context
const TestComponent = () => {
  const { loading, error, config } = useConfig();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <div>Loaded: {config.loaded ? 'true' : 'false'}</div>
      <div>Races: {config.races?.length || 0}</div>
      <div>Classes: {config.classes?.length || 0}</div>
    </div>
  );
};

describe('ConfigContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should show loading state initially', () => {
    // Mock all service methods to return pending promises
    configService.preloadConfig.mockImplementation(() => new Promise(() => {}));
    configService.getBasicConfig.mockImplementation(() => new Promise(() => {}));
    configService.getRaces.mockImplementation(() => new Promise(() => {}));
    configService.getClasses.mockImplementation(() => new Promise(() => {}));
    configService.getCompatibility.mockImplementation(() => new Promise(() => {}));
    configService.getRacialAbilities.mockImplementation(() => new Promise(() => {}));

    render(
      <ConfigProvider>
        <TestComponent />
      </ConfigProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should load configuration successfully', async () => {
    // Mock successful responses
    configService.preloadConfig.mockResolvedValue(true);
    configService.getBasicConfig.mockResolvedValue({
      minPlayers: 2,
      maxPlayers: 20,
      version: '1.0.0'
    });
    configService.getRaces.mockResolvedValue({
      races: ['Artisan', 'Rockhewn', 'Lich'],
      raceAttributes: {
        Artisan: { description: 'Adaptable' },
        Rockhewn: { description: 'Hardy' },
        Lich: { description: 'Undead' }
      }
    });
    configService.getClasses.mockResolvedValue({
      classes: ['Warrior', 'Wizard', 'Assassin'],
      classAttributes: {
        Warrior: { description: 'Tank' },
        Wizard: { description: 'Caster' },
        Assassin: { description: 'Stealth' }
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

    render(
      <ConfigProvider>
        <TestComponent />
      </ConfigProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Loaded: true')).toBeInTheDocument();
    });

    expect(screen.getByText('Races: 3')).toBeInTheDocument();
    expect(screen.getByText('Classes: 3')).toBeInTheDocument();
  });

  it('should handle loading errors', async () => {
    const errorMessage = 'Failed to load configuration';
    configService.preloadConfig.mockRejectedValue(new Error(errorMessage));

    render(
      <ConfigProvider>
        <TestComponent />
      </ConfigProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it('should handle network errors', async () => {
    const networkError = new Error('Network Error');
    networkError.code = 'ERR_NETWORK';
    configService.preloadConfig.mockRejectedValue(networkError);

    render(
      <ConfigProvider>
        <TestComponent />
      </ConfigProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Error: Network Error')).toBeInTheDocument();
    });
  });

  it('should handle partial config loading failures', async () => {
    // Mock some services to succeed and others to fail
    configService.preloadConfig.mockResolvedValue(true);
    configService.getBasicConfig.mockResolvedValue({ minPlayers: 2 });
    configService.getRaces.mockResolvedValue({ races: ['Artisan'] });
    configService.getClasses.mockRejectedValue(new Error('Classes failed'));

    render(
      <ConfigProvider>
        <TestComponent />
      </ConfigProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Error: Classes failed')).toBeInTheDocument();
    });
  });

  it('should throw error when useConfig is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow();

    console.error = originalError;
  });
});