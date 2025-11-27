'use client';

import { motion } from 'framer-motion';
import { getCreatorTime } from '@/utils/customTime';
import { useEffect, useState } from 'react';

const LAT = -26.2;
const LON = 28.0;

export function SecondsHand({ watchSize }: { watchSize: number }) {
  const [angle, setAngle] = useState(90);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const { sunriseMinutes } = getCreatorTime(now, LAT, LON);

      const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000;
      const sunriseSec = sunriseMinutes * 60;

      let secsSinceSunrise = nowSec - sunriseSec;
      if (secsSinceSunrise < 0) secsSinceSunrise += 86400;

      const realSeconds = secsSinceSunrise % 60;
      const degrees = (realSeconds / 60) * 360;
      setAngle(90 - degrees); // normal 60-second anti-clockwise
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

