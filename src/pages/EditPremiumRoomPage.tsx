import { useParams } from 'react-router-dom';
import { Crown, Lock, Users, Sparkles } from 'lucide-react';
import { PremiumRoomForm } from '@/components/premium/PremiumRoomForm';
import { FormShell } from '@/components/forms';

export default function EditPremiumRoomPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <FormShell
      icon={Crown}
      eyebrow="refine your private sanctuary"
      title="Edit Premium Room"
      subtitle="Tune access, pricing, and the soul of your room — your tribe will feel every detail."
      backTo="/dashboard"
      backLabel="Back to dashboard"
      size="xl"
      benefits={[
        { icon: Lock, label: 'Adjust access tier' },
        { icon: Users, label: 'Member-first design' },
        { icon: Sparkles, label: 'Live updates' },
      ]}
    >
      <PremiumRoomForm roomId={id} />
    </FormShell>
  );
}
