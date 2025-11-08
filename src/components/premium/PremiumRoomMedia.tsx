import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Music, FileText, Image as ImageIcon, Upload, Download,
  DollarSign, Lock, Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { AudioSnippetPlayer } from '@/components/radio/AudioSnippetPlayer';
import { useMediaUpload } from '@/components/live/media/useMediaUpload';
import { MediaUploadZone } from '@/components/live/media/MediaUploadZone';
import { SetPriceModal } from '@/components/live/media/SetPriceModal';
import { useCurrency } from '@/hooks/useCurrency';

interface PremiumRoomMediaProps {
  roomId: string;
  isCreator: boolean;
  userId: string;
}

export const PremiumRoomMedia: React.FC<PremiumRoomMediaProps> = ({
  roomId,
  isCreator,
  userId
}) => {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'music' | 'docs' | 'art'>('music');
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const { uploadMedia, uploading, progress } = useMediaUpload();

  // Fetch media and purchases
  useEffect(() => {
    fetchMedia();
    if (user) {
      fetchPurchases();
    }

    const channel = supabase
      .channel(`premium-room-media:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_media',
          filter: `session_id=eq.${roomId}`,
        },
        () => fetchMedia()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user]);

  const fetchMedia = async () => {
    const { data, error } = await supabase
      .from('live_session_media')
      .select('*')
      .eq('session_id', roomId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMediaItems(data);
    }
  };

  const fetchPurchases = async () => {
    const { data } = await supabase
      .from('live_session_media_purchases')
      .select('media_id')
      .eq('buyer_id', user?.id);

    if (data) {
      setPurchasedItems(new Set(data.map(p => p.media_id)));
    }
  };

  const handleUpload = async (files: File[]) => {
    let mediaType: 'doc' | 'art' | 'music' = 'doc';
    if (activeTab === 'music') mediaType = 'music';
    else if (activeTab === 'art') mediaType = 'art';
    else mediaType = 'doc';

    for (const file of files) {
      await uploadMedia(file, roomId, mediaType, userId);
    }
    fetchMedia();
  };

  const handlePurchase = async (item: any) => {
    if (!user) {
      toast.error('Please log in to purchase');
      return;
    }

    try {
      // Call purchase edge function
      const { data, error } = await supabase.functions.invoke('purchase-media', {
        body: {
          mediaId: item.id,
          paymentMethod: 'bestowal'
        }
      });

      if (error) throw error;

      toast.success('Purchase successful! File sent to your 1-on-1 chat.');
      fetchPurchases();
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Purchase failed');
    }
  };

  const handleFreeDownload = async (item: any) => {
    if (!user) {
      toast.error('Please log in to download');
      return;
    }

    try {
      // Get or create direct chat room with uploader
      const { data: roomData, error: roomError } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: user.id,
        user2_id: item.uploader_id,
      });

      if (roomError || !roomData) {
        throw new Error('Failed to create chat room');
      }

      const roomId = roomData;

      // Get signed URL for the file
      const bucket = item.media_type === 'doc' ? 'live-session-docs' :
                     item.media_type === 'art' ? 'live-session-art' :
                     'live-session-music';

      const { data: signedUrl } = await supabase.storage
        .from(bucket)
        .createSignedUrl(item.file_path, 2592000); // 30 days

      // Send file to chat room
      await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: null, // System message
        content: `📥 Free Download: ${item.file_name}`,
        message_type: 'purchase_delivery',
        system_metadata: {
          type: 'free_download',
          file_url: signedUrl?.signedUrl,
          file_name: item.file_name,
          file_size: item.file_size,
          media_type: item.media_type,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      toast.success('File sent to your 1-on-1 chat!');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || 'Download failed');
    }
  };

  const getPublicUrl = (item: any) => {
    const bucket = item.media_type === 'doc' ? 'live-session-docs' :
                   item.media_type === 'art' ? 'live-session-art' :
                   'live-session-music';
    
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(item.file_path);
    
    return data?.publicUrl || '';
  };

  const filteredItems = mediaItems.filter(item => {
    if (activeTab === 'music') return item.media_type === 'music';
    if (activeTab === 'art') return item.media_type === 'art';
    return item.media_type === 'doc';
  });

  const renderMediaItem = (item: any) => {
    const hasPurchased = purchasedItems.has(item.id);
    const isFree = item.price_cents === 0;
    const isOwner = item.uploader_id === userId;
    const canAccess = isFree || hasPurchased || isOwner || isCreator;
    const price = item.price_cents / 100;

    return (
      <Card key={item.id} className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {item.media_type === 'music' && <Music className="h-5 w-5 text-purple-500 flex-shrink-0" />}
              {item.media_type === 'art' && <ImageIcon className="h-5 w-5 text-pink-500 flex-shrink-0" />}
              {item.media_type === 'doc' && <FileText className="h-5 w-5 text-amber-500 flex-shrink-0" />}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{item.file_name}</h4>
                <p className="text-xs text-muted-foreground">
                  {(item.file_size / 1024 / 1024).toFixed(2)} MB
                  {item.duration_seconds && ` • ${Math.floor(item.duration_seconds / 60)}:${(item.duration_seconds % 60).toString().padStart(2, '0')}`}
                </p>
              </div>
            </div>

            {!isFree && (
              <Badge variant={canAccess ? "secondary" : "default"}>
                {canAccess ? 'Owned' : `$${price.toFixed(2)}`}
              </Badge>
            )}
            {isFree && <Badge variant="secondary">Free</Badge>}
          </div>

          {/* Art preview */}
          {item.media_type === 'art' && (
            <img
              src={getPublicUrl(item)}
              alt={item.file_name}
              className="w-full h-48 object-cover rounded-lg"
            />
          )}

          {/* Music player */}
          {item.media_type === 'music' && (
            <div className="space-y-2">
              {canAccess && isCreator ? (
                // Full player for creator
                <audio controls className="w-full" src={getPublicUrl(item)} />
              ) : canAccess ? (
                // Snippet player for purchasers who aren't creator
                <AudioSnippetPlayer 
                  fileUrl={getPublicUrl(item)}
                  duration={item.duration_seconds || 30}
                  snippetLength={30000}
                />
              ) : (
                // Snippet for non-purchasers
                <div>
                  <AudioSnippetPlayer 
                    fileUrl={getPublicUrl(item)}
                    duration={30}
                    snippetLength={30000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Preview only • Purchase for full track
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isFree ? (
              // Free media - show download button for all
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleFreeDownload(item)}
              >
                <Download className="h-4 w-4 mr-1" />
                Download (Free)
              </Button>
            ) : hasPurchased || isOwner || isCreator ? (
              // Already purchased or owned - show that they have access
              <Badge variant="secondary" className="gap-1">
                <Download className="h-3 w-3" />
                Owned
              </Badge>
            ) : (
              // Priced media - show bestowal button
              <Button
                size="sm"
                onClick={() => handlePurchase(item)}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Bestowal {formatAmount(price)}
              </Button>
            )}

            {isCreator && isOwner && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedMedia(item);
                  setShowPriceModal(true);
                }}
              >
                Set Price
              </Button>
            )}

            {isOwner && <Crown className="h-4 w-4 text-primary ml-auto" />}
          </div>
        </div>
      </Card>
    );
  };

  const getAcceptTypes = () => {
    if (activeTab === 'music') return '.mp3,.wav,.m4a,.aac,.ogg';
    if (activeTab === 'art') return '.jpg,.jpeg,.png,.gif,.webp';
    return '.pdf,.doc,.docx,.txt,.xlsx,.csv';
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="music" className="gap-2">
            <Music className="h-4 w-4" />
            Music
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <FileText className="h-4 w-4" />
            Files
          </TabsTrigger>
          <TabsTrigger value="art" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Art
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 flex flex-col mt-4">
          <ScrollArea className="flex-1">
            <div className="space-y-4 p-4">
              {isCreator && (
                <MediaUploadZone
                  accept={getAcceptTypes()}
                  onUpload={handleUpload}
                  uploading={uploading}
                  mediaType={activeTab}
                />
              )}

              {uploading && (
                <Card className="p-4">
                  <div className="space-y-2">
                    <p className="text-sm">Uploading...</p>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </Card>
              )}

              {filteredItems.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No {activeTab} uploaded yet
                  </p>
                </Card>
              ) : (
                filteredItems.map(renderMediaItem)
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {showPriceModal && selectedMedia && (
        <SetPriceModal
          open={showPriceModal}
          onOpenChange={setShowPriceModal}
          mediaItem={selectedMedia}
          onPriceSet={() => {
            fetchMedia();
            setSelectedMedia(null);
          }}
        />
      )}
    </div>
  );
};
