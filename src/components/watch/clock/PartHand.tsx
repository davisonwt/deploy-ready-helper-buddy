'use client';

import { motion } from 'framer-motion';
import { getCreatorTime, getAntiClockwiseAngle } from '@/utils/customTime';
import { useEffect, useState } from 'react';

const LAT = -26.2;
const LON = 28.0;

export function PartHand({ watchSize }: { watchSize: number }) {
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const ct = getCreatorTime(now, LAT, LON);
      // getAntiClockwiseAngle returns mathematical angle (90° = top, increases anti-clockwise)
      // CSS rotate: 270° = top, so convert: 270 - (mathAngle - 90) = 360 - mathAngle
      const mathAngle = getAntiClockwiseAngle(ct.raw);
      setAngle(360 - mathAngle + 90); // Convert to CSS: Part 1 (90° math) = 270° CSS
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      className="absolute"
      style={{
        width: watchSize * 0.012,
        height: watchSize * 0.28,
        left: '50%',
        bottom: '50%',
        marginLeft: `-${watchSize * 0.006}px`,
        transformOrigin: '50% 100%',
        background: 'linear-gradient(to top, #d4af37, #f4e4bc, #d4af37)',
        borderRadius: '3px',
        boxShadow: '0 0 10px gold',
        zIndex: 10,
      }}
      animate={{ rotate: angle }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    />
  );
}

