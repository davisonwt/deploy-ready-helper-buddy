import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, Bell, Timer, Settings, X, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toCustomTime, getTimeOfDay, getTimeOfDayColor, formatCustomTime, getAntiClockwiseAngle, type TimeOfDay, toStandardMinutes } from '@/utils/customTime';
import { toCustomDate, formatCustomDate, getDayOfWeek, type CustomDate } from '@/utils/customCalendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CustomWatchProps {
  className?: string;
  compact?: boolean;
  showControls?: boolean;
}

interface Alarm {
  id: string;
  time: number; // minutes from midnight (0-1439)
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
  const [customTime, setCustomTime] = useState(toCustomTime(0));
  const [customDate, setCustomDate] = useState<CustomDate>({ year: 6028, month: 9, day: 10 });
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('midday');
  const [userTimezone, setUserTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [timezoneOffset, setTimezoneOffset] = useState(0); // Offset in minutes
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alarmDialogOpen, setAlarmDialogOpen] = useState(false);
  const [timerDialogOpen, setTimerDialogOpen] = useState(false);
  const [newAlarmPart, setNewAlarmPart] = useState(1);
  const [newAlarmMinutes, setNewAlarmMinutes] = useState(0);
  const [newAlarmLabel, setNewAlarmLabel] = useState('');
  const [newTimerHours, setNewTimerHours] = useState(0);
  const [newTimerMinutes, setNewTimerMinutes] = useState(0);
  const [newTimerSeconds, setNewTimerSeconds] = useState(0);
  const [newTimerLabel, setNewTimerLabel] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize with user's local time
    const now = new Date();
    setCustomDate(toCustomDate(now));
    
    // Calculate timezone offset
    const localTime = now.getTime();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const targetTime = new Date(utcTime + (timezoneOffset * 60000));
    const offset = (targetTime.getTime() - localTime) / 60000;
    setTimezoneOffset(offset);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Calculate custom time with timezone offset
      const localMinutes = now.getHours() * 60 + now.getMinutes();
      const seconds = now.getSeconds();
      const adjustedMinutes = (localMinutes + timezoneOffset) % 1440;
      const custom = toCustomTime(adjustedMinutes);
      setCustomTime(custom);
      
      // Update time of day
      const hours = (adjustedMinutes / 60) % 24;
      setTimeOfDay(getTimeOfDay(hours));
      
      // Update custom date periodically
      setCustomDate(toCustomDate(now));
      
      // Check alarms
      alarms.forEach(alarm => {
        if (alarm.enabled && Math.floor(adjustedMinutes) === alarm.time) {
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
  }, [timezoneOffset, alarms]);

  // Calculate angles for three hands (anti-clockwise)
  const partAngle = getAntiClockwiseAngle({ part: customTime.part, minutes: 0 }); // Hour hand (part indicator)
  const minuteAngle = getAntiClockwiseAngle(customTime); // Minute hand (within part)
  const secondAngle = (360 - ((currentTime.getSeconds() / 60) * 360)) % 360; // Second hand (anti-clockwise)
  
  const bgColor = getTimeOfDayColor(timeOfDay);
  const dayOfWeek = getDayOfWeek(customDate);

  const handleAddAlarm = () => {
    const alarmTime = toStandardMinutes({ part: newAlarmPart, minutes: newAlarmMinutes });
    const newAlarm: Alarm = {
      id: Date.now().toString(),
      time: alarmTime,
      label: newAlarmLabel || `Alarm Part ${newAlarmPart}, minute ${newAlarmMinutes}`,
      enabled: true,
    };
    setAlarms([...alarms, newAlarm]);
    setNewAlarmPart(1);
    setNewAlarmMinutes(0);
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

  const watchSize = compact ? 120 : 280; // Increased by ~1cm (38px) per side: 200 -> 280, 80 -> 120
  const centerX = 50;
  const centerY = 50;

  return (
    <>
      <Card className={cn('backdrop-blur-md bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border-white/20 shadow-2xl', className)}>
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
              
              {/* Main Dial - Celestial Theme */}
              <div
                className="absolute rounded-full overflow-hidden"
                style={{
                  width: `${watchSize * 0.85}px`,
                  height: `${watchSize * 0.85}px`,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: bgColor,
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)',
                }}
              >
                {/* Starry Sky Effect */}
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 1px, transparent 1px), radial-gradient(circle at 60% 70%, rgba(255,255,255,0.6) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.7) 1px, transparent 1px), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.5) 1px, transparent 1px)',
                  backgroundSize: '30% 30%, 25% 25%, 35% 35%, 28% 28%',
                  backgroundPosition: '0% 0%, 100% 100%, 50% 50%, 0% 100%',
                  opacity: 0.6,
                }} />
                
                {/* 18 Part Markers - Anti-clockwise (1-18) */}
                {Array.from({ length: 18 }).map((_, i) => {
                  const partNum = i + 1;
                  // Anti-clockwise: Start at top (12 o'clock) with Part 1, move counter-clockwise
                  // Each part is 20 degrees (360/18), moving anti-clockwise means subtracting
                  const markerAngle = 90 - (i * 20); // Start at 90° (top), subtract 20° for each part
                  const radian = (markerAngle * Math.PI) / 180;
                  const radius = watchSize * 0.38; // Slightly further out for better visibility
                  const x = centerX + Math.cos(radian) * radius;
                  const y = centerY - Math.sin(radian) * radius; // Negative because screen Y is inverted
                  
                  return (
                    <div key={i}>
                      {/* Part Number - Larger and more prominent */}
                      <div
                        className="absolute text-white font-bold"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: 'translate(-50%, -50%)',
                          fontSize: watchSize * 0.08,
                          textShadow: '0 0 6px rgba(0,0,0,0.9), 0 0 12px rgba(255,255,255,0.4), 2px 2px 4px rgba(0,0,0,0.8)',
                          fontWeight: customTime.part === partNum ? '900' : '700',
                          color: customTime.part === partNum ? '#ffd700' : 'rgba(255,255,255,0.95)',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {partNum}
                      </div>
                      {/* Marker Dot - Larger */}
                      <div
                        className="absolute rounded-full bg-white/90"
                        style={{
                          width: watchSize * 0.02,
                          height: watchSize * 0.02,
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: 'translate(-50%, -50%)',
                          boxShadow: '0 0 6px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.5)',
                        }}
                      />
                    </div>
                  );
                })}
                
                {/* Hour Hand (Part Indicator) - Thick, Rose Gold */}
                <motion.div
                  className="absolute origin-bottom"
                  style={{
                    width: watchSize * 0.008,
                    height: watchSize * 0.25,
                    left: `${centerX}%`,
                    top: `${centerY}%`,
                    transformOrigin: 'bottom center',
                    background: 'linear-gradient(to top, #d4af37 0%, #f4e4bc 50%, #d4af37 100%)',
                    borderRadius: '2px',
                    boxShadow: '0 0 8px rgba(212,175,55,0.6), inset 0 0 4px rgba(255,255,255,0.3)',
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
                
                {/* Minute Hand (Within Part) - Medium, Silver */}
                <motion.div
                  className="absolute origin-bottom"
                  style={{
                    width: watchSize * 0.005,
                    height: watchSize * 0.35,
                    left: `${centerX}%`,
                    top: `${centerY}%`,
                    transformOrigin: 'bottom center',
                    background: 'linear-gradient(to top, #c0c0c0 0%, #e8e8e8 50%, #c0c0c0 100%)',
                    borderRadius: '1px',
                    boxShadow: '0 0 6px rgba(192,192,192,0.5)',
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
                
                {/* Second Hand - Thin, Red */}
                <motion.div
                  className="absolute origin-bottom"
                  style={{
                    width: watchSize * 0.003,
                    height: watchSize * 0.4,
                    left: `${centerX}%`,
                    top: `${centerY}%`,
                    transformOrigin: 'bottom center',
                    background: '#ff4444',
                    borderRadius: '0.5px',
                    boxShadow: '0 0 4px rgba(255,68,68,0.8)',
                  }}
                  animate={{
                    rotate: secondAngle,
                  }}
                  transition={{
                    type: 'tween',
                    duration: 0.1,
                    ease: 'linear',
                  }}
                />
                
                {/* Center Dot - Rose Gold with Gem Effect */}
                <div
                  className="absolute rounded-full"
                  style={{
                    width: watchSize * 0.04,
                    height: watchSize * 0.04,
                    left: `${centerX}%`,
                    top: `${centerY}%`,
                    transform: 'translate(-50%, -50%)',
                    background: 'radial-gradient(circle at 30% 30%, #f4e4bc, #d4af37, #b8860b)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 0 12px rgba(212,175,55,0.8), inset 0 0 8px rgba(255,255,255,0.4)',
                  }}
                />
                
                {/* Calendar Ring - Inner Black Ring */}
                <div
                  className="absolute rounded-full border-2 border-white/20"
                  style={{
                    width: `${watchSize * 0.7}px`,
                    height: `${watchSize * 0.7}px`,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                  }}
                />
              </div>
              
              {/* Date Display - Below Watch */}
              {!compact && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
                  <div className="text-xs text-white/90 font-mono font-bold mb-1">
                    {formatCustomDate(customDate)}
                  </div>
                  <div className="text-xs text-white/70 font-mono">
                    Day {dayOfWeek} • {formatCustomTime(customTime)}
                  </div>
                  <div className="text-xs text-white/60 font-mono mt-1">
                    {currentTime.getFullYear()}/{String(currentTime.getMonth() + 1).padStart(2, '0')}/{String(currentTime.getDate()).padStart(2, '0')}
                  </div>
                </div>
              )}
            </div>
            
            {/* Date and Info Panel */}
            <div className="flex-1 min-w-0">
              {!compact && (
                <>
                  <div className="text-lg font-bold text-white mb-1 font-mono">
                    {formatCustomDate(customDate)}
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 text-xs mb-2 capitalize">
                    {timeOfDay}
                  </Badge>
                  <div className="text-xs text-white/70 font-mono mb-1">
                    {formatCustomTime(customTime)}
                  </div>
                  <div className="text-xs text-white/60 font-mono">
                    Day {dayOfWeek}
                  </div>
                  {showControls && (
                    <div className="flex gap-2 mt-3">
                      <Dialog open={alarmDialogOpen} onOpenChange={setAlarmDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-white/30 text-white hover:bg-white/20">
                            <Bell className="w-3 h-3 mr-1" />
                            Alarm
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white/95 backdrop-blur-md">
                          <DialogHeader>
                            <DialogTitle>Add Alarm</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Part (1-18)</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="18"
                                  value={newAlarmPart}
                                  onChange={(e) => setNewAlarmPart(parseInt(e.target.value) || 1)}
                                />
                              </div>
                              <div>
                                <Label>Minutes (0-79)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="79"
                                  value={newAlarmMinutes}
                                  onChange={(e) => setNewAlarmMinutes(parseInt(e.target.value) || 0)}
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Label (optional)</Label>
                              <Input
                                value={newAlarmLabel}
                                onChange={(e) => setNewAlarmLabel(e.target.value)}
                                placeholder="Wake up"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleAddAlarm}>Add Alarm</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={timerDialogOpen} onOpenChange={setTimerDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-white/30 text-white hover:bg-white/20">
                            <Timer className="w-3 h-3 mr-1" />
                            Timer
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white/95 backdrop-blur-md">
                          <DialogHeader>
                            <DialogTitle>Add Timer</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label>Hours</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={newTimerHours}
                                  onChange={(e) => setNewTimerHours(parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label>Minutes</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={newTimerMinutes}
                                  onChange={(e) => setNewTimerMinutes(parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label>Seconds</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={newTimerSeconds}
                                  onChange={(e) => setNewTimerSeconds(parseInt(e.target.value) || 0)}
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Label (optional)</Label>
                              <Input
                                value={newTimerLabel}
                                onChange={(e) => setNewTimerLabel(e.target.value)}
                                placeholder="Pomodoro"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleAddTimer}>Start Timer</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-white/30 text-white hover:bg-white/20">
                            <Settings className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white/95 backdrop-blur-md">
                          <DialogHeader>
                            <DialogTitle>Watch Settings</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Timezone</Label>
                              <Select value={userTimezone} onValueChange={setUserTimezone}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Intl.supportedValuesOf('timeZone').slice(0, 50).map(tz => (
                                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground mt-1">
                                Adjust to sync with your local time
                              </p>
                            </div>
                            <div>
                              <Label>Active Alarms ({alarms.filter(a => a.enabled).length})</Label>
                              <div className="space-y-2 mt-2">
                                {alarms.map(alarm => (
                                  <div key={alarm.id} className="flex items-center justify-between p-2 bg-white/50 rounded">
                                    <div>
                                      <div className="text-sm font-medium">{alarm.label}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {formatCustomTime(toCustomTime(alarm.time))}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setAlarms(alarms.filter(a => a.id !== alarm.id))}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label>Active Timers ({timers.length})</Label>
                              <div className="space-y-2 mt-2">
                                {timers.map(timer => (
                                  <div key={timer.id} className="flex items-center justify-between p-2 bg-white/50 rounded">
                                    <div>
                                      <div className="text-sm font-medium">{timer.label}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {formatTimer(timer.remaining)}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setTimers(timers.filter(t => t.id !== timer.id))}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </>
              )}
              {compact && (
                <div className="text-sm font-bold text-white font-mono">
                  {formatCustomDate(customDate)}
                </div>
              )}
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
