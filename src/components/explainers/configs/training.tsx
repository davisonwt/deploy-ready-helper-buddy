import { motion } from 'framer-motion';
import { Dumbbell, Plus, Flame, CheckCircle2, FileText, Download } from 'lucide-react';
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
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-4" style={{ background: `${PANEL}CC`, borderColor: `${CORAL}55`, fontFamily: FONT }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-[0.25em]" style={{ color: MUTED }}>Create a room</p>
          <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
            style={{ background: HOT, color: BG }}>
            <Plus className="w-3 h-3" /> New
          </motion.div>
        </div>

        <div className="p-3 rounded-lg border mb-3"
          style={{ background: `${CORAL}10`, borderColor: `${CORAL}33` }}>
          <p className="text-sm uppercase tracking-wide font-medium" style={{ color: TEXT }}>Sunrise Calisthenics</p>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>18 training</p>
        </div>

        <p className="text-[10px] uppercase tracking-[0.25em] mb-2" style={{ color: MUTED }}>Access</p>
        <div className="grid grid-cols-2 gap-2">
          <motion.div
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="rounded-lg border-2 p-2.5 text-center uppercase tracking-wider"
            style={{ borderColor: CORAL, background: `${CORAL}22` }}
          >
            <p className="text-xs font-semibold" style={{ color: TEXT }}>Free</p>
            <p className="text-[10px]" style={{ color: MUTED }}>open</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}
            className="rounded-lg border p-2.5 text-center uppercase tracking-wider"
            style={{ borderColor: `${HOT}77`, background: `${HOT}14` }}
          >
            <p className="text-xs font-semibold" style={{ color: HOT }}>Set fee</p>
            <p className="text-[10px]" style={{ color: MUTED }}>your call</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function Step3() {
  const files = [
    { name: 'workout-day-7.pdf' },
    { name: 'scripture-read.pdf' },
    { name: 'mobility-flow.pdf' },
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border overflow-hidden" style={{ background: `${PANEL}CC`, borderColor: `${CORAL}55`, fontFamily: FONT }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: `${CORAL}33` }}>
          <FileText className="w-4 h-4" style={{ color: CORAL }} />
          <span className="text-xs uppercase tracking-[0.2em] font-semibold" style={{ color: MUTED }}>Pre-loaded</span>
          <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${HOT}22`, color: HOT }}>view · download</span>
        </div>
        <div className="p-3 space-y-2">
          {files.map((f, i) => (
            <motion.div key={f.name}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.22 }}
              className="flex items-center gap-3 p-2.5 rounded-lg border"
              style={{ background: `${CORAL}10`, borderColor: `${CORAL}33` }}
            >
              <div className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: `${CORAL}33`, color: CORAL }}>
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs uppercase tracking-wide flex-1" style={{ color: TEXT }}>{f.name}</span>
              <Download className="w-3.5 h-3.5" style={{ color: HOT }} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Step4() {
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
  estDuration: 24,
  title: 'Training',
  subtitle: 'Daily practice rooms.',
  outroTitle: 'Show up. Train.',
  outroTagline: 'Repeat.',
  theme: { bg: BG, panel: PANEL, accent: CORAL, ember: HOT, muted: MUTED, text: TEXT, font: FONT, fontWeight: 600 },
  segments: [
    { id: 'intro', weight: 2,   Scene: Intro },
    { id: 'step1', weight: 3,   Scene: Step1 },
    { id: 'step2', weight: 6,   Scene: Step2 },
    { id: 'step3', weight: 6,   Scene: Step3 },
    { id: 'step4', weight: 5,   Scene: Step4 },
    { id: 'outro', weight: 2,   Scene: Outro },
  ],
};
