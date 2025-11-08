import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Plus } from 'lucide-react';
import { PremiumRoomsList } from '@/components/chat/PremiumRoomsList';

interface PremiumRoomsTabProps {
  searchQuery: string;
}

export const PremiumRoomsTab = ({ searchQuery }: PremiumRoomsTabProps) => {
  return (
    <div className="space-y-4">
      <PremiumRoomsList />
    </div>
  );
};
