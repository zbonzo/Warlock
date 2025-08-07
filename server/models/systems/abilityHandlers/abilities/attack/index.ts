/**
 * @fileoverview Attack abilities module exports
 * Centralized export for all attack ability handlers
 */

export { handleAttack } from './basic-attack.js';
export { 
  handlePoisonStrike, 
  handleDeathMark, 
  handlePoisonTrap 
} from './poison-attacks.js';
export { 
  handleAoeDamage, 
  handleInfernoBlast 
} from './aoe-attacks.js';
export { handleMultiHitAttack } from './multi-hit-attacks.js';
export {
  handleVulnerabilityStrike,
  handleRecklessStrike,
  handleBarbedArrow,
  handlePyroblast
} from './special-attacks.js';