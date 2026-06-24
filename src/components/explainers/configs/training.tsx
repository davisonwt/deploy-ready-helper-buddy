import { motion } from 'framer-motion';
import { Dumbbell, Plus, Flame, Phone, CheckCircle2 } from 'lucide-react';
import voAsset from '@/assets/training-vo.mp3.asset.json';
import type { ExplainerConfig } from '../types';
import { sceneAnim } from '../ExplainerPlayer';

// Training — coral, Oswald
const CORAL = '#F472B6';
const HOT = '#F97316';
const BG = '#1A0A14';
const PANEL = '#26101D';
const MUTED = 'rgba(254,226,231,0.6)';
const TEXT = '#FEE2E7';
const FONT = '"Oswald", Impact, sans-serif';

function Intro() {
  return (
    <motion.div {...sceneAnim} className="text-center" style={{ fontFamily: FONT }}>
      <p className="text-xs uppercase tracking-[0.4em] mb-3" style={{ color: HOT }}>How it works</p>
      <h2 className="text-4xl sm:text-6xl mb-3 uppercase tracking-wider" style={{ fontWeight: 600, color: TEXT }}>
        Training
      </h2>
      <p className="text-sm sm:text-base max-w-md mx-auto uppercase tracking-wide" style={{ color: MUTED, fontWeight: 300 }}>
        Daily practice. Streaks that build real habits.
      </p>
    </motion.div>
  );
}

function Step1() {
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-5" style={{ background: `${PANEL}CC`, borderColor: `${CORAL}55`, fontFamily: FONT }}>
        <p className="text-xs uppercase tracking-[0.25em] mb-4" style={{ color: MUTED }}>Go-Live Launcher</p>
        <motion.button
          animate={{ scale: [1, 1.04, 1], boxShadow: [`0 0 0 0 ${CORAL}66`, `0 0 0 14px ${CORAL}00`, `0 0 0 0 ${CORAL}00`] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg uppercase tracking-wider font-semibold"
          style={{ background: CORAL, color: BG }}
        >
          <Dumbbell className="w-4 h-4" /> Training
        </motion.button>
        <p className="text-xs mt-4 text-center uppercase tracking-wider" style={{ color: MUTED }}>Opens the training hub.</p>
      </div>
    </motion.div>
  );
}

function Step2() {
  const rooms = [
    { title: 'Sunrise Calisthenics', members: 18 },
    { title: 'Daily Scripture Read', members: 42 },
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-4" style={{ background: `${PANEL}CC`, borderColor: `${CORAL}55`, fontFamily: FONT }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: MUTED }}>Training rooms</p>
          <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
            style={{ background: HOT, color: BG }}>
            <Plus className="w-3 h-3" /> Create
          </motion.div>
        </div>
        <div className="space-y-2">
          {rooms.map((r, i) => (
            <motion.div key={r.title}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.18 }}
              className="p-3 rounded-lg border flex items-center justify-between"
              style={{ background: `${CORAL}10`, borderColor: `${CORAL}33` }}>
              <div>
                <p className="text-sm uppercase tracking-wide font-medium" style={{ color: TEXT }}>{r.title}</p>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>{r.members} training</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Step3() {
  const days = Array.from({ length: 7 }, (_, i) => i);
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-5" style={{ background: `${PANEL}CC`, borderColor: `${CORAL}55`, fontFamily: FONT }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: MUTED }}>Your streak</p>
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, -3, 3, 0] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase"
            style={{ background: HOT, color: BG }}
          >
            <Flame className="w-3.5 h-3.5" /> Day 7
          </motion.div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {days.map((d) => (
            <motion.div key={d}
              initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: d * 0.12 }}
              className="aspect-square rounded-md flex items-center justify-center"
              style={{ background: `linear-gradient(180deg, ${CORAL} 0%, ${HOT} 100%)`, color: BG }}
            >
              <CheckCircle2 className="w-4 h-4" />
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}
          className="text-center text-xs uppercase tracking-wider" style={{ color: MUTED }}
        >
          Posted today · the room sees you
        </motion.div>
      </div>
    </motion.div>
  );
}

function Step4() {
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md text-center">
      <div className="rounded-xl border p-6" style={{ background: `${PANEL}CC`, borderColor: `${CORAL}55`, fontFamily: FONT }}>
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {['A', 'B', 'C', 'D', 'E'].map((l, i) => (
            <motion.div key={l}
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.1 }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ background: `${CORAL}33`, color: TEXT, border: `2px solid ${CORAL}` }}
            >{l}</motion.div>
          ))}
        </div>
        <motion.button
          animate={{ scale: [1, 1.06, 1], boxShadow: [`0 0 0 0 ${HOT}80`, `0 0 0 18px ${HOT}00`, `0 0 0 0 ${HOT}00`] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="mx-auto flex items-center gap-2 px-5 py-3 rounded-full font-semibold uppercase tracking-wider"
          style={{ background: HOT, color: BG }}
        >
          <Phone className="w-4 h-4" /> Live training
        </motion.button>
        <p className="text-xs mt-4 uppercase tracking-wider" style={{ color: MUTED }}>Train together. Right now.</p>
      </div>
    </motion.div>
  );
}

function Outro() {
  return (
    <motion.div {...sceneAnim} className="text-center" style={{ fontFamily: FONT }}>
      <h3 className="text-3xl sm:text-4xl mb-3 uppercase tracking-wider" style={{ fontWeight: 600, color: TEXT }}>
        Show up. Train.
      </h3>
      <p className="text-base uppercase tracking-[0.3em] font-semibold" style={{ color: HOT }}>Repeat.</p>
    </motion.div>
  );
}

export const trainingConfig: ExplainerConfig = {
  voUrl: voAsset.url,
  estDuration: 35,
  title: 'Training',
  subtitle: 'Daily practice rooms.',
  outroTitle: 'Show up. Train.',
  outroTagline: 'Repeat.',
  theme: { bg: BG, panel: PANEL, accent: CORAL, ember: HOT, muted: MUTED, text: TEXT, font: FONT, fontWeight: 600 },
  segments: [
    { id: 'intro', weight: 6,   Scene: Intro },
    { id: 'step1', weight: 5,   Scene: Step1 },
    { id: 'step2', weight: 5.5, Scene: Step2 },
    { id: 'step3', weight: 7.5, Scene: Step3 },
    { id: 'step4', weight: 6,   Scene: Step4 },
    { id: 'outro', weight: 4,   Scene: Outro },
  ],
};
