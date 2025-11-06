import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Video, FileText, Image, Music2 } from 'lucide-react';
import { MediaUploadZone } from './MediaUploadZone';
import { MediaThumbnailStrip } from './MediaThumbnailStrip';
import { useMediaUpload } from './useMediaUpload';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MediaDockProps {
  sessionId: string;
  isHost?: boolean;
}

export function MediaDock({ sessionId, isHost = false }: MediaDockProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'voice' | 'video' | 'docs' | 'art' | 'music'>('voice');
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const { uploadMedia, uploading, progress } = useMediaUpload();

  // Fetch media items for this session
  const fetchMedia = useCallback(async () => {
    if (!sessionId) return;

    const { data, error } = await supabase
      .from('live_session_media')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMediaItems(data);
    }
  }, [sessionId]);

  React.useEffect(() => {
    fetchMedia();

    // Subscribe to new media uploads
    const channel = supabase
      .channel(`session-media-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_media',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchMedia();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, fetchMedia]);

  const handleUpload = async (files: File[], mediaType: 'doc' | 'art' | 'music') => {
    if (!user) return;

    for (const file of files) {
      await uploadMedia(file, sessionId, mediaType, user.id);
    }
    fetchMedia();
  };

  const getMediaByType = (type: string) => {
    return mediaItems.filter(item => item.media_type === type);
  };

  const tabConfig = [
    { value: 'voice', label: 'Voice', icon: Mic, color: 'bg-emerald-500/10 text-emerald-500' },
    { value: 'video', label: 'Video', icon: Video, color: 'bg-blue-500/10 text-blue-500' },
    { value: 'docs', label: 'Docs', icon: FileText, color: 'bg-amber-500/10 text-amber-500' },
    { value: 'art', label: 'Art', icon: Image, color: 'bg-pink-500/10 text-pink-500' },
    { value: 'music', label: 'Music', icon: Music2, color: 'bg-purple-500/10 text-purple-500' },
  ];

  return (
    <Card className="border-2 shadow-xl bg-card/95 backdrop-blur-sm">
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className="font-semibold text-lg">Media Dock</h3>
          </div>
          {uploading && (
            <Badge variant="secondary" className="gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Uploading {progress}%
            </Badge>
          )}
        </div>

        <TabsList className="w-full grid grid-cols-5 gap-2 p-2 bg-muted/50">
          {tabConfig.map(({ value, label, icon: Icon, color }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all data-[state=active]:scale-105 data-[state=active]:shadow-lg ${color}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="p-4 space-y-4">
          <TabsContent value="voice" className="mt-0">
            <div className="text-center py-8 text-muted-foreground">
              <Mic className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Voice calls active in main interface</p>
            </div>
          </TabsContent>

          <TabsContent value="video" className="mt-0">
            <div className="text-center py-8 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Video feeds active in main interface</p>
            </div>
          </TabsContent>

          <TabsContent value="docs" className="mt-0">
            <MediaUploadZone
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
              onUpload={(files) => handleUpload(files, 'doc')}
              uploading={uploading}
              mediaType="documents"
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {getMediaByType('doc').map((item) => (
                <Card key={item.id} className="p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <FileText className="h-8 w-8 text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(item.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="art" className="mt-0">
            <MediaUploadZone
              accept="image/*"
              onUpload={(files) => handleUpload(files, 'art')}
              uploading={uploading}
              mediaType="images"
            />
            <div className="mt-4 grid grid-cols-3 gap-3">
              {getMediaByType('art').map((item) => (
                <Card key={item.id} className="p-2 group hover:shadow-lg transition-all">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={`https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/live-session-art/${item.file_path}`}
                      alt={item.file_name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-xs truncate mt-2">{item.file_name}</p>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="music" className="mt-0">
            <MediaUploadZone
              accept="audio/*"
              onUpload={(files) => handleUpload(files, 'music')}
              uploading={uploading}
              mediaType="music"
            />
            <div className="mt-4 space-y-2">
              {getMediaByType('music').map((item) => (
                <Card key={item.id} className="p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Music2 className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{(item.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        {item.duration_seconds && (
                          <span>• {Math.floor(item.duration_seconds / 60)}:{(item.duration_seconds % 60).toString().padStart(2, '0')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </div>

        {/* Thumbnail strip at bottom */}
        <MediaThumbnailStrip 
          items={mediaItems} 
          onSelect={(item) => {
            // Switch to the correct tab when thumbnail clicked
            const tabMap: Record<string, typeof activeTab> = {
              'doc': 'docs',
              'art': 'art',
              'music': 'music',
              'voice': 'voice',
              'video': 'video',
            };
            setActiveTab(tabMap[item.media_type] || 'docs');
          }}
        />
      </Tabs>
    </Card>
  );
}
