import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingSpinnerProps {
  size?: 'sm' | 'default' | 'lg';
  full?: boolean;
  text?: string;
}

export const LoadingSpinner = ({ 
  size = 'default', 
  full = false, 
  text = 'Loading...' 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`flex items-center justify-center ${full ? 'min-h-screen' : ''}`}>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
        {text && (
          <span className="text-sm text-muted-foreground animate-pulse">
            {text}
          </span>
        )}
      </div>
    </div>
  );
};

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export const LoadingSkeleton = ({ lines = 5, className = '' }: LoadingSkeletonProps) => (
  <div className={`space-y-3 ${className}`}>
    {[...Array(lines)].map((_, i) => (
      <Skeleton 
        key={i} 
        className={`h-4 w-full ${i === 0 ? 'w-3/4' : i === lines - 1 ? 'w-1/2' : ''}`} 
      />
    ))}
  </div>
);

interface LoadingCardProps {
  count?: number;
}

export const LoadingCard = ({ count = 1 }: LoadingCardProps) => (
  <div className="space-y-4">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="border rounded-lg p-4 space-y-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    ))}
  </div>
);

interface LoadingTableProps {
  rows?: number;
  columns?: number;
}

export const LoadingTable = ({ rows = 5, columns = 4 }: LoadingTableProps) => (
  <div className="space-y-2">
    {/* Header */}
    <div className="flex gap-4 p-3 border-b">
      {[...Array(columns)].map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex gap-4 p-3">
        {[...Array(columns)].map((_, j) => (
          <Skeleton key={j} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);