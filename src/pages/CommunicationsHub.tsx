import React from 'react';
import { UnifiedDashboard } from '@/components/chat/UnifiedDashboard';

const CommunicationsHub: React.FC = () => {
  // PHASE 1: UNIFIED DASHBOARD WITH AURORA BACKGROUND
  try {
    return <UnifiedDashboard />;
  } catch (error) {
    console.error('Error loading UnifiedDashboard:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Communications Hub</h1>
          <p className="text-muted-foreground">Please refresh the page or contact support if the issue persists.</p>
        </div>
      </div>
    );
  }
};

export default CommunicationsHub;
