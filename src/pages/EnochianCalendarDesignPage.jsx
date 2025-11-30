import React from 'react';
import EnochianWheelCalendar from '@/components/watch/EnochianWheelCalendar';
import { LocationVerification } from '@/components/calendar/LocationVerification';

export default function EnochianCalendarDesignPage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <div className="container mx-auto pt-4">
        <LocationVerification />
      </div>
      <EnochianWheelCalendar />
    </div>
  );
}
