/**
 * Loading screen component shown during data fetching
 */
import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
}

/**
 * LoadingScreen component displays a loading spinner with a message
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  return (
    <div className="loading-screen full-screen-center">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>
    </div>
  );
};

export default LoadingScreen;
