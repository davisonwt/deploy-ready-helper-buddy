import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  getCreatorTime,
  getTimeOfPartGradient,
  getTimeOfPartColor,
  type CustomTime
} from '@/utils/customTime';
import {
  getCreatorDate,
  type CustomDate
} from '@/utils/customCalendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PartHand } from './clock/PartHand';
import { MinuteHand } from './clock/MinuteHand';
import { SecondsHand } from './clock/SecondsHand';

interface CustomWatchProps {
  className?: string;
  compact?: boolean;
}

export function CustomWatch({ className, compact = false }: CustomWatchProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [customTime, setCustomTime] = useState<CustomTime>({ part: 1, minute: 1 });
  const [customDate, setCustomDate] = useState<CustomDate>({ year: 6028, month: 9, day: 10, weekDay: 3 });
  const [userLat] = useState<number>(-26.2);  // Johannesburg
  const [userLon] = useState<number>(28.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initial load
  useEffect(() => {
    const now = new Date();
    setCustomTime(getCreatorTime(now, userLat, userLon).raw);
    setCustomDate(getCreatorDate(now));
  }, []);

  // Main tick — 100ms for perfect smoothness
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const ct = getCreatorTime(now, userLat, userLon);
      setCustomTime(ct.raw);
      setCustomDate(getCreatorDate(now));
    }, 100);
    return () => clearInterval(interval);
  }, [userLat, userLon]);

  // Visuals
  const bgGradient = getTimeOfPartGradient(customTime.part);
  const { accent } = getTimeOfPartColor(customTime.part);
  const watchSize = compact ? 150 : 250;

  const getNumberPosition = (partNum: number) => {
    const angle = 90 + (partNum - 1) * 20;
    const rad = (angle * Math.PI) / 180;
    const radius = 38;
    const x = 50 + Math.cos(rad) * radius;
    const y = 50 - Math.sin(rad) * radius;
    return { x, y };
  };

  return (
    <>
      <Card className={cn('backdrop-blur-md border-white/20 shadow-2xl', className)}
            style={{ background: bgGradient }}>
        <CardContent className={cn('p-4', compact && 'p-2')}>
          <div className="relative" style={{ width: `${watchSize}px`, height: `${watchSize}px` }}>

            {/* Bezel */}
            <div className="absolute inset-0 rounded-full"
                 style={{
                   background: 'linear-gradient(135deg, #d4af37 0%, #f4e4bc 30%, #d4af37 60%, #b8860b 100%)',
                   boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(212,175,55,0.4)',
                   border: '2px solid rgba(212,175,55,0.6)',
                 }} />

            {/* Dial */}
            <div className="absolute rounded-full border-4 border-white/15"
                 style={{
                   width: `${watchSize * 0.85}px`,
                   height: `${watchSize * 0.85}px`,
                   left: '50%', top: '50%',
                   transform: 'translate(-50%, -50%)',
                   background: bgGradient,
                   boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)',
                   overflow: 'visible',
                 }}>

              {/* Starry sky */}
              <div className="absolute inset-0 opacity-50"
                   style={{
                     backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 1px, transparent 1px), radial-gradient(circle at 70% 70%, rgba(255,255,255,0.6) 1px, transparent 1px)',
                     backgroundSize: '30% 30%',
                   }} />

              {/* 18 Part Numbers + Markers */}
              {Array.from({ length: 18 }, (_, i) => {
                const n = i + 1;
                const { x, y } = getNumberPosition(n);
                const isCurrent = customTime.part === n;

                return (
                  <div key={i}>
                    <div className="absolute font-bold"
                         style={{
                           left: `${x}%`, top: `${y}%`,
                           transform: 'translate(-50%, -50%)',
                           fontSize: watchSize * 0.07,
                           color: isCurrent ? '#ffd700' : accent,
                           textShadow: '0 0 8px black',
                         }}>{n}</div>
                    <div className="absolute rounded-full"
                         style={{
                           width: watchSize * 0.018, height: watchSize * 0.018,
                           left: `${x}%`, top: `${y}%`,
                           transform: 'translate(-50%, -50%)',
                           background: isCurrent ? '#ffd700' : 'white',
                           boxShadow: isCurrent ? '0 0 12px gold' : '0 0 6px white',
                         }} />
                  </div>
                );
              })}

              {/* Clock Hands - All logic in separate components */}
              <PartHand watchSize={watchSize} />
              <MinuteHand watchSize={watchSize} />
              <SecondsHand watchSize={watchSize} />

              {/* Center gem */}
              <div className="absolute rounded-full"
                   style={{
                     width: watchSize * 0.045, height: watchSize * 0.045,
                     left: '50%', top: '50%',
                     transform: 'translate(-50%, -50%)',
                     background: 'radial-gradient(circle at 30% 30%, #f4e4bc, #d4af37)',
                     boxShadow: '0 0 12px gold',
                     zIndex: 9,
                   }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <audio ref={audioRef} preload="auto">
        <source src="/alarm-sound.mp3" type="audio/mpeg" />
      </audio>
    </>
  );
}
