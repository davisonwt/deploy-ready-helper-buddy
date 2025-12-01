import React from 'react';
import { YHVHWheelCalendarLive } from '@/components/watch/YHVHWheelCalendar';
import EnochianWheelCalendar from '@/components/watch/EnochianWheelCalendar';
import { LocationVerification } from '@/components/calendar/LocationVerification';

export default function EnochianCalendarDesignPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0a0a15] via-[#1a1a2e] to-[#0a0a15] overflow-x-hidden">
      {/* Header */}
      <div className="container mx-auto pt-6 pb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent mb-4">
          YHVH's Wheel Within Wheels Calendar
        </h1>
        <LocationVerification />
      </div>

      {/* Main content - Two column layout on large screens */}
      <div className="container mx-auto px-4 pb-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          
          {/* Left: Rotational Wheel Calendar (2/3 width) */}
          <div className="w-full lg:w-2/3 flex flex-col items-center">
            <div className="glass-card p-6 rounded-3xl w-full max-w-4xl">
              <h2 className="text-xl md:text-2xl font-bold text-center text-amber-400 mb-6">
                6 Concentric Wheels
              </h2>
              
              {/* Wheel Calendar - responsive sizing */}
              <div className="flex justify-center">
                <YHVHWheelCalendarLive size={Math.min(700, typeof window !== 'undefined' ? window.innerWidth * 0.6 : 700)} />
              </div>
              
              {/* Legend */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500" />
                  <span>Outer: 366 Days (Sun)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <span>4 Leaders (91 days each)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                  <span>Day of Month (1-31)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gray-500" />
                  <span>52 Weeks (364 dots)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span>7 Days of Week</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500" />
                  <span>Inner: 4 Parts of Day</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Month Bead Strands (1/3 width) */}
          <div className="w-full lg:w-1/3 flex flex-col items-center">
            <div className="glass-card p-4 rounded-3xl bg-purple-900/30 border border-purple-500/30 w-full max-w-sm">
              <h2 className="text-lg md:text-xl font-bold text-center text-purple-300 mb-4">
                Month Bead Strands
              </h2>
              
              {/* Scrollable container for bead strands */}
              <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-purple-900/30">
                <EnochianWheelCalendar />
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
