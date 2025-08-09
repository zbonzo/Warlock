/**
 * @fileoverview Card component for displaying an individual ability
 */
import React from 'react';
import { ABILITY_CATEGORIES, DEFAULT_CATEGORY, type AbilityCategory } from '../constants';
import type { Ability } from '../../../../types/shared';
import './AbilityCard.css';

export interface AbilityCardProps {
  ability: Ability;
  onSelect: () => void;
}

const AbilityCard: React.FC<AbilityCardProps> = ({ ability, onSelect }) => {
  const getCategoryInfo = (category?: string): AbilityCategory => {
    return (category && ABILITY_CATEGORIES[category]) || DEFAULT_CATEGORY;
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

export default AbilityCard;
