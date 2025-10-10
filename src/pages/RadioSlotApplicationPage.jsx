import React from 'react';
import { RadioSlotApplicationWizard } from '@/components/radio/RadioSlotApplicationWizard';
import { useNavigate } from 'react-router-dom';

export function RadioSlotApplicationPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      <RadioSlotApplicationWizard onClose={() => navigate('/radio-management')} />
    </div>
  );
}
