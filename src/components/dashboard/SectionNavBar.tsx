import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DASHBOARD_SECTIONS, DashboardSectionConfig } from './sectionConfig';
import { DashboardTheme } from '@/utils/dashboardThemes';

interface SectionNavBarProps {
  activeSectionId: string;
  sectionThemes: Record<string, DashboardTheme>;
  onSectionClick: (sectionId: string) => void;
}

export const SectionNavBar: React.FC<SectionNavBarProps> = ({
  activeSectionId,
  sectionThemes,
  onSectionClick,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active pill into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const pill = activeRef.current;
      const left = pill.offsetLeft - container.offsetWidth / 2 + pill.offsetWidth / 2;
      container.scrollTo({ left, behavior: 'smooth' });
    }
  }, [activeSectionId]);

  return (
    <div
      className="sticky top-[56px] z-40 backdrop-blur-xl border-b"
      style={{
        backgroundColor: 'rgba(10, 14, 26, 0.85)',
        borderColor: sectionThemes[activeSectionId]?.cardBorder || 'rgba(255,255,255,0.1)',
      }}
    >
      <div
        ref={scrollRef}
        className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {DASHBOARD_SECTIONS.map((section) => {
          const isActive = section.id === activeSectionId;
          const theme = sectionThemes[section.id];
          const Icon = section.icon;

          return (
            <button
              key={section.id}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSectionClick(section.id)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-300 flex-shrink-0"
              style={{
                background: isActive ? theme?.primaryButton : 'transparent',
                color: isActive ? 'hsl(102 25% 25%)' : (theme?.textSecondary || '#aaa'),
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="section-nav-active"
                  className="absolute inset-0 rounded-full"
                  style={{ background: theme?.primaryButton }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                {section.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
