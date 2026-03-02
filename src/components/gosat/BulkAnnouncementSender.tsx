import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Megaphone, Send, Users, Loader2, Eye, CheckCircle2, X, Search, UserPlus, FileText } from 'lucide-react';

// ═══════════════════════════════════════════
// MESSAGE TEMPLATES
// ═══════════════════════════════════════════
const MESSAGE_TEMPLATES = [
  {
    id: 'wallet_setup',
    label: '💳 Wallet Setup Reminder',
    message: `📢 Important: Set Up Your Payout Wallet

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
s2g gosat 🌳`,
  },
  {
    id: 'welcome',
    label: '👋 Welcome Message',
    message: `👋 Welcome to Sow2Grow!

Shalom and blessings! 🌱

We're thrilled to have you as part of our growing community. Here's a quick guide to get started:

🌳 Explore Orchards — Discover causes and projects to support
🛒 Browse Seeds — Find unique products from our sowers
💬 ChatApp — Connect directly with sowers and the community
🎵 Music — Listen to and support independent artists

Need help? Reply to this message anytime — we're here for you!

Blessings,
s2g gosat 🌳`,
  },
  {
    id: 'maintenance',
    label: '🔧 Maintenance Notice',
    message: `🔧 Scheduled Maintenance Notice

Shalom! 🌱

We wanted to let you know that Sow2Grow will undergo brief maintenance on [DATE] from [TIME] to [TIME].

During this period:
- The platform may be temporarily unavailable
- No transactions will be lost
- All pending payments will be processed after maintenance

We apologize for any inconvenience and appreciate your patience!

Blessings,
s2g gosat 🌳`,
  },
  {
    id: 'new_feature',
    label: '🎉 New Feature Announcement',
    message: `🎉 Exciting New Feature!

Shalom! 🌱

We're excited to announce a new feature on Sow2Grow:

✨ [FEATURE NAME]

[Describe the feature and how to use it]

Try it out today and let us know what you think!

Blessings,
s2g gosat 🌳`,
  },
  {
    id: 'payment_reminder',
    label: '💰 Payment/Earnings Update',
    message: `💰 Earnings Update

Shalom! 🌱

Just a friendly reminder to check your dashboard for recent earnings and bestowals. 

To withdraw your earnings:
1. Go to Dashboard → Wallet
2. Ensure your Solana wallet address is set up
3. Click "Request Payout" when your balance is $10+

If you have any questions about your earnings, reply to this message!

Blessings,
s2g gosat 🌳`,
  },
  {
    id: 'custom',
    label: '✏️ Custom Message',
    message: '',
  },
];

const ROLE_OPTIONS = [
  { value: 'all', label: 'All Users', description: 'Every registered user' },
  { value: 'sower', label: 'Sowers', description: 'Sellers/creators only' },
  { value: 'whisperer', label: 'Whisperers', description: 'Affiliate marketers' },
  { value: 'driver', label: 'Drivers', description: 'Community delivery drivers' },
  { value: 'specific', label: 'Specific Users', description: 'Pick individual users' },
];

interface UserProfile {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export function BulkAnnouncementSender() {
  const [targetRole, setTargetRole] = useState('all');
  const [message, setMessage] = useState(MESSAGE_TEMPLATES[0].message);
  const [selectedTemplate, setSelectedTemplate] = useState('wallet_setup');
  const [isSending, setIsSending] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [result, setResult] = useState<{ sentCount: number; failedCount: number } | null>(null);

  // User picker state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { toast } = useToast();

  // Debounced user search
  useEffect(() => {
    if (targetRole !== 'specific' || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name, avatar_url')
          .or(`display_name.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
          .limit(10);

        if (!error && data) {
          // Filter out already selected users
          const selectedIds = new Set(selectedUsers.map(u => u.user_id));
          setSearchResults(data.filter(u => !selectedIds.has(u.user_id)));
        }
      } catch (err) {
        console.error('User search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, targetRole, selectedUsers]);

  const addUser = (user: UserProfile) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.user_id !== userId));
  };

  const getUserDisplayName = (user: UserProfile) => {
    return user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
  };

  const getUserInitials = (user: UserProfile) => {
    const name = getUserDisplayName(user);
    return name.substring(0, 2).toUpperCase();
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setMessage(template.message);
    }
  };

  const handlePreview = async () => {
    if (targetRole === 'specific') {
      setPreviewCount(selectedUsers.length);
      return;
    }
    setIsPreviewing(true);
    setPreviewCount(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-system-message', {
        body: { targetRole, message, dryRun: true },
      });
      if (error) throw error;
      setPreviewCount(data.targetCount);
    } catch (err: any) {
      toast({ title: 'Preview Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    setResult(null);
    try {
      const body: any = { message, dryRun: false };

      if (targetRole === 'specific') {
        body.targetRole = 'specific';
        body.targetUserIds = selectedUsers.map(u => u.user_id);
      } else {
        body.targetRole = targetRole;
      }

      const { data, error } = await supabase.functions.invoke('send-bulk-system-message', { body });
      if (error) throw error;

      setResult({ sentCount: data.sentCount, failedCount: data.failedCount });
      toast({
        title: '✅ Announcement Sent',
        description: `${data.sentCount} messages delivered, ${data.failedCount} failed`,
      });
    } catch (err: any) {
      toast({ title: 'Send Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const selectedRoleLabel = targetRole === 'specific'
    ? `${selectedUsers.length} selected user${selectedUsers.length !== 1 ? 's' : ''}`
    : ROLE_OPTIONS.find(r => r.value === targetRole)?.label || 'All';

  const canSend = message.trim() && (targetRole !== 'specific' || selectedUsers.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Send Announcement
        </CardTitle>
        <CardDescription>
          Send a ChatApp message from GoSat to users by role or pick specific people. Messages appear as personal DMs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Message Template
          </label>
          <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESSAGE_TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target Audience Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Target Audience
          </label>
          <Select value={targetRole} onValueChange={(v) => { setTargetRole(v); setPreviewCount(null); setResult(null); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  <span className="flex items-center gap-2">
                    {role.value === 'specific' ? <UserPlus className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                    {role.label} — <span className="text-muted-foreground text-xs">{role.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* User Picker (when "Specific Users" is selected) */}
        {targetRole === 'specific' && (
          <div className="space-y-3">
            {/* Selected users chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Badge key={user.user_id} variant="secondary" className="pl-1 pr-1 py-1 flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{getUserInitials(user)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{getUserDisplayName(user)}</span>
                    <button
                      onClick={() => removeUser(user.user_id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name..."
                className="pl-9"
              />
              {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <ScrollArea className="max-h-48 border rounded-lg">
                <div className="p-1">
                  {searchResults.map((user) => (
                    <button
                      key={user.user_id}
                      onClick={() => addUser(user)}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors text-left"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{getUserInitials(user)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{getUserDisplayName(user)}</p>
                      </div>
                      <UserPlus className="h-4 w-4 ml-auto text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <p className="text-xs text-muted-foreground text-center py-2">No users found</p>
            )}
          </div>
        )}

        {/* Message Editor */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Message</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
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
              This will be sent to <Badge variant="secondary" className="mx-1">{previewCount}</Badge> {targetRole === 'specific' ? 'selected users' : `users (${selectedRoleLabel})`}
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
            disabled={isPreviewing || isSending || (targetRole === 'specific' && selectedUsers.length === 0)}
          >
            {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            Preview Count
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isSending || !canSend} className="flex-1">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                {isSending ? 'Sending...' : `Send to ${selectedRoleLabel}`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Announcement</AlertDialogTitle>
                <AlertDialogDescription>
                  This will send a personal ChatApp message to{' '}
                  {targetRole === 'specific'
                    ? <strong>{selectedUsers.length} selected user{selectedUsers.length !== 1 ? 's' : ''}</strong>
                    : previewCount !== null
                      ? <strong>{previewCount} users</strong>
                      : `all ${selectedRoleLabel.toLowerCase()}`
                  }.
                  This action cannot be undone.
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
