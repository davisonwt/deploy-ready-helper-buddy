import React from 'react';
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

      {/* Main content - Centered beads */}
      <div className="container mx-auto px-4 pb-8">
        <div className="flex flex-col items-center justify-center">
          {/* Month Bead Strands - Centered */}
          <div className="w-full max-w-2xl flex flex-col items-center">
            <div className="glass-card p-4 rounded-3xl bg-purple-900/30 border border-purple-500/30 w-full">
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
