import { motion } from 'framer-motion';
import { Users, Plus, Mic, Send, Video, Phone } from 'lucide-react';
import voAsset from '@/assets/community-vo.mp3.asset.json';
import type { ExplainerConfig } from '../types';
import { sceneAnim } from '../ExplainerPlayer';

// Community — sage / honey, Outfit
const SAGE = '#10B981';
const HONEY = '#FBBF24';
const BG = '#06140F';
const PANEL = '#0F2A1F';
const MUTED = '#8FA89C';
const TEXT = '#E6F4EC';
const FONT = '"Outfit", system-ui, sans-serif';

function Intro() {
  return (
    <motion.div {...sceneAnim} className="text-center">
      <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: HONEY }}>How it works</p>
      <h2 className="text-4xl sm:text-6xl mb-3" style={{ fontFamily: FONT, fontWeight: 700, color: TEXT }}>
        Community Chats
      </h2>
      <p className="text-sm sm:text-base max-w-md mx-auto" style={{ color: MUTED, fontFamily: FONT }}>
        Open rooms where the tribe gathers around what you care about.
      </p>
    </motion.div>
  );
}

function Step1() {
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-5" style={{ background: `${PANEL}99`, borderColor: `${SAGE}33`, fontFamily: FONT }}>
        <p className="text-xs uppercase tracking-wider mb-4" style={{ color: MUTED }}>Go-Live Launcher</p>
        <motion.button
          animate={{ scale: [1, 1.04, 1], boxShadow: [`0 0 0 0 ${SAGE}66`, `0 0 0 14px ${SAGE}00`, `0 0 0 0 ${SAGE}00`] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold"
          style={{ background: SAGE, color: BG }}
        >
          <Users className="w-4 h-4" /> Community Chat
        </motion.button>
        <p className="text-xs mt-4 text-center" style={{ color: MUTED }}>Opens the room hub.</p>
      </div>
    </motion.div>
  );
}

function Step2() {
  const rooms = [
    { name: 'Garden Tribe', count: 12 },
    { name: 'Sunrise Circle', count: 7 },
    { name: 'Hearth Talk', count: 23 },
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-4" style={{ background: `${PANEL}99`, borderColor: `${SAGE}33`, fontFamily: FONT }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wider" style={{ color: MUTED }}>Active chats</p>
          <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: HONEY, color: BG }}>
            <Plus className="w-3 h-3" /> New chat
          </motion.div>
        </div>
        <div className="space-y-2">
          {rooms.map((r, i) => (
            <motion.div key={r.name}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3 p-2.5 rounded-lg border"
              style={{ background: `${SAGE}10`, borderColor: `${SAGE}1A` }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${SAGE}33`, color: TEXT }}>
                <Users className="w-4 h-4" />
              </div>
              <span className="flex-1 text-sm font-medium" style={{ color: TEXT }}>{r.name}</span>
              <span className="text-xs" style={{ color: MUTED }}>{r.count} here</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Step3() {
  const trail = [
    { initial: 'A', active: true },
    { initial: 'B', active: true },
    { initial: 'C' },
    { initial: 'D' },
    { initial: 'E', active: true },
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border overflow-hidden" style={{ background: `${PANEL}99`, borderColor: `${SAGE}33`, fontFamily: FONT }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: `${SAGE}1A` }}>
          <span className="text-xs uppercase tracking-wider mr-2" style={{ color: MUTED }}>Voice trail</span>
          <div className="flex -space-x-2">
            {trail.map((p, i) => (
              <motion.div key={i}
                animate={p.active ? { boxShadow: [`0 0 0 0 ${SAGE}99`, `0 0 0 6px ${SAGE}00`] } : {}}
                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border-2"
                style={{ background: p.active ? `${SAGE}33` : `${PANEL}`, color: TEXT, borderColor: p.active ? SAGE : `${SAGE}33` }}
              >
                {p.initial}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="p-4 space-y-2 min-h-[160px]">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="max-w-[75%] px-3 py-2 rounded-2xl rounded-tl-sm text-sm" style={{ background: `${SAGE}1A`, color: TEXT }}>
            Anyone up for sunrise prayer?
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="ml-auto max-w-[70%] px-3 py-2 rounded-2xl rounded-tr-sm flex items-center gap-2"
            style={{ background: SAGE, color: BG }}>
            <Mic className="w-3.5 h-3.5" />
            <div className="flex items-end gap-0.5 h-3">
              {[5, 9, 6, 11, 7, 4].map((h, i) => (
                <motion.div key={i} initial={{ height: 2 }} animate={{ height: h }} transition={{ delay: 0.8 + i * 0.05 }}
                  className="w-0.5 rounded" style={{ background: BG }} />
              ))}
            </div>
            <span className="text-xs">0:06</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}
            className="max-w-[45%] rounded-xl overflow-hidden border" style={{ borderColor: `${HONEY}33` }}>
            <div className="aspect-video flex items-center justify-center" style={{ background: `${HONEY}1A` }}>
              <Video className="w-5 h-5" style={{ color: HONEY }} />
            </div>
          </motion.div>
        </div>
        <div className="px-4 py-3 border-t flex items-center gap-2" style={{ borderColor: `${SAGE}1A`, background: `${BG}80` }}>
          <div className="flex-1 px-3 py-1.5 rounded-full text-xs" style={{ background: `${SAGE}14`, color: MUTED }}>Message the room…</div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: SAGE }}>
            <Send className="w-3.5 h-3.5" style={{ color: BG }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Step4() {
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md text-center">
      <div className="rounded-xl border p-6" style={{ background: `${PANEL}99`, borderColor: `${SAGE}33`, fontFamily: FONT }}>
        <div className="flex items-center justify-center gap-2 mb-5">
          {['A', 'B', 'C', 'D'].map((l, i) => (
            <motion.div key={l}
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.12 }}
              className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
              style={{ background: `${SAGE}33`, color: TEXT, border: `2px solid ${SAGE}` }}
            >{l}</motion.div>
          ))}
        </div>
        <motion.button
          animate={{ scale: [1, 1.06, 1], boxShadow: [`0 0 0 0 ${HONEY}80`, `0 0 0 18px ${HONEY}00`, `0 0 0 0 ${HONEY}00`] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="mx-auto flex items-center gap-2 px-5 py-3 rounded-full font-semibold"
          style={{ background: HONEY, color: BG }}
        >
          <Phone className="w-4 h-4" /> Bring the room live
        </motion.button>
        <p className="text-xs mt-4" style={{ color: MUTED }}>Any member can start the call.</p>
      </div>
    </motion.div>
  );
}

function Outro() {
  return (
    <motion.div {...sceneAnim} className="text-center" style={{ fontFamily: FONT }}>
      <h3 className="text-3xl sm:text-4xl mb-3" style={{ fontWeight: 700, color: TEXT }}>Always open.</h3>
      <p className="text-base" style={{ color: HONEY }}>Always yours.</p>
    </motion.div>
  );
}

export const communityConfig: ExplainerConfig = {
  voUrl: voAsset.url,
  estDuration: 35,
  title: 'Community Chats',
  subtitle: 'Open rooms where the tribe gathers.',
  outroTitle: 'Always open.',
  outroTagline: 'Always yours.',
  theme: { bg: BG, panel: PANEL, accent: SAGE, ember: HONEY, muted: MUTED, text: TEXT, font: FONT, fontWeight: 700 },
  segments: [
    { id: 'intro', weight: 6,   Scene: Intro },
    { id: 'step1', weight: 5,   Scene: Step1 },
    { id: 'step2', weight: 6,   Scene: Step2 },
    { id: 'step3', weight: 7,   Scene: Step3 },
    { id: 'step4', weight: 6.5, Scene: Step4 },
    { id: 'outro', weight: 4.5, Scene: Outro },
  ],
};
