/**
 * Data mappings for racial abilities
 * Extracted to a separate file for better organization and reuse
 */

/**
 * Mapping of races to their corresponding ability types
 * @type {Object.<string, string>}
 */
export const RACE_TO_ABILITY = {
    'Artisan': 'adaptability',
    'Rockhewn': 'stoneResolve',
    'Crestfallen': 'keenSenses',
    'Orc': 'bloodRage',
    'Kinfolk': 'forestsGrace',
    'Lich': 'undying'
  };
  
  /**
   * Ability type to icon mapping
   * @type {Object.<string, string>}
   */
  export const ABILITY_ICONS = {
    'adaptability': '🔄',
    'stoneResolve': '🛡️',
    'keenSenses': '👁️',
    'bloodRage': '💢',
    'forestsGrace': '🌿',
    'undying': '💀'
  };
  
  /**
   * Race to color mapping
   * @type {Object.<string, string>}
   */
  export const RACE_COLORS = {
    'Artisan': '#4169E1',    // Royal Blue
    'Rockhewn': '#8B4513',    // Saddle Brown
    'Crestfallen': '#228B22',      // Forest Green
    'Orc': '#8B0000',      // Dark Red
    'Kinfolk': '#9932CC',    // Dark Orchid
    'Lich': '#36454F'  // Charcoal
  };
  
  /**
   * Get race from ability type
   * 
   * @param {string} abilityType - Ability type identifier
   * @returns {string} Race name or 'Unknown'
   */
  export function getRaceFromAbilityType(abilityType) {
    for (const [race, type] of Object.entries(RACE_TO_ABILITY)) {
      if (type === abilityType) return race;
    }
    return 'Unknown';
  }
  
  /**
   * Get ability type from race
   * 
   * @param {string} race - Race name
   * @returns {string|null} Ability type or null if not found
   */
  export function getAbilityTypeFromRace(race) {
    return RACE_TO_ABILITY[race] || null;
  }
  
  /**
   * Get color for a specific race
   * 
   * @param {string} race - Race name
   * @param {Object} theme - Theme object (optional fallback)
   * @returns {string} Color code
   */
  export function getRaceColor(race, theme) {
    return RACE_COLORS[race] || (theme ? theme.colors.primary : '#4a2c82');
  }

