import { Home, Radio, TreePine, MessageSquare, Sprout, Compass } from 'lucide-react';
import { getThemeByIndex, getCurrentTheme, DashboardTheme } from '@/utils/dashboardThemes';

export interface DashboardSectionConfig {
  id: string;
  label: string;
  icon: any;
  themeOffset: number;
}

export const DASHBOARD_SECTIONS: DashboardSectionConfig[] = [
  { id: 'home', label: 'Home', icon: Home, themeOffset: 0 },
  { id: 'radio', label: 'Radio', icon: Radio, themeOffset: 2 },
  { id: 'browse', label: 'Browse', icon: TreePine, themeOffset: 4 },
  { id: 'chat', label: 'Chat', icon: MessageSquare, themeOffset: 6 },
  { id: 'garden', label: 'Garden', icon: Sprout, themeOffset: 8 },
  { id: 'explore', label: 'Explore', icon: Compass, themeOffset: 10 },
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
