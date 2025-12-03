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
          YHVH's 8-Wheel Rotating Calendar System
        </p>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 pb-8 flex justify-center">
        <div className="glass-card p-6 rounded-3xl shadow-xl border-2 border-amber-500/20">
          <RemnantsWheelCalendar size={Math.min(800, typeof window !== 'undefined' ? window.innerWidth * 0.85 : 800)} />
        </div>
      </div>
    </div>
  );
}
