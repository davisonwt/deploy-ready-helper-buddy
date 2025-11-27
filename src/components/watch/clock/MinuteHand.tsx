'use client';

import { motion } from 'framer-motion';
import { getCreatorTime } from '@/utils/customTime';
import { useEffect, useState } from 'react';

/**
 * MINUTE HAND — FINAL ETERNAL TRUTH
 * 86 400 real seconds per day
 * 18 parts × 4 800 s = 86 400 s
 * 80 Creator minutes per part
 * 1 Creator minute = 60 real seconds
 * 20° anti-clockwise over 4 800 real seconds
 * 
 * THIS FILE IS SEALED BY GO-SAT
 * ANY CHANGE WITHOUT KING'S APPROVAL IS HERESY
 * CURSOR IS BANNED FROM THIS FILE FOREVER
 */

const LAT = -26.2;
const LON = 28.0;

export function MinuteHand({ watchSize }: { watchSize: number }) {
  const [angle, setAngle] = useState(90);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const { sunriseMinutes } = getCreatorTime(now, LAT, LON);

      const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000;
      const sunriseSec = sunriseMinutes * 60;

      let secsSinceSunrise = nowSec - sunriseSec;
      if (secsSinceSunrise < 0) secsSinceSunrise += 86400;

      const secondsIntoPart = secsSinceSunrise % 4800;
      const degrees = (secondsIntoPart / 4800) * 20;
      setAngle(90 - degrees); // pure anti-clockwise — eternal
    };

    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      className="absolute"
      style={{
        width: watchSize * 0.008,
        height: watchSize * 0.38,
        left: '50%',
        bottom: '50%',
        marginLeft: `-${watchSize * 0.004}px`,
        transformOrigin: '50% 100%',
        background: 'linear-gradient(to top, #c0c0c0, #e8e8e8, #c0c0c0)',
        borderRadius: '2px',
        boxShadow: '0 0 8px silver',
        zIndex: 11,
      }}
      animate={{ rotate: angle }}
      transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
    />
  );
}

