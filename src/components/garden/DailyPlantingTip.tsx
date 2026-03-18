import { useMemo } from 'react';
import { Sprout, Leaf } from 'lucide-react';
import { getMoonInfo, getDailyCompanionTip, getZodiacEmoji } from '@/utils/lunarEngine';
import { MOON_ELEMENT_LABELS } from '@/data/gardenCrops';

interface DailyPlantingTipProps {
  currentTheme?: {
    accent?: string;
    cardBorder?: string;
    textPrimary?: string;
    textSecondary?: string;
  };
}

export function DailyPlantingTip({ currentTheme }: DailyPlantingTipProps) {
  const today = useMemo(() => new Date(), []);
  const moonInfo = useMemo(() => getMoonInfo(today), [today]);
  const companionTip = useMemo(() => getDailyCompanionTip(moonInfo.element), [moonInfo.element]);
  const elementInfo = MOON_ELEMENT_LABELS[moonInfo.element];
  const zodiacEmoji = getZodiacEmoji(moonInfo.zodiac);

  return (
    <div
      className="mt-3 pt-3 border-t space-y-2"
      style={{ borderColor: currentTheme?.cardBorder }}
    >
      <div className="flex items-center gap-2">
        <Sprout className="w-4 h-4" style={{ color: currentTheme?.accent || '#10b981' }} />
        <span
          className="text-sm font-semibold"
          style={{ color: currentTheme?.textPrimary }}
        >
          Today's Garden Tip
        </span>
      </div>

      {/* Moon phase + element */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{
            backgroundColor: currentTheme?.accent ? `${currentTheme.accent}22` : 'rgba(16,185,129,0.15)',
            color: currentTheme?.accent || '#10b981',
          }}
        >
          {elementInfo.emoji} {elementInfo.label} Day
        </span>
        <span className="text-xs" style={{ color: currentTheme?.textSecondary }}>
          {moonInfo.phaseEmoji} {moonInfo.phase} · {zodiacEmoji} {moonInfo.zodiac}
        </span>
      </div>

      {/* Advice */}
      <div className="flex items-start gap-2">
        <Leaf className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: currentTheme?.accent || '#10b981' }} />
        <p className="text-xs leading-relaxed" style={{ color: currentTheme?.textSecondary }}>
          {elementInfo.description}
        </p>
      </div>

      {/* Companion tip */}
      <div
        className="rounded-lg p-2.5 text-xs leading-relaxed"
        style={{
          backgroundColor: currentTheme?.accent ? `${currentTheme.accent}11` : 'rgba(16,185,129,0.07)',
          color: currentTheme?.textSecondary,
        }}
      >
        🤝 {companionTip}
      </div>
    </div>
  );
}
