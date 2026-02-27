

## Weather Widget for Radio Page

### What exists
- `profiles` table already has `timezone` and `location` columns -- no migration needed for user preferences.
- `LiveTimezoneDisplay` component already shows world clock on the dashboard.
- No weather functionality exists yet.

### Approach
Since weather APIs require API keys, I'll build a **weather placeholder system** that uses a free, no-key API (Open-Meteo) which provides weather data based on lat/lon coordinates. Users set their timezone in their profile, and we derive coordinates from that.

### Implementation Steps

1. **Create `WeatherWidget` component** (`src/components/weather/WeatherWidget.tsx`)
   - Fetches weather from Open-Meteo API (free, no API key needed) using coordinates derived from the user's timezone or browser geolocation
   - Shows: current temperature, condition icon, high/low, humidity, wind
   - Timezone selector dropdown so users can set/update their timezone (saves to `profiles.timezone`)
   - Clean card-based UI matching existing design patterns

2. **Create `useWeather` hook** (`src/hooks/useWeather.ts`)
   - Takes lat/lon, fetches current weather from `https://api.open-meteo.com/v1/forecast`
   - Returns temperature, weather code (mapped to icons/descriptions), wind, humidity
   - Includes a timezone-to-approximate-coordinates mapping for major cities

3. **Create `WeatherPage`** (`src/pages/WeatherPage.tsx`)
   - Standalone page at `/weather` with the full weather widget
   - Includes timezone selector and location settings

4. **Add weather widget to RadioPage**
   - Insert `WeatherWidget` as a compact card in the radio page header area, alongside the existing station info

5. **Add navigation links**
   - Add `/weather` route to `App.tsx`
   - Add link in `MyGardenPanel.tsx`

### Technical Details
- **Open-Meteo API** -- completely free, no key required, supports timezone parameter
- Timezone-to-coordinates mapping covers the same cities already in `LiveTimezoneDisplay`
- User's timezone preference is read from and saved to `profiles.timezone` via Supabase
- Falls back to browser geolocation or Johannesburg default (matching existing `useUserLocation` pattern)

