/**
 * @fileoverview Component for displaying a grid of class options
 */
import React from 'react';
import ClassCard from './ClassCard';
import type { PlayerClass } from '../../../../types/shared';
import './ClassList.css';

export interface ClassListProps {
  classes: PlayerClass[];
  onClassSelect: (className: PlayerClass) => void;
}

const ClassList: React.FC<ClassListProps> = ({ classes, onClassSelect }) => {
  return (
    <div className="class-list">
      {classes.map(className => (
        <ClassCard
          key={className.id}
          className={className}
          onSelect={() => onClassSelect(className)}
        />
      ))}
    </div>
  );
};

export default ClassList;