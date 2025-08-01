/**
 * @fileoverview Tests for AdaptabilityModal.tsx
 * Comprehensive test suite for the main AdaptabilityModal component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdaptabilityModal from '../../../../../client/src/components/modals/AdaptabilityModal/AdaptabilityModal';
import type { Socket } from 'socket.io-client';
import type { Ability, PlayerClass } from '../../../../../shared/types';

// Mock CSS
jest.mock('../../../../../client/src/components/modals/AdaptabilityModal/AdaptabilityModal.css', () => ({}));

// Mock ThemeContext
const mockUseTheme = jest.fn();
jest.mock('../../../../../client/src/contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme()
}));

// Mock constants
jest.mock('../../../../../client/src/components/modals/AdaptabilityModal/constants', () => ({
  STEPS: {
    SELECT_ABILITY: 'selectAbility',
    SELECT_CLASS: 'selectClass',
    SELECT_NEW_ABILITY: 'selectNewAbility'
  }
}));

describe('AdaptabilityModal', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  } as unknown as Socket;

  const mockAbilities: Ability[] = [
    {
      type: 'attack',
      name: 'Slash',
      category: 'Attack',
      unlockAt: 1
    },
    {
      type: 'heal',
      name: 'Heal',
      category: 'Heal',
      unlockAt: 2
    },
    {
      type: 'shield',
      name: 'Shield Wall',
      category: 'Defense',
      unlockAt: 3
    }
  ];

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    socket: mockSocket,
    gameCode: 'TEST123',
    className: 'Warrior' as PlayerClass,
    initialAbilities: mockAbilities,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      isDarkMode: false,
      toggleTheme: jest.fn()
    });
  });

  describe('Basic Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<AdaptabilityModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Artisan Adaptability')).not.toBeInTheDocument();
    });

    it('should render modal title when open', () => {
      render(<AdaptabilityModal {...defaultProps} />);
      
      expect(screen.getByText('Artisan Adaptability')).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      render(<AdaptabilityModal {...defaultProps} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should show ability selection step initially', () => {
      render(<AdaptabilityModal {...defaultProps} />);
      
      expect(screen.getByText('Choose an ability you want to replace:')).toBeInTheDocument();
    });
  });

  describe('Socket Event Handlers', () => {
    it('should set up socket listeners when opened', () => {
      render(<AdaptabilityModal {...defaultProps} />);
      
      expect(mockSocket.on).toHaveBeenCalledWith('adaptabilityChooseAbility', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('classAbilitiesResponse', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('adaptabilityComplete', expect.any(Function));
    });

    it('should clean up socket listeners on unmount', () => {
      const { unmount } = render(<AdaptabilityModal {...defaultProps} />);
      
      unmount();
      
      expect(mockSocket.off).toHaveBeenCalledWith('adaptabilityChooseAbility', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('classAbilitiesResponse', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('adaptabilityComplete', expect.any(Function));
    });

    it('should handle adaptabilityComplete success response', async () => {
      const onClose = jest.fn();
      render(<AdaptabilityModal {...defaultProps} onClose={onClose} />);
      
      // Get the handler function that was registered
      const completeCallArgs = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'adaptabilityComplete'
      );
      const completeHandler = completeCallArgs[1];
      
      // Simulate successful completion
      act(() => {
        completeHandler({ success: true });
      });
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should handle adaptabilityComplete error response', async () => {
      render(<AdaptabilityModal {...defaultProps} />);
      
      // Get the handler function that was registered
      const completeCallArgs = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'adaptabilityComplete'
      );
      const completeHandler = completeCallArgs[1];
      
      // Simulate error response
      act(() => {
        completeHandler({ success: false, message: 'Test error' });
      });
      
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('Ability Selection Step', () => {
    it('should render abilities from initialAbilities prop', () => {
      render(<AdaptabilityModal {...defaultProps} />);
      
      expect(screen.getByText('Slash')).toBeInTheDocument();
      expect(screen.getByText('Heal')).toBeInTheDocument();
      expect(screen.getByText('Shield Wall')).toBeInTheDocument();
    });

    it('should show loading message when loading', () => {
      render(<AdaptabilityModal {...defaultProps} initialAbilities={[]} />);
      
      expect(screen.getByText('Loading your abilities...')).toBeInTheDocument();
    });

    it('should show fallback abilities when no abilities available', async () => {
      render(<AdaptabilityModal {...defaultProps} initialAbilities={[]} />);
      
      // Wait for loading to complete and fallback to show
      await waitFor(() => {
        expect(screen.getByText('No abilities available. Using fallback options:')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Slash')).toBeInTheDocument();
      expect(screen.getByText('Shield Wall')).toBeInTheDocument();
      expect(screen.getByText('Bandage')).toBeInTheDocument();
      expect(screen.getByText('Battle Cry')).toBeInTheDocument();
    });

    it('should proceed to class selection when ability is selected', () => {
      render(<AdaptabilityModal {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Slash'));
      
      expect(screen.getByText(/You selected: Slash/)).toBeInTheDocument();
      expect(screen.getByText(/Now choose a class to take an ability from:/)).toBeInTheDocument();
    });
  });

  describe('Class Selection Step', () => {
    beforeEach(() => {
      render(<AdaptabilityModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Slash'));
    });

    it('should show available classes excluding current class', () => {
      // Should show other classes but not Warrior (current class)
      expect(screen.getByText('Pyromancer')).toBeInTheDocument();
      expect(screen.getByText('Wizard')).toBeInTheDocument();
      expect(screen.getByText('Assassin')).toBeInTheDocument();
      expect(screen.queryByText('Warrior')).not.toBeInTheDocument();
    });

    it('should show back button', () => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should go back to ability selection when back is clicked', () => {
      fireEvent.click(screen.getByText('Back'));
      
      expect(screen.getByText('Choose an ability you want to replace:')).toBeInTheDocument();
    });

    it('should emit getClassAbilities when class is selected', () => {
      fireEvent.click(screen.getByText('Pyromancer'));
      
      expect(mockSocket.emit).toHaveBeenCalledWith('getClassAbilities', {
        gameCode: 'TEST123',
        className: 'Pyromancer',
        level: 1,
        abilityLevel: 1,
        currentAbilityType: 'attack',
      });
    });
  });

  describe('New Ability Selection Step', () => {
    beforeEach(() => {
      render(<AdaptabilityModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Slash'));
      fireEvent.click(screen.getByText('Pyromancer'));
    });

    it('should show loading message while fetching abilities', () => {
      expect(screen.getByText('Loading available abilities...')).toBeInTheDocument();
    });

    it('should handle classAbilitiesResponse with abilities', async () => {
      // Get the handler function that was registered
      const responseCallArgs = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'classAbilitiesResponse'
      );
      const responseHandler = responseCallArgs[1];
      
      // Simulate receiving new abilities
      const newAbility = {
        type: 'fireball',
        name: 'Fireball',
        category: 'Attack',
        unlockAt: 1
      };
      
      act(() => {
        responseHandler({
          className: 'Pyromancer',
          level: 1,
          success: true,
          abilities: [newAbility]
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Fireball')).toBeInTheDocument();
      });
    });

    it('should show error when no abilities found', async () => {
      // Get the handler function that was registered
      const responseCallArgs = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'classAbilitiesResponse'
      );
      const responseHandler = responseCallArgs[1];
      
      act(() => {
        responseHandler({
          className: 'Pyromancer',
          level: 1,
          success: false,
          abilities: []
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText(/No Pyromancer abilities available at level 1/)).toBeInTheDocument();
      });
    });

    it('should emit adaptabilityReplaceAbility when new ability is selected', async () => {
      // Get the handler function and simulate response
      const responseCallArgs = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'classAbilitiesResponse'
      );
      const responseHandler = responseCallArgs[1];
      
      const newAbility = {
        type: 'fireball',
        name: 'Fireball',
        category: 'Attack',
        unlockAt: 1
      };
      
      act(() => {
        responseHandler({
          className: 'Pyromancer',
          level: 1,
          success: true,
          abilities: [newAbility]
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Fireball')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Fireball'));
      
      expect(mockSocket.emit).toHaveBeenCalledWith('adaptabilityReplaceAbility', {
        gameCode: 'TEST123',
        oldAbilityType: 'attack',
        newAbilityType: 'fireball',
        level: 1,
        newClassName: 'Pyromancer'
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error occurs', async () => {
      render(<AdaptabilityModal {...defaultProps} />);
      
      // Get the complete handler and simulate error
      const completeCallArgs = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'adaptabilityComplete'
      );
      const completeHandler = completeCallArgs[1];
      
      act(() => {
        completeHandler({ success: false, message: 'Test error message' });
      });
      
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should clear error when clear button is clicked', async () => {
      render(<AdaptabilityModal {...defaultProps} />);
      
      // Get the complete handler and simulate error
      const completeCallArgs = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'adaptabilityComplete'
      );
      const completeHandler = completeCallArgs[1];
      
      act(() => {
        completeHandler({ success: false, message: 'Test error message' });
      });
      
      expect(screen.getByText('Test error message')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('✕'));
      
      expect(screen.queryByText('Test error message')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close modal when Escape key is pressed', () => {
      const onClose = jest.fn();
      render(<AdaptabilityModal {...defaultProps} onClose={onClose} />);
      
      fireEvent.keyDown(window, { key: 'Escape' });
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Helper Functions', () => {
    it('should return correct category icons', () => {
      render(<AdaptabilityModal {...defaultProps} />);
      
      // These are tested indirectly through the rendered abilities
      expect(screen.getByText('Slash')).toBeInTheDocument();
      expect(screen.getByText('Attack')).toBeInTheDocument();
      expect(screen.getByText('Heal')).toBeInTheDocument();
      expect(screen.getByText('Defense')).toBeInTheDocument();
    });

    it('should return correct class icons', async () => {
      render(<AdaptabilityModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Slash'));
      fireEvent.click(screen.getByText('Pyromancer'));
      
      // Get the handler and simulate response to test class icons
      const responseCallArgs = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'classAbilitiesResponse'
      );
      const responseHandler = responseCallArgs[1];
      
      const newAbility = {
        type: 'fireball',
        name: 'Fireball',
        category: 'Attack',
        unlockAt: 1
      };
      
      act(() => {
        responseHandler({
          className: 'Pyromancer',
          level: 1,
          success: true,
          abilities: [newAbility]
        });
      });
      
      // Class icon should be rendered in the ability header
      await waitFor(() => {
        expect(screen.getByText('Fireball')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Button', () => {
    it('should call onClose when cancel is clicked', () => {
      const onClose = jest.fn();
      render(<AdaptabilityModal {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByText('Cancel'));
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should disable cancel button during final step loading', () => {
      render(<AdaptabilityModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Slash'));
      fireEvent.click(screen.getByText('Pyromancer'));
      
      // Cancel button should be disabled during loading in final step
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Data Processing', () => {
    it('should handle socket data with array format', () => {
      render(<AdaptabilityModal {...defaultProps} initialAbilities={[]} />);
      
      // Get the ability data handler
      const abilityCallArgs = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'adaptabilityChooseAbility'
      );
      const abilityHandler = abilityCallArgs[1];
      
      act(() => {
        abilityHandler({
          abilities: mockAbilities
        });
      });
      
      expect(screen.getByText('Slash')).toBeInTheDocument();
      expect(screen.getByText('Heal')).toBeInTheDocument();
    });

    it('should handle socket data with object format', () => {
      render(<AdaptabilityModal {...defaultProps} initialAbilities={[]} />);
      
      // Get the ability data handler
      const abilityCallArgs = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'adaptabilityChooseAbility'
      );
      const abilityHandler = abilityCallArgs[1];
      
      act(() => {
        abilityHandler({
          abilities: {
            '1': [mockAbilities[0]],
            '2': [mockAbilities[1]]
          }
        });
      });
      
      expect(screen.getByText('Slash')).toBeInTheDocument();
      expect(screen.getByText('Heal')).toBeInTheDocument();
    });

    it('should handle malformed socket data gracefully', () => {
      render(<AdaptabilityModal {...defaultProps} initialAbilities={[]} />);
      
      // Get the ability data handler
      const abilityCallArgs = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'adaptabilityChooseAbility'
      );
      const abilityHandler = abilityCallArgs[1];
      
      // Should not crash with malformed data
      expect(() => {
        act(() => {
          abilityHandler({ abilities: null });
        });
      }).not.toThrow();
      
      // Should show fallback abilities
      expect(screen.getByText('No abilities available. Using fallback options:')).toBeInTheDocument();
    });
  });
});