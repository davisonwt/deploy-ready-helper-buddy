import React, { useEffect } from 'react';
import { UnifiedDashboard } from '@/components/chat/UnifiedDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const CommunicationsHub: React.FC = () => {
  const { user } = useAuth();

  // Mark all messages as read when user visits the communications hub
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (!user?.id) return;
      try {
        await supabase
          .from('chat_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('is_active', true);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    markMessagesAsRead();
  }, [user?.id]);

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
