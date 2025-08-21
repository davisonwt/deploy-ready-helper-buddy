import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Globe, Radio } from 'lucide-react';

/**
 * Live timezone display component for the dashboard
 */
export default function LiveTimezoneDisplay() {
  const [currentTime, setCurrentTime] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState('America/New_York');

  const timezones = [
    { label: 'New York (USA)', zone: 'America/New_York', flag: '🇺🇸' },
    { label: 'Los Angeles (USA)', zone: 'America/Los_Angeles', flag: '🇺🇸' },
    { label: 'London (UK)', zone: 'Europe/London', flag: '🇬🇧' },
    { label: 'Paris (France)', zone: 'Europe/Paris', flag: '🇫🇷' },
    { label: 'Berlin (Germany)', zone: 'Europe/Berlin', flag: '🇩🇪' },
    { label: 'Tokyo (Japan)', zone: 'Asia/Tokyo', flag: '🇯🇵' },
    { label: 'Sydney (Australia)', zone: 'Australia/Sydney', flag: '🇦🇺' },
    { label: 'Dubai (UAE)', zone: 'Asia/Dubai', flag: '🇦🇪' },
    { label: 'Singapore', zone: 'Asia/Singapore', flag: '🇸🇬' },
    { label: 'Hong Kong', zone: 'Asia/Hong_Kong', flag: '🇭🇰' },
    { label: 'Mumbai (India)', zone: 'Asia/Kolkata', flag: '🇮🇳' },
    { label: 'Moscow (Russia)', zone: 'Europe/Moscow', flag: '🇷🇺' },
    { label: 'Toronto (Canada)', zone: 'America/Toronto', flag: '🇨🇦' },
    { label: 'São Paulo (Brazil)', zone: 'America/Sao_Paulo', flag: '🇧🇷' }
  ];

  useEffect(() => {
    const updateTime = () => {
      try {
        const time = new Intl.DateTimeFormat('en-US', {
          timeZone: selectedTimezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }).format(new Date());
        setCurrentTime(time);
      } catch (error) {
        setCurrentTime('N/A');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [selectedTimezone]);

  const selectedTz = timezones.find(tz => tz.zone === selectedTimezone);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">World Clock</span>
      </div>
      
      <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select timezone" />
        </SelectTrigger>
        <SelectContent>
          {timezones.map((tz) => (
            <SelectItem key={tz.zone} value={tz.zone}>
              <div className="flex items-center gap-2">
                <span>{tz.flag}</span>
                <span>{tz.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-xl">{selectedTz?.flag}</span>
          <div>
            <div className="text-sm font-medium">
              {selectedTz?.label}
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedTimezone.split('/')[1].replace('_', ' ')}
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="font-mono">
          <Clock className="h-3 w-3 mr-1" />
          {currentTime || '--:--:--'}
        </Badge>
      </div>
      
      <div className="text-xs text-center text-muted-foreground pt-2 border-t">
        <Radio className="h-3 w-3 inline mr-1" />
        Radio shows scheduled across all zones
      </div>
    </div>
  );
}