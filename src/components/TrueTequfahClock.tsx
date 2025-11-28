// TrueTequfahClock.tsx

// THE COMPLETE, FINAL, STAND-ALONE FILE

// Earth immovable • Sun clockwise • Stars counter-clockwise • Tequfah straight line twice a year



import { useState, useEffect } from "react";

import { motion } from "framer-motion";



export default function TrueTequfahClock() {

  const [now, setNow] = useState(new Date());

  // Update time every second for real-time animation
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);



  // Real observed Tequfahs 2025 – Jerusalem local time

  const SPRING_TEQUFAH_2025 = new Date("2025-03-20T11:37:00"); // 09:37 UTC+2

  const AUTUMN_TEQUFAH_2025 = new Date("2025-09-22T21:44:00");



  const msPerDay = 86_400_000;

  const daysSinceSpring = (now.getTime() - SPRING_TEQUFAH_2025.getTime()) / msPerDay;



  // Sun circle → clockwise (365.25-day tropical year)

  const sunAngle = (daysSinceSpring / 365.25) * 360;



  // Stars / 364-day Enoch year → counter-clockwise

  const starsAngle = -((daysSinceSpring % 364) * (360 / 364));



  // Detect Tequfah moments (±1 minute tolerance)

  const nearSpring = Math.abs(daysSinceSpring) < 0.0007;

  const nearAutumn = Math.abs(daysSinceSpring - ((AUTUMN_TEQUFAH_2025.getTime() - SPRING_TEQUFAH_2025.getTime()) / msPerDay)) < 0.0007;

  const isTequfah = nearSpring || nearAutumn;



  return (

    <div className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden">

      <div className="relative w-[90vmin] h-[90vmin]">



        {/* 1. IMMOVABLE EARTH */}

        <div className="absolute inset-0 flex items-center justify-center">

          <div className="w-full h-full rounded-full bg-gradient-to-b from-emerald-950 via-blue-950 to-amber-900 border-[24px] border-amber-700 shadow-2xl">

            <div className="absolute inset-16 text-7xl font-bold text-amber-100 text-center leading-tight">

              אֶרֶץ<br/>

              <span className="text-5xl">Earth</span><br/>

              לָנֶצַח עוֹמֶדֶת

            </div>

          </div>

        </div>



        {/* 2. SUN CIRCLE – clockwise */}

        <motion.div

          className="absolute inset-12"

          animate={{ rotate: sunAngle }}

          transition={{ ease: "linear", duration: 0.5, repeat: Infinity }}

        >

          <svg className="w-full h-full">

            <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#f59e0b" strokeWidth="16" opacity="0.9"/>

            <text x="50%" y="10%" textAnchor="middle" fill="#f59e0b" fontSize="60">שמש (Sun)</text>

          </svg>

        </motion.div>



        {/* 3. STARS / 364-DAY CIRCLE – counter-clockwise */}

        <motion.div

          className="absolute inset-0"

          animate={{ rotate: starsAngle }}

          transition={{ ease: "linear", duration: 0.5, repeat: Infinity }}

        >

          <svg className="w-full h-full">

            <circle cx="50%" cy="50%" r="48%" fill="none" stroke="#fbbf24" strokeWidth="20" opacity="0.95"/>

            <text x="50%" y="6%" textAnchor="middle" fill="#fbbf24" fontSize="60">כוכבים (Stars)</text>

          </svg>

        </motion.div>



        {/* 4. TEQUFAH STRAIGHT LINE – flashes twice a year */}

        {isTequfah && (

          <motion.div

            className="absolute inset-0 pointer-events-none"

            initial={{ opacity: 0, scale: 0.8 }}

            animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1.3, 1.3, 1] }}

            transition={{ duration: 3 }}

          >

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-full bg-gradient-to-b from-transparent via-yellow-400 to-transparent shadow-2xl"/>

            <div className="absolute inset-0 flex items-center justify-center">

              <div className="text-9xl font-bold text-yellow-400 animate-pulse drop-shadow-2xl">

                תְּקוּפָה

              </div>

            </div>

          </motion.div>

        )}



        {/* Current year & info */}

        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center text-amber-100">

          <div className="text-6xl font-bold">שנה 6028</div>

          <div className="text-3xl mt-4">

            {isTequfah ? "תְּקוּפָה עכשיו! Straight Shadow!" : "השמש והכוכבים סובבים"}

          </div>

          <div className="text-xl mt-8">

            בראשית א׳:י״ד • ספר חנוך ע״ד • תהילים צ״ג:א׳

          </div>

        </div>



      </div>

    </div>

  );

}

