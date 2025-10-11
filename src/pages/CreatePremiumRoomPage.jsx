import React, { useEffect } from 'react';
import { PremiumRoomCreationWizard } from '@/components/chat/PremiumRoomCreationWizard';
import { useNavigate } from 'react-router-dom';

export function CreatePremiumRoomPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Create Premium Room | Chat Rooms Wizard";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Create premium chat rooms with video, seminars, and more.');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      <PremiumRoomCreationWizard onClose={() => navigate('/chatapp')} />
    </div>
  );
}
