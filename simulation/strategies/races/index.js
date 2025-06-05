/**
 * @fileoverview Race Behaviors Index - Exports all race behaviors
 */

const ArtisanBehavior = require('./artisan-behavior');
const RockhewnBehavior = require('./rockhewn-behavior');
const CrestfallenBehavior = require('./crestfallen-behavior');
const OrcBehavior = require('./orc-behavior');
const KinfolkBehavior = require('./kinfolk-behavior');
const LichBehavior = require('./lich-behavior');

/**
 * Factory function to create race behaviors
 * @param {string} race - Race name
 * @returns {Object} Appropriate race behavior instance
 */
function createRaceBehavior(race) {
  switch (race) {
    case 'Artisan':
      return new ArtisanBehavior();
    case 'Rockhewn':
      return new RockhewnBehavior();
    case 'Crestfallen':
      return new CrestfallenBehavior();
    case 'Orc':
      return new OrcBehavior();
    case 'Kinfolk':
      return new KinfolkBehavior();
    case 'Lich':
      return new LichBehavior();
    default:
      return null; // No special race behavior
  }
}

module.exports = {
  ArtisanBehavior,
  RockhewnBehavior,
  CrestfallenBehavior,
  OrcBehavior,
  KinfolkBehavior,
  LichBehavior,
  createRaceBehavior,
};
