import { useState, useEffect } from 'react';

interface UseCountUpOptions {
  duration?: number;
  startOnMount?: boolean;
}

export function useCountUp(end: number, options: UseCountUpOptions = {}) {
  const { duration = 2000, startOnMount = true } = options;
  const [count, setCount] = useState(startOnMount ? 0 : end);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!startOnMount) {
      setCount(end);
      return;
    }

    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (end - startValue) * easeOut);
      
      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration, startOnMount]);

  return { count, isAnimating };
}

