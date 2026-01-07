import React from 'react';
import RemnantsWheelCalendar from '@/components/watch/RemnantsWheelCalendar';
import { LocationVerification } from '@/components/calendar/LocationVerification';

export default function WheelsInItselfPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0a0a15] via-[#1a1a2e] to-[#0a0a15] overflow-x-hidden">
      {/* Header */}
      <div className="container mx-auto pt-6 pb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent mb-2">
          Wheels in Itself
        </h1>
        <p className="text-center text-gray-400 text-lg mb-4">
          YHVH's 8-Wheel Rotating Calendar System
        </p>
        <LocationVerification />
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 pb-8 flex justify-center">
        <div className="glass-card p-6 rounded-3xl shadow-xl border-2 border-amber-500/20">
          <RemnantsWheelCalendar size={Math.min(800, typeof window !== 'undefined' ? window.innerWidth * 0.85 : 800)} />
        </div>
      </div>
      
      {/* Week Structure Explanation */}
      <div className="container mx-auto px-4 pb-8 max-w-2xl">
        <div className="bg-black/40 rounded-xl p-6 border border-amber-500/20">
          <h2 className="text-xl font-bold text-amber-400 mb-4">Year-End Week Structure</h2>
          <div className="space-y-2 text-sm text-gray-300">
            <p><span className="text-purple-400">Day 361</span> - 52nd Sabbath (end of Man's count)</p>
            <p><span className="text-pink-400">• Dot 1</span> - Helo-Yaseph (Day out of time)</p>
            <p><span className="text-pink-400">• Dot 2</span> - Asfa'el (Day out of time)</p>
            <p><span className="text-cyan-400">Day 362</span> - YHVH Day 1 = Week Day 1</p>
            <p><span className="text-cyan-400">Day 363</span> - YHVH Day 2 = Week Day 2</p>
            <p><span className="text-cyan-400">Day 364</span> - YHVH Day 3 = Week Day 3</p>
            <p><span className="text-amber-400">Tequvah</span> - YHVH Day 4 = Week Day 4 = <strong>Man's Day 1</strong> (New Year)</p>
            <p><span className="text-gray-400">Man's Day 2</span> - Week Day 5</p>
            <p><span className="text-gray-400">Man's Day 3</span> - Week Day 6</p>
            <p><span className="text-purple-400">Man's Day 4</span> - Sabbath (Week Day 7)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
