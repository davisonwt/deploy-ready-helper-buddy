import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Image, Music2, Lock, Clock, Trash2, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PurchaseDeliveryMessageProps {
  metadata: {
    type?: 'purchase_delivery' | 'free_download';
    file_url: string;
    file_name: string;
    file_size?: number;
    price_paid?: number;
    media_type?: 'doc' | 'art' | 'music';
    purchase_id?: string;
    expires_at?: string;
  };
  messageId?: string;
  onDelete?: () => void;
}

export function PurchaseDeliveryMessage({ metadata, messageId, onDelete }: PurchaseDeliveryMessageProps) {
  const { user } = useAuth();
  const [isGosat, setIsGosat] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    type,
    file_url,
    file_name,
    file_size,
    price_paid,
    media_type,
    expires_at,
  } = metadata || ({} as any);

  // Check if current user is gosat
  useEffect(() => {
    const checkGosatRole = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'gosat')
        .single();
      
      setIsGosat(!!data);
    };
    
    checkGosatRole();
  }, [user]);

  const handleDelete = async () => {
    if (!messageId || !isGosat) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
      
      toast.success('Delivery message deleted');
      if (onDelete) onDelete();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete message');
    } finally {
      setDeleting(false);
    }
  };

  const getMediaIcon = () => {
    switch (media_type) {
      case 'doc':
        return <FileText className="h-6 w-6 text-amber-500" />;
      case 'art':
        return <Image className="h-6 w-6 text-pink-500" />;
      case 'music':
        return <Music2 className="h-6 w-6 text-purple-500" />;
      default:
        return <Download className="h-6 w-6 text-primary" />;
    }
  };

  const hasExpiry = !!expires_at;
  const isExpired = hasExpiry ? new Date(expires_at!) < new Date() : false;
  const expiresIn = hasExpiry ? formatDistanceToNow(new Date(expires_at!), { addSuffix: true }) : '';

  const isFree = type === 'free_download' || typeof price_paid !== 'number';

  return (
    <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-emerald-500/20">
      {/* S2G Gosat System Badge */}
      <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b border-emerald-500/20">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-600 text-white shadow-sm">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs font-semibold">s2g gosat System Delivery</span>
        </div>
      </div>

      <div className="flex items-start gap-3">
        {/* Media Icon */}
        <div className="w-12 h-12 rounded-lg bg-background/80 flex items-center justify-center flex-shrink-0">
          {getMediaIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="bg-emerald-600 text-white">
                  {isFree ? 'Free Download' : 'Purchase Complete'}
                </Badge>
                {!isFree && typeof price_paid === 'number' && (
                  <span className="text-xs text-muted-foreground">${price_paid.toFixed(2)}</span>
                )}
              </div>
              <p className="font-semibold text-sm">{file_name}</p>
              {(file_size || media_type) && (
                <p className="text-xs text-muted-foreground">
                  {file_size ? `${(file_size / 1024 / 1024).toFixed(2)} MB` : ''}
                  {file_size && media_type ? ' • ' : ''}
                  {media_type ? media_type.toUpperCase() : ''}
                </p>
              )}
            </div>
            
            {/* Gosat Delete Button */}
            {isGosat && messageId && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Expiry Warning */}
          {hasExpiry && !isExpired && (
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3 w-3 text-amber-500" />
              <span className="text-muted-foreground">
                Download before it expires {expiresIn}
              </span>
            </div>
          )}

          {/* Actions */}
          {isExpired ? (
            <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
              <Lock className="h-4 w-4 text-destructive" />
              <span className="text-xs text-destructive font-medium">
                Download link expired
              </span>
            </div>
          ) : (
            <Button
              size="sm"
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                if (file_url) {
                  window.open(file_url, '_blank');
                }
              }}
            >
              <Download className="h-4 w-4" />
              Download Now
            </Button>
          )}

          {/* Info */}
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {isFree
                ? '💡 This free file was delivered to you privately. Download it before it expires.'
                : '💡 This file is private and only accessible by you. Download it before it expires!'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
