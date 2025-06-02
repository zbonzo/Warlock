/**
 * @fileoverview Container component for a step in the modal workflow
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import './ModalStep.css';

/**
 * ModalStep component for wrapping step content in the modal
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Title/description for the step
 * @param {boolean} props.showBackButton - Whether to show back button
 * @param {Function|null} props.onBack - Callback for back button
 * @param {React.ReactNode} props.children - Step content
 * @returns {React.ReactElement} The rendered component
 */
const ModalStep = ({ title, showBackButton, onBack, children }) => {
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

ModalStep.propTypes = {
  title: PropTypes.string.isRequired,
  showBackButton: PropTypes.bool.isRequired,
  onBack: PropTypes.func,
  children: PropTypes.node.isRequired
};

export default ModalStep;

