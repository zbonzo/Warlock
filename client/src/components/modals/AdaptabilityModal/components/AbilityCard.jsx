/**
 * @fileoverview Card component for displaying an individual ability
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import { ABILITY_CATEGORIES, DEFAULT_CATEGORY } from '../constants';
import './AbilityCard.css';

/**
 * AbilityCard component displays a selectable ability card
 * 
 * @param {Object} props - Component props
 * @param {Object} props.ability - The ability to display
 * @param {Function} props.onSelect - Callback when ability is selected
 * @returns {React.ReactElement} The rendered component
 */
const AbilityCard = ({ ability, onSelect }) => {
  const theme = useTheme();
  
  /**
   * Get icon and color for an ability category
   * 
   * @param {string} category - Category name
   * @returns {Object} Icon and color for the category
   */
  const getCategoryInfo = (category) => {
    return ABILITY_CATEGORIES[category] || DEFAULT_CATEGORY;
  };
  
  const categoryInfo = getCategoryInfo(ability.category);
  
  return (
    <div className="ability-card" onClick={onSelect}>
      <div className="ability-name">
        {ability.name}
      </div>
      <div className="ability-category" style={{ color: categoryInfo.color }}>
        <span className="category-icon">{categoryInfo.icon}</span>
        <span className="category-name">
          {ability.category || 'Ability'}
        </span>
      </div>
    </div>
  );
};

AbilityCard.propTypes = {
  ability: PropTypes.shape({
    type: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    category: PropTypes.string,
    unlockAt: PropTypes.number
  }).isRequired,
  onSelect: PropTypes.func.isRequired
};

export default AbilityCard;