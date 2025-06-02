/**
 * @fileoverview Component for displaying a list of abilities by level
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import AbilityCard from './AbilityCard';
import './AbilityList.css';

/**
 * AbilityList component displays abilities grouped by level
 * 
 * @param {Object} props - Component props
 * @param {Object} props.abilityOptions - Map of abilities by level
 * @param {Function} props.onAbilitySelect - Callback when ability is selected
 * @param {boolean} props.hideLevel - Whether to hide level headers
 * @returns {React.ReactElement} The rendered component
 */
const AbilityList = ({ abilityOptions, onAbilitySelect, hideLevel = false }) => {
  const theme = useTheme();
  
  return (
    <div className="ability-list">
      {Object.entries(abilityOptions).map(([level, abilityList]) => (
        <div key={level} className="ability-level-group">
          {!hideLevel && (
            <h3 className="level-title">
              Level {level} Abilities
            </h3>
          )}
          
          <div className="ability-cards">
            {abilityList.map(ability => (
              <AbilityCard
                key={ability.type}
                ability={ability}
                onSelect={() => onAbilitySelect(ability)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

AbilityList.propTypes = {
  abilityOptions: PropTypes.object.isRequired,
  onAbilitySelect: PropTypes.func.isRequired,
  hideLevel: PropTypes.bool
};

export default AbilityList;
