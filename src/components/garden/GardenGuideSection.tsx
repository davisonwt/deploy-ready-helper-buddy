import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Leaf, Sprout, Droplets } from 'lucide-react';
import { getMoonInfo, getDailyCompanionTip, getZodiacEmoji } from '@/utils/lunarEngine';
import { MOON_ELEMENT_LABELS } from '@/data/gardenCrops';
import { Badge } from '@/components/ui/badge';

interface GardenGuideSectionProps {
  gregorianDate: Date;
}

export function GardenGuideSection({ gregorianDate }: GardenGuideSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const moonInfo = useMemo(() => getMoonInfo(gregorianDate), [gregorianDate]);
  const companionTip = useMemo(() => getDailyCompanionTip(moonInfo.element), [moonInfo.element]);
  const elementInfo = MOON_ELEMENT_LABELS[moonInfo.element];
  const zodiacEmoji = getZodiacEmoji(moonInfo.zodiac);

  const elementColors: Record<string, string> = {
    root: 'bg-amber-600 text-white',
    leaf: 'bg-emerald-600 text-white',
    fruit: 'bg-red-500 text-white',
    flower: 'bg-pink-500 text-white',
  };

  return (
    <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200/60">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full mb-2"
      >
        <div className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-emerald-700" />
          <span className="font-semibold text-emerald-900">Garden Guide</span>
          <span className="text-lg">{moonInfo.phaseEmoji}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-emerald-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-emerald-600" />
        )}
      </button>

      {/* Always show moon phase + element badge */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Badge className={`${elementColors[moonInfo.element]} text-xs font-bold`}>
          {elementInfo.emoji} {elementInfo.label}
        </Badge>
        <span className="text-xs text-emerald-700">
          {moonInfo.phaseEmoji} {moonInfo.phase} · {zodiacEmoji} {moonInfo.zodiac}
        </span>
      </div>

      {expanded && (
        <div className="space-y-2.5 mt-3">
          {/* Moon phase details */}
          <div className="flex items-start gap-2">
            <Leaf className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-emerald-900/80 text-xs leading-relaxed">
              {elementInfo.description}
            </p>
          </div>

          {/* Waxing/Waning advice */}
          <div className="flex items-start gap-2">
            <Droplets className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-emerald-900/80 text-xs leading-relaxed">
              {moonInfo.isWaxing
                ? '🌒 Waxing moon — energy rising. Good for planting above-ground crops.'
                : '🌘 Waning moon — energy descending. Good for root work, pruning & composting.'}
            </p>
          </div>

          {/* Companion tip */}
          <div className="bg-emerald-100/60 rounded-xl p-3 border border-emerald-200/40">
            <p className="text-xs font-medium text-emerald-800 mb-1">🤝 Companion Tip</p>
            <p className="text-emerald-700/90 text-xs leading-relaxed">{companionTip}</p>
          </div>

          {/* Root day pH reminder */}
          {moonInfo.element === 'root' && (
            <div className="bg-amber-50/80 rounded-xl p-3 border border-amber-200/40">
              <p className="text-xs font-medium text-amber-800 mb-1">⚗️ Root Day — Soil Health</p>
              <p className="text-amber-700/90 text-xs leading-relaxed">
                Great day for soil amendments! Test soil pH — most veggies thrive at 6.0–7.0. Add lime to raise or sulfur/compost to lower.
              </p>
            </div>
          )}

          {/* Illumination bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-600">Illumination</span>
            <div className="flex-1 h-1.5 bg-emerald-200/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-yellow-300 rounded-full transition-all"
                style={{ width: `${Math.round(moonInfo.illumination * 100)}%` }}
              />
            </div>
            <span className="text-xs text-emerald-600 font-medium">
              {Math.round(moonInfo.illumination * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
