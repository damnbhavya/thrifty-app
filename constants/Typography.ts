/**
 * Typography tokens — Outfit font from Google Fonts
 * Matches the website's font usage.
 */

export const Fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semiBold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

export const FontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 36,
  '4xl': 48,
} as const;

/** Section label style — 12px, 600 weight, uppercase, lime, letter-spacing 0.07em */
export const SectionLabelStyle = {
  fontFamily: Fonts.semiBold,
  fontSize: 12,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.84, // 12 * 0.07
  color: '#CDF12B',
};
