import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { BookOpen, Gift, Coins, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DEFAULT_COVER = '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png';

export default function StudyFeedList() {
  const { data: studies = [], isLoading } = useQuery({
    queryKey: ['community-studies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('s2g_library_items')
        .select('*')
        .eq('type', 'study')
        .eq('is_public', true)
        .is('parent_study_id' as any, null)
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
        <Link key={study.id} to={`/study/${study.id}`} className="block rounded-xl border overflow-hidden bg-card hover:bg-accent/30 transition-colors">
          <img
            src={study.cover_image_url || DEFAULT_COVER}
            alt={study.title}
            className="w-full h-32 object-cover"
          />
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              {(study as any).study_number && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                  #{(study as any).study_number}
                </span>
              )}
              <h4 className="text-sm font-semibold text-foreground line-clamp-1">{study.title}</h4>
            </div>
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
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={e => e.preventDefault()}>
                <Gift className="w-3 h-3" />
                Gift Sower
              </Button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
