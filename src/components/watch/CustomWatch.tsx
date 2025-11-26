import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, Bell, Timer, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toCustomTime, getTimeOfDay, getTimeOfDayColor, formatCustomTime, getAntiClockwiseAngle, type TimeOfDay } from '@/utils/customTime';
import { toCustomDate, formatCustomDate, type CustomDate } from '@/utils/customCalendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CustomWatchProps {
  className?: string;
  compact?: boolean;
  showControls?: boolean;
}

export function CustomWatch({ className, compact = false, showControls = false }: CustomWatchProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [customTime, setCustomTime] = useState(toCustomTime(0));
  const [customDate, setCustomDate] = useState<CustomDate>({ year: 6028, month: 9, day: 10 });
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('midday');
  const [userOffset, setUserOffset] = useState(0); // User's local time offset in minutes
  const [alarms, setAlarms] = useState<Array<{ id: string; time: number; label: string }>>([]);
  const [timers, setTimers] = useState<Array<{ id: string; duration: number; remaining: number; label: string }>>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize with user's local time
    const now = new Date();
    const localMinutes = now.getHours() * 60 + now.getMinutes();
    setUserOffset(localMinutes);
    
    // Convert to custom date
    setCustomDate(toCustomDate(now));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Calculate custom time with user offset
      const standardMinutes = (now.getHours() * 60 + now.getMinutes() + userOffset) % 1440;
      const custom = toCustomTime(standardMinutes);
      setCustomTime(custom);
      
      // Update time of day
      const hours = (standardMinutes / 60) % 24;
      setTimeOfDay(getTimeOfDay(hours));
      
      // Check alarms
      alarms.forEach(alarm => {
        if (standardMinutes === alarm.time) {
          // Trigger alarm
          if (audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
        }
      });
      
      // Update timers
      setTimers(prev => prev.map(timer => ({
        ...timer,
        remaining: Math.max(0, timer.remaining - 1)
      })).filter(timer => timer.remaining > 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [userOffset, alarms]);

  const angle = getAntiClockwiseAngle(customTime);
  const bgColor = getTimeOfDayColor(timeOfDay);

  return (
    <Card className={cn('backdrop-blur-md bg-white/10 border-white/20', className)}>
      <CardContent className={cn('p-4', compact && 'p-2')}>
        <div className="flex items-center gap-4">
          {/* Watch Face */}
          <div className="relative" style={{ width: compact ? '80px' : '120px', height: compact ? '80px' : '120px' }}>
            <div
              className="rounded-full border-4 border-white/30 shadow-lg relative overflow-hidden"
              style={{
                width: '100%',
                height: '100%',
                background: bgColor,
              }}
            >
              {/* 18 Part Markers */}
              {Array.from({ length: 18 }).map((_, i) => {
                const markerAngle = (i * 20) - 90; // Start at top, anti-clockwise
                const radian = (markerAngle * Math.PI) / 180;
                const radius = compact ? 35 : 50;
                const x = 50 + Math.cos(radian) * radius;
                const y = 50 + Math.sin(radian) * radius;
                
                return (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-white/60 rounded-full"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                );
              })}
              
              {/* Hour Hand (Current Part) */}
              <motion.div
                className="absolute w-1 bg-white rounded-full origin-bottom"
                style={{
                  height: compact ? '30%' : '35%',
                  left: '50%',
                  top: '50%',
                  transformOrigin: 'bottom center',
                  boxShadow: '0 0 4px rgba(255,255,255,0.8)',
                }}
                animate={{
                  rotate: angle,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 100,
                  damping: 15,
                }}
              />
              
              {/* Center Dot */}
              <div
                className="absolute w-3 h-3 bg-white rounded-full border-2 border-white/50"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 8px rgba(255,255,255,0.6)',
                }}
              />
            </div>
            
            {/* Time Display */}
            {!compact && (
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-center">
                <div className="text-xs text-white/90 font-mono">
                  {formatCustomTime(customTime)}
                </div>
              </div>
            )}
          </div>
          
          {/* Date and Info */}
          <div className="flex-1 min-w-0">
            {!compact && (
              <>
                <div className="text-lg font-bold text-white mb-1 font-mono">
                  {formatCustomDate(customDate)}
                </div>
                <Badge className="bg-white/20 text-white border-white/30 text-xs mb-2 capitalize">
                  {timeOfDay}
                </Badge>
                <div className="text-xs text-white/70">
                  {formatCustomTime(customTime)}
                </div>
              </>
            )}
            {compact && (
              <div className="text-sm font-bold text-white font-mono">
                {formatCustomDate(customDate)}
              </div>
            )}
          </div>
        </div>
        
        {/* Hidden audio for alarms */}
        <audio ref={audioRef} preload="auto">
          <source src="/alarm-sound.mp3" type="audio/mpeg" />
        </audio>
      </CardContent>
    </Card>
  );
}

