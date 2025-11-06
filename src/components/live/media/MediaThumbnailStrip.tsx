import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Image, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaItem {
  id: string;
  media_type: 'doc' | 'art' | 'music' | 'voice' | 'video';
  file_name: string;
  file_path: string;
  mime_type: string;
}

interface MediaThumbnailStripProps {
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
}

export function MediaThumbnailStrip({ items, onSelect }: MediaThumbnailStripProps) {
  if (items.length === 0) return null;

  const renderThumbnail = (item: MediaItem) => {
    switch (item.media_type) {
      case 'art':
        return (
          <img
            src={`https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/live-session-art/${item.file_path}`}
            alt={item.file_name}
            className="w-full h-full object-cover"
          />
        );
      case 'doc':
        return (
          <div className="w-full h-full flex items-center justify-center bg-amber-500/20">
            <FileText className="h-6 w-6 text-amber-500" />
          </div>
        );
      case 'music':
        return (
          <div className="w-full h-full flex items-center justify-center bg-purple-500/20">
            <Music2 className="h-6 w-6 text-purple-500" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border-t bg-muted/30">
      <div className="p-2">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
          Quick Access ({items.length})
        </p>
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {items.slice(0, 20).map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={cn(
                  'flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden',
                  'border-2 border-transparent hover:border-primary',
                  'transition-all duration-200 hover:scale-110 hover:shadow-lg',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                )}
              >
                {renderThumbnail(item)}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
