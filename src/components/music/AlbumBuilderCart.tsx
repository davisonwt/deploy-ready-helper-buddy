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
import ProviderPicker from '@/components/payments/ProviderPicker';
import { PayoutProviderId, quoteFee } from '@/lib/payments/providerFees';

interface AlbumBuilderCartProps {
  scopeName?: string;
}

export function AlbumBuilderCart({ scopeName }: AlbumBuilderCartProps = {}) {
  const { selectedTracks, removeTrack, clearAlbum, albumPrice } = useAlbumBuilder();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [processing, setProcessing] = useState(false);
  const [provider, setProvider] = useState<PayoutProviderId>('nowpayments');
  const feeQuote = quoteFee(provider, albumPrice);

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
      const productItems = selectedTracks
        .map((track) => track.product_id || (track.source_type === 'product' ? track.id : null))
        .filter(Boolean)
        .map((productId) => ({ productId, qty: 1 }));

      if (productItems.length !== selectedTracks.length) {
        toast.error('Album checkout is available for sower music seeds. Please bestow uploaded DJ tracks one song at a time.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-basket-bestowal-order', {
        body: {
          items: productItems,
          provider,
          payCurrency: provider === 'nowpayments' ? 'usdcsol' : undefined,
          redirectBaseUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (error) throw new Error(error.message || 'Failed to create album order');
      if (!data || data.error) throw new Error(data?.error || 'album_order_failed');

      if (provider === 'paypal') {
        if (!data.approveUrl) throw new Error('No PayPal checkout URL returned');
        window.location.href = data.approveUrl;
        return;
      }

      if (!data.invoiceUrl) throw new Error('No crypto invoice URL returned');
      window.open(data.invoiceUrl, '_blank');
      toast.success('Album invoice opened. Complete payment to confirm the album bestowal.');
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error(error instanceof Error ? error.message : 'Purchase failed. Please try again.');
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
             <p>Select 10 tracks{scopeName ? ` from ${scopeName}` : ''} to build your album</p>
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
            <p>• 85% to sowers</p>
            <p>• 10% platform fee</p>
            <p>• 5% admin fee</p>
          </div>

          {selectedTracks.length === 10 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment method</div>
              <ProviderPicker value={provider} onChange={setProvider} amount={albumPrice} mode="buyer" disabled={processing} />
              <div className="text-xs text-muted-foreground text-right">
                Estimated processor fee: <span className="font-medium text-foreground">{feeQuote.display}</span>
              </div>
            </div>
          )}

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
