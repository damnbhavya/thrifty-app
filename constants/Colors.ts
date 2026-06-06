/**
 * Thrifty Design Tokens — Light & Dark Themes
 */

export const LightColors = {
  // Core brand
  primary: '#CDF12B',
  primaryDark: '#b8d926',
  primaryText: '#111111',
  secondary: '#1E45FC',

  // Surfaces
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F3F5',

  // Borders
  border: '#E2E6EA',
  borderHover: '#CBD3DA',

  // Semantic
  success: '#22C55E',
  warning: '#EAB308',
  danger: '#FF4D4D',

  // Text
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E6EA',
};

export const DarkColors = {
  // Core brand — same lime accent
  primary: '#CDF12B',
  primaryDark: '#b8d926',
  primaryText: '#111111',
  secondary: '#1E45FC',

  // Surfaces — dark mode
  background: '#111111',
  surface: '#1A1A1A',
  surfaceElevated: '#222222',

  // Borders
  border: '#2A2A2A',
  borderHover: '#3A3A3A',

  // Semantic — same
  success: '#22C55E',
  warning: '#EAB308',
  danger: '#FF4D4D',

  // Text — inverted
  textPrimary: '#F5F5F5',
  textSecondary: '#A1A1A1',
  textMuted: '#6B7280',

  // Tab bar
  tabBar: '#111111',
  tabBarBorder: '#2A2A2A',
};

export type ThemeColors = typeof LightColors;

/**
 * Default export — light theme.
 * This is kept for backward compatibility with existing StyleSheet.create calls.
 * New code should use useTheme().colors instead.
 */
export const Colors = LightColors;

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
