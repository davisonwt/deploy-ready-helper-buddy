import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { BookOpen, Gift, Coins, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StudyFeedList() {
  const { data: studies = [], isLoading } = useQuery({
    queryKey: ['community-studies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('s2g_library_items')
        .select('*')
        .eq('type', 'study')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (studies.length === 0) {
    return (
      <div className="text-center py-6">
        <BookOpen className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No studies yet. Be the first to share!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
        <BookOpen className="w-4 h-4" />
        Community Studies
      </h3>
      {studies.map(study => (
        <div key={study.id} className="rounded-xl border overflow-hidden bg-card">
          {study.cover_image_url && (
            <img src={study.cover_image_url} alt={study.title}
              className="w-full h-32 object-cover" />
          )}
          <div className="p-3 space-y-2">
            <h4 className="text-sm font-semibold text-foreground line-clamp-1">{study.title}</h4>
            {study.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{study.description}</p>
            )}
            <div className="flex items-center gap-2">
              {(study.price ?? 0) > 0 ? (
                <Button size="sm" variant="default" className="text-xs h-7 gap-1">
                  <Coins className="w-3 h-3" />
                  Bestow {study.price} USDC
                </Button>
              ) : (
                <span className="text-[10px] text-emerald-500 font-medium">✨ Free Study</span>
              )}
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                <Gift className="w-3 h-3" />
                Gift Sower
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
