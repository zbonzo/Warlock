/**
 * @fileoverview Panel for displaying game statistics
 * Shows numerical stats with labels
 */
import React from 'react';
import PropTypes from 'prop-types';
import './StatsPanel.css';

/**
 * StatsPanel component displays a set of game statistics
 * 
 * @param {Object} props - Component props
 * @param {Array} props.stats - Array of stat objects
 * @returns {React.ReactElement} The rendered component
 */
const StatsPanel = ({ stats }) => {
  return (
    <div className="stats-panel">
      {stats.map((stat, index) => (
        <div key={index} className="stat-card">
          <div 
            className="stat-value"
            style={{ color: stat.color }}
          >
            {stat.value}
          </div>
          <div className="stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

StatsPanel.propTypes = {
  stats: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.number.isRequired,
      label: PropTypes.string.isRequired,
      color: PropTypes.string
    })
  ).isRequired
};

export default StatsPanel;