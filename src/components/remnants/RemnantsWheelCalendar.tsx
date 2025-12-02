'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { getCreatorTime } from '@/utils/customTime';

const LEADERS = [
  { name: 'MALKIEL', meaning: 'My King is El', face: 'Lion', color: '#f59e0b' },
  { name: 'CHALAM-MELEK', meaning: 'Strength of King', face: 'Man', color: '#10b981' },
  { name: 'MELEKIEL', meaning: 'King of El', face: 'Ox', color: '#ef4444' },
  { name: 'NARIEL', meaning: 'Light of El', face: 'Eagle', color: '#3b82f6' },
];

const MONTH_ANGELS = [
  'ADNARIEL','YAHSHUAEL','ELOMIEL',
  'BARKAEL','ZELEBSAEL','HILU-YAHSEPH',
  'ADNARIEL','YAHSHUAEL','ELOMIEL',
  'BARKAEL','GIDAIEL','KIEL'
];

const MONTH_LENGTHS = [30,30,31,30,30,31,30,30,31,30,30,31];

export default function RemnantsWheelCalendar({ size = 900 }: { size?: number }) {
  const c = size / 2;
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const date = calculateCreatorDate(now);
  const time = getCreatorTime(now);
  const dayOfYear = date.dayOfYear ?? 1;
  const progress = ((time.part - 1) * 80 + (time.minute - 1)) / 1440;
  const totalDays = dayOfYear - 1 + progress;

  const sunRot = -(totalDays / 366) * 360;
  const leaderRot = -Math.floor((dayOfYear - 1) / 91) * 90;
  const civilRot = -(totalDays / 364) * 360;
  const weekRot = -(totalDays * (360 / 7));
  const lunarRot = -(((dayOfYear - 1 + progress) % 354) / 354) * 360;
  const partRot = -(progress * 360);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
        <defs>
          <radialGradient id="space"><stop offset="0%" stopColor="#0f0722"/><stop offset="100%" stopColor="#000"/></radialGradient>
          <linearGradient id="gold"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#d97706"/></linearGradient>
        </defs>

        <circle cx={c} cy={c} r={size * 0.5} fill="url(#space)" />

        <g>
          <motion.g animate={{ rotate: sunRot }} transition={{ ease: 'linear', duration: 1 }} style={{ transformOrigin: '50% 50%' }}>
            {Array.from({ length: 366 }, (_, i) => {
              const day = i + 1;
              const angle = (i / 366) * 360 - 90;
              const rad = angle * Math.PI / 180;
              const r1 = size * 0.46;
              const r2 = size * 0.49;

              const isShabbat = (day + 3) % 7 === 0;
              const isTwoBeforeNewYear = day === 365 || day === 366;
              const isNewYear = day === 1;

              let color = '#4b5563';
              let width = 1.5;
              if (isTwoBeforeNewYear) { color = '#4c1d95'; width = 5; }
              else if (isShabbat)     { color = '#fbbf24'; width = 4; }
              else if (isNewYear)     { color = '#ffffff'; width = 6; }

              return (
                <line key={i}
                  x1={c + Math.cos(rad)*r1} y1={c + Math.sin(rad)*r1}
                  x2={c + Math.cos(rad)*r2} y2={c + Math.sin(rad)*r2}
                  stroke={day === dayOfYear ? '#ef4444' : color}
                  strokeWidth={day === dayOfYear ? 8 : width}
                />
              );
            })}
          </motion.g>
        </g>

        <g>
          <motion.g animate={{ rotate: leaderRot }} style={{ transformOrigin: '50% 50%' }}>
            {LEADERS.map((l,i) => {
              const a = i*90 - 90;
              const rad = a * Math.PI / 180;
              return (
                <g key={i}>
                  <text x={c + Math.cos(rad)*size*0.42} y={c + Math.sin(rad)*size*0.42}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={l.color} fontSize={size*0.034} fontWeight="bold">{l.name}</text>
                  <text x={c + Math.cos(rad)*size*0.38} y={c + Math.sin(rad)*size*0.38}
                        textAnchor="middle" fill="#ddd" fontSize={size*0.018}>
                    {l.meaning} • {l.face}
                  </text>
                </g>
              );
            })}
          </motion.g>
        </g>

        <g>
          <motion.g animate={{ rotate: civilRot }} style={{ transformOrigin: '50% 50%' }}>
            {MONTH_ANGELS.map((name,i) => {
              const start = MONTH_LENGTHS.slice(0,i).reduce((a,b)=>a+b,0);
              const angle = (start + MONTH_LENGTHS[i]/2) / 364 * 360 - 90;
              const rad = angle * Math.PI / 180;
              return (
                <text key={i} x={c + Math.cos(rad)*size*0.33} y={c + Math.sin(rad)*size*0.33}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#c4b5fd" fontSize={size*0.024} fontWeight="bold">{name}</text>
              );
            })}

            {Array.from({length:364},(_,i) => {
              const a = i/364*360-90;
              const rad = a*Math.PI/180;
              return <circle key={i} cx={c + Math.cos(rad)*size*0.28} cy={c + Math.sin(rad)*size*0.28} r={2.5}
                             fill={(i+1)%7===0?'#fbbf24':'#6b7280'} />;
            })}

            {(() => {
              let day = 1;
              return MONTH_LENGTHS.flatMap(len => Array.from({length:len},(_,i) => {
                const a = (day+i-1)/364*360-90;
                const rad = a*Math.PI/180;
                const el = <text key={day+i} x={c + Math.cos(rad)*size*0.23} y={c + Math.sin(rad)*size*0.23}
                                 textAnchor="middle" dominantBaseline="middle"
                                 fill="#e0f2fe" fontSize={size*0.018}>{i+1}</text>;
                day += len;
                return el;
              }));
            })()}
          </motion.g>
        </g>

        <g>
          <motion.g animate={{ rotate: lunarRot }} style={{ transformOrigin: '50% 50%' }}>
            {Array.from({length:354},(_,i) => {
              const a = i/354*360-90;
              const rad = a*Math.PI/180;
              return <circle key={i} cx={c + Math.cos(rad)*size*0.16} cy={c + Math.sin(rad)*size*0.16} r={1.8} fill="#c3dafe"/>;
            })}
            <text x={c} y={c-size*0.12} textAnchor="middle" fill="#93c5fd" fontSize={size*0.028} fontWeight="bold">ASFAEL • El Gathers</text>
          </motion.g>
        </g>

        <g>
          <motion.g animate={{ rotate: partRot }} style={{ transformOrigin: '50% 50%' }}>
            {['DAY','EVENING','NIGHT','MORNING'].map((p,i) => {
              const a = i*90-90;
              const rad = a*Math.PI/180;
              return (
                <text key={i} x={c + Math.cos(rad)*size*0.08} y={c + Math.sin(rad)*size*0.08}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#fcd34d" fontSize={size*0.045} fontWeight="bold">{p}</text>
              );
            })}
          </motion.g>
        </g>

        <g>
          <motion.g animate={{ rotate: weekRot }} style={{ transformOrigin: '50% 50%' }}>
            {['1','2','3','4','5','6','SABBATH'].map((d,i) => {
              const a = i*(360/7)-90;
              const rad = a*Math.PI/180;
              const r = size*0.10;
              const x = c + Math.cos(rad)*r;
              const y = c + Math.sin(rad)*r;
              return (
                <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                      fill={i===6?'#fbbf24':'#e5e7eb'}
                      fontSize={i===6?size*0.06:size*0.045} fontWeight="bold"
                      transform={`rotate(${i*51.4286 + 90} ${x} ${y})`}>{d}</text>
              );
            })}
          </motion.g>
        </g>

        <circle cx={c} cy={c} r={size*0.05} fill="url(#gold)" stroke="#d97706" strokeWidth={6}/>
        <text x={c} y={c} textAnchor="middle" dominantBaseline="middle"
              fill="#1a1a2e" fontSize={size*0.08} fontWeight="bold">YHVH</text>

        <circle cx={c + Math.cos((totalDays/366*360-90)*Math.PI/180)*size*0.48}
                cy={c + Math.sin((totalDays/366*360-90)*Math.PI/180)*size*0.48}
                r={14} fill="#ef4444"/>
      </svg>
    </div>
  );
}
