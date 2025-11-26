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
import { toCustomDate, formatCustomDate, type CustomDate } from '@/utils/customCalendar';
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
  const [userOffset, setUserOffset] = useState(0); // User's local time offset in minutes
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
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Calculate custom time
      const standardMinutes = (now.getHours() * 60 + now.getMinutes() + userOffset) % 1440;
      const custom = toCustomTime(standardMinutes);
      setCustomTime(custom);
      
      // Update time of day
      const hours = (standardMinutes / 60) % 24;
      setTimeOfDay(getTimeOfDay(hours));
      
      // Check alarms
      alarms.forEach(alarm => {
        if (alarm.enabled && standardMinutes === alarm.time) {
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
  }, [userOffset, alarms]);

  const angle = getAntiClockwiseAngle(customTime);
  const bgColor = getTimeOfDayColor(timeOfDay);

  const handleAddAlarm = () => {
    const alarmTime = toStandardMinutes({ part: newAlarmPart, minutes: newAlarmMinutes });
    const newAlarm: Alarm = {
      id: Date.now().toString(),
      time: alarmTime,
      label: newAlarmLabel || `Alarm Part ${newAlarmPart}:${newAlarmMinutes.toString().padStart(2, '0')}`,
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

  return (
    <>
      <Card className={cn('backdrop-blur-md bg-white/10 border-white/20', className)}>
        <CardContent className={cn('p-4', compact && 'p-2')}>
          <div className="flex items-center gap-4">
            {/* Watch Face */}
            <div className="relative flex-shrink-0" style={{ width: compact ? '80px' : '120px', height: compact ? '80px' : '120px' }}>
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
                  {showControls && (
                    <div className="flex gap-2 mt-2">
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
                              <Label>Time Offset (minutes)</Label>
                              <Input
                                type="number"
                                value={userOffset}
                                onChange={(e) => setUserOffset(parseInt(e.target.value) || 0)}
                                placeholder="0"
                              />
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
