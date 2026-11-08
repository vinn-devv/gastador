import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#172B3A',
    background: '#F7F9FC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E0F2FD',
    textSecondary: '#8293A3',

    surface: '#FFFFFF',
    sunken: '#EFF5FA',
    line: '#DEE8F0',
    muted: '#8293A3',
    primary: '#55A9E8',
    onPrimary: '#123B5D',
    primarySoft: '#E0F2FD',
    navy: '#123B5D',
    balanceEnd: '#123B5D',
    mint: '#55A9E8',
    teal: '#55A9E8',
    tealSoft: '#E0F2FD',
    warning: '#D97706',
    warningSoft: '#FEF3C7',
    danger: '#E11D48',
    dangerSoft: '#FFE4E6',
  },
  dark: {
    text: '#EDF5FA',
    background: '#09141F',
    backgroundElement: '#102333',
    backgroundSelected: '#1A394D',
    textSecondary: '#A1B5C3',

    surface: '#102333',
    sunken: '#182F41',
    line: '#273F52',
    muted: '#A1B5C3',
    primary: '#8ECDF5',
    onPrimary: '#123B5D',
    primarySoft: '#1A394D',
    navy: '#123B5D',
    balanceEnd: '#0D2E4A',
    mint: '#8ECDF5',
    teal: '#55A9E8',
    tealSoft: '#182F41',
    warning: '#F9BE58',
    warningSoft: '#3A2F1A',
    danger: '#FA7785',
    dangerSoft: '#3E1F27',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
