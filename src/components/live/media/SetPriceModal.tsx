import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Lock, Unlock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SetPriceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaItem: any;
  onPriceSet: () => void;
}

export function SetPriceModal({ open, onOpenChange, mediaItem, onPriceSet }: SetPriceModalProps) {
  const [isFree, setIsFree] = useState(mediaItem?.price_cents === 0);
  const [price, setPrice] = useState((mediaItem?.price_cents || 499) / 100);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!isFree && (price < 0.50 || price > 999.99)) {
      toast.error('Price must be between $0.50 and $999.99');
      return;
    }

    setSaving(true);

    try {
      const priceCents = isFree ? 0 : Math.round(price * 100);

      const { error } = await supabase
        .from('live_session_media')
        .update({ price_cents: priceCents })
        .eq('id', mediaItem.id);

      if (error) throw error;

      toast.success(isFree ? 'Media set to free' : `Price set to $${price.toFixed(2)}`);
      onPriceSet();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error setting price:', error);
      toast.error('Failed to set price');
    } finally {
      setSaving(false);
    }
  };

  const calculateRevenue = () => {
    if (isFree) return { uploader: 0, host: 0, platform: 0 };
    const total = Math.round(price * 100);
    const uploader = Math.round(total * 0.8);
    const host = Math.round(total * 0.1);
    const platform = total - uploader - host;
    return { uploader: uploader / 100, host: host / 100, platform: platform / 100 };
  };

  const revenue = calculateRevenue();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Set Price for {mediaItem?.file_name}
          </DialogTitle>
          <DialogDescription>
            Choose whether this {mediaItem?.media_type} is free or paid
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Free/Paid Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              {isFree ? (
                <Unlock className="h-5 w-5 text-emerald-500" />
              ) : (
                <Lock className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <Label className="font-semibold">{isFree ? 'Free Access' : 'Paid Content'}</Label>
                <p className="text-xs text-muted-foreground">
                  {isFree ? 'Anyone can download' : 'Requires purchase'}
                </p>
              </div>
            </div>
            <Switch checked={!isFree} onCheckedChange={(checked) => setIsFree(!checked)} />
          </div>

          {/* Price Input */}
          {!isFree && (
            <div className="space-y-2">
              <Label htmlFor="price">Sale Price (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  min="0.50"
                  max="999.99"
                  step="0.25"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                  className="pl-9"
                  placeholder="4.99"
                />
              </div>
              <p className="text-xs text-muted-foreground">Minimum $0.50, maximum $999.99</p>
            </div>
          )}

          {/* Revenue Split Preview */}
          {!isFree && (
            <div className="space-y-2 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-semibold text-primary">Revenue Split:</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <Badge variant="secondary" className="w-full">
                    You: ${revenue.uploader.toFixed(2)}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">80%</p>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="w-full">
                    Host: ${revenue.host.toFixed(2)}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">10%</p>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="w-full">
                    Platform: ${revenue.platform.toFixed(2)}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">10%</p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Info */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              📦 Purchased files are delivered to the buyer's 1-on-1 chat with you and expire in 30 days
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isFree ? 'Set as Free' : `Set Price: $${price.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
