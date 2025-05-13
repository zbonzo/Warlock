/**
 * @fileoverview Card component for displaying a selectable class
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import './ClassCard.css';

/**
 * Get icon for a class
 * 
 * @param {string} className - Class name
 * @returns {string} Icon for the class
 */
const getClassIcon = (className) => {
  const icons = {
    Warrior: '⚔️',
    Pyromancer: '🔥',
    Wizard: '🧙',
    Assassin: '🗡️',
    Rogue: '👥',
    Priest: '✝️',
    Oracle: '🔮',
    Seer: '👁️',
    Shaman: '🌪️',
    Gunslinger: '🔫',
    Tracker: '🏹',
    Druid: '🌿'
  };
  
  return icons[className] || '📚';
};

/**
 * ClassCard component displays a selectable class card
 * 
 * @param {Object} props - Component props
 * @param {string} props.className - The class name to display
 * @param {Function} props.onSelect - Callback when class is selected
 * @returns {React.ReactElement} The rendered component
 */
const ClassCard = ({ className, onSelect }) => {
  const theme = useTheme();
  const icon = getClassIcon(className);
  
  return (
    <div className="class-card" onClick={onSelect}>
      <div className="class-icon">{icon}</div>
      <div className="class-name">{className}</div>
    </div>
  );
};

ClassCard.propTypes = {
  className: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired
};

export default ClassCard;