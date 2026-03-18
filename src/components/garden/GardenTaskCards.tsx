import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sprout, Droplets, FlaskConical, Leaf, Bug, Scissors, Sun as SunIcon } from 'lucide-react';
import { getMoonInfo } from '@/utils/lunarEngine';
import { GARDEN_CROPS, MOON_ELEMENT_LABELS, getCropsByMoonElement } from '@/data/gardenCrops';
import { getRestDayInfo } from '@/utils/gardenRestDays';
import { Badge } from '@/components/ui/badge';

interface GardenTaskCardsProps {
  date: Date;
  weekDay: number;
  yhwhMonth: number;
  yhwhDay: number;
  userCropKeys?: string[];
  userSoilPh?: number;
}

interface TaskItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  moonOverlay: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

export function GardenTaskCards({ date, weekDay, yhwhMonth, yhwhDay, userCropKeys = [], userSoilPh }: GardenTaskCardsProps) {
  const moonInfo = useMemo(() => getMoonInfo(date), [date]);
  const restDay = useMemo(() => getRestDayInfo(weekDay, yhwhMonth, yhwhDay), [weekDay, yhwhMonth, yhwhDay]);
  const elementInfo = MOON_ELEMENT_LABELS[moonInfo.element];

  const tasks = useMemo((): TaskItem[] => {
    if (restDay.isRestDay) {
      return [{
        id: 'rest',
        icon: <span className="text-lg">🕊️</span>,
        title: `${restDay.name} — Rest Day`,
        description: 'No garden work today. Let yourself and your garden rest in the Creator\'s provision.',
        moonOverlay: moonInfo.phaseEmoji,
        priority: 'high',
        category: 'rest',
      }];
    }

    const items: TaskItem[] = [];

    // Element-based primary task
    const elementTasks: Record<string, { title: string; desc: string; icon: React.ReactNode }> = {
      root: {
        title: '🌱 Root Day — Tend Below Ground',
        desc: 'Best day for planting root crops, composting, and soil amendments.',
        icon: <Sprout className="w-4 h-4 text-amber-500" />,
      },
      leaf: {
        title: '🍃 Leaf Day — Nurture Greens',
        desc: 'Best for watering, planting leafy greens and herbs, mowing.',
        icon: <Leaf className="w-4 h-4 text-emerald-500" />,
      },
      fruit: {
        title: '🍎 Fruit Day — Harvest & Plant',
        desc: 'Best for planting fruiting crops, harvesting fruit, seed saving.',
        icon: <SunIcon className="w-4 h-4 text-orange-500" />,
      },
      flower: {
        title: '🌸 Flower Day — Cultivate Beauty',
        desc: 'Best for planting flowers, brassicas, cultivating and weeding.',
        icon: <Sprout className="w-4 h-4 text-pink-500" />,
      },
    };

    const et = elementTasks[moonInfo.element];
    items.push({
      id: 'element',
      icon: et.icon,
      title: et.title,
      description: et.desc,
      moonOverlay: moonInfo.phaseEmoji,
      priority: 'high',
      category: moonInfo.element,
    });

    // Waxing/waning task
    items.push({
      id: 'phase',
      icon: <span className="text-lg">{moonInfo.phaseEmoji}</span>,
      title: moonInfo.isWaxing ? 'Waxing Moon — Plant Above Ground' : 'Waning Moon — Work Below Ground',
      description: moonInfo.isWaxing
        ? 'Rising energy favors above-ground growth. Good for transplanting, grafting, leafy crops.'
        : 'Descending energy. Good for root work, pruning, composting, soil testing.',
      moonOverlay: moonInfo.phaseEmoji,
      priority: 'medium',
      category: 'moon',
    });

    // pH check on root days
    if (moonInfo.element === 'root') {
      let phDesc = 'Test soil pH — most veggies thrive at 6.0–7.0.';
      if (userSoilPh !== undefined) {
        if (userSoilPh < 6.0) phDesc = `Your pH ${userSoilPh} is acidic. Consider adding lime to raise it.`;
        else if (userSoilPh > 7.0) phDesc = `Your pH ${userSoilPh} is alkaline. Add sulfur or compost to lower.`;
        else phDesc = `Your pH ${userSoilPh} is in the ideal range! Keep it up.`;
      }
      items.push({
        id: 'ph',
        icon: <FlaskConical className="w-4 h-4 text-amber-500" />,
        title: '⚗️ Soil pH Check',
        description: phDesc,
        moonOverlay: '🌱',
        priority: 'medium',
        category: 'soil',
      });
    }

    // Watering reminder (every day except rest)
    items.push({
      id: 'water',
      icon: <Droplets className="w-4 h-4 text-blue-400" />,
      title: '💧 Water Check',
      description: moonInfo.element === 'leaf'
        ? 'Leaf Day — extra effective watering day! Plants absorb moisture best now.'
        : 'Check soil moisture and water as needed.',
      moonOverlay: moonInfo.phaseEmoji,
      priority: 'low',
      category: 'daily',
    });

    // Pest check (every 3 days based on day of year)
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    if (dayOfYear % 3 === 0) {
      items.push({
        id: 'pest',
        icon: <Bug className="w-4 h-4 text-yellow-500" />,
        title: '🐛 Pest Patrol',
        description: 'Check for aphids, caterpillars, and other pests. Use companion planting as natural defense!',
        moonOverlay: '🔍',
        priority: 'low',
        category: 'daily',
      });
    }

    // User crop specific tasks
    if (userCropKeys.length > 0) {
      const todayCrops = userCropKeys
        .map(k => GARDEN_CROPS.find(c => c.key === k))
        .filter(c => c && c.moonPreference === moonInfo.element);
      
      if (todayCrops.length > 0) {
        const cropNames = todayCrops.map(c => `${c!.emoji} ${c!.name}`).join(', ');
        items.push({
          id: 'user-crops',
          icon: <Sprout className="w-4 h-4 text-emerald-400" />,
          title: `Your ${elementInfo.label} Crops`,
          description: `Great day to tend: ${cropNames}`,
          moonOverlay: elementInfo.emoji,
          priority: 'high',
          category: 'personal',
        });
      }
    }

    return items;
  }, [date, moonInfo, restDay, userCropKeys, userSoilPh]);

  const priorityColors: Record<string, string> = {
    high: 'border-l-emerald-500',
    medium: 'border-l-amber-500',
    low: 'border-l-slate-500',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Sprout className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-medium text-emerald-300">Today's Garden Tasks</span>
        <span className="text-base">{moonInfo.phaseEmoji}</span>
      </div>
      {tasks.map((task, i) => (
        <motion.div
          key={task.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-start gap-3 p-3 rounded-lg bg-emerald-900/20 border border-emerald-800/30 border-l-2 ${priorityColors[task.priority]}`}
        >
          <div className="relative shrink-0 mt-0.5">
            {task.icon}
            <span className="absolute -top-1 -right-1 text-[8px]">{task.moonOverlay}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-emerald-200">{task.title}</p>
            <p className="text-[11px] text-emerald-400/70 leading-relaxed mt-0.5">{task.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
