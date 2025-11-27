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
  const [userLat, setUserLat] = useState<number>(-26.2); // Default: South Africa (Johannesburg)
  const [userLon, setUserLon] = useState<number>(28.0); // Default: South Africa (Johannesburg)
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
    // Try to get user's location from browser
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLat(position.coords.latitude);
          setUserLon(position.coords.longitude);
        },
        () => {
          // Fallback to default if geolocation fails
          console.log('Using default location (South Africa: -26.2°N, 28.0°E)');
        }
      );
    }
    
    // Initialize with current time in user's timezone
    const now = new Date();
    const creatorTime = getCreatorTime(now, userLat, userLon);
    setCustomTime(creatorTime.raw);
    setCustomDate(getCreatorDate(now));
  }, []);

  useEffect(() => {
    // Update more frequently (every 100ms) for smooth seconds hand animation
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Calculate custom time with user's location - use EXACT same calculation as HTML
      const creatorTime = getCreatorTime(now, userLat, userLon);
      setCustomTime(creatorTime.raw);
      
      setCustomDate(getCreatorDate(now));
      
      // Check alarms (only check on full seconds to avoid spam)
      if (now.getMilliseconds() < 100) {
        alarms.forEach(alarm => {
          if (alarm.enabled && creatorTime.raw.part === alarm.part && creatorTime.raw.minute === alarm.minute) {
            toast.success(`Alarm: ${alarm.label || 'Alarm'}`);
            if (audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
          }
        });
      }
      
      // Update timers (only decrement on full seconds)
      if (now.getMilliseconds() < 100) {
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
      }
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [alarms, userLat, userLon]);

  // Calculate angles for hands (anti-clockwise)
  // Convert from mathematical angle (90° = top) to CSS rotate angle (0° = top, clockwise)
  // Formula: CSS_angle = 450 - math_angle (converts to CSS convention and accounts for clockwise rotation)
  
  // Calculate seconds within current custom minute (0-79, since each minute has 80 seconds)
  const sunriseMinutes = getCreatorTime(currentTime, userLat, userLon).sunriseMinutes;
  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60 + currentTime.getMilliseconds() / 60000;
  let elapsed = nowMinutes - sunriseMinutes;
  if (elapsed < 0) elapsed += 1440;
  
  // Calculate which second we're at within the current custom minute (including fractional for smooth animation)
  // elapsed is in minutes, so elapsed % 1 gives fractional part of current minute
  // Multiply by 80 to get seconds (0-79.99) within the custom minute
  const secondsInMinuteFloat = (elapsed % 1) * 80;
  
  // Hour hand (part indicator): accounts for both part and minutes within part (like a real clock hour hand)
  const mathPartAngle = getAntiClockwiseAngle(customTime);
  const partAngle = 450 - mathPartAngle; // Convert to CSS rotate convention
  
  /* --------  MINUTE HAND – 80 MIN = 360° ANTI-CLOCKWISE, PHASE-LOCKED, NO WRAP  -------- */
  // use the SAME elapsed minutes counter that drives the part hand
  let minsSinceSunrise = elapsed; // already calculated above (0-1440)
  if (minsSinceSunrise < 0) minsSinceSunrise += 1440;

  // 360° per 80 min → 4.5° per 80 s → 0.05625°/s  (NEGATIVE = ANTI-CLOCKWISE)
  // NEVER MODULO – angle grows forever
  // 0 min = -20° (leading edge), 80 min = 0° (trailing edge)  ANTI-CLOCKWISE
  const minuteDeg = -20 + (minsSinceSunrise * 60) * 0.05625; // -20° → 0°
  const minuteAngle = 450 - (90 + (minsSinceSunrise * 60) * 0.05625);
  
  /* --------  SECONDS HAND – 80 SECONDS = 360° ANTI-CLOCKWISE  -------- */
  // 360° per 80 seconds → 4.5°/s ANTI-CLOCKWISE (negative in CSS)
  const secondsDeg = secondsInMinuteFloat * 4.5; // 0 → 360° every 80 seconds
  const secondsAngle = -secondsDeg; // CSS: negative = anti-clockwise, starts at 0° (top)
  
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

  const watchSize = compact ? 150 : 250; // Half size: 500px -> 250px
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
      <Card 
        className={cn('backdrop-blur-md border-white/20 shadow-2xl transition-all duration-2000', className)} 
        style={{ background: bgGradient }}
      >
        <CardContent className={cn('p-4', compact && 'p-2')}>
          <div className="flex items-center gap-4">
            {/* Luxury Watch Face */}
            <div className="relative flex-shrink-0 overflow-visible" style={{ width: `${watchSize}px`, height: `${watchSize}px` }}>
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
                  overflow: 'visible', // Allow hands to extend beyond dial
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
                    boxShadow: '0 0 10px rgba(212,175,55,0.7), inset 0 0 6px rgba(255,255,255,0.4)',
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
                    type: 'tween',
                    duration: 0.1, // Smooth continuous movement matching update interval
                    ease: 'linear',
                  }}
                />
                
                {/* Seconds Hand - Thin, Red - Properly centered, completes rotation in 80 seconds */}
                <motion.div
                  className="absolute"
                  style={{
                    width: watchSize * 0.006, // Slightly thicker for better visibility
                    height: watchSize * 0.42,
                    left: '50%',
                    top: '50%',
                    marginLeft: `-${watchSize * 0.003}px`, // Half width to center horizontally
                    marginTop: `-${watchSize * 0.42}px`, // Full height to position bottom at center
                    transformOrigin: 'center bottom',
                    background: 'linear-gradient(to top, #dc2626 0%, #ef4444 50%, #dc2626 100%)',
                    borderRadius: '2px',
                    boxShadow: '0 0 6px rgba(220,38,38,1), 0 0 12px rgba(220,38,38,0.6)', // Enhanced shadow for visibility
                    zIndex: 12, // Above minute hand
                  }}
                  animate={{
                    rotate: secondsAngle,
                  }}
                  transition={{
                    type: 'tween',
                    duration: 0.1, // Smooth tick animation
                    ease: 'linear',
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
                    zIndex: 9, // Below all hands
                  }}
                />
                
              </div>
            </div>
            
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
