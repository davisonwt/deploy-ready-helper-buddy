import React, { useEffect } from 'react';
import { RadioSlotApplicationWizard } from '@/components/radio/RadioSlotApplicationWizard';
import { useNavigate } from 'react-router-dom';

const RadioSlotApplicationPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Apply for Radio Slot | Radio Wizard";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Apply for a 2-hour live radio slot. Upload documents, set ads, and playlists.');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      <RadioSlotApplicationWizard onClose={() => navigate('/radio-management')} />
    </div>
  );
};

export default RadioSlotApplicationPage;
