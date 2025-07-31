/**
 * @fileoverview Container component for a step in the modal workflow
 */
import React from 'react';
import { useTheme } from '@contexts/ThemeContext';
import './ModalStep.css';

export interface ModalStepProps {
  title: string;
  showBackButton: boolean;
  onBack?: () => void;
  children: React.ReactNode;
}

const ModalStep: React.FC<ModalStepProps> = ({ 
  title, 
  showBackButton, 
  onBack, 
  children 
}) => {
  const theme = useTheme();
  
  return (
    <div className="modal-step">
      <p className="step-title">
        {title}
      </p>
      
      <div className="step-content">
        {children}
      </div>
      
      {showBackButton && onBack && (
        <button 
          className="back-button"
          onClick={onBack}
        >
          Back
        </button>
      )}
    </div>
  );
};

export default ModalStep;