/**
 * @fileoverview Tooltip component for displaying helpful information on hover
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './Tooltip.css';

/**
 * Tooltip component adds a tooltip to any element on hover
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Element to attach tooltip to
 * @param {string|React.ReactNode} props.content - Content to display in tooltip
 * @param {string} props.position - Position of tooltip (top, right, bottom, left)
 * @returns {React.ReactElement} The rendered component
 */
const Tooltip = ({ children, content, position = 'top' }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div 
      className="tooltip-container"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <div className={`tooltip tooltip-${position}`}>
          {content}
        </div>
      )}
    </div>
  );
};

Tooltip.propTypes = {
  children: PropTypes.node.isRequired,
  content: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.node
  ]).isRequired,
  position: PropTypes.oneOf(['top', 'right', 'bottom', 'left'])
};

export default Tooltip;

