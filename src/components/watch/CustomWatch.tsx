import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import {
  getCreatorTime,
  getTimeOfPartGradient,
  getTimeOfPartColor,
  getAntiClockwiseAngle,
  type CustomTime
} from '@/utils/customTime';
import {
  getCreatorDate,
  getDayOfWeek,
  type CustomDate
} from '@/utils/customCalendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

  // ──────────────────────────────────────────────────────────────
  // THE ONE AND ONLY ETERNAL TRUTH — 86 400 seconds per day
  // 18 parts × 4 800 s = 86 400 s → 80 Creator minutes per part
  // 1 Creator minute = 60 real seconds
  // All hands anti-clockwise from sunrise
  // ──────────────────────────────────────────────────────────────

  const { sunriseMinutes } = getCreatorTime(currentTime, userLat, userLon);

  // Real seconds since midnight (precise)
  const nowSec = 
    currentTime.getHours() * 3600 +
    currentTime.getMinutes() * 60 +
    currentTime.getSeconds() +
    currentTime.getMilliseconds() / 1000;

  const sunriseSec = sunriseMinutes * 60;

  let secsSinceSunrise = nowSec - sunriseSec;
  if (secsSinceSunrise < 0) secsSinceSunrise += 86400;  // Overnight wrap

  // Part hand — already perfect
  const partHandAngle = 450 - getAntiClockwiseAngle(customTime);

  // MINUTE HAND — Positioned based on customTime.minute (1-80) within current part
  // Get the starting angle of the current part (where the part marker is)
  const partStartAngle = 90 + (customTime.part - 1) * 20; // Part marker angle (clockwise from 12)
  // Calculate minute progress: (minute - 1) / 80 gives 0.0 to 0.9875, then * 20 for degrees
  const minuteProgress = ((customTime.minute - 1) / 80) * 20; // 0 → 19.75° progress (80 minutes per part)
  // Minute hand starts at part marker and moves anti-clockwise
  const mathMinuteAngle = partStartAngle - minuteProgress; // Anti-clockwise from part marker
  const minuteAngle = 450 - mathMinuteAngle; // Convert to CSS rotation

  // SECONDS HAND — normal 60-second anti-clockwise
  const realSeconds = secsSinceSunrise % 60;
  const secondsDegrees = (realSeconds / 60) * 360;
  const secondsAngle = 90 - secondsDegrees;

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

              {/* PART HAND */}
              <motion.div
                className="absolute"
                style={{
                  width: watchSize * 0.012, 
                  height: watchSize * 0.28,
                  left: '50%', 
                  top: '50%',
                  marginLeft: `-${watchSize * 0.006}px`,
                  marginTop: `-${watchSize * 0.28}px`,
                  transformOrigin: `${watchSize * 0.006}px ${watchSize * 0.28}px`,
                  background: 'linear-gradient(to top, #d4af37, #f4e4bc, #d4af37)',
                  borderRadius: '3px',
                  boxShadow: '0 0 10px gold',
                  zIndex: 10,
                }}
                animate={{ rotate: partHandAngle }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              />

              {/* MINUTE HAND — YOUR FINAL TRUTH */}
              <motion.div
                className="absolute"
                style={{
                  width: watchSize * 0.008, 
                  height: watchSize * 0.38,
                  left: '50%', 
                  top: '50%',
                  marginLeft: `-${watchSize * 0.004}px`,
                  marginTop: `-${watchSize * 0.38}px`,
                  transformOrigin: `${watchSize * 0.004}px ${watchSize * 0.38}px`,
                  background: 'linear-gradient(to top, #c0c0c0, #e8e8e8, #c0c0c0)',
                  borderRadius: '2px',
                  boxShadow: '0 0 8px silver',
                  zIndex: 11,
                }}
                animate={{ rotate: minuteAngle }}
                transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
              />

              {/* SECONDS HAND */}
              <motion.div
                className="absolute"
                style={{
                  width: watchSize * 0.006, 
                  height: watchSize * 0.42,
                  left: '50%', 
                  top: '50%',
                  marginLeft: `-${watchSize * 0.003}px`,
                  marginTop: `-${watchSize * 0.42}px`,
                  transformOrigin: `${watchSize * 0.003}px ${watchSize * 0.42}px`,
                  background: 'linear-gradient(to top, #dc2626, #ef4444, #dc2626)',
                  borderRadius: '2px',
                  boxShadow: '0 0 10px #dc2626',
                  zIndex: 12,
                }}
                animate={{ rotate: secondsAngle }}
                transition={{ type: 'tween', ease: 'linear', duration: 0.05 }}
              />

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
