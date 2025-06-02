/**
 * @fileoverview Tutorial modal that explains the game rules
 * Displays a multi-step tutorial with basic game mechanics
 */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import { TUTORIAL_STEPS } from './constants';
import './GameTutorialModal.css';

/**
 * GameTutorialModal component displays a step-by-step tutorial for new players
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is currently open
 * @param {Function} props.onComplete - Callback when tutorial is completed
 * @returns {React.ReactElement|null} The rendered component or null if closed
 */
const GameTutorialModal = ({ isOpen, onComplete }) => {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  
  // Close the modal when ESC is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleComplete();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
  
  // Don't render if modal is closed
  if (!isOpen) return null;
  
  /**
   * Move to next step or complete the tutorial
   */
  const nextStep = () => {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };
  
  /**
   * Handle tutorial completion with exit animation
   */
  const handleComplete = () => {
    setExiting(true);
    
    // Wait for exit animation to complete
    setTimeout(() => {
      setExiting(false);
      setStep(0);
      onComplete();
    }, 300);
  };
  
  // Get current step data
  const currentStep = TUTORIAL_STEPS[step];
  
  return (
    <div className={`tutorial-overlay ${exiting ? 'exiting' : ''}`}>
      <div className="tutorial-modal">
        <div className="tutorial-progress">
          {TUTORIAL_STEPS.map((_, index) => (
            <div 
              key={index}
              className={`progress-dot ${index === step ? 'active' : index < step ? 'completed' : ''}`}
              onClick={() => setStep(index)}
            />
          ))}
        </div>
        
        <h2 className="tutorial-title">
          {currentStep.title}
        </h2>
        
        <div className="tutorial-content">
          <p>{currentStep.content}</p>
          {currentStep.image && (
            <div className="tutorial-image">
              <img 
                src={currentStep.image} 
                alt={currentStep.title}
                className="tutorial-img"
              />
            </div>
          )}
        </div>
        
        <div className="tutorial-actions">
          <button 
            className="tutorial-button back-button"
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
          >
            Back
          </button>
          
          <button 
            className="tutorial-button next-button"
            onClick={nextStep}
          >
            {step < TUTORIAL_STEPS.length - 1 ? "Next" : "Start Playing"}
          </button>
        </div>
        
        <button 
          className="close-button" 
          onClick={handleComplete}
          aria-label="Close tutorial"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

GameTutorialModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onComplete: PropTypes.func.isRequired
};

export default GameTutorialModal;
