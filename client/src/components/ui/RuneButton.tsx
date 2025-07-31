/**
 * @fileoverview Test component for rune-styled button
 */
import React from 'react';
import './RuneButton.css';

export interface RuneButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

const RuneButton: React.FC<RuneButtonProps> = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary',
  ...props 
}) => {
  return (
    <button
      className={`rune-button rune-button--${variant} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default RuneButton;