/**
 * @fileoverview Component for displaying a grid of class options
 */
import React from 'react';
import PropTypes from 'prop-types';
import ClassCard from './ClassCard';
import './ClassList.css';

/**
 * ClassList component displays a grid of selectable classes
 * 
 * @param {Object} props - Component props
 * @param {Array} props.classes - List of class names to display
 * @param {Function} props.onClassSelect - Callback when a class is selected
 * @returns {React.ReactElement} The rendered component
 */
const ClassList = ({ classes, onClassSelect }) => {
  return (
    <div className="class-list">
      {classes.map(className => (
        <ClassCard
          key={className}
          className={className}
          onSelect={() => onClassSelect(className)}
        />
      ))}
    </div>
  );
};

ClassList.propTypes = {
  classes: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClassSelect: PropTypes.func.isRequired
};

export default ClassList;
