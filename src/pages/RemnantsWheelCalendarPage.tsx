'use client';

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import RemnantsWheelCalendar from '@/components/remnants/RemnantsWheelCalendar';
import { Button } from '@/components/ui/button';

const RemnantsWheelCalendarPage = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-black via-slate-950 to-black text-slate-100">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300 mb-2">
              364yhvh Days
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg">
              Remnants Wheel Calendar
            </h1>
            <p className="mt-3 text-slate-300 max-w-2xl">
              A permanently centered, live-updating visualization of the Creator&rsquo;s appointed times.
              This wheel cannot be dragged off-axis—it always re-centers on YHVH&rsquo;s cadence.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="bg-emerald-500/10 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/20"
          >
            <Link to="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[1100px]">
          <RemnantsWheelCalendar />
        </div>
      </div>
    </div>
  );
};

export default RemnantsWheelCalendarPage;
