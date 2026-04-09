import React from 'react';

interface SubSectionLabelProps {
  emoji: string;
  label: string;
  /** Two CSS colors for pill gradient bg */
  gradientColors?: [string, string];
}

export const SubSectionLabel: React.FC<SubSectionLabelProps> = ({
  emoji,
  label,
  gradientColors = ['#6366f1', '#8b5cf6'],
}) => {
  const [from, to] = gradientColors;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-white"
      style={{
        background: `linear-gradient(135deg, ${from}cc, ${to}99)`,
        border: `1px solid ${from}44`,
        boxShadow: `0 2px 8px ${from}30`,
      }}
    >
      <span className="text-sm">{emoji}</span>
      {label}
    </div>
  );
};
