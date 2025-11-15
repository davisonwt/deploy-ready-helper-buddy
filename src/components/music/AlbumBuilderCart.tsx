import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAlbumBuilder } from '@/contexts/AlbumBuilderContext';
import { Music, X, ShoppingCart, Download } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';

export function AlbumBuilderCart() {
  const { selectedTracks, removeTrack, clearAlbum, albumPrice } = useAlbumBuilder();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [processing, setProcessing] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please sign in to purchase');
      return;
    }

    if (selectedTracks.length !== 10) {
      toast.error('Please select exactly 10 tracks for your album');
      return;
    }

    setProcessing(true);
    try {
      // Create album purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from('music_purchases')
        .insert({
          buyer_id: user.id,
          track_id: selectedTracks[0].id, // Use first track as reference
          amount: albumPrice * 0.85, // Artist amount (85%)
          total_amount: albumPrice,
          platform_fee: albumPrice * 0.05,
          sow2grow_fee: albumPrice * 0.10,
          artist_amount: albumPrice * 0.85,
          platform_amount: albumPrice * 0.05,
          admin_amount: albumPrice * 0.10,
          payment_status: 'completed'
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Create individual track purchase records for tracking
      const trackPurchases = selectedTracks.map(track => ({
        buyer_id: user.id,
        track_id: track.id,
        amount: albumPrice / 10,
        total_amount: albumPrice / 10,
        platform_fee: (albumPrice / 10) * 0.05,
        sow2grow_fee: (albumPrice / 10) * 0.10,
        artist_amount: (albumPrice / 10) * 0.85,
        platform_amount: (albumPrice / 10) * 0.05,
        admin_amount: (albumPrice / 10) * 0.10,
        payment_status: 'completed'
      }));

      const { error: tracksError } = await supabase
        .from('music_purchases')
        .insert(trackPurchases);

      if (tracksError) throw tracksError;

      toast.success('Album purchased! You can now download all tracks.');
      clearAlbum();
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Purchase failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (selectedTracks.length === 0) {
    return (
      <Card className="sticky top-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Build Your Album
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select 10 tracks from the community music to build your album</p>
            <p className="text-sm mt-2">{formatAmount(albumPrice)} total</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Your Album
          </span>
          <Badge variant="secondary">
            {selectedTracks.length}/10 tracks
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {selectedTracks.map((track, index) => (
            <div
              key={track.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{track.track_title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {track.artist_name || track.profiles?.username || 'Unknown Artist'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeTrack(track.id)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">{formatAmount(albumPrice)}</span>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• 85% to artists</p>
            <p>• 10% tithing</p>
            <p>• 5% platform fee</p>
          </div>

          {selectedTracks.length === 10 ? (
            <Button
              onClick={handleCheckout}
              disabled={processing}
              className="w-full"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              {processing ? 'Processing...' : `Bestow ${formatAmount(albumPrice)}`}
            </Button>
          ) : (
            <Button disabled className="w-full" size="lg">
              Select {10 - selectedTracks.length} more track{10 - selectedTracks.length !== 1 ? 's' : ''}
            </Button>
          )}

          {selectedTracks.length > 0 && (
            <Button
              variant="outline"
              onClick={clearAlbum}
              className="w-full"
              size="sm"
            >
              Clear Album
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
