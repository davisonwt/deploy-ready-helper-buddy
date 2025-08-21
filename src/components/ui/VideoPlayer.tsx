import React, { useState, useRef, useEffect } from 'react';

interface VideoPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  onError?: (error: any) => void;
  fallbackImage?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  className = "",
  autoPlay = false,
  loop = false,
  muted = true,
  playsInline = true,
  onError,
  fallbackImage = "/placeholder.svg"
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => {
      console.log('🎥 Video loading started:', src);
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      console.log('✅ Video ready to play:', src);
      setIsLoading(false);
      setHasError(false);
    };

    const handleError = (error: any) => {
      console.error('❌ Video error:', error, 'Source:', src);
      setHasError(true);
      setIsLoading(false);
      
      if (onError) {
        onError(error);
      }
    };

    const handleLoadedData = () => {
      console.log('📹 Video data loaded:', src);
      setIsLoading(false);
    };

    // Add event listeners
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('loadeddata', handleLoadedData);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [src, onError]);

  if (hasError) {
    return (
      <div className={`${className} bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex items-center justify-center`}>
        {fallbackImage && (
          <img 
            src={fallbackImage} 
            alt="Video placeholder"
            className="w-full h-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="text-white/70 text-center">
            <div className="text-sm">Background content loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        className={className}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        crossOrigin="anonymous"
        preload="metadata"
        controls={false}
        style={{ display: hasError ? 'none' : 'block' }}
      >
        <source src={src} type="video/mp4" />
        {/* Fallback for unsupported browsers */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 w-full h-full flex items-center justify-center">
          <p className="text-white/70">Your browser doesn't support video playback.</p>
        </div>
      </video>

      {isLoading && !hasError && (
        <div className={`${className} bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex items-center justify-center absolute inset-0`}>
          <div className="text-white/50 text-center">
            <div className="animate-pulse text-sm">Loading background...</div>
          </div>
        </div>
      )}
    </>
  );
};