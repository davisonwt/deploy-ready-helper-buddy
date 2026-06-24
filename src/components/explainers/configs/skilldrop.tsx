import { motion } from 'framer-motion';
import { Zap, Plus, MessageSquare, Sparkles } from 'lucide-react';
import voAsset from '@/assets/skilldrop-vo.mp3.asset.json';
import type { ExplainerConfig } from '../types';
import { sceneAnim } from '../ExplainerPlayer';

// SkillDrop — gold / ember, Space Grotesk
const GOLD = '#F5A623';
const EMBER = '#FF6B4A';
const BG = '#1A1308';
const PANEL = '#241A0D';
const MUTED = 'rgba(245,230,200,0.6)';
const TEXT = '#F5E6C8';
const FONT = '"Space Grotesk", Inter, sans-serif';

function Intro() {
  return (
    <motion.div {...sceneAnim} className="text-center" style={{ fontFamily: FONT }}>
      <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: EMBER }}>How it works</p>
      <h2 className="text-4xl sm:text-6xl mb-3" style={{ fontWeight: 700, color: TEXT }}>SkillDrop</h2>
      <p className="text-sm sm:text-base max-w-md mx-auto" style={{ color: MUTED }}>
        Fast skill-sharing where one tip lands hard.
      </p>
    </motion.div>
  );
}

function Step1() {
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-5" style={{ background: `${PANEL}CC`, borderColor: `${GOLD}55`, fontFamily: FONT }}>
        <p className="text-xs uppercase tracking-wider mb-4" style={{ color: MUTED }}>Go-Live Launcher</p>
        <motion.button
          animate={{ scale: [1, 1.04, 1], boxShadow: [`0 0 0 0 ${GOLD}66`, `0 0 0 14px ${GOLD}00`, `0 0 0 0 ${GOLD}00`] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold"
          style={{ background: `linear-gradient(90deg, ${GOLD} 0%, ${EMBER} 100%)`, color: BG }}
        >
          <Zap className="w-4 h-4" /> SkillDrop
        </motion.button>
        <p className="text-xs mt-4 text-center" style={{ color: MUTED }}>Opens the drops board.</p>
      </div>
    </motion.div>
  );
}

function Step2() {
  const drops = [
    { title: 'Sharpen a knife in 30s', host: 'Mira' },
    { title: 'Read a sourdough crust', host: 'Ezra' },
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-4" style={{ background: `${PANEL}CC`, borderColor: `${GOLD}55`, fontFamily: FONT }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wider" style={{ color: MUTED }}>Dropping now</p>
          <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background: `linear-gradient(90deg, ${GOLD}, ${EMBER})`, color: BG }}>
            <Plus className="w-3 h-3" /> Start
          </motion.div>
        </div>
        <div className="space-y-2">
          {drops.map((d, i) => (
            <motion.div key={d.title}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.18 }}
              className="p-3 rounded-lg border relative overflow-hidden"
              style={{ background: `${GOLD}10`, borderColor: `${GOLD}33` }}>
              <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${EMBER}30 0%, transparent 70%)` }} />
              <p className="text-sm font-bold relative" style={{ color: TEXT }}>{d.title}</p>
              <p className="text-xs mt-0.5 relative" style={{ color: MUTED }}>by {d.host}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Step3() {
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <motion.div
        initial={{ y: -120, opacity: 0, scale: 0.85 }}
        animate={{ y: [-120, 18, -6, 0], opacity: 1, scale: [0.85, 1.05, 0.98, 1] }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-xl border p-5 relative overflow-hidden"
        style={{ background: `${PANEL}EE`, borderColor: GOLD, fontFamily: FONT, boxShadow: `0 20px 60px ${EMBER}55` }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 0%, ${GOLD}33 0%, transparent 60%)` }} />
        <div className="flex items-center gap-2 mb-3 relative">
          <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: EMBER }}>Live drop</span>
        </div>
        <h3 className="text-2xl font-bold mb-3 relative" style={{ color: TEXT }}>
          Salt your pasta water like the sea.
        </h3>
        <p className="text-sm relative" style={{ color: MUTED }}>
          One tablespoon per litre. Tastes briny in the pot — perfect on the plate. That's the whole drop.
        </p>
      </motion.div>
    </motion.div>
  );
}

function Step4() {
  const replies = [
    { from: 'Mira', text: 'Game changer.' },
    { from: 'Ezra', text: 'Per litre, not per pot. Got it.' },
    { from: 'Amara', text: 'Tried it tonight 🔥' },
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-4" style={{ background: `${PANEL}CC`, borderColor: `${GOLD}55`, fontFamily: FONT }}>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4" style={{ color: GOLD }} />
          <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: MUTED }}>Back & forth</p>
        </div>
        <div className="space-y-2">
          {replies.map((r, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.35 }}
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${i % 2 === 0 ? '' : 'ml-auto'}`}
              style={{
                background: i % 2 === 0 ? `${GOLD}1A` : `linear-gradient(90deg, ${GOLD}, ${EMBER})`,
                color: i % 2 === 0 ? TEXT : BG,
                borderTopLeftRadius: i % 2 === 0 ? '0.25rem' : undefined,
                borderTopRightRadius: i % 2 === 0 ? undefined : '0.25rem',
              }}
            >
              <span className="font-bold mr-1.5">{r.from}:</span>{r.text}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Outro() {
  return (
    <motion.div {...sceneAnim} className="text-center" style={{ fontFamily: FONT }}>
      <h3 className="text-3xl sm:text-4xl mb-3" style={{ fontWeight: 700, color: TEXT }}>Short. Sharp.</h3>
      <p className="text-base font-bold"
        style={{ background: `linear-gradient(90deg, ${GOLD}, ${EMBER})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        That's SkillDrop.
      </p>
    </motion.div>
  );
}

export const skilldropConfig: ExplainerConfig = {
  voUrl: voAsset.url,
  estDuration: 29,
  title: 'SkillDrop',
  subtitle: 'Fast skill-sharing.',
  outroTitle: 'Short. Sharp.',
  outroTagline: "That's SkillDrop.",
  theme: { bg: BG, panel: PANEL, accent: GOLD, ember: EMBER, muted: MUTED, text: TEXT, font: FONT, fontWeight: 700 },
  segments: [
    { id: 'intro', weight: 5,   Scene: Intro },
    { id: 'step1', weight: 4.5, Scene: Step1 },
    { id: 'step2', weight: 5.5, Scene: Step2 },
    { id: 'step3', weight: 6,   Scene: Step3 },
    { id: 'step4', weight: 5,   Scene: Step4 },
    { id: 'outro', weight: 3.5, Scene: Outro },
  ],
};
