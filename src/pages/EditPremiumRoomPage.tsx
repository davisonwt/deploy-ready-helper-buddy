import { useParams } from 'react-router-dom';
import { PremiumRoomForm } from '@/components/premium/PremiumRoomForm';

export default function EditPremiumRoomPage() {
  const { id } = useParams<{ id: string }>();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      <PremiumRoomForm roomId={id} />
    </div>
  );
}
