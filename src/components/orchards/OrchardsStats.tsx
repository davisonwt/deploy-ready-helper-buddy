import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TreePine, Users, TrendingUp, Eye } from 'lucide-react';

interface OrchardsStatsProps {
  className?: string;
}

export function OrchardsStats({ className }: OrchardsStatsProps) {
  // TODO: Implement orchard-specific stats
  // - Supporters count
  // - Progress percentage
  // - Honey harvested (if applicable)
  // - Views and engagement
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TreePine className="h-5 w-5" />
          Orchard Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Orchard-specific metrics coming soon...</p>
      </CardContent>
    </Card>
  );
}

