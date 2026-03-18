import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sprout, Droplets, Leaf, Bug, Scissors, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';
import { getMoonInfo, getDailyCompanionTip } from '@/utils/lunarEngine';
import { GARDEN_CROPS, MOON_ELEMENT_LABELS, type CropData } from '@/data/gardenCrops';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface GardenLogSectionProps {
  date: Date;
}

const QUICK_ACTIONS = [
  { key: 'planted', label: 'Planted', emoji: '🌱', icon: Sprout },
  { key: 'watered', label: 'Watered', emoji: '💧', icon: Droplets },
  { key: 'harvested', label: 'Harvested', emoji: '🧺', icon: Leaf },
  { key: 'amended', label: 'Amended Soil', emoji: '⚗️', icon: FlaskConical },
  { key: 'pest', label: 'Pest Check', emoji: '🐛', icon: Bug },
  { key: 'pruned', label: 'Pruned', emoji: '✂️', icon: Scissors },
];

export default function GardenLogSection({ date }: GardenLogSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [logged, setLogged] = useState<Set<string>>(new Set());

  const moonInfo = useMemo(() => getMoonInfo(date), [date]);
  const companionTip = useMemo(() => getDailyCompanionTip(moonInfo.element), [moonInfo.element]);
  const elementInfo = MOON_ELEMENT_LABELS[moonInfo.element];

  // Get crops recommended for today's moon element
  const recommendedCrops = useMemo(() => {
    return GARDEN_CROPS.filter(c => c.moonPreference === moonInfo.element).slice(0, 4);
  }, [moonInfo.element]);

  const toggleLog = (key: string) => {
    setLogged(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const elementColors: Record<string, string> = {
    root: 'from-amber-600 to-amber-700',
    leaf: 'from-emerald-600 to-emerald-700',
    fruit: 'from-red-500 to-orange-600',
    flower: 'from-pink-500 to-rose-600',
  };

  return (
    <div className="border border-emerald-200/30 rounded-xl bg-emerald-950/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full p-3 hover:bg-emerald-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sprout className="w-4 h-4 text-emerald-400" />
          <span className="font-medium text-emerald-300 text-sm">Garden Log</span>
          <span className="text-base">{moonInfo.phaseEmoji}</span>
          <Badge className={`bg-gradient-to-r ${elementColors[moonInfo.element]} text-white text-[10px] px-1.5 py-0`}>
            {elementInfo.emoji} {elementInfo.label}
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-emerald-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-emerald-500" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-3">
              {/* Moon phase info */}
              <div className="flex items-center gap-2 text-xs text-emerald-400/80">
                <span>{moonInfo.phaseEmoji} {moonInfo.phase}</span>
                <span>·</span>
                <span>{moonInfo.zodiac}</span>
                <span>·</span>
                <span>{Math.round(moonInfo.illumination * 100)}% lit</span>
              </div>

              {/* Quick-log buttons */}
              <div>
                <p className="text-xs text-emerald-400/60 mb-2">Quick log today's activity:</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {QUICK_ACTIONS.map(action => {
                    const isActive = logged.has(action.key);
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.key}
                        onClick={() => toggleLog(action.key)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all border ${
                          isActive
                            ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                            : 'border-emerald-800/30 text-emerald-500/70 hover:border-emerald-600/40'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {action.label}
                        {isActive && <span className="ml-auto">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Biodynamic advice */}
              <div className="bg-emerald-900/30 rounded-lg p-2.5 border border-emerald-800/30">
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  {elementInfo.description}
                </p>
              </div>

              {/* Companion tip */}
              <div className="bg-emerald-900/20 rounded-lg p-2.5 border border-emerald-800/20">
                <p className="text-[10px] font-medium text-emerald-400/60 mb-1">🤝 COMPANION TIP</p>
                <p className="text-xs text-emerald-300/80 leading-relaxed">{companionTip}</p>
              </div>

              {/* Root day pH reminder */}
              {moonInfo.element === 'root' && (
                <div className="bg-amber-900/20 rounded-lg p-2.5 border border-amber-700/30">
                  <p className="text-[10px] font-medium text-amber-400/70 mb-1">⚗️ ROOT DAY — SOIL HEALTH</p>
                  <p className="text-xs text-amber-300/80 leading-relaxed">
                    Great day for soil amendments! Test pH — most veggies thrive at 6.0–7.0. Add lime to raise or sulfur/compost to lower.
                  </p>
                </div>
              )}

              {/* Recommended crops for today */}
              <div>
                <p className="text-[10px] font-medium text-emerald-400/60 mb-1.5">BEST FOR TODAY</p>
                <div className="flex flex-wrap gap-1.5">
                  {recommendedCrops.map(crop => (
                    <span
                      key={crop.key}
                      className="text-xs bg-emerald-800/30 text-emerald-300/80 px-2 py-0.5 rounded-full border border-emerald-700/30"
                    >
                      {crop.emoji} {crop.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
