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
  formatCustomDate, 
  formatCustomDateCompact,
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
  const [customDate, setCustomDate] = useState<CustomDate>({ year: 6028, month: 2, day: 10, weekDay: 3 });
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
    // Initialize
    const now = new Date();
    const creatorTime = getCreatorTime(now);
    setCustomTime(creatorTime.raw);
    setCustomDate(getCreatorDate(now));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Calculate custom time
      const creatorTime = getCreatorTime(now);
      setCustomTime(creatorTime.raw);
      
      setCustomDate(getCreatorDate(now));
      
      // Check alarms
      alarms.forEach(alarm => {
        if (alarm.enabled && creatorTime.raw.part === alarm.part && creatorTime.raw.minute === alarm.minute) {
          toast.success(`Alarm: ${alarm.label || 'Alarm'}`);
          if (audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
        }
      });
      
      // Update timers
      setTimers(prev => prev.map(timer => {
        if (timer.remaining > 0) {
          const newRemaining = timer.remaining - 1;
          if (newRemaining === 0) {
            toast.success(`Timer: ${timer.label || 'Timer'}`);
            if (audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
          }
          return { ...timer, remaining: newRemaining };
        }
        return timer;
      }).filter(timer => timer.remaining > 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [alarms]);

  // Calculate angles for hands (anti-clockwise)
  const partAngle = getAntiClockwiseAngle({ part: customTime.part, minute: 1 }); // Hour hand (part indicator)
  const minuteAngle = getAntiClockwiseAngle(customTime); // Minute hand (within part)
  
  const bgGradient = getTimeOfPartGradient(customTime.part);
  const { accent } = getTimeOfPartColor(customTime.part);
  const dayOfWeek = getDayOfWeek(customDate);

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

  const watchSize = compact ? 150 : 500; // Increased by 0.5cm (~19px) per side: 480 -> 500px
  const centerX = 50;
  const centerY = 50;

  // Calculate positions for numbers 1-18 anti-clockwise
  const getNumberPosition = (partNum: number) => {
    // Start at top (90°), move anti-clockwise (add degrees)
    const angle = 90 + ((partNum - 1) * 20); // Each part is 20 degrees
    const radian = (angle * Math.PI) / 180;
    const radius = 38; // Percentage from center
    const x = centerX + Math.cos(radian) * radius;
    const y = centerY - Math.sin(radian) * radius; // Negative because screen Y is inverted
    return { x, y, angle };
  };

  return (
    <>
      <Card className={cn('backdrop-blur-md border-white/20 shadow-2xl transition-all duration-2000', className)} style={{ background: bgGradient }}>
        <CardContent className={cn('p-4', compact && 'p-2')}>
          <div className="flex items-center gap-4">
            {/* Luxury Watch Face */}
            <div className="relative flex-shrink-0" style={{ width: `${watchSize}px`, height: `${watchSize}px` }}>
              {/* Outer Rose Gold Bezel */}
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #d4af37 0%, #f4e4bc 30%, #d4af37 60%, #b8860b 100%)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(212,175,55,0.4)',
                  border: '2px solid rgba(212,175,55,0.6)',
                }}
              />
              
              {/* Main Dial */}
              <div
                className="absolute rounded-full overflow-hidden border-4 border-white/15"
                style={{
                  width: `${watchSize * 0.85}px`,
                  height: `${watchSize * 0.85}px`,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: bgGradient,
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)',
                  transition: 'background 2s ease',
                }}
              >
                {/* Starry Sky Effect */}
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 1px, transparent 1px), radial-gradient(circle at 60% 70%, rgba(255,255,255,0.6) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.7) 1px, transparent 1px), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.5) 1px, transparent 1px)',
                  backgroundSize: '30% 30%, 25% 25%, 35% 35%, 28% 28%',
                  backgroundPosition: '0% 0%, 100% 100%, 50% 50%, 0% 100%',
                  opacity: customTime.part >= 1 && customTime.part <= 3 || customTime.part >= 17 ? 0.6 : 0.2,
                }} />
                
                {/* 18 Part Markers - Anti-clockwise (1-18) */}
                {Array.from({ length: 18 }).map((_, i) => {
                  const partNum = i + 1;
                  const { x, y } = getNumberPosition(partNum);
                  const isCurrentPart = customTime.part === partNum;
                  
                  return (
                    <div key={i}>
                      {/* Part Number */}
                      <div
                        className="absolute font-bold transition-all duration-300"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: 'translate(-50%, -50%)',
                          fontSize: watchSize * 0.07,
                          textShadow: '0 0 6px rgba(0,0,0,0.9), 0 0 12px rgba(255,255,255,0.4), 2px 2px 4px rgba(0,0,0,0.8)',
                          fontWeight: isCurrentPart ? '900' : '700',
                          color: isCurrentPart ? '#ffd700' : accent,
                          letterSpacing: '0.5px',
                          opacity: isCurrentPart ? 1 : 0.85,
                        }}
                      >
                        {partNum}
                      </div>
                      {/* Marker Dot */}
                      <div
                        className="absolute rounded-full transition-all duration-300"
                        style={{
                          width: watchSize * 0.018,
                          height: watchSize * 0.018,
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: 'translate(-50%, -50%)',
                          background: isCurrentPart ? '#ffd700' : 'rgba(255,255,255,0.9)',
                          boxShadow: isCurrentPart 
                            ? '0 0 8px rgba(255,215,0,0.9), 0 0 16px rgba(255,215,0,0.5)'
                            : '0 0 6px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.5)',
                        }}
                      />
                    </div>
                  );
                })}
                
                {/* Hour Hand (Part Indicator) - Thick, Rose Gold - Properly centered */}
                <motion.div
                  className="absolute"
                  style={{
                    width: watchSize * 0.012,
                    height: watchSize * 0.28,
                    left: '50%',
                    top: '50%',
                    marginLeft: `-${watchSize * 0.006}px`, // Half width to center horizontally
                    marginTop: `-${watchSize * 0.28}px`, // Full height to position bottom at center
                    transformOrigin: 'center bottom',
                    background: 'linear-gradient(to top, #d4af37 0%, #f4e4bc 50%, #d4af37 100%)',
                    borderRadius: '3px',
                    boxShadow: '0 0 10px rgba(212,175,55,0.7), inset 0.7), inset 0 0 6px rgba(255,255,255,0.4)',
                    zIndex: 10,
                  }}
                  animate={{
                    rotate: partAngle,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                  }}
                />
                
                {/* Minute Hand (Within Part) - Medium, Silver - Properly centered */}
                <motion.div
                  className="absolute"
                  style={{
                    width: watchSize * 0.008,
                    height: watchSize * 0.38,
                    left: '50%',
                    top: '50%',
                    marginLeft: `-${watchSize * 0.004}px`, // Half width to center horizontally
                    marginTop: `-${watchSize * 0.38}px`, // Full height to position bottom at center
                    transformOrigin: 'center bottom',
                    background: 'linear-gradient(to top, #c0c0c0 0%, #e8e8e8 50%, #c0c0c0 100%)',
                    borderRadius: '2px',
                    boxShadow: '0 0 8px rgba(192,192,192,0.6)',
                    zIndex: 11,
                  }}
                  animate={{
                    rotate: minuteAngle,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                  }}
                />
                
                {/* Center Dot - Rose Gold with Gem Effect */}
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
                    boxShadow: '0 0 12px rgba(212,175,55,0.8), inset 0 0 8px rgba(255,255,255,0.4)',
                  }}
                />
                
                {/* Center Time Display */}
                {!compact && (
                  <div 
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none text-white font-black" 
                    style={{ 
                      marginTop: watchSize * 0.15,
                      fontSize: watchSize * 0.1,
                      textShadow: '0 0 8px rgba(0,0,0,0.9)',
                      lineHeight: 1.2
                    }}
                    dangerouslySetInnerHTML={{ __html: getCreatorTime(currentTime).display }}
                  />
                )}
              </div>
              
              {/* Date Display - Below Watch */}
              {!compact && (
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center whitespace-nowrap w-full">
                  <div className="text-sm text-white/90 font-mono font-bold mb-2">
                    {formatCustomDateCompact(customDate)}
                  </div>
                  <div className="flex justify-between text-xs text-white/70 font-mono max-w-xs mx-auto">
                    <div className="text-left">
                      <div>Creator's Calendar</div>
                      <div className="font-semibold">{formatCustomDate(customDate)}</div>
                      <div>Week Day {customDate.weekDay}</div>
                    </div>
                    <div className="text-right">
                      <div>Gregorian</div>
                      <div className="font-semibold">
                        2025/11/26
                      </div>
                      <div>
                        {currentTime.toLocaleDateString(undefined, { weekday: 'long' })} {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Date and Info Panel */}
            {compact && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white font-mono">
                  {formatCustomDateCompact(customDate)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Hidden audio for alarms */}
      <audio ref={audioRef} preload="auto">
        <source src="/alarm-sound.mp3" type="audio/mpeg" />
      </audio>
    </>
  );
}
