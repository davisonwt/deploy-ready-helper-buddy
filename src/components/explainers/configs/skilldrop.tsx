import { motion } from 'framer-motion';
import { Zap, Plus, MessageSquare, Sparkles, FileText, ImageIcon, Download, Hand, Mic, Video, Users } from 'lucide-react';
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
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-4" style={{ background: `${PANEL}CC`, borderColor: `${GOLD}55`, fontFamily: FONT }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wider" style={{ color: MUTED }}>Start a drop</p>
          <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background: `linear-gradient(90deg, ${GOLD}, ${EMBER})`, color: BG }}>
            <Plus className="w-3 h-3" /> New
          </motion.div>
        </div>

        <div className="p-3 rounded-lg border mb-3 relative overflow-hidden"
          style={{ background: `${GOLD}10`, borderColor: `${GOLD}33` }}>
          <p className="text-sm font-bold" style={{ color: TEXT }}>Sharpen a knife in 30s</p>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>by Mira</p>
        </div>

        <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Entry</p>
        <div className="grid grid-cols-2 gap-2">
          <motion.div
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="rounded-lg border-2 p-2.5 text-center"
            style={{ borderColor: GOLD, background: `${GOLD}22` }}
          >
            <p className="text-xs font-bold" style={{ color: TEXT }}>Free</p>
            <p className="text-[10px]" style={{ color: MUTED }}>open</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}
            className="rounded-lg border p-2.5 text-center"
            style={{ borderColor: `${EMBER}77`, background: `${EMBER}14` }}
          >
            <p className="text-xs font-bold" style={{ color: EMBER }}>Small fee</p>
            <p className="text-[10px]" style={{ color: MUTED }}>your call</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function Step3() {
  const files = [
    { Icon: FileText, name: 'knife-angles.pdf' },
    { Icon: ImageIcon, name: 'grip-diagram.png' },
    { Icon: FileText, name: 'safety-notes.md' },
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <motion.div
        initial={{ y: -40, opacity: 0, scale: 0.92 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-xl border p-5 relative overflow-hidden"
        style={{ background: `${PANEL}EE`, borderColor: GOLD, fontFamily: FONT, boxShadow: `0 20px 60px ${EMBER}55` }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 0%, ${GOLD}33 0%, transparent 60%)` }} />
        <div className="flex items-center gap-2 mb-3 relative">
          <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: EMBER }}>Live drop</span>
        </div>
        <h3 className="text-lg font-bold mb-3 relative" style={{ color: TEXT }}>
          Salt your pasta water like the sea.
        </h3>
        <div className="relative space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: MUTED }}>Pre-loaded · view or download</p>
          {files.map((f, i) => (
            <motion.div key={f.name}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.2 }}
              className="flex items-center gap-2 p-2 rounded-md border text-xs"
              style={{ background: `${GOLD}10`, borderColor: `${GOLD}33`, color: TEXT }}
            >
              <f.Icon className="w-3.5 h-3.5" style={{ color: GOLD }} />
              <span className="flex-1">{f.name}</span>
              <Download className="w-3.5 h-3.5" style={{ color: EMBER }} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Step4() {
  const items = [
    { from: 'Mira', kind: 'raise', text: 'Has a question' },
    { from: 'Ezra', kind: 'voice', text: 'voice note · 0:18' },
    { from: 'Amara', kind: 'upload', text: 'fixed-handle.jpg · video' },
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-4" style={{ background: `${PANEL}CC`, borderColor: `${GOLD}55`, fontFamily: FONT }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" style={{ color: GOLD }} />
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: MUTED }}>Attendees</p>
          </div>
          <motion.div
            animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: `linear-gradient(90deg, ${GOLD}, ${EMBER})`, color: BG }}
          >
            <Users className="w-3 h-3" /> Open floor
          </motion.div>
        </div>

        <div className="space-y-1.5">
          {items.map((it, i) => {
            const iconMap = { raise: Hand, voice: Mic, upload: Video } as const;
            const Icon = iconMap[it.kind as keyof typeof iconMap];
            return (
              <motion.div key={it.from}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.28 }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-md border"
                style={{ background: `${GOLD}10`, borderColor: `${GOLD}33` }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: `linear-gradient(90deg, ${GOLD}, ${EMBER})`, color: BG }}>{it.from[0]}</div>
                <span className="text-xs flex-1" style={{ color: TEXT }}>{it.from}</span>
                <span className="flex items-center gap-1 text-[10px] italic" style={{ color: MUTED }}>
                  <Icon className="w-3 h-3" style={{ color: EMBER }} /> {it.text}
                </span>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
          className="mt-3 text-center text-[10px] uppercase tracking-[0.2em]"
          style={{ color: MUTED }}
        >
          host controls the flow · gives feedback
        </motion.div>
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
  estDuration: 32,
  title: 'SkillDrop',
  subtitle: 'Fast skill-sharing.',
  outroTitle: 'Short. Sharp.',
  outroTagline: "That's SkillDrop.",
  theme: { bg: BG, panel: PANEL, accent: GOLD, ember: EMBER, muted: MUTED, text: TEXT, font: FONT, fontWeight: 700 },
  segments: [
    { id: 'intro', weight: 2,   Scene: Intro },
    { id: 'step1', weight: 3,   Scene: Step1 },
    { id: 'step2', weight: 6,   Scene: Step2 },
    { id: 'step3', weight: 6,   Scene: Step3 },
    { id: 'step4', weight: 10,  Scene: Step4 },
    { id: 'outro', weight: 2.5, Scene: Outro },
  ],
};
