import React, { useEffect, useRef, useState } from 'react';

interface DeferredVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  threshold?: number;
}

// Defers setting the video src until the element is in view (or after idle),
// greatly reducing initial page load time and bandwidth.
export const DeferredVideo: React.FC<DeferredVideoProps> = ({ src, threshold = 0.1, autoPlay = true, muted = true, playsInline = true, preload = 'none', ...rest }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // Prefer IntersectionObserver to avoid loading until visible
    const onIntersect = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      if (entries[0].isIntersecting) {
        attach();
        observer.disconnect();
      }
    };

    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(onIntersect, { threshold })
      : null;

    if (observer) {
      observer.observe(el);
    } else {
      // Fallback: defer until idle
      (window as any).requestIdleCallback?.(() => attach()) ?? setTimeout(attach, 1);
    }

    function attach() {
      if (!videoRef.current || loaded) return;
      videoRef.current.src = src;
      setLoaded(true);
      // Autoplay muted inline if requested
      if (autoPlay) {
        videoRef.current.play().catch(() => {/* ignore autoplay restrictions */});
      }
    }

    return () => observer?.disconnect();
  }, [src, threshold, autoPlay, loaded]);

  return (
    <video
      ref={videoRef}
      muted={muted}
      playsInline={playsInline}
      preload={preload}
      {...rest}
    />
  );
};

export default DeferredVideo;
