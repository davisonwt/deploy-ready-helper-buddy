import { MessageSquare, Calendar, Sprout, Camera } from 'lucide-react';
import { getThemeByIndex, DashboardTheme } from '@/utils/dashboardThemes';

export interface DashboardSectionConfig {
  id: string;
  label: string;
  icon: any;
  themeOffset: number;
}

export const DASHBOARD_SECTIONS: DashboardSectionConfig[] = [
  { id: 'chatapp', label: 'ChatApp', icon: MessageSquare, themeOffset: 0 },
  { id: '364yhvh', label: '364yhvh Days', icon: Calendar, themeOffset: 3 },
  { id: 'garden', label: 'My Garden', icon: Sprout, themeOffset: 6 },
  { id: 'memry', label: 'S2G Memry', icon: Camera, themeOffset: 9 },
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
