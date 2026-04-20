import { Crown, Lock, Users, Sparkles } from 'lucide-react';
import { PremiumRoomForm } from '@/components/premium/PremiumRoomForm';
import { FormShell } from '@/components/forms';

export function CreatePremiumRoomPage() {
  return (
    <FormShell
      icon={Crown}
      eyebrow="build your private sanctuary"
      title="Create a Premium Room"
      subtitle="Curate an exclusive space for your most devoted tribe members — gated by bestowal, alive with your voice."
      backTo="/dashboard"
      backLabel="Back to dashboard"
      size="xl"
      benefits={[
        { icon: Lock, label: 'Bestowal-gated access' },
        { icon: Users, label: 'Inner-circle community' },
        { icon: Sparkles, label: 'Recurring earnings' },
      ]}
    >
      <PremiumRoomForm />
    </FormShell>
  );
}

export default CreatePremiumRoomPage;
