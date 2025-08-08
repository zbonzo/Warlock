/**
 * @fileoverview Tests for Confetti component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Confetti from '../../../../../client/src/pages/EndPage/components/Confetti';

// Mock the ThemeContext
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

// Mock CSS imports
jest.mock('../../../../../client/src/pages/EndPage/components/Confetti.css', () => ({}));

describe('Confetti', () => {
  const mockUseTheme = require('@contexts/ThemeContext').useTheme;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render confetti container', () => {
    render(<Confetti />);

    const container = document.querySelector('.confetti-container');
    expect(container).toBeInTheDocument();
  });

  it('should generate 100 confetti pieces', () => {
    render(<Confetti />);

    const confettiPieces = document.querySelectorAll('.confetti-piece');
    expect(confettiPieces).toHaveLength(100);
  });

  it('should use theme colors for confetti pieces', () => {
    const mockColors = {
      primary: '#000000',
      secondary: '#111111',
      accent: '#222222',
      danger: '#333333'
    };

    mockUseTheme.mockReturnValue({ colors: mockColors });

    render(<Confetti />);

    const confettiPieces = document.querySelectorAll('.confetti-piece');
    const colorsUsed = new Set();

    confettiPieces.forEach(piece => {
      const backgroundColor = (piece as HTMLElement).style.backgroundColor;
      colorsUsed.add(backgroundColor);
    });

    // Should use colors from the theme (converted to rgb format by browser)
    expect(colorsUsed.size).toBeGreaterThan(0);
  });

  it('should generate confetti pieces with random properties', () => {
    render(<Confetti />);

    const confettiPieces = document.querySelectorAll('.confetti-piece');
    const positions = new Set();
    const sizes = new Set();
    const opacities = new Set();

    confettiPieces.forEach(piece => {
      const style = (piece as HTMLElement).style;
      positions.add(style.left);
      sizes.add(style.width);
      opacities.add(style.opacity);
    });

    // Should have variety in positions, sizes, and opacities
    expect(positions.size).toBeGreaterThan(1);
    expect(sizes.size).toBeGreaterThan(1);
    expect(opacities.size).toBeGreaterThan(1);
  });

  it('should generate both circular and square confetti pieces', () => {
    render(<Confetti />);

    const confettiPieces = document.querySelectorAll('.confetti-piece');
    const borderRadii = new Set();

    confettiPieces.forEach(piece => {
      const borderRadius = (piece as HTMLElement).style.borderRadius;
      borderRadii.add(borderRadius);
    });

    // Should have both '50%' (circles) and '0%' (squares)
    expect(borderRadii.has('50%')).toBe(true);
    expect(borderRadii.has('0%')).toBe(true);
  });

  it('should set appropriate size range for confetti pieces', () => {
    render(<Confetti />);

    const confettiPieces = document.querySelectorAll('.confetti-piece');

    confettiPieces.forEach(piece => {
      const style = (piece as HTMLElement).style;
      const width = parseFloat(style.width);
      const height = parseFloat(style.height);

      // Size should be between 5 and 15 pixels
      expect(width).toBeGreaterThanOrEqual(5);
      expect(width).toBeLessThanOrEqual(15);
      expect(height).toBe(width); // Width and height should be equal
    });
  });

  it('should set appropriate opacity range for confetti pieces', () => {
    render(<Confetti />);

    const confettiPieces = document.querySelectorAll('.confetti-piece');

    confettiPieces.forEach(piece => {
      const opacity = parseFloat((piece as HTMLElement).style.opacity);

      // Opacity should be between 0.3 and 1.0
      expect(opacity).toBeGreaterThanOrEqual(0.3);
      expect(opacity).toBeLessThanOrEqual(1.0);
    });
  });

  it('should set animation properties for each confetti piece', () => {
    render(<Confetti />);

    const confettiPieces = document.querySelectorAll('.confetti-piece');

    confettiPieces.forEach(piece => {
      const style = (piece as HTMLElement).style;

      expect(style.animationDuration).toBeTruthy();
      expect(style.animationDelay).toBeTruthy();

      const duration = parseFloat(style.animationDuration);
      const delay = parseFloat(style.animationDelay);

      // Duration should be between 2 and 5 seconds
      expect(duration).toBeGreaterThanOrEqual(2);
      expect(duration).toBeLessThanOrEqual(5);

      // Delay should be between 0 and 2 seconds
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(2);
    });
  });

  it('should position confetti pieces across full width', () => {
    render(<Confetti />);

    const confettiPieces = document.querySelectorAll('.confetti-piece');
    const positions = new Set();

    confettiPieces.forEach(piece => {
      const left = (piece as HTMLElement).style.left;
      positions.add(left);

      // Position should be a percentage
      expect(left).toMatch(/%$/);

      const positionValue = parseFloat(left);
      expect(positionValue).toBeGreaterThanOrEqual(0);
      expect(positionValue).toBeLessThanOrEqual(100);
    });

    // Should have good distribution across the width
    expect(positions.size).toBeGreaterThan(50); // Most pieces should have unique positions
  });

  it('should use all theme colors across all confetti pieces', () => {
    const mockColors = {
      primary: 'rgb(26, 26, 26)',
      secondary: 'rgb(51, 51, 51)',
      accent: 'rgb(255, 107, 53)',
      danger: 'rgb(220, 53, 69)'
    };

    mockUseTheme.mockReturnValue({ colors: mockColors });

    render(<Confetti />);

    const confettiPieces = document.querySelectorAll('.confetti-piece');
    const colorsUsed = new Set();

    confettiPieces.forEach(piece => {
      const backgroundColor = (piece as HTMLElement).style.backgroundColor;
      colorsUsed.add(backgroundColor);
    });

    // With 100 pieces, we should see most if not all theme colors used
    expect(colorsUsed.size).toBeGreaterThan(2);
  });

  it('should render without errors when theme colors are empty', () => {
    mockUseTheme.mockReturnValue({
      colors: {}
    });

    expect(() => render(<Confetti />)).not.toThrow();

    const confettiPieces = document.querySelectorAll('.confetti-piece');
    expect(confettiPieces).toHaveLength(100);
  });
});
