import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Play, Lock, Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { useCryptoPay } from '@/hooks/useCryptoPay';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface RadioSession {
  id: string;
  is_free: boolean;
  price?: number;
  radio_shows?: {
    show_name: string;
    category: string;
    description: string;
  };
  radio_djs?: {
    dj_name: string;
    avatar_url?: string;
  };
}

const ITEMS_PER_PAGE = 12;

export default function RadioSessions() {
  const [searchQuery, setSearchQuery] = useState('');
  const { buySession, processing } = useCryptoPay();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['radio-sessions', searchQuery],
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      let query = supabase
        .from('radio_schedule')
        .select(`
          *,
          radio_shows!inner(show_name, category, description),
          radio_djs!inner(dj_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + ITEMS_PER_PAGE - 1);

      if (searchQuery) {
        query = query.or(`radio_shows.show_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < ITEMS_PER_PAGE) return undefined;
      return allPages.length * ITEMS_PER_PAGE;
    },
  });

  const handlePlaySession = async (session: RadioSession) => {
    if (!session.is_free) {
      // Check if already purchased
      const { data: purchased } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('session_id', session.id)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!purchased) {
        await buySession(session, () => {
          toast.success('Access granted! Starting playback...');
          // TODO: Implement actual playback
        });
        return;
      }
    }

    toast.info('Starting playback...');
    // TODO: Implement actual playback
  };

  const sessions = data?.pages.flatMap(page => page) || [];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Life Radio Sessions</h1>
        <p className="text-muted-foreground">
          Browse and listen to pre-recorded radio sessions from our community
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Play className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No sessions found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session: RadioSession) => (
              <Card key={session.id} className="border-primary/10 hover:border-primary/30 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">
                      {session.radio_shows?.show_name}
                    </CardTitle>
                    {session.is_free ? (
                      <Badge variant="default" className="bg-green-600 shrink-0">
                        Free
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="shrink-0">
                        {session.price} USDC
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {session.radio_djs?.dj_name} • {session.radio_shows?.category}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => handlePlaySession(session)}
                    disabled={processing}
                    className="w-full gap-2"
                    variant={session.is_free ? 'default' : 'destructive'}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : session.is_free ? (
                      <Play className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    {session.is_free ? 'Play Now' : `Pay & Listen`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                variant="outline"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
