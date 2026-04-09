import { Home, MessageSquare, Camera, Calendar, Sprout, Cloud, Settings } from 'lucide-react';
import { getThemeByIndex, DashboardTheme } from '@/utils/dashboardThemes';

export interface DashboardSectionConfig {
  id: string;
  label: string;
  icon: any;
  themeOffset: number;
}

export const DASHBOARD_SECTIONS: DashboardSectionConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, themeOffset: 0 },
  { id: 'chatapp', label: 'ChatApp', icon: MessageSquare, themeOffset: 1 },
  { id: 'memry', label: 'S2G Memry', icon: Camera, themeOffset: 3 },
  { id: '364yhvh', label: '364yhvh', icon: Calendar, themeOffset: 5 },
  { id: 'garden', label: 'My Garden', icon: Sprout, themeOffset: 7 },
  { id: 'letitrain', label: 'Let It Rain', icon: Cloud, themeOffset: 9 },
  { id: 'gosats', label: "GoSat's", icon: Settings, themeOffset: 11 },
];

export function getSectionTheme(sectionId: string): DashboardTheme {
  const now = new Date();
  const baseIndex = Math.floor(now.getHours() / 2);
  const section = DASHBOARD_SECTIONS.find(s => s.id === sectionId);
  const offset = section?.themeOffset ?? 0;
  return getThemeByIndex(baseIndex + offset);
}

export function getAllSectionThemes(): Record<string, DashboardTheme> {
  const now = new Date();
  const baseIndex = Math.floor(now.getHours() / 2);
  const themes: Record<string, DashboardTheme> = {};
  DASHBOARD_SECTIONS.forEach(s => {
    themes[s.id] = getThemeByIndex(baseIndex + s.themeOffset);
  });
  return themes;
}
