/**
 * client/src/components/common/LoadingScreen.jsx
 * Loading screen component shown during data fetching
 */
import React from 'react';
import PropTypes from 'prop-types';
import './LoadingScreen.css';

/**
 * LoadingScreen component displays a loading spinner with a message
 *
 * @param {Object} props - Component props
 * @param {string} props.message - Message to display
 * @returns {React.ReactElement} The rendered component
 */
const LoadingScreen = ({ message }) => {
  return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>
    </div>
  );
};

LoadingScreen.propTypes = {
  message: PropTypes.string,
};

export default LoadingScreen;


