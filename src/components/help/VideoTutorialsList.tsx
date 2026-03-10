import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Play, Clock } from 'lucide-react';
import { helpVideoCategories, type HelpVideoCategory, type HelpVideo } from './helpVideoData';
import { toast } from '@/hooks/use-toast';

const VideoTutorialsList = () => {
  const [search, setSearch] = useState('');

  const filteredCategories = helpVideoCategories
    .map((category) => ({
      ...category,
      videos: category.videos.filter(
        (video) =>
          video.title.toLowerCase().includes(search.toLowerCase()) ||
          video.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((category) => category.videos.length > 0);

  const handlePlayVideo = (video: HelpVideo) => {
    if (video.videoUrl) {
      window.open(video.videoUrl, '_blank');
    } else {
      toast({
        title: 'Coming Soon',
        description: `The tutorial "${video.title}" is being produced and will be available shortly.`,
      });
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search video tutorials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-6 pr-1 pb-2">
        {filteredCategories.map((category) => (
          <div key={category.id}>
            <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
              <span className="text-lg">{category.icon}</span>
              <h3 className="font-semibold text-foreground">{category.title}</h3>
              <Badge variant="secondary" className="text-xs">
                {category.videos.length}
              </Badge>
            </div>

            <div className="space-y-2 ml-1">
              {category.videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => handlePlayVideo(video)}
                  className="w-full text-left p-3 rounded-lg border border-border bg-card/80 hover:bg-accent/70 transition-colors group flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Play className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-foreground truncate">
                        {video.title}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 line-clamp-2">
                      {video.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1 text-foreground/70">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">{video.duration}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tutorials found for "{search}"</p>
            <p className="text-sm mt-2">Try different keywords</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoTutorialsList;
