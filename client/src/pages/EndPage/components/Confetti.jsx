/**
 * @fileoverview Confetti effect component for celebrations
 * Creates animated confetti pieces in various colors
 */
import React from 'react';
import { useTheme } from '@contexts/ThemeContext';
import './Confetti.css';

/**
 * Confetti component that displays animated confetti pieces
 * @returns {React.ReactElement} The rendered confetti
 */
const Confetti = () => {
  const theme = useTheme();
  
  // Theme colors for confetti pieces
  const colors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.accent,
    theme.colors.danger
  ];
  
  // Number of confetti pieces to generate
  const pieceCount = 100;
  
  /**
   * Generate random confetti piece with unique properties
   * 
   * @param {number} index - Index for React key
   * @returns {React.ReactElement} A confetti piece
   */
  const renderConfettiPiece = (index) => {
    // Generate random properties for variety
    const size = Math.random() * 10 + 5; // 5-15px
    const left = Math.random() * 100 + '%'; // Random horizontal position
    const animationDuration = Math.random() * 3 + 2; // 2-5s
    const animationDelay = Math.random() * 2; // 0-2s delay
    const colorIndex = Math.floor(Math.random() * 4); // Pick from theme colors
    const isCircle = Math.random() > 0.5; // 50% chance for circles vs squares
    
    return (
      <div 
        key={index}
        className="confetti-piece"
        style={{
          left,
          width: size,
          height: size,
          backgroundColor: colors[colorIndex],
          borderRadius: isCircle ? '50%' : '0%',
          opacity: Math.random() * 0.7 + 0.3, // 0.3-1.0 opacity
          animationDuration: `${animationDuration}s`,
          animationDelay: `${animationDelay}s`
        }}
      />
    );
  };
  
  return (
    <div className="confetti-container">
      {Array.from({ length: pieceCount }).map((_, i) => renderConfettiPiece(i))}
    </div>
  );
};

export default Confetti;

