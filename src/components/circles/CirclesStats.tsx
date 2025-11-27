import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Radio, Clock } from 'lucide-react';

interface CirclesStatsProps {
  className?: string;
}

export function CirclesStats({ className }: CirclesStatsProps) {
  // TODO: Implement circle-specific stats
  // - Seats available/occupied
  // - Current part indicator
  // - Active listeners
  // - Circle engagement metrics
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          Circle Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Circle-specific metrics coming soon...</p>
      </CardContent>
    </Card>
  );
}

