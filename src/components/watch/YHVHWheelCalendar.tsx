'use client';

import React from 'react';
import EnochianTimepiece from './EnochianWheelCalendar';

// Re-export the live Enochian timepiece as the wheel-in-wheel calendar.
// Previously this file was stubbed to null which removed the wheel from /364yhvh-days.
export const YHVHWheelCalendar = (_props: any) => {
  return <EnochianTimepiece />;
};

export const YHVHWheelCalendarLive = ({ size: _size = 800 }: { size?: number }) => {
  return <EnochianTimepiece />;
};

export default YHVHWheelCalendarLive;
