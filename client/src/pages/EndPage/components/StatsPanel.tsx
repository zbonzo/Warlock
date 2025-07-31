/**
 * @fileoverview Panel for displaying game statistics
 * Shows numerical stats with labels
 */
import React from 'react';
import './StatsPanel.css';

interface Stat {
  value: number;
  label: string;
  color?: string;
}

interface StatsPanelProps {
  stats: Stat[];
}

/**
 * StatsPanel component displays a set of game statistics
 */
const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
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

export default StatsPanel;