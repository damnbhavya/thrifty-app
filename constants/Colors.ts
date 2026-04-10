/**
 * Thrifty Design Tokens — "Mira Style" Dark Theme
 * Synced with website's index.css
 */

export const Colors = {
  // Core brand
  primary: '#CDF12B',        // Lime accent
  primaryDark: '#b8d926',    // Pressed buttons
  primaryText: '#111111',    // Text on lime backgrounds
  secondary: '#1E45FC',      // Info, links

  // Surfaces
  background: '#111111',     // App background
  surface: '#1A1A1A',        // Card backgrounds
  surfaceElevated: '#222222', // Sheets, modals

  // Borders
  border: '#2A2A2A',
  borderHover: '#3A3A3A',

  // Semantic
  success: '#22C55E',
  warning: '#EAB308',
  danger: '#FF4D4D',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#555555',

  // Tab bar
  tabBar: '#0D0D0D',
  tabBarBorder: '#1A1A1A',
};

/** Category colors — matches website DashboardContext */
export const CategoryColors: Record<string, string> = {
  food: '#FF6B6B',
  groceries: '#00CEC9',
  transport: '#74B9FF',
  subscriptions: '#A29BFE',
  entertainment: '#FD79A8',
  utilities: '#FDCB6E',
  shopping: '#00D2D3',
  health: '#00B894',
  education: '#6C5CE7',
  rent: '#E17055',
  transfers: '#636E72',
  cash_withdrawal: '#B2BEC3',
  other: '#DFE6E9',
};
