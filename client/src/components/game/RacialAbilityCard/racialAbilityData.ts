/**
 * Data mappings for racial abilities
 * Extracted to a separate file for better organization and reuse
 */

/**
 * Mapping of races to their corresponding ability types
 */
export const RACE_TO_ABILITY: Record<string, string> = {
  'Artisan': 'adaptability',
  'Rockhewn': 'stoneResolve',
  'Crestfallen': 'keenSenses',
  'Orc': 'bloodRage',
  'Kinfolk': 'forestsGrace',
  'Lich': 'undying'
};

/**
 * Ability type to icon mapping
 */
export const ABILITY_ICONS: Record<string, string> = {
  'adaptability': '🔄',
  'stoneResolve': '🛡️',
  'keenSenses': '👁️',
  'bloodRage': '💢',
  'forestsGrace': '🌿',
  'undying': '💀'
};

/**
 * Race to color mapping
 */
export const RACE_COLORS: Record<string, string> = {
  'Artisan': '#4169E1',    // Royal Blue
  'Rockhewn': '#8B4513',    // Saddle Brown
  'Crestfallen': '#228B22',      // Forest Green
  'Orc': '#8B0000',      // Dark Red
  'Kinfolk': '#9932CC',    // Dark Orchid
  'Lich': '#36454F'  // Charcoal
};

/**
 * Get race from ability type
 */
export function getRaceFromAbilityType(abilityType: string): string {
  for (const [race, type] of Object.entries(RACE_TO_ABILITY)) {
    if (type === abilityType) return race;
  }
  return 'Unknown';
}

/**
 * Get ability type from race
 */
export function getAbilityTypeFromRace(race: string): string | null {
  return RACE_TO_ABILITY[race] || null;
}

/**
 * Get color for a specific race
 */
export function getRaceColor(race: string, theme?: any): string {
  return RACE_COLORS[race] || (theme ? theme.colors.primary : '#4a2c82');
}