import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentTheme } from '@/utils/dashboardThemes';

export function DashboardSkeleton() {
  const theme = getCurrentTheme();

  return (
    <div className="min-h-screen" style={{ background: theme.background }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-4">
        {/* Welcome Card Skeleton */}
        <div
          className="rounded-2xl border p-6 mb-6 backdrop-blur-xl"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
        >
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" style={{ backgroundColor: theme.accent + '20' }} />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" style={{ backgroundColor: theme.accent + '20' }} />
              <Skeleton className="h-4 w-64" style={{ backgroundColor: theme.accent + '15' }} />
              <Skeleton className="h-3 w-40" style={{ backgroundColor: theme.accent + '10' }} />
            </div>
          </div>
          <div className="mt-6 space-y-2 flex flex-col items-center">
            <Skeleton className="h-5 w-56" style={{ backgroundColor: theme.accent + '20' }} />
            <Skeleton className="h-4 w-44" style={{ backgroundColor: theme.accent + '15' }} />
            <Skeleton className="h-3 w-36" style={{ backgroundColor: theme.accent + '10' }} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border p-6 h-32 backdrop-blur-xl"
              style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
            >
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" style={{ backgroundColor: theme.accent + '20' }} />
                <Skeleton className="h-8 w-16" style={{ backgroundColor: theme.accent + '25' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Leaderboard Skeleton */}
        <div
          className="rounded-3xl border p-6 mb-6 backdrop-blur-xl"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
        >
          <Skeleton className="h-5 w-40 mb-4" style={{ backgroundColor: theme.accent + '20' }} />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" style={{ backgroundColor: theme.accent + '20' }} />
                <Skeleton className="w-10 h-10 rounded-full" style={{ backgroundColor: theme.accent + '15' }} />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" style={{ backgroundColor: theme.accent + '20' }} />
                  <Skeleton className="h-3 w-16" style={{ backgroundColor: theme.accent + '15' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div
          className="rounded-xl border p-6 backdrop-blur-xl"
          style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
        >
          <Skeleton className="h-5 w-32 mb-4" style={{ backgroundColor: theme.accent + '20' }} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-20 rounded-2xl"
                style={{ backgroundColor: theme.accent + '15' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
