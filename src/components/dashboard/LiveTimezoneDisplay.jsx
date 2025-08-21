import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Globe, Radio } from 'lucide-react';

/**
 * Live timezone display component for the dashboard
 */
export default function LiveTimezoneDisplay() {
  const [currentTimes, setCurrentTimes] = useState({});

  const timezones = [
    { 
      label: 'New York', 
      zone: 'America/New_York',
      flag: '🇺🇸',
      color: 'bg-blue-100 text-blue-800'
    },
    { 
      label: 'London', 
      zone: 'Europe/London',
      flag: '🇬🇧',
      color: 'bg-green-100 text-green-800'
    },
    { 
      label: 'Sydney', 
      zone: 'Australia/Sydney',
      flag: '🇦🇺',
      color: 'bg-purple-100 text-purple-800'
    }
  ];

  useEffect(() => {
    const updateTimes = () => {
      const times = {};
      timezones.forEach(tz => {
        try {
          times[tz.zone] = new Intl.DateTimeFormat('en-US', {
            timeZone: tz.zone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }).format(new Date());
        } catch (error) {
          times[tz.zone] = 'N/A';
        }
      });
      setCurrentTimes(times);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">World Clock</span>
      </div>
      
      {timezones.map((tz, index) => (
        <div key={tz.zone} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-lg">{tz.flag}</span>
            <div>
              <div className="text-sm font-medium text-gray-800">
                {tz.label}
              </div>
              <div className="text-xs text-gray-500">
                {tz.zone.split('/')[1].replace('_', ' ')}
              </div>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className={`font-mono text-xs ${tz.color}`}>
              <Clock className="h-3 w-3 mr-1" />
              {currentTimes[tz.zone] || '--:--'}
            </Badge>
          </div>
        </div>
      ))}
      
      <div className="text-xs text-center text-gray-500 mt-3 pt-2 border-t border-gray-200">
        <Radio className="h-3 w-3 inline mr-1" />
        Radio shows scheduled across all zones
      </div>
    </div>
  );
}