export const COLOR_TOKENS = {
  sidebar: '#172238',
  mainBg: '#F7F7F0',
  primaryYellow: '#FFD21C',
  yellowHover: '#EFC000',
  paleYellow: '#FFF6C9',
  cardBg: '#FFFFFF',
  mint: '#78E9AD',
  mintDark: '#0C5A37',
  mintLight: '#E8FAF1',
  blue: '#5BA4F5',
  blueDark: '#134685',
  blueLight: '#EBF4FE',
  primaryText: '#172238',
  secondaryText: '#718096',
  border: '#ECEDE8',
  error: '#EF6461',
  errorLight: '#FDF0F0',
} as const;

export type ColorTokenKey = keyof typeof COLOR_TOKENS;
