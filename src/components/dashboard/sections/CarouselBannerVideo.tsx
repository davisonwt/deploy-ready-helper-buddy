import React, { useEffect, useRef, useState } from 'react';

interface CarouselBannerVideoProps {
  src: string;
  fallbackImg?: string;
  alt?: string;
}

/**
 * Background video for service carousel cards.
 * - Always preloads (preload="auto") so the user never sees a "loading" gap
 * - Auto-retries on transient network errors (up to 3 attempts)
 * - Falls back to the still image if the video truly cannot play
 */
export const CarouselBannerVideo: React.FC<CarouselBannerVideoProps> = ({
  src,
  fallbackImg,
  alt = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setFailed(false);
    setAttempt(0);
  }, [src]);

  const handleError = () => {
    if (attempt < 3) {
      // Retry after a short backoff — the file is still downloading or network blipped
      const delay = 800 * (attempt + 1);
      setTimeout(() => {
        setAttempt((a) => a + 1);
        const v = videoRef.current;
        if (v) {
          v.load();
          v.play().catch(() => {/* will fire onError again if still broken */});
        }
      }, delay);
    } else {
      setFailed(true);
    }
  };

  if (failed && fallbackImg) {
    return (
      <img
        src={fallbackImg}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <video
      ref={videoRef}
      key={`${src}-${attempt}`}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      onError={handleError}
      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
    />
  );
};
