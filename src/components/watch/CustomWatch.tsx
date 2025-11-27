import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, Bell, Timer, Settings, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  showControls?: boolean;
}

interface Alarm {
  id: string;
  part: number;
  minute: number;
  label: string;
  enabled: boolean;
}

interface Timer {
  id: string;
  duration: number; // seconds
  remaining: number; // seconds
  label: string;
}

export function CustomWatch({ className, compact = false, showControls = false }: CustomWatchProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [customTime, setCustomTime] = useState<CustomTime>({ part: 1, minute: 1 });
  const [customDate, setCustomDate] = useState<CustomDate>({ year: 6028, month: 9, day: 10, weekDay: 3 });
  const [userLat, setUserLat] = useState<number>(-26.2);
  const [userLon, setUserLon] = useState<number>(28.0);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alarmDialogOpen, setAlarmDialogOpen] = useState(false);
  const [timerDialogOpen, setTimerDialogOpen] = useState(false);
  const [newAlarmPart, setNewAlarmPart] = useState(10);
  const [newAlarmMinute, setNewAlarmMinute] = useState(1);
  const [newAlarmLabel, setNewAlarmLabel] = useState('');
  const [newTimerHours, setNewTimerHours] = useState(0);
  const [newTimerMinutes, setNewTimerMinutes] = useState(0);
  const [newTimerSeconds, setNewTimerSeconds] = useState(0);
  const [newTimerLabel, setNewTimerLabel] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLat(position.coords.latitude);
          setUserLon(position.coords.longitude);
        },
        () => console.log('Using default location')
      );
    }

    const now = new Date();
    const creatorTime = getCreatorTime(now, userLat, userLon);
    setCustomTime(creatorTime.raw);
    setCustomDate(getCreatorDate(now));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const creatorTime = getCreatorTime(now, userLat, userLon);
      setCustomTime(creatorTime.raw);
      setCustomDate(getCreatorDate(now));

      // Alarm & timer logic
      if (now.getMilliseconds() < 100) {
        alarms.forEach(alarm => {
          if (alarm.enabled && creatorTime.raw.part === alarm.part && creatorTime.raw.minute === alarm.minute) {
            toast.success(`Alarm: ${alarm.label || 'Alarm'}`);
            audioRef.current?.play().catch(() => {});
          }
        });

        setTimers(prev => prev.map(timer => {
          if (timer.remaining > 0) {
            const newRemaining = timer.remaining - 1;
            if (newRemaining === 0) {
              toast.success(`Timer: ${timer.label || 'Timer'}`);
              audioRef.current?.play().catch(() => {});
            }
            return { ...timer, remaining: newRemaining };
          }
          return timer;
        }).filter(t => t.remaining > 0));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [alarms, userLat, userLon]);

  // ──────────────────────────────────────────────────────────────
  // PERFECT CREATOR CLOCK MATH – 18 parts, anti-clockwise, 80-sec minutes
  // 86 400 real seconds per day – no drift, no sunrise dependency
  // ──────────────────────────────────────────────────────────────

  const now = currentTime;

  const realSecondsToday =
    now.getHours() * 3600 +
    now.getMinutes() * 60 +
    now.getSeconds() +
    now.getMilliseconds() / 1000;

  // HOUR (PART) HAND – from your existing perfect utility
  const partHandAngle = 450 - getAntiClockwiseAngle(customTime);

  // MINUTE HAND – 20° anti-clockwise per 80-minute part → 0.25° per Creator minute
  // Starts at 110° (Part 2 side) and moves anti-clockwise to 90° (Part 18 side)
  const creatorMinutesIntoPart = (realSecondsToday / 80) % 80; // 0–79.999
  const minuteHandDegrees = creatorMinutesIntoPart * 0.25;     // 0 → 19.999°
  const cssMinuteAngle = 450 - (110 - minuteHandDegrees);      // 110° → 90° anti-clockwise

  // SECONDS HAND – 80 real seconds = 360° anti-clockwise → 4.5° per second
  const creatorSeconds = realSecondsToday % 80;               // 0–79.999
  const secondsHandDegrees = creatorSeconds * 4.5;
  const cssSecondsAngle = 90 - secondsHandDegrees;            // anti-clockwise from 12

  const bgGradient = getTimeOfPartGradient(customTime.part);
  const { accent } = getTimeOfPartColor(customTime.part);
  const dayOfWeek = getDayOfWeek(customDate);

  const watchSize = compact ? 150 : 250;
  const centerX = 50;
  const centerY = 50;

  const getNumberPosition = (partNum: number) => {
    const angle = 90 + ((partNum - 1) * 20);
    const radian = (angle * Math.PI) / 180;
    const radius = 38;
    const x = centerX + Math.cos(radian) * radius;
    const y = centerY - Math.sin(radian) * radius;
    return { x, y, angle };
  };

  const handleAddAlarm = () => {
    const newAlarm: Alarm = {
      id: Date.now().toString(),
      part: newAlarmPart,
      minute: newAlarmMinute,
      label: newAlarmLabel || `Alarm Part ${newAlarmPart}, minute ${newAlarmMinute}`,
      enabled: true,
    };
    setAlarms([...alarms, newAlarm]);
    setNewAlarmPart(10);
    setNewAlarmMinute(1);
    setNewAlarmLabel('');
    setAlarmDialogOpen(false);
    toast.success('Alarm added');
  };

  const handleAddTimer = () => {
    const totalSeconds = newTimerHours * 3600 + newTimerMinutes * 60 + newTimerSeconds;
    if (totalSeconds <= 0) {
      toast.error('Timer duration must be greater than 0');
      return;
    }
    const newTimer: Timer = {
      id: Date.now().toString(),
      duration: totalSeconds,
      remaining: totalSeconds,
      label: newTimerLabel || `${newTimerHours}h ${newTimerMinutes}m ${newTimerSeconds}s`,
    };
    setTimers([...timers, newTimer]);
    setNewTimerHours(0);
    setNewTimerMinutes(0);
    setNewTimerSeconds(0);
    setNewTimerLabel('');
    setTimerDialogOpen(false);
    toast.success('Timer started');
  };

  const formatTimer = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <>
      <Card
        className={cn('backdrop-blur-md border-white/20 shadow-2xl transition-all duration-2000', className)}
        style={{ background: bgGradient }}
      >
        <CardContent className={cn('p-4', compact && 'p-2')}>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0 overflow-visible" style={{ width: `${watchSize}px`, height: `${watchSize}px` }}>
              {/* Outer Bezel */}
              <div className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #d4af37 0%, #f4e4bc 30%, #d4af37 60%, #b8860b 100%)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(212,175,55,0.4)',
                  border: '2px solid rgba(212,175,55,0.6)',
                }}
              />

              {/* Main Dial */}
              <div
                className="absolute rounded-full border-4 border-white/15"
                style={{
                  width: `${watchSize * 0.85}px`,
                  height: `${watchSize * 0.85}px`,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: bgGradient,
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)',
                  transition: 'background 2s ease',
                  overflow: 'visible',
                }}
              >
                {/* Starry Sky */}
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 1px, transparent 1px), radial-gradient(circle at 60% 70%, rgba(255,255,255,0.6) 1px, transparent 1px)',
                  backgroundSize: '30% 30%, 25% 25%',
                  opacity: customTime.part >= 1 && customTime.part <= 3 || customTime.part >= 17 ? 0.6 : 0.2,
                }} />

                {/* 18 Part Numbers & Markers */}
                {Array.from({ length: 18 }).map((_, i) => {
                  const partNum = i + 1;
                  const { x, y } = getNumberPosition(partNum);
                  const isCurrent = customTime.part === partNum;

                  return (
                    <div key={i}>
                      <div
                        className="absolute font-bold transition-all duration-300"
                        style={{
                          left: `${x}%`, top: `${y}%`,
                          transform: 'translate(-50%, -50%)',
                          fontSize: watchSize * 0.07,
                          textShadow: '0 0 6px rgba(0,0,0,0.9), 0 0 12px rgba(255,255,255,0.4)',
                          fontWeight: isCurrent ? '900' : '700',
                          color: isCurrent ? '#ffd700' : accent,
                          opacity: isCurrent ? 1 : 0.85,
                        }}
                      >
                        {partNum}
                      </div>
                      <div
                        className="absolute rounded-full transition-all duration-300"
                        style={{
                          width: watchSize * 0.018,
                          height: watchSize * 0.018,
                          left: `${x}%`, top: `${y}%`,
                          transform: 'translate(-50%, -50%)',
                          background: isCurrent ? '#ffd700' : 'rgba(255,255,255,0.9)',
                          boxShadow: isCurrent
                            ? '0 0 8px rgba(255,215,0,0.9), 0 0 16px rgba(255,215,0,0.5)'
                            : '0 0 6px rgba(255,255,255,0.9)',
                        }}
                      />
                    </div>
                  );
                })}

                {/* HOUR (PART) HAND */}
                <motion.div
                  className="absolute"
                  style={{
                    width: watchSize * 0.012,
                    height: watchSize * 0.28,
                    left: '50%',
                    top: '50%',
                    marginLeft: `-${watchSize * 0.006}px`,
                    marginTop: `-${watchSize * 0.28}px`,
                    transformOrigin: 'center bottom',
                    background: 'linear-gradient(to top, #d4af37 0%, #f4e4bc 50%, #d4af37 100%)',
                    borderRadius: '3px',
                    boxShadow: '0 0 10px rgba(212,175,55,0.7)',
                    zIndex: 10,
                  }}
                  animate={{ rotate: partHandAngle }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                />

                {/* MINUTE HAND – FIXED & PERFECT */}
                <motion.div
                  className="absolute"
                  style={{
                    width: watchSize * 0.008,
                    height: watchSize * 0.38,
                    left: '50%',
                    top: '50%',
                    marginLeft: `-${watchSize * 0.004}px`,
                    marginTop: `-${watchSize * 0.38}px`,
                    transformOrigin: 'center bottom',
                    background: 'linear-gradient(to top, #c0c0c0 0%, #e8e8e8 50%, #c0c0c0 100%)',
                    borderRadius: '2px',
                    boxShadow: '0 0 8px rgba(192,192,192,0.6)',
                    zIndex: 11,
                  }}
                  animate={{ rotate: cssMinuteAngle }}
                  transition={{ type: "tween", ease: "linear", duration: 0.1 }}
                />

                {/* SECONDS HAND – 80-second anti-clockwise cycle */}
                <motion.div
                  className="absolute"
                  style={{
                    width: watchSize * 0.006,
                    height: watchSize * 0.42,
                    left: '50%',
                    top: '50%',
                    marginLeft: `-${watchSize * 0.003}px`,
                    marginTop: `-${watchSize * 0.42}px`,
                    transformOrigin: 'center bottom',
                    background: 'linear-gradient(to top, #dc2626 0%, #ef4444 50%, #dc2626 100%)',
                    borderRadius: '2px',
                    boxShadow: '0 0 10px rgba(220,38,38,0.9)',
                    zIndex: 12,
                  }}
                  animate={{ rotate: cssSecondsAngle }}
                  transition={{ type: "tween", ease: "linear", duration: 0.05 }}
                />

                {/* Center Gem */}
                <div
                  className="absolute rounded-full"
                  style={{
                    width: watchSize * 0.045,
                    height: watchSize * 0.045,
                    left: `${centerX}%`,
                    top: `${centerY}%`,
                    transform: 'translate(-50%, -50%)',
                    background: 'radial-gradient(circle at 30% 30%, #f4e4bc, #d4af37, #b8860b)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 0 12px rgba(212,175,55,0.8)',
                    zIndex: 9,
                  }}
                />
              </div>
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
