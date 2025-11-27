/**
 * Dashboard Theme System
 * 12 different themes that rotate every 2 hours
 * Each theme represents a different time of day/mood
 */

export interface DashboardTheme {
  name: string;
  background: string;
  cardBg: string;
  cardBorder: string;
  primaryButton: string;
  primaryButtonHover: string;
  secondaryButton: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentLight: string;
  shadow: string;
}

export const dashboardThemes: DashboardTheme[] = [
  {
    name: 'Midnight Deep',
    background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f35 50%, #0f1423 100%)',
    cardBg: 'rgba(26, 31, 53, 0.85)',
    cardBorder: 'rgba(100, 200, 255, 0.2)',
    primaryButton: 'linear-gradient(135deg, #64c8ff 0%, #4a9eff 100%)',
    primaryButtonHover: 'linear-gradient(135deg, #7dd3ff 0%, #5eb0ff 100%)',
    secondaryButton: 'rgba(100, 200, 255, 0.15)',
    textPrimary: '#ffffff',
    textSecondary: '#b8d4ff',
    accent: '#64c8ff',
    accentLight: '#9bf6ff',
    shadow: 'rgba(100, 200, 255, 0.15)',
  },
  {
    name: 'Dawn Purple',
    background: 'linear-gradient(135deg, #1a0f2e 0%, #2d1b4e 50%, #3d2568 100%)',
    cardBg: 'rgba(45, 27, 78, 0.85)',
    cardBorder: 'rgba(200, 150, 255, 0.25)',
    primaryButton: 'linear-gradient(135deg, #c896ff 0%, #a855f7 100%)',
    primaryButtonHover: 'linear-gradient(135deg, #d4a5ff 0%, #b366ff 100%)',
    secondaryButton: 'rgba(200, 150, 255, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#e9d5ff',
    accent: '#c896ff',
    accentLight: '#e9d5ff',
    shadow: 'rgba(200, 150, 255, 0.2)',
  },
  {
    name: 'Sunrise Amber',
    background: 'linear-gradient(135deg, #2d1810 0%, #4a2c1a 50%, #6b3d25 100%)',
    cardBg: 'rgba(74, 44, 26, 0.85)',
    cardBorder: 'rgba(255, 183, 77, 0.3)',
    primaryButton: 'linear-gradient(135deg, #ffb74d 0%, #ff9800 100%)',
    primaryButtonHover: 'linear-gradient(135deg, #ffc870 0%, #ffa726 100%)',
    secondaryButton: 'rgba(255, 183, 77, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#ffe0b2',
    accent: '#ffb74d',
    accentLight: '#ffe0b2',
    shadow: 'rgba(255, 183, 77, 0.25)',
  },
  {
    name: 'Morning Gold',
    background: 'linear-gradient(135deg, #3d2e1a 0%, #5c4226 50%, #7a5633 100%)',
    cardBg: 'rgba(92, 66, 38, 0.85)',
    cardBorder: 'rgba(255, 224, 130, 0.3)',
    primaryButton: 'linear-gradient(135deg, #ffe082 0%, #ffc107 100%)',
    primaryButtonHover: 'linear-gradient(135deg, #ffe699 0%, #ffca28 100%)',
    secondaryButton: 'rgba(255, 224, 130, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#fff9c4',
    accent: '#ffe082',
    accentLight: '#fff9c4',
    shadow: 'rgba(255, 224, 130, 0.25)',
  },
  {
    name: 'Daylight Blue',
    background: 'linear-gradient(135deg, #1a2332 0%, #2d3f54 50%, #3d5270 100%)',
    cardBg: 'rgba(45, 63, 84, 0.85)',
    cardBorder: 'rgba(100, 181, 246, 0.3)',
    primaryButton: 'linear-gradient(135deg, #64b5f6 0%, #2196f3 100%)',
    primaryButtonHover: 'linear-gradient(135deg, #81c784 0%, #42a5f5 100%)',
    secondaryButton: 'rgba(100, 181, 246, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#bbdefb',
    accent: '#64b5f6',
    accentLight: '#bbdefb',
    shadow: 'rgba(100, 181, 246, 0.25)',
  },
  {
    name: 'Ocean Teal',
    background: 'linear-gradient(135deg, #1a2e2e 0%, #2d4a4a 50%, #3d6060 100%)',
    cardBg: 'rgba(45, 74, 74, 0.85)',
    cardBorder: 'rgba(77, 208, 225, 0.3)',
    primaryButton: 'linear-gradient(135deg, #4dd0e1 0%, #00acc1 100%)',
    primaryButtonHover: 'linear-gradient(135deg, #66d9ea 0%, #26c6da 100%)',
    secondaryButton: 'rgba(77, 208, 225, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#b2ebf2',
    accent: '#4dd0e1',
    accentLight: '#b2ebf2',
    shadow: 'rgba(77, 208, 225, 0.25)',
  },
  {
    name: 'Forest Green',
    background: 'linear-gradient(135deg, #1a2e1f 0%, #2d4a35 50%, #3d6047 100%)',
    cardBg: 'rgba(45, 74, 53, 0.85)',
    cardBorder: 'rgba(129, 199, 132, 0.3)',
    primaryButton: 'linear-gradient(135deg, #81c784 0%, #4caf50 100%)',
    primaryButtonHover: 'linear-gradient(135deg, #a5d6a7 0%, #66bb6a 100%)',
    secondaryButton: 'rgba(129, 199, 132, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#c8e6c9',
    accent: '#81c784',
    accentLight: '#c8e6c9',
    shadow: 'rgba(129, 199, 132, 0.25)',
  },
  {
    name: 'Emerald Jade',
    background: 'linear-gradient(135deg, #1a2e28 0%, #2d4a40 50%, #3d6054 100%)',
    cardBg: 'rgba(45, 74, 64, 0.85)',
    cardBorder: 'rgba(102, 187, 106, 0.3)',
    primaryButton: 'linear-gradient(135deg, #66bb6a 0%, #26a69a 100%)',
    primaryButtonHover: 'linear-gradient(135deg, #81c784 0%, #4db6ac 100%)',
    secondaryButton: 'rgba(102, 187, 106, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#c8e6c9',
    accent: '#66bb6a',
    accentLight: '#c8e6c9',
    shadow: 'rgba(102, 187, 106, 0.25)',
  },
  {
    name: 'Sunset Orange',
    background: 'linear-gradient(135deg, #2e1a0f 0%, #4a2d1a 50%, #603d25 100%)',
    cardBg: 'rgba(74, 45, 26, 0.85)',
    cardBorder: 'rgba(255, 152, 0, 0.3)',
    primaryButton: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
    primaryButtonHover: 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)',
    secondaryButton: 'rgba(255, 152, 0, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#ffe0b2',
    accent: '#ff9800',
    accentLight: '#ffe0b2',
    shadow: 'rgba(255, 152, 0, 0.25)',
  },
  {
    name: 'Crimson Red',
    background: 'linear-gradient(135deg, #2e1a1a 0%, #4a2d2d 50%, #603d3d 100%)',
    cardBg: 'rgba(74, 45, 45, 0.85)',
    cardBorder: 'rgba(239, 83, 80, 0.3)',
    primaryButton: 'linear-gradient(135deg, #ef5350 0%, #e53935 100%)',
    primaryButtonHover: 'linear-gradient(135deg, #f7706e 0%, #ef5350 100%)',
    secondaryButton: 'rgba(239, 83, 80, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#ffcdd2',
    accent: '#ef5350',
    accentLight: '#ffcdd2',
    shadow: 'rgba(239, 83, 80, 0.25)',
  },
  {
    name: 'Twilight Indigo',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d4a 50%, #3d3d60 100%)',
    cardBg: 'rgba(45, 45, 74, 0.85)',
    cardBorder: 'rgba(126, 87, 194, 0.3)',
    primaryButton: 'linear-gradient(135deg, #7e57c2 0%, #5e35b1 100%)',
    primaryButtonHover: 'linear-gradient(135deg, #9575cd 0%, #7e57c2 100%)',
    secondaryButton: 'rgba(126, 87, 194, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#d1c4e9',
    accent: '#7e57c2',
    accentLight: '#d1c4e9',
    shadow: 'rgba(126, 87, 194, 0.25)',
  },
  {
    name: 'Starlight Cyan',
    background: 'linear-gradient(135deg, #0f1a1f 0%, #1a2d35 50%, #253d47 100%)',
    cardBg: 'rgba(26, 45, 53, 0.85)',
    cardBorder: 'rgba(38, 198, 218, 0.3)',
    primaryButton: 'linear-gradient(135deg, #26c6da 0%, #00acc1 100%)',
    primaryButtonHover: 'linear-gradient(135deg, #4dd0e1 0%, #26c6da 100%)',
    secondaryButton: 'rgba(38, 198, 218, 0.2)',
    textPrimary: '#ffffff',
    textSecondary: '#b2ebf2',
    accent: '#26c6da',
    accentLight: '#b2ebf2',
    shadow: 'rgba(38, 198, 218, 0.25)',
  },
];

/**
 * Get the current theme based on the hour (rotates every 2 hours)
 * 12 themes = 24 hours / 12 = 2 hours per theme
 */
export function getCurrentTheme(): DashboardTheme {
  const now = new Date();
  const hour = now.getHours();
  // Each theme lasts 2 hours: 0-1, 2-3, 4-5, etc.
  const themeIndex = Math.floor(hour / 2);
  return dashboardThemes[themeIndex % dashboardThemes.length];
}

/**
 * Get theme by index (for testing or manual selection)
 */
export function getThemeByIndex(index: number): DashboardTheme {
  return dashboardThemes[index % dashboardThemes.length];
}

