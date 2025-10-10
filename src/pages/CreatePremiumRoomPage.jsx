import React from 'react';
import { PremiumRoomCreationWizard } from '@/components/chat/PremiumRoomCreationWizard';
import { useNavigate } from 'react-router-dom';

export function CreatePremiumRoomPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      <PremiumRoomCreationWizard onClose={() => navigate('/chatapp')} />
    </div>
  );
}
