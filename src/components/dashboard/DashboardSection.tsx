import React, { forwardRef } from 'react';
import { DashboardTheme } from '@/utils/dashboardThemes';

interface DashboardSectionProps {
  id: string;
  theme: DashboardTheme;
  children: React.ReactNode;
  className?: string;
}

export const DashboardSection = forwardRef<HTMLElement, DashboardSectionProps>(
  ({ id, theme, children, className = '' }, ref) => {
    return (
      <section
        ref={ref}
        id={`section-${id}`}
        className={`min-h-[60vh] py-6 transition-colors duration-700 ${className}`}
        style={{ background: theme.background }}
      >
        <div className="max-w-2xl mx-auto px-3 space-y-3">
          {children}
        </div>
      </section>
    );
  }
);

DashboardSection.displayName = 'DashboardSection';
