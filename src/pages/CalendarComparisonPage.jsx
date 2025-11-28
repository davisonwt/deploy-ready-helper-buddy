import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CalendarWheel from '@/components/watch/CalendarWheel'
import YHWHWheel from '@/components/YHWHWheel'
import { EzekielClock } from '@/components/ezekiel-clock/EzekielClock'
import { getCurrentTheme } from '@/utils/dashboardThemes'

export default function CalendarComparisonPage() {
  const [calendarWheelData, setCalendarWheelData] = useState(null)
  const [yhwhWheelData, setYhwhWheelData] = useState(null)
  const [ezekielClockData, setEzekielClockData] = useState(null)
  const currentTheme = getCurrentTheme()

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: currentTheme.background }}>
      <div className="max-w-6xl mx-auto">
        {/* Simple Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ color: currentTheme.textPrimary }}>
            Calendar Comparison
          </h1>
          <p className="text-sm" style={{ color: currentTheme.textSecondary }}>
            View all three calendar designs side by side
          </p>
        </div>

        {/* Clean Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CalendarWheel */}
          <Card className="border shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-center" style={{ color: currentTheme.textPrimary }}>
                New CalendarWheel
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center p-4">
              <div className="w-full flex justify-center mb-4" style={{ minHeight: '300px' }}>
                <div style={{ width: '300px', height: '300px' }}>
                  <CalendarWheel 
                    timezone="Africa/Johannesburg"
                    theme="auto"
                    size={300}
                    onDataUpdate={setCalendarWheelData}
                  />
                </div>
              </div>
              {calendarWheelData && (
                <div className="text-xs text-center space-y-1" style={{ color: currentTheme.textSecondary }}>
                  <div>Year {calendarWheelData.year} • Month {calendarWheelData.month} • Day {calendarWheelData.dayOfMonth}</div>
                  <div>Weekday {calendarWheelData.weekday} • Part {calendarWheelData.part}/18</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* YHWHWheel */}
          <Card className="border shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-center" style={{ color: currentTheme.textPrimary }}>
                Original YHWHWheel
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center p-4">
              <div className="w-full flex justify-center mb-4" style={{ minHeight: '300px' }}>
                <div style={{ width: '300px', height: '300px' }}>
                  <YHWHWheel 
                    onDataUpdate={setYhwhWheelData}
                  />
                </div>
              </div>
              {yhwhWheelData && (
                <div className="text-xs text-center space-y-1" style={{ color: currentTheme.textSecondary }}>
                  <div>Year {yhwhWheelData.year} • Month {yhwhWheelData.month} • Day {yhwhWheelData.day}</div>
                  <div>Weekday {yhwhWheelData.weekday} • Part {yhwhWheelData.part}/18</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* EzekielClock */}
          <Card className="border shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-center" style={{ color: currentTheme.textPrimary }}>
                EzekielClock
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center p-4">
              <div className="w-full flex justify-center mb-4" style={{ minHeight: '300px' }}>
                <div style={{ width: '300px', height: '300px' }}>
                  <EzekielClock 
                    onDataUpdate={setEzekielClockData}
                  />
                </div>
              </div>
              {ezekielClockData && (
                <div className="text-xs text-center space-y-1" style={{ color: currentTheme.textSecondary }}>
                  <div>Year {ezekielClockData.year} • Day {ezekielClockData.dayOfYear}</div>
                  <div>Part {ezekielClockData.sacredPart}/18</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

