/**
 * @fileoverview Custom avatar component for displaying player badge in action column
 * Extracted from ActionColumn for better component organization
 */
import React, { useEffect, useRef } from 'react';
import { Player } from '@/types/game';

interface CustomAvatarProps {
  player: Player;
  isCurrentPlayer: boolean;
}

/**
 * Draws a 40×40 circle with race color background, class emoji, and player initial on top
 */
function drawPlayerBadge(canvas: HTMLCanvasElement, classEmoji: string, letter: string, raceColor: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = Math.min(canvas.width, canvas.height);
  const cx = size / 2;
  const cy = size / 2;
  const r = cx - 2; // 2px padding

  ctx.clearRect(0, 0, size, size);

  // Race color background circle
  ctx.fillStyle = raceColor;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.fill();

  // Circle outline
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.stroke();

  // Class emoji in the background
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${r * 1.4}px serif`;
  ctx.fillText(classEmoji, cx, cy);

  // Player initial on top
  ctx.font = `${r * 1.2}px sans-serif`;
  ctx.fillStyle = '#FFF';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.strokeText(letter, cx, cy);
  ctx.fillText(letter, cx, cy);
}

/**
 * Custom avatar component that renders a player badge
 */
const CustomAvatar: React.FC<CustomAvatarProps> = ({ player, isCurrentPlayer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !player) return;

    const classEmojis: Record<string, string> = {
      Wizard: '🧙',
      Warrior: '⚔️',
      Priest: '⛪',
      Assassin: '🗡️',
      // Add other class mappings as needed
    };

    const raceColors: Record<string, string> = {
      Human: '#D2691E',
      Elf: '#228B22',
      Dwarf: '#8B4513',
      // Add other race mappings as needed
    };

    const classEmoji = classEmojis[player['class'] || 'Unknown'] || '🎭';
    const raceColor = raceColors[player['race'] || 'Unknown'] || '#666';
    const letter = player['name']?.charAt(0).toUpperCase() || 'U';

    drawPlayerBadge(canvas, classEmoji, letter, raceColor);
  }, [player]);

  return (
    <canvas
      ref={canvasRef}
      width="40"
      height="40"
      style={{
        border: isCurrentPlayer ? '2px solid gold' : '2px solid transparent',
        borderRadius: '50%',
        cursor: 'pointer'
      }}
    />
  );
};

export default CustomAvatar;