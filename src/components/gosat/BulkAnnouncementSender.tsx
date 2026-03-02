import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Megaphone, Send, Users, Loader2, Eye, CheckCircle2 } from 'lucide-react';

const DEFAULT_WALLET_MESSAGE = `📢 Important: Set Up Your Payout Wallet

Shalom! 🌱

To receive payouts for your earnings on Sow2Grow, you need to add a crypto wallet address to your profile.

📋 What you need to do:
1. Go to your Dashboard → Settings → Wallet
2. Add your Solana wallet address (for USDC/USDT payouts)
3. If you don't have one yet, download Phantom Wallet (phantom.app) — it's free and takes 2 minutes

💡 Why is this important?
Without a wallet address, we cannot process payouts for your bestowal earnings, whisperer commissions, or delivery payments.

📌 Minimum withdrawal: $10 USD
📌 Payout fee: 0.5%
📌 All payouts are in USDC on Solana (fast & low fees)

If you need help setting up your wallet, reply to this message and we'll guide you through it!

Blessings,
s2g gosat 🌳`;

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Users', description: 'Every registered user' },
  { value: 'sower', label: 'Sowers', description: 'Sellers/creators only' },
  { value: 'whisperer', label: 'Whisperers', description: 'Affiliate marketers' },
  { value: 'driver', label: 'Drivers', description: 'Community delivery drivers' },
];

export function BulkAnnouncementSender() {
  const [targetRole, setTargetRole] = useState('all');
  const [message, setMessage] = useState(DEFAULT_WALLET_MESSAGE);
  const [isSending, setIsSending] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [result, setResult] = useState<{ sentCount: number; failedCount: number } | null>(null);
  const { toast } = useToast();

  const handlePreview = async () => {
    setIsPreviewing(true);
    setPreviewCount(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-system-message', {
        body: { targetRole, message, dryRun: true },
      });

      if (error) throw error;
      setPreviewCount(data.targetCount);
    } catch (err: any) {
      toast({
        title: 'Preview Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-system-message', {
        body: { targetRole, message, dryRun: false },
      });

      if (error) throw error;

      setResult({ sentCount: data.sentCount, failedCount: data.failedCount });
      toast({
        title: '✅ Announcement Sent',
        description: `${data.sentCount} messages delivered, ${data.failedCount} failed`,
      });
    } catch (err: any) {
      toast({
        title: 'Send Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const selectedRoleLabel = ROLE_OPTIONS.find(r => r.value === targetRole)?.label || 'All';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Send Bulk Announcement
        </CardTitle>
        <CardDescription>
          Send a ChatApp message from GoSat to all users or specific roles. Messages appear as personal DMs from s2g gosat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Target Role Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Target Audience</label>
          <Select value={targetRole} onValueChange={(v) => { setTargetRole(v); setPreviewCount(null); setResult(null); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  <span className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    {role.label} — <span className="text-muted-foreground text-xs">{role.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Message Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Message</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessage(DEFAULT_WALLET_MESSAGE)}
              className="text-xs"
            >
              Reset to default
            </Button>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={12}
            className="font-mono text-sm"
            placeholder="Type your announcement message..."
          />
          <p className="text-xs text-muted-foreground">{message.length} characters</p>
        </div>

        {/* Preview / Count */}
        {previewCount !== null && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm">
              This will be sent to <Badge variant="secondary" className="mx-1">{previewCount}</Badge> users ({selectedRoleLabel})
            </span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-sm">
              ✅ Sent: {result.sentCount} | ❌ Failed: {result.failedCount}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={isPreviewing || isSending}
          >
            {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            Preview Count
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={isSending || !message.trim()}
                className="flex-1"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                {isSending ? 'Sending...' : `Send to ${selectedRoleLabel}`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Bulk Announcement</AlertDialogTitle>
                <AlertDialogDescription>
                  This will send a personal ChatApp message to {previewCount !== null ? <strong>{previewCount}</strong> : `all ${selectedRoleLabel.toLowerCase()}`} users. 
                  This action cannot be undone. Are you sure?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSend}>
                  Yes, Send Announcement
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
