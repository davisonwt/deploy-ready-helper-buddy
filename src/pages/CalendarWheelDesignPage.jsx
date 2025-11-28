import React, { useState, useEffect } from 'react'
import SacredCalendarWheel from '@/components/watch/SacredCalendarWheel'
import { getCurrentTheme } from '@/utils/dashboardThemes'

export default function CalendarWheelDesignPage() {
  const currentTheme = getCurrentTheme()
  const [wheelSize, setWheelSize] = useState(800)

  useEffect(() => {
    const updateSize = () => {
      const maxSize = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.85)
      setWheelSize(maxSize)
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return (
    <div className="min-h-screen p-2 sm:p-4" style={{ background: currentTheme.background }}>
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-4 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: currentTheme.textPrimary }}>
            Calendar Wheel Design
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: currentTheme.textSecondary }}>
            Large view for design and development
          </p>
        </div>

        {/* Large Calendar Wheel Container */}
        <div className="flex items-center justify-center w-full" style={{ minHeight: 'calc(100vh - 120px)' }}>
          <SacredCalendarWheel 
            size={wheelSize}
            userLat={-26.2} // South Africa default
            userLon={28.0}
          />
        </div>
      </div>
    </div>
  )
}

