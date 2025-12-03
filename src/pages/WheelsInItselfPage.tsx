import React from 'react';
import RemnantsWheelCalendar from '@/components/watch/RemnantsWheelCalendar';

export default function WheelsInItselfPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0a0a15] via-[#1a1a2e] to-[#0a0a15] overflow-x-hidden">
      {/* Header */}
      <div className="container mx-auto pt-6 pb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent mb-2">
          Wheels in Itself
        </h1>
        <p className="text-center text-gray-400 text-lg">
          YHVH's 6-Wheel Rotating Calendar System
        </p>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 pb-8 flex justify-center">
        <div className="glass-card p-6 rounded-3xl shadow-xl border-2 border-amber-500/20">
          <RemnantsWheelCalendar size={Math.min(800, typeof window !== 'undefined' ? window.innerWidth * 0.85 : 800)} />
          
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
              <div className="w-4 h-4 rounded-full bg-purple-400" />
              <span>Month Angels</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-500" />
              <span>364 Day Dots</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-300" />
              <span>354-day Lunar Wheel</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-400" />
              <span>4 Parts of Day</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
