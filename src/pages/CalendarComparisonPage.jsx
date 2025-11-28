import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CalendarWheel from '@/components/watch/CalendarWheel'
import YHWHWheel from '@/components/YHWHWheel'
import { getCurrentTheme } from '@/utils/dashboardThemes'

export default function CalendarComparisonPage() {
  const [calendarWheelData, setCalendarWheelData] = useState(null)
  const [yhwhWheelData, setYhwhWheelData] = useState(null)
  const currentTheme = getCurrentTheme()

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8" style={{ background: currentTheme.background }}>
      <div className="max-w-7xl mx-auto">
        <Card 
          className="mb-6 border shadow-xl backdrop-blur-xl"
          style={{
            backgroundColor: currentTheme.cardBg,
            borderColor: currentTheme.cardBorder,
          }}
        >
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl" style={{ color: currentTheme.textPrimary }}>
              Calendar Comparison
            </CardTitle>
            <p className="text-sm sm:text-base mt-2" style={{ color: currentTheme.textSecondary }}>
              Compare and design both calendar wheels side by side
            </p>
          </CardHeader>
        </Card>

        {/* Side by Side Calendar Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* CalendarWheel */}
          <Card 
            className="border shadow-xl backdrop-blur-xl"
            style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.cardBorder,
            }}
          >
            <CardHeader>
              <CardTitle className="text-xl" style={{ color: currentTheme.textPrimary }}>
                CalendarWheel (New)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="w-full flex items-center justify-center">
                <CalendarWheel 
                  timezone="Africa/Johannesburg"
                  theme="auto"
                  size={400}
                  onDataUpdate={setCalendarWheelData}
                />
              </div>
              
              {/* Calendar Info */}
              {calendarWheelData && (
                <div className="w-full space-y-2 p-4 rounded-lg" style={{ backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
                  <div className="text-base font-bold" style={{ color: '#b48f50' }}>
                    Year {calendarWheelData.year} • Month {calendarWheelData.month} • Day {calendarWheelData.dayOfMonth}
                  </div>
                  <div className="text-sm" style={{ color: '#b48f50' }}>
                    Weekday {calendarWheelData.weekday} • Part {calendarWheelData.part}/18
                  </div>
                  <div className="text-xs opacity-80" style={{ color: '#b48f50' }}>
                    Day {calendarWheelData.dayOfYear} of {calendarWheelData.year} • {calendarWheelData.season}
                  </div>
                  <div className="text-xs font-mono opacity-60" style={{ color: '#b48f50' }}>
                    {new Date(calendarWheelData.timestamp).toLocaleString('en-ZA', { 
                      timeZone: 'Africa/Johannesburg',
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* YHWHWheel */}
          <Card 
            className="border shadow-xl backdrop-blur-xl"
            style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.cardBorder,
            }}
          >
            <CardHeader>
              <CardTitle className="text-xl" style={{ color: currentTheme.textPrimary }}>
                YHWHWheel (Original)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="w-full flex items-center justify-center">
                <YHWHWheel 
                  onDataUpdate={setYhwhWheelData}
                />
              </div>
              
              {/* Calendar Info */}
              {yhwhWheelData && (
                <div className="w-full space-y-2 p-4 rounded-lg" style={{ backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
                  <div className="text-base font-bold" style={{ color: '#b48f50' }}>
                    Year {yhwhWheelData.year} • Month {yhwhWheelData.month} • Day {yhwhWheelData.day}
                  </div>
                  <div className="text-sm" style={{ color: '#b48f50' }}>
                    Weekday {yhwhWheelData.weekday} • Part {yhwhWheelData.part}/18
                  </div>
                  {yhwhWheelData.timestamp && (
                    <div className="text-xs font-mono opacity-60" style={{ color: '#b48f50' }}>
                      {yhwhWheelData.timestamp}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

