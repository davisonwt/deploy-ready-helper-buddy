import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Droplets, Wind, Thermometer, MapPin } from 'lucide-react';
import { useWeather, getTimezoneCoords, getAvailableTimezones } from '@/hooks/useWeather';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WeatherWidgetProps {
  compact?: boolean;
}

const WeatherWidget = ({ compact = false }: WeatherWidgetProps) => {
  const { user } = useAuth();
  const [userTimezone, setUserTimezone] = useState<string>('Africa/Johannesburg');
  const [saving, setSaving] = useState(false);
  const timezones = getAvailableTimezones();

  // Load user's timezone from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.timezone) setUserTimezone(data.timezone);
      });
  }, [user]);

  const { weather, loading, error, refetch } = useWeather(userTimezone);
  const coords = getTimezoneCoords(userTimezone);

  const handleTimezoneChange = async (tz: string) => {
    setUserTimezone(tz);
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ timezone: tz })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to save timezone');
    } else {
      toast.success('Timezone updated');
    }
  };

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          {loading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground">Weather unavailable</p>
          ) : weather ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{weather.icon}</span>
                <div>
                  <div className="text-2xl font-bold">{weather.temperature}°C</div>
                  <div className="text-xs text-muted-foreground">{weather.description}</div>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div className="flex items-center gap-1 justify-end">
                  <MapPin className="h-3 w-3" />
                  {coords.city}
                </div>
                <div>H: {weather.temperatureMax}° L: {weather.temperatureMin}°</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Thermometer className="h-5 w-5" />
          Weather
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={refetch} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timezone selector */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Your location
          </label>
          <Select value={userTimezone} onValueChange={handleTimezoneChange} disabled={saving}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Weather display */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={refetch}>
              Retry
            </Button>
          </div>
        ) : weather ? (
          <>
            <div className="flex items-center justify-center gap-4 py-4">
              <span className="text-6xl">{weather.icon}</span>
              <div>
                <div className="text-4xl font-bold">{weather.temperature}°C</div>
                <div className="text-muted-foreground">{weather.description}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 bg-muted rounded-lg">
                <Thermometer className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-medium">
                  {weather.temperatureMax}° / {weather.temperatureMin}°
                </div>
                <div className="text-xs text-muted-foreground">High / Low</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Wind className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-medium">{weather.windSpeed} km/h</div>
                <div className="text-xs text-muted-foreground">Wind</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <Droplets className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-medium">{weather.humidity}%</div>
                <div className="text-xs text-muted-foreground">Humidity</div>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
