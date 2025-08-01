/**
 * @fileoverview Card component for displaying a selectable class
 */
import React from 'react';
import { useTheme } from '@contexts/ThemeContext';
import type { PlayerClass } from '../../../../types/shared';
import './ClassCard.css';

const getClassIcon = (playerClass: PlayerClass): string => {
  const icons: Record<string, string> = {
    Warrior: '⚔️',
    Pyromancer: '🔥',
    Wizard: '🧙',
    Assassin: '🥷',
    Alchemist: '🧪',
    Priest: '✨',
    Oracle: '🔮',
    Barbarian: '🪓',
    Shaman: '🌀',
    Gunslinger: '💥',
    Tracker: '🏹',
    Druid: '🌿',
  };

  return icons[playerClass.name] || '📚';
};

export interface ClassCardProps {
  className: PlayerClass;
  onSelect: () => void;
}

const ClassCard: React.FC<ClassCardProps> = ({ className, onSelect }) => {
  const theme = useTheme();
  const icon = getClassIcon(className);

  return (
    <div className="class-card" onClick={onSelect}>
      <div className="class-icon">{icon}</div>
      <div className="class-name">{className.name}</div>
    </div>
  );
};

export default ClassCard;