/**
 * @fileoverview Component for displaying a list of abilities by level
 */
import React from 'react';
import { useTheme } from '@contexts/ThemeContext';
import AbilityCard from './AbilityCard';
import type { Ability } from '../../../../types/shared';
import './AbilityList.css';

export interface AbilityListProps {
  abilityOptions: Record<string, Ability[]>;
  onAbilitySelect: (ability: Ability) => void;
  hideLevel?: boolean;
}

const AbilityList: React.FC<AbilityListProps> = ({ 
  abilityOptions, 
  onAbilitySelect, 
  hideLevel = false 
}) => {
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

export default AbilityList;