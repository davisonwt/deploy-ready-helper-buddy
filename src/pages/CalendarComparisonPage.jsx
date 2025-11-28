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
              Compare and design all calendar wheels
            </p>
          </CardHeader>
        </Card>

        {/* Top Row: Two Calendars Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
          {/* CalendarWheel - Left */}
          <Card 
            className="border shadow-xl backdrop-blur-xl"
            style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.cardBorder,
              position: 'relative',
              overflow: 'hidden',
              zIndex: 1
            }}
          >
            <CardHeader>
              <CardTitle className="text-xl" style={{ color: currentTheme.textPrimary }}>
                CalendarWheel (New)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 p-6">
              <div className="w-full flex items-center justify-center" style={{ minHeight: '400px', maxWidth: '100%', overflow: 'hidden', position: 'relative' }}>
                <div style={{ width: '400px', height: '400px', position: 'relative', zIndex: 1, isolation: 'isolate' }}>
                  <CalendarWheel 
                    timezone="Africa/Johannesburg"
                    theme="auto"
                    size={400}
                    onDataUpdate={setCalendarWheelData}
                  />
                </div>
              </div>
              
              {/* Calendar Info */}
              {calendarWheelData && (
                <div className="w-full space-y-2 p-4 rounded-lg mt-4" style={{ backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
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

          {/* YHWHWheel - Right */}
          <Card 
            className="border shadow-xl backdrop-blur-xl"
            style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.cardBorder,
              position: 'relative',
              overflow: 'hidden',
              zIndex: 1
            }}
          >
            <CardHeader>
              <CardTitle className="text-xl" style={{ color: currentTheme.textPrimary }}>
                YHWHWheel (Original)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 p-6">
              <div className="w-full flex items-center justify-center" style={{ minHeight: '400px', maxWidth: '100%', overflow: 'hidden', position: 'relative' }}>
                <div style={{ width: '400px', height: '400px', position: 'relative', zIndex: 1, isolation: 'isolate' }}>
                  <YHWHWheel 
                    onDataUpdate={setYhwhWheelData}
                  />
                </div>
              </div>
              
              {/* Calendar Info */}
              {yhwhWheelData && (
                <div className="w-full space-y-2 p-4 rounded-lg mt-4" style={{ backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
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

        {/* Bottom Row: One Calendar Centered */}
        <div className="flex justify-center">
          <Card 
            className="border shadow-xl backdrop-blur-xl w-full max-w-2xl"
            style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.cardBorder,
              position: 'relative',
              overflow: 'hidden',
              zIndex: 1
            }}
          >
            <CardHeader>
              <CardTitle className="text-xl text-center" style={{ color: currentTheme.textPrimary }}>
                EzekielClock (Circles Within Circles)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 p-6">
              <div className="w-full flex items-center justify-center" style={{ minHeight: '400px', maxWidth: '100%', overflow: 'hidden', position: 'relative' }}>
                <div style={{ width: '400px', height: '400px', position: 'relative', zIndex: 1, isolation: 'isolate' }}>
                  <EzekielClock 
                    onDataUpdate={setEzekielClockData}
                  />
                </div>
              </div>
              
              {/* Calendar Info */}
              {ezekielClockData && (
                <div className="w-full space-y-2 p-4 rounded-lg mt-4" style={{ backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
                  <div className="text-base font-bold" style={{ color: '#b48f50' }}>
                    Year {ezekielClockData.year} • Day {ezekielClockData.dayOfYear}
                  </div>
                  <div className="text-sm" style={{ color: '#b48f50' }}>
                    Part {ezekielClockData.sacredPart}/18
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

