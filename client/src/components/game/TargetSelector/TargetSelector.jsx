/**
 * @fileoverview Enhanced TargetSelector with Monster first and custom split-circle avatars
 * Used in game actions to choose where to apply an ability
 */
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import { ICONS } from '../../../config/constants';
import './TargetSelector.css';

/**
 * Draws a 40×40 circle with race color background, class emoji, and player initial on top
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} classEmoji - emoji representing the class
 * @param {string} letter - single character to center (player initial)
 * @param {string} raceColor - background color for the race
 */
function drawPlayerBadge(canvas, classEmoji, letter, raceColor) {
  const ctx = canvas.getContext('2d');
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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Stroke at 100% opacity
  ctx.lineWidth = r * 0.15;
  ctx.strokeStyle = '#000';
  ctx.globalAlpha = 1.0;
  ctx.strokeText(letter, cx, cy);

  // Fill at 60% opacity
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.6;
  ctx.fillText(letter, cx, cy);

  // Reset alpha
  ctx.globalAlpha = 1.0;
}

/**
 * Draws a menacing Monster avatar with gradient background and glowing effects
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} monster - monster data with hp information
 */
function drawMonsterBadge(canvas, monster) {
  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const cx = size / 2;
  const cy = size / 2;
  const r = cx - 2; // 2px padding

  ctx.clearRect(0, 0, size, size);

  // Create gradient background based on monster health
  const healthPercent = monster.hp / monster.maxHp;
  let gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);

  if (healthPercent > 0.7) {
    // Healthy monster - dark red to black
    gradient.addColorStop(0, '#8B0000');
    gradient.addColorStop(1, '#2D0000');
  } else if (healthPercent > 0.3) {
    // Wounded monster - orange to dark red
    gradient.addColorStop(0, '#FF4500');
    gradient.addColorStop(1, '#8B0000');
  } else {
    // Nearly defeated - bright red with warning colors
    gradient.addColorStop(0, '#FF0000');
    gradient.addColorStop(1, '#8B0000');
  }

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.fill();

  // Add a glowing outer ring for low health
  if (healthPercent < 0.3) {
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  // Main circle outline
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.stroke();

  // Monster emoji/symbol in the background
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${r * 1.4}px serif`;

  // Choose emoji based on health
  let monsterEmoji = '👹'; // Default
  if (healthPercent < 0.3) {
    monsterEmoji = '💀'; // Nearly dead
  } else if (healthPercent < 0.7) {
    monsterEmoji = '👿'; // Wounded and angry
  }

  ctx.fillText(monsterEmoji, cx, cy);

  // "M" letter on top
  ctx.font = `${r * 1.2}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Stroke at 100% opacity
  ctx.lineWidth = r * 0.15;
  ctx.strokeStyle = '#000';
  ctx.globalAlpha = 1.0;
  ctx.strokeText('M', cx, cy);

  // Fill at 80% opacity (slightly more opaque than players for distinction)
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.8;
  ctx.fillText('M', cx, cy);

  // Reset alpha
  ctx.globalAlpha = 1.0;
}

/**
 * Monster avatar component that renders a dynamic avatar based on monster health
 */
const MonsterAvatar = ({ monster }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    drawMonsterBadge(canvasRef.current, monster);
  }, [monster.hp, monster.maxHp]); // Redraw when monster health changes

  return (
    <canvas
      ref={canvasRef}
      width="40"
      height="40"
      className="monster-avatar"
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
};

/**
 * Custom avatar component that renders a circle with race color, class emoji, and name initial
 */
const CustomAvatar = ({ player, isCurrentPlayer }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const classEmoji = ICONS.CLASSES[player.class] || '❓';
    const letter = player.name.charAt(0).toUpperCase();

    // Get race color
    const raceColors = {
      Artisan: '#4169E1',
      Rockhewn: '#8B4513',
      Crestfallen: '#228B22',
      Orc: '#8B0000',
      Kinfolk: '#9932CC',
      Lich: '#36454F',
    };

    const raceColor = raceColors[player.race] || '#666666';

    drawPlayerBadge(canvasRef.current, classEmoji, letter, raceColor);
  }, [player]);

  return (
    <canvas
      ref={canvasRef}
      width="40"
      height="40"
      className="custom-avatar"
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
};

/**
 * TargetSelector component displays a list of potential targets for abilities
 * Monster appears first, followed by players with custom avatars
 *
 * @param {Object} props - Component props
 * @param {Array} props.alivePlayers - List of alive players
 * @param {Object} props.monster - Monster data
 * @param {string} props.currentPlayerId - ID of the current player
 * @param {string} props.selectedTarget - ID of the currently selected target
 * @param {Function} props.onSelectTarget - Callback when target is selected
 * @param {boolean} props.disableMonster - Whether monster should be excluded as a target
 * @returns {React.ReactElement} The rendered component
 */
const TargetSelector = ({
  alivePlayers,
  monster,
  currentPlayerId,
  selectedTarget,
  onSelectTarget,
  disableMonster = false,
}) => {
  const theme = useTheme();

  return (
    <div className="target-selector">
      <h4 className="target-selector-title">Choose Target</h4>

      <div className="target-list">
        {/* Monster target - appears first */}
        {!disableMonster && (
          <div
            onClick={() => onSelectTarget('__monster__')}
            className={`target-option monster ${selectedTarget === '__monster__' ? 'selected' : ''}`}
          >
            <div className="target-avatar-container">
              <MonsterAvatar monster={monster} />
            </div>

            <div className="target-info">
              <div className="target-name">Monster</div>
              <div className="target-health">
                HP: {monster.hp}/{monster.maxHp}
              </div>
            </div>
          </div>
        )}

        {/* Player targets with custom avatars */}
        {alivePlayers.map((player) => (
          <div
            key={player.id}
            onClick={() => onSelectTarget(player.id)}
            className={`target-option ${selectedTarget === player.id ? 'selected' : ''} ${player.id === currentPlayerId ? 'current-player' : ''}`}
          >
            <div className="target-avatar-container">
              {player.race && player.class ? (
                <CustomAvatar
                  player={player}
                  isCurrentPlayer={player.id === currentPlayerId}
                />
              ) : (
                <div
                  className={`target-avatar ${player.id === currentPlayerId ? 'current-player' : ''}`}
                >
                  {player.id === currentPlayerId
                    ? 'You'
                    : player.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="target-info">
              <div className="target-name">
                {player.name}
                {player.id === currentPlayerId && ' (You)'}
              </div>
              <div className="target-health">
                HP: {player.hp}/{player.maxHp}
              </div>
            </div>
          </div>
        ))}

        {/* Message when monster is disabled but was previously selected */}
        {disableMonster && selectedTarget === '__monster__' && (
          <div className="target-restriction-message">
            Keen Senses can only target players. Please select a player target.
          </div>
        )}
      </div>
    </div>
  );
};

MonsterAvatar.propTypes = {
  monster: PropTypes.shape({
    hp: PropTypes.number.isRequired,
    maxHp: PropTypes.number.isRequired,
  }).isRequired,
};

CustomAvatar.propTypes = {
  player: PropTypes.shape({
    name: PropTypes.string.isRequired,
    race: PropTypes.string,
    class: PropTypes.string,
  }).isRequired,
  isCurrentPlayer: PropTypes.bool,
};

TargetSelector.propTypes = {
  alivePlayers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      hp: PropTypes.number.isRequired,
      maxHp: PropTypes.number.isRequired,
      race: PropTypes.string,
      class: PropTypes.string,
    })
  ).isRequired,
  monster: PropTypes.shape({
    hp: PropTypes.number.isRequired,
    maxHp: PropTypes.number.isRequired,
  }).isRequired,
  currentPlayerId: PropTypes.string.isRequired,
  selectedTarget: PropTypes.string,
  onSelectTarget: PropTypes.func.isRequired,
  disableMonster: PropTypes.bool,
};

export default TargetSelector;


