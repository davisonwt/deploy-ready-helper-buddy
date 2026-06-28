import React from 'react';
import { Document } from '@react-pdf/renderer';
import type { YearBuild } from '@/utils/calendarYearBuild';
import { MonthPage } from './MonthPage';
import { YearPlannerPage } from './YearPlannerPage';

export type CalendarOutput = 'wall' | 'planner' | 'both';

interface Props {
  year: YearBuild;
  monthImages: Record<number, string>; // month -> image URL
  output: CalendarOutput;
}

export const WallCalendarDocument: React.FC<Props> = ({ year, monthImages, output }) => (
  <Document title={`Scriptural Calendar — Year ${year.year}`}>
    {(output === 'wall' || output === 'both') && year.months.map((m) => (
      <MonthPage key={m.month} month={m} year={year.year} imageUrl={monthImages[m.month] ?? ''} />
    ))}
    {(output === 'planner' || output === 'both') && <YearPlannerPage year={year} />}
  </Document>
);
