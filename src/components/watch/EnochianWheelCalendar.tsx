import React, { useState, useEffect, useRef } from 'react';

import { motion } from 'framer-motion';

import { Sun, Moon } from 'lucide-react';



const PART_MINUTES = 80;

const PARTS_PER_DAY = 18;

const MINUTES_PER_DAY = PART_MINUTES * PARTS_PER_DAY;

const DAYS_PER_YEAR = 364;



const EnochianTimepiece = () => {

  const [currentDate, setCurrentDate] = useState(new Date());

  const [enochianDate, setEnochianDate] = useState({

    dayOfYear: 255, month: 9, dayOfMonth: 13, weekOfYear: 37,

    dayOfWeek: 6, dayPart: 'Laylah', eighteenPart: 12, daysInCurrentMonth: 31,

    timelessDay: 0, season: 'Fall'

  });

  const [sunData, setSunData] = useState<any>(null);



  const monthStructure = [

    { num: 1, days: 30, season: 'Spring' }, { num: 2, days: 30, season: 'Spring' },

    { num: 3, days: 31, season: 'Spring' }, { num: 4, days: 30, season: 'Summer' },

    { num: 5, days: 30, season: 'Summer' }, { num: 6, days: 31, season: 'Summer' },

    { num: 7, days: 30, season: 'Fall' },   { num: 8, days: 30, season: 'Fall' },

    { num: 9, days: 31, season: 'Fall' },   { num: 10, days: 30, season: 'Winter' },

    { num: 11, days: 30, season: 'Winter' },{ num: 12, days: 31, season: 'Winter' }

  ];



  const zodiacWheel = [

    { constellation: 'ARIES', tribe: 'Yehudah', banner: 'Lion', month: 'Nisan' },

    { constellation: 'TAURUS', tribe: 'Yissakar', banner: 'Donkey', month: 'Iyar' },

    { constellation: 'GEMINI', tribe: 'Zebulon', banner: 'Ship', month: 'Sivan' },

    { constellation: 'CANCER', tribe: 'Reuben', banner: 'Man', month: 'Tammuz' },

    { constellation: 'LEO', tribe: 'Simeon', banner: 'Sword', month: 'Av' },

    { constellation: 'VIRGO', tribe: 'Gad', banner: 'Fire', month: 'Elul' },

    { constellation: 'LIBRA', tribe: 'Ephraim', banner: 'Ox', month: 'Tishrei' },

    { constellation: 'SCORPIO', tribe: 'Manasseh', banner: 'Unicorn', month: 'Cheshvan' },

    { constellation: 'SAGITTARIUS', tribe: 'Benyamin', banner: 'Wolf', month: 'Kislev' },

    { constellation: 'CAPRICORN', tribe: 'Dan', banner: 'Eagle', month: 'Tevet' },

    { constellation: 'AQUARIUS', tribe: 'Asher', banner: 'Tree', month: 'Shevat' },

    { constellation: 'PISCES', tribe: 'Naphtali', banner: 'Deer', month: 'Adar' }

  ];



  const greatWheel = ['ORION', 'HYDRA', 'CENTAURUS', 'PEGASUS'];



  const size = 1000;

  const center = size / 2;



  const RadiantText = ({ text, radius, angle, size = 18, weight = 'bold', color = '#fbbf24' }: { text: string; radius: number; angle: number; size?: number; weight?: string; color?: string }) => {

    const rad = (angle - 90) * Math.PI / 180;

    const x = center + radius * Math.cos(rad);

    const y = center + radius * Math.sin(rad);

    const textRot = angle + (angle > 90 && angle < 270 ? 180 : 0);

    return (

      <text

        x={x} y={y}

        textAnchor="middle"

        dominantBaseline="middle"

        transform={`rotate(${textRot}, ${x}, ${y})`}

        className={`${weight} tracking-widest`}

        style={{

          fontSize: `${size}px`,

          fill: color,

          filter: 'drop-shadow(0 0 12px currentColor)',

          paintOrder: 'stroke fill',

          stroke: 'black',

          strokeWidth: 4,

        }}

      >

        {text}

      </text>

    );

  };



  const getSpringEquinox = (y: number) => new Date(y, 2, 20);

  const convertToEnochian = (d: Date) => {

    const y = d.getFullYear();

    const equinox = getSpringEquinox(y);

    let days = Math.floor((d.getTime() - equinox.getTime()) / 86400000);

    if (days < 0) days += 364;

    if (days >= 364) days = 363;

    let rem = days;

    for (const m of monthStructure) {

      if (rem < m.days) return { ...enochianDate, month: m.num, dayOfMonth: rem + 1, dayOfYear: days + 1, season: m.season };

      rem -= m.days;

    }

    return enochianDate;

  };



  useEffect(() => {

    const timer = setInterval(() => setCurrentDate(new Date()), 1000);

    return () => clearInterval(timer);

  }, []);



  useEffect(() => {

    setEnochianDate(convertToEnochian(currentDate));

  }, [currentDate]);



  useEffect(() => {

    navigator.geolocation.getCurrentPosition(

      async (pos) => {

        const res = await fetch(`https://api.sunrise-sunset.org/json?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&formatted=0`);

        const data = await res.json();

        const sr = new Date(data.results.sunrise);

        setSunData({ sunrise: sr });

      },

      () => setSunData({ sunrise: new Date() })

    );

  }, []);



  const seasonRotation = ((enochianDate.dayOfYear - 1) / 91) * 90;

  const zodiacRotation = -((enochianDate.dayOfYear - 1) / 30.333) * 30;

  const greatRotation = -((enochianDate.dayOfYear - 1) / 91) * 90;

  const dayRotation = ((enochianDate.dayOfYear - 1) / 364) * 360;



  return (

    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">

      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-black to-blue-950" />

      <div className="absolute inset-0">

        <div className="absolute top-0 left-0 w-full h-full bg-radial-gradient from-purple-900/20 to-transparent" />

      </div>



      <motion.div initial={{ y: -100 }} animate={{ y: 0 }} className="absolute top-8 left-1/2 -translate-x-1/2 text-center z-10">

        <h1 className="text-6xl md:text-9xl font-black bg-gradient-to-r from-amber-300 via-yellow-500 to-pink-600 bg-clip-text text-transparent">

          THE CREATOR'S WHEEL

        </h1>

        <p className="text-3xl text-amber-200 mt-4 tracking-widest">Eternal • 364 • Aligned Forever</p>

      </motion.div>



      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 2 }}>

        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>

          <defs>

            <filter id="abyssShadow" x="-200%" y="-200%" width="400%" height="400%">

              <feDropShadow dx="30" dy="30" stdDeviation="20" floodColor="#000" floodOpacity="0.95"/>

              <feDropShadow dx="60" dy="60" stdDeviation="50" floodColor="#000" floodOpacity="0.8"/>

              <feDropShadow dx="90" dy="90" stdDeviation="80" floodColor="#000" floodOpacity="0.6"/>

            </filter>

            <filter id="holyFire">

              <feGaussianBlur stdDeviation="15" result="blur"/>

              <feFlood floodColor="#fbbf24" floodOpacity="1"/>

              <feComposite in2="blur" operator="in"/>

              <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>

            </filter>

            <radialGradient id="abyss"><stop offset="0%" stopColor="#1a0033"/><stop offset="100%" stopColor="#000"/></radialGradient>

            <linearGradient id="bronze"><stop offset="0%" stopColor="#fcd34d"/><stop offset="100%" stopColor="#92400e"/></linearGradient>

          </defs>



          {[400, 370, 340, 310, 280, 250, 220, 190, 160, 130].map((r, i) => (

            <g key={r} filter="url(#abyssShadow)">

              <circle cx={center} cy={center} r={r} fill="none" stroke="url(#bronze)" strokeWidth={i < 3 ? 14 : 8} opacity="0.9"/>

              <circle cx={center} cy={center} r={r - 10} fill="none" stroke="#1e293b" strokeWidth="4" opacity="0.7"/>

            </g>

          ))}



          {['SPRING', 'SUMMER', 'FALL', 'WINTER'].map((s, i) => (

            <g key={s} filter="url(#holyFire)" transform={`rotate(${seasonRotation}, ${center}, ${center})`}>

              <path d={`M ${center} ${center} L ${center + 430*Math.cos((i*90-90)*Math.PI/180)} ${center + 430*Math.sin((i*90-90)*Math.PI/180)} A 430 430 0 0 1 ${center + 430*Math.cos((i*90)*Math.PI/180)} ${center + 430*Math.sin((i*90)*Math.PI/180)} Z`}

                    fill={['#10b981','#f59e0b','#ef4444','#3b82f6'][i]} opacity="0.3"/>

              <RadiantText text={s} radius={470} angle={i*90 + 45} size={40} color="#fff"/>

            </g>

          ))}



          <g filter="url(#holyFire)" transform={`rotate(${zodiacRotation}, ${center}, ${center})`}>

            {zodiacWheel.map((z, i) => (

              <g key={i}>

                <RadiantText text={z.constellation} radius={320} angle={i*30} size={24} color="#fbbf24"/>

                <RadiantText text={z.tribe} radius={295} angle={i*30} size={18} color="#f59e0b"/>

                <RadiantText text={z.banner} radius={270} angle={i*30} size={32} color="#fff"/>

              </g>

            ))}

          </g>



          <g filter="url(#abyssShadow)" transform={`rotate(${greatRotation}, ${center}, ${center})`}>

            {greatWheel.map((g, i) => (

              <RadiantText key={g} text={g} radius={230} angle={i*90 + 45} size={36} color="#34d399"/>

            ))}

          </g>



          <motion.g animate={{ y: [0, -30, 0] }} transition={{ duration: 6, repeat: Infinity }}

                    transform={`rotate(${((enochianDate.dayOfYear - 1)/364)*360}, ${center}, ${center})`}>

            <circle cx={center} cy={center-380} r="50" fill="#ec4899" filter="url(#abyssShadow)"/>

            <circle cx={center} cy={center-380} r="38" fill="#000" stroke="#fbbf24" strokeWidth="10" filter="url(#holyFire)"/>

            <text x={center} y={center-370} textAnchor="middle" className="text-6xl font-black fill-white" filter="url(#holyFire)">

              {enochianDate.dayOfYear}

            </text>

          </motion.g>



          <g filter="url(#abyssShadow)">

            <circle cx={center} cy={center} r="140" fill="url(#abyss)"/>

            <circle cx={center} cy={center} r="120" fill="#000" stroke="#fbbf24" strokeWidth="20" filter="url(#holyFire)"/>

            <text x={center} y={center-30} textAnchor="middle" className="text-9xl font-black fill-amber-400" filter="url(#holyFire)">

              {enochianDate.dayOfMonth}

            </text>

            <text x={center} y={center+40} textAnchor="middle" className="text-4xl fill-pink-400 tracking-widest" filter="url(#holyFire)">

              {enochianDate.dayPart.toUpperCase()}

            </text>

          </g>



          <motion.g initial={{ scale: 0 }} animate={{ scale: 1.3 }} transition={{ duration: 3, type: "spring" }}>

            <path d="M 500 20 L 550 160 L 450 160 Z" fill="#ec4899" stroke="#fff" strokeWidth="8" filter="url(#holyFire)"/>

            <text x="500" y="10" textAnchor="middle" className="text-9xl font-black fill-pink-500" filter="url(#holyFire)">

              255

            </text>

          </motion.g>

        </svg>

      </motion.div>



      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center">

        <p className="text-4xl font-bold text-amber-300 tracking-widest">

          Year 6028 • Month {enochianDate.month} • Day {enochianDate.dayOfMonth} • Part {enochianDate.eighteenPart}/18

        </p>

        <p className="text-2xl text-amber-200 mt-4">The Creator's wheels never lie • Forever in sync</p>

        <p className="text-yellow-400 mt-4">Day {enochianDate.dayOfYear} → Wheel at {dayRotation.toFixed(2)}°</p>

      </motion.div>



      <Sun className="absolute top-10 right-10 w-24 h-24 text-amber-400 animate-pulse" />

      <Moon className="absolute top-10 left-10 w-20 h-20 text-blue-300 animate-pulse" />

    </div>

  );

};



export default EnochianTimepiece;
