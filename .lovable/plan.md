

## Add Weather Widget to Dashboard

The screenshot shows the **Global Time Zones** card on the dashboard (line 812-852 of `DashboardPage.jsx`). The weather widget should be placed alongside it in the existing 2-column grid layout.

### Implementation

1. **Add `WeatherWidget` (compact) to the dashboard grid** in `src/pages/DashboardPage.jsx`
   - Import `WeatherWidget` at the top
   - Add a second card inside the `lg:grid-cols-2` grid (line 810) next to the Global Time Zones card
   - Style it to match the dashboard theme (using `currentTheme` for `backgroundColor`, `borderColor`, etc.)
   - Use the compact variant: `<WeatherWidget compact />`

2. **Wrap the widget in a themed Card** matching the existing pattern:
   - Same glassmorphic styling as the timezone card (backdrop-blur, theme colors)
   - Header with a weather icon and "Weather" title
   - The compact WeatherWidget renders inside CardContent

This places weather right next to time zones on the dashboard, creating a natural "location & conditions" section. One file change: `DashboardPage.jsx`.

