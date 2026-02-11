import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';

interface ImageCarouselProps {
  images: string[];
  title: string;
  type?: string;
  isFeatured?: boolean;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onImageError?: () => void;
}

export function ImageCarousel({ images, title, type, isFeatured, isPlaying, onPlayPause, onImageError }: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.offsetWidth;
    scrollRef.current.scrollTo({ left: width * index, behavior: 'smooth' });
    setActiveIndex(index);
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.offsetWidth;
    const idx = Math.round(scrollRef.current.scrollLeft / width);
    setActiveIndex(idx);
  }, []);

  if (images.length === 0) {
    return (
      <div className="relative aspect-square overflow-hidden">
        <GradientPlaceholder type={(type as any) || 'product'} title={title} className="w-full h-full" />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge variant="secondary" className="backdrop-blur-sm">{type}</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group/carousel aspect-square overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory h-full"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        <style>{`.group\\/carousel div::-webkit-scrollbar { display: none; }`}</style>
        {images.map((src, idx) => (
          <div key={idx} className="min-w-full h-full snap-center relative overflow-hidden flex-shrink-0">
            <img
              src={src}
              alt={`${title} - ${idx + 1}`}
              className="w-full h-full object-cover"
              onError={onImageError}
            />
          </div>
        ))}
      </div>

      {/* Left/Right arrows - always visible */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); scrollTo(Math.max(0, activeIndex - 1)); }}
            disabled={activeIndex === 0}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 disabled:opacity-30 flex items-center justify-center text-white shadow-lg"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); scrollTo(Math.min(images.length - 1, activeIndex + 1)); }}
            disabled={activeIndex === images.length - 1}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 disabled:opacity-30 flex items-center justify-center text-white shadow-lg"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}


      {/* Image count badge */}
      {images.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">
          {activeIndex + 1}/{images.length}
        </div>
      )}

      {/* Music play overlay */}
      {type === 'music' && onPlayPause && (
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <Button size="lg" onClick={onPlayPause} className="rounded-full bg-primary hover:bg-primary/90 shadow-lg">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </Button>
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="absolute top-3 left-3 flex gap-2 z-10">
        {isFeatured && (
          <Badge className="bg-primary/90 backdrop-blur-sm">
            <Sparkles className="w-3 h-3 mr-1" />
            Featured
          </Badge>
        )}
        <Badge variant="secondary" className="backdrop-blur-sm">
          {type}
        </Badge>
      </div>
    </div>
  );
}
