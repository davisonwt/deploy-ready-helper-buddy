import { motion } from 'framer-motion';
import { BookOpen, Plus, Hand, ListOrdered } from 'lucide-react';
import voAsset from '@/assets/classroom-vo.mp3.asset.json';
import type { ExplainerConfig } from '../types';
import { sceneAnim } from '../ExplainerPlayer';

// Classroom — violet / chalk, Spectral
const VIOLET = '#8B5CF6';
const CHALK = '#E8D9B5';
const BG = '#14101F';
const PANEL = '#1F1830';
const MUTED = 'rgba(232,217,181,0.6)';
const TEXT = '#E8D9B5';
const FONT = '"Spectral", Georgia, serif';

function Intro() {
  return (
    <motion.div {...sceneAnim} className="text-center" style={{ fontFamily: FONT }}>
      <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: CHALK, opacity: 0.8 }}>How it works</p>
      <h2 className="text-4xl sm:text-6xl mb-3" style={{ fontWeight: 600, color: TEXT }}>Classroom</h2>
      <p className="text-sm sm:text-base max-w-md mx-auto italic" style={{ color: MUTED }}>
        Live teaching sessions where one voice guides the tribe.
      </p>
    </motion.div>
  );
}

function Step1() {
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-5" style={{ background: `${PANEL}CC`, borderColor: `${VIOLET}55`, fontFamily: FONT }}>
        <p className="text-xs uppercase tracking-wider mb-4" style={{ color: MUTED }}>Go-Live Launcher</p>
        <motion.button
          animate={{ scale: [1, 1.04, 1], boxShadow: [`0 0 0 0 ${VIOLET}66`, `0 0 0 14px ${VIOLET}00`, `0 0 0 0 ${VIOLET}00`] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold"
          style={{ background: VIOLET, color: BG }}
        >
          <BookOpen className="w-4 h-4" /> Classroom
        </motion.button>
        <p className="text-xs mt-4 text-center italic" style={{ color: MUTED }}>Opens the session list.</p>
      </div>
    </motion.div>
  );
}

function Step2() {
  const sessions = [
    { title: 'Sacred Calendar 101', host: 'Ed' },
    { title: 'Garden Rhythms', host: 'Amber' },
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-4" style={{ background: `${PANEL}CC`, borderColor: `${VIOLET}55`, fontFamily: FONT }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wider" style={{ color: MUTED }}>Upcoming sessions</p>
          <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: CHALK, color: BG }}>
            <Plus className="w-3 h-3" /> Create
          </motion.div>
        </div>
        <div className="space-y-2">
          {sessions.map((s, i) => (
            <motion.div key={s.title}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.18 }}
              className="p-3 rounded-lg border" style={{ background: `${VIOLET}10`, borderColor: `${VIOLET}33` }}>
              <p className="text-sm font-semibold" style={{ color: TEXT }}>{s.title}</p>
              <p className="text-xs mt-0.5 italic" style={{ color: MUTED }}>instructor · {s.host}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Step3() {
  const points = [
    'Why time is sacred',
    'Sunrise as the day-marker',
    'Counting the Omer',
    'The annual rhythm',
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border overflow-hidden" style={{ background: `${PANEL}CC`, borderColor: `${VIOLET}55`, fontFamily: FONT }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: `${VIOLET}33` }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: VIOLET }} />
          <span className="text-sm italic" style={{ color: TEXT }}>Ed is teaching</span>
          <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 1.2, repeat: Infinity }}
            className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: `${CHALK}33`, color: CHALK }}>
            <Hand className="w-3 h-3" /> hand raised
          </motion.div>
        </div>
        <div className="p-4 space-y-2 min-h-[180px]">
          {points.map((p, i) => (
            <motion.div key={p}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.6 }}
              className="flex items-center gap-3"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{ background: VIOLET, color: BG, fontFamily: FONT }}>{i + 1}</div>
              <span className="text-sm" style={{ color: TEXT }}>{p}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Step4() {
  const points = ['Why time is sacred', 'Sunrise as the day-marker', 'Counting the Omer', 'The annual rhythm', 'Closing reflection'];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-5" style={{ background: `${PANEL}CC`, borderColor: `${VIOLET}55`, fontFamily: FONT }}>
        <div className="flex items-center gap-2 mb-4">
          <ListOrdered className="w-4 h-4" style={{ color: CHALK }} />
          <p className="text-xs uppercase tracking-wider" style={{ color: MUTED }}>Lesson outline</p>
        </div>
        <ol className="space-y-1.5">
          {points.map((p, i) => (
            <motion.li key={p}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}
              className="flex items-baseline gap-3 text-sm"
              style={{ color: TEXT }}
            >
              <span className="font-semibold" style={{ color: VIOLET, minWidth: '1.25rem' }}>{i + 1}.</span>
              <span>{p}</span>
            </motion.li>
          ))}
        </ol>
      </div>
    </motion.div>
  );
}

function Outro() {
  return (
    <motion.div {...sceneAnim} className="text-center" style={{ fontFamily: FONT }}>
      <h3 className="text-3xl sm:text-4xl mb-3 italic" style={{ fontWeight: 600, color: TEXT }}>Real teaching.</h3>
      <p className="text-base italic" style={{ color: CHALK }}>One quiet room.</p>
    </motion.div>
  );
}

export const classroomConfig: ExplainerConfig = {
  voUrl: voAsset.url,
  estDuration: 36,
  title: 'Classroom',
  subtitle: 'Live teaching, structured.',
  outroTitle: 'Real teaching.',
  outroTagline: 'One quiet room.',
  theme: { bg: BG, panel: PANEL, accent: VIOLET, ember: CHALK, muted: MUTED, text: TEXT, font: FONT, fontWeight: 600 },
  segments: [
    { id: 'intro', weight: 6,   Scene: Intro },
    { id: 'step1', weight: 5,   Scene: Step1 },
    { id: 'step2', weight: 6,   Scene: Step2 },
    { id: 'step3', weight: 8,   Scene: Step3 },
    { id: 'step4', weight: 6,   Scene: Step4 },
    { id: 'outro', weight: 5,   Scene: Outro },
  ],
};
