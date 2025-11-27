'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function SecondsHand({ watchSize }: { watchSize: number }) {
  const [angle, setAngle] = useState(90);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      // Use real-world seconds (0-59.999) - independent of custom time system
      const currentSecond = now.getSeconds() + now.getMilliseconds() / 1000;
      // 360° rotation over 60 seconds, anti-clockwise from Part 1 (top)
      // CSS rotate: 270° = top (12 o'clock), so we start at 270° and subtract degrees
      const degrees = (currentSecond / 60) * 360;
      setAngle(270 - degrees); // Start at 270° (Part 1 at top), rotate anti-clockwise
    };

    update();
    const id = setInterval(update, 50);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      className="absolute"
      style={{
        width: watchSize * 0.006,
        height: watchSize * 0.42,
        left: '50%',
        bottom: '50%',
        marginLeft: `-${watchSize * 0.003}px`,
        transformOrigin: '50% 100%',
        background: 'linear-gradient(to top, #dc2626, #ef4444, #dc2626)',
        borderRadius: '2px',
        boxShadow: '0 0 10px #dc2626',
        zIndex: 12,
      }}
      animate={{ rotate: angle }}
      transition={{ type: 'tween', ease: 'linear', duration: 0.05 }}
    />
  );
}

