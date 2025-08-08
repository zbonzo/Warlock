/**
 * @fileoverview Tests for DamageEffects.tsx
 * Tests the damage effect animations and processing system
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DamageEffects from '../../../../client/src/components/game/DamageEffects/DamageEffects';

// Mock CSS
jest.mock('../../../../client/src/components/game/DamageEffects/DamageEffects.css', () => ({}));

// Mock AppContext
const mockUseAppContext = jest.fn();
jest.mock('../../../../client/src/contexts/AppContext', () => ({
  useAppContext: () => mockUseAppContext()
}));

interface EventsLogRound {
  round: number;
  events: GameEvent[];
}

interface GameEvent {
  type: string;
  targetId?: string;
  targetName?: string;
  damage?: number;
  attackerName?: string;
  abilityName?: string;
}

describe('DamageEffects', () => {
  const defaultProps = {
    eventsLog: [] as EventsLogRound[],
    playerName: 'Test Player',
    playerId: 'player1'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseAppContext.mockReturnValue({});

    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render nothing when no effects are active', () => {
      const { container } = render(<DamageEffects {...defaultProps} />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render anything when eventsLog is empty', () => {
      const { container } = render(<DamageEffects {...defaultProps} />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render anything when playerId is not provided', () => {
      const props = { ...defaultProps, playerId: '' };
      const { container } = render(<DamageEffects {...props} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Effect Triggering', () => {
    it('should trigger fire effect for Fireball ability', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'action_announcement',
            targetId: 'player1',
            abilityName: 'Fireball'
          },
          {
            type: 'damage',
            targetId: 'player1',
            damage: 25
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      // Wait for effect processing
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(container.querySelector('.fire-effect')).toBeInTheDocument();
    });

    it('should trigger poison effect for Poison Strike ability', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'action_announcement',
            targetId: 'player1',
            abilityName: 'Poison Strike'
          },
          {
            type: 'damage',
            targetId: 'player1',
            damage: 15
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(container.querySelector('.poison-effect')).toBeInTheDocument();
    });

    it('should trigger lightning effect for Lightning Bolt ability', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'action_announcement',
            targetId: 'player1',
            abilityName: 'Lightning Bolt'
          },
          {
            type: 'damage',
            targetId: 'player1',
            damage: 20
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(container.querySelector('.lightning-effect')).toBeInTheDocument();
    });

    it('should trigger corruption effect for corruption event', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'corruption',
            targetId: 'player1'
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(container.querySelector('.corruption-effect')).toBeInTheDocument();
      expect(screen.getByText('CORRUPTED')).toBeInTheDocument();
    });

    it('should trigger blunt effect for monster attacks', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'damage',
            targetId: 'player1',
            attackerName: 'The Monster',
            damage: 30
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(container.querySelector('.blunt-effect')).toBeInTheDocument();
    });

    it('should trigger blunt effect for stone armor degradation', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'stone_armor_degradation',
            targetId: 'player1'
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(container.querySelector('.blunt-effect')).toBeInTheDocument();
    });
  });

  describe('Player Targeting', () => {
    it('should trigger effects when targeted by player ID', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'action_announcement',
            targetId: 'player1',
            abilityName: 'Fireball'
          },
          {
            type: 'damage',
            targetId: 'player1',
            damage: 25
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(container.querySelector('.fire-effect')).toBeInTheDocument();
    });

    it('should trigger effects when targeted by player name', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'action_announcement',
            targetName: 'Test Player',
            abilityName: 'Magic Missile'
          },
          {
            type: 'damage',
            targetName: 'Test Player',
            damage: 15
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(container.querySelector('.arcane-effect')).toBeInTheDocument();
    });

    it('should not trigger effects for other players', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'action_announcement',
            targetId: 'player2',
            abilityName: 'Fireball'
          },
          {
            type: 'damage',
            targetId: 'player2',
            damage: 25
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Effect Queue Processing', () => {
    it('should process multiple effects in sequence', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'action_announcement',
            targetId: 'player1',
            abilityName: 'Fireball'
          },
          {
            type: 'damage',
            targetId: 'player1',
            damage: 25
          },
          {
            type: 'action_announcement',
            targetId: 'player1',
            abilityName: 'Lightning Bolt'
          },
          {
            type: 'damage',
            targetId: 'player1',
            damage: 20
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      // First effect should be triggered
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(container.querySelector('.fire-effect')).toBeInTheDocument();

      // Second effect should be triggered after delay
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(container.querySelector('.lightning-effect')).toBeInTheDocument();
    });

    it('should handle queue processing correctly', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'corruption',
            targetId: 'player1'
          },
          {
            type: 'action_announcement',
            targetId: 'player1',
            abilityName: 'Poison Strike'
          },
          {
            type: 'damage',
            targetId: 'player1',
            damage: 15
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      // Process queue
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(container.querySelector('.corruption-effect')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(container.querySelector('.poison-effect')).toBeInTheDocument();
    });
  });

  describe('Effect Cleanup', () => {
    it('should remove effects after their duration', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'action_announcement',
            targetId: 'player1',
            abilityName: 'Fireball'
          },
          {
            type: 'damage',
            targetId: 'player1',
            damage: 25
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      // Trigger effect
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(container.querySelector('.fire-effect')).toBeInTheDocument();

      // Wait for fire effect duration (2500ms)
      act(() => {
        jest.advanceTimersByTime(2500);
      });

      expect(container.querySelector('.fire-effect')).not.toBeInTheDocument();
    });

    it('should handle multiple effect cleanup correctly', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'action_announcement',
            targetId: 'player1',
            abilityName: 'Lightning Bolt'
          },
          {
            type: 'damage',
            targetId: 'player1',
            damage: 20
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      // Trigger effect
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(container.querySelector('.lightning-effect')).toBeInTheDocument();

      // Wait for lightning effect duration (1500ms)
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(container.querySelector('.lightning-effect')).not.toBeInTheDocument();
    });
  });

  describe('Ability to Effect Mapping', () => {
    const testCases = [
      { ability: 'Fireball', expectedClass: '.fire-effect' },
      { ability: 'Slash', expectedClass: '.slash-effect' },
      { ability: 'Poison Strike', expectedClass: '.poison-effect' },
      { ability: 'Lightning Bolt', expectedClass: '.lightning-effect' },
      { ability: 'Magic Missile', expectedClass: '.arcane-effect' },
      { ability: 'Precise Shot', expectedClass: '.burst-effect' },
      { ability: 'Holy Bolt', expectedClass: '.divine-effect' },
      { ability: 'Primal Roar', expectedClass: '.blunt-effect' },
      { ability: 'Entangle', expectedClass: '.nature-effect' }
    ];

    testCases.forEach(({ ability, expectedClass }) => {
      it(`should map ${ability} to ${expectedClass}`, async () => {
        const eventsLog = [{
          round: 1,
          events: [
            {
              type: 'action_announcement',
              targetId: 'player1',
              abilityName: ability
            },
            {
              type: 'damage',
              targetId: 'player1',
              damage: 20
            }
          ]
        }];

        const { container } = render(
          <DamageEffects {...defaultProps} eventsLog={eventsLog} />
        );

        act(() => {
          jest.advanceTimersByTime(100);
        });

        expect(container.querySelector(expectedClass)).toBeInTheDocument();
      });
    });
  });

  describe('Corruption Effect Special Handling', () => {
    it('should display CORRUPTED text for corruption effect', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'corruption',
            targetId: 'player1'
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      const corruptedText = screen.getByText('CORRUPTED');
      expect(corruptedText).toBeInTheDocument();
      expect(corruptedText).toHaveStyle({
        color: '#cc0000',
        fontSize: '5rem',
        fontWeight: '900'
      });
    });

    it('should apply correct styling to corruption text', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'corruption',
            targetId: 'player1'
          }
        ]
      }];

      render(<DamageEffects {...defaultProps} eventsLog={eventsLog} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      const corruptedText = screen.getByText('CORRUPTED');
      expect(corruptedText).toHaveStyle({
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        letterSpacing: '0.2em',
        zIndex: '10',
        pointerEvents: 'none'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown abilities gracefully', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'action_announcement',
            targetId: 'player1',
            abilityName: 'Unknown Ability'
          },
          {
            type: 'damage',
            targetId: 'player1',
            damage: 10
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should not crash, but no effect should be triggered
      expect(container.firstChild).toBeNull();
    });

    it('should handle missing abilityName gracefully', async () => {
      const eventsLog = [{
        round: 1,
        events: [
          {
            type: 'action_announcement',
            targetId: 'player1'
          },
          {
            type: 'damage',
            targetId: 'player1',
            damage: 10
          }
        ]
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should default to blunt effect for monster attacks
      expect(container.querySelector('.blunt-effect')).toBeInTheDocument();
    });

    it('should handle empty events array', () => {
      const eventsLog = [{
        round: 1,
        events: []
      }];

      const { container } = render(
        <DamageEffects {...defaultProps} eventsLog={eventsLog} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should handle undefined eventsLog', () => {
      const props = { ...defaultProps, eventsLog: undefined };
      const { container } = render(<DamageEffects {...props} />);

      expect(container.firstChild).toBeNull();
    });
  });
});
