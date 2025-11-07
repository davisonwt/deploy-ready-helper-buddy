import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PremiumRoomCreationWizard } from '@/components/chat/PremiumRoomCreationWizard';

export function CreatePremiumRoomPage() {
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(true);

  const handleClose = () => {
    setShowWizard(false);
    navigate('/premium-rooms');
  };

  if (!showWizard) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <PremiumRoomCreationWizard onClose={handleClose} />
      </div>
    </div>
  );
}
