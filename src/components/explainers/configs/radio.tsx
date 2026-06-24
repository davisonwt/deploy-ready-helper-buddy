import { motion } from 'framer-motion';
import { Radio as RadioIcon, Play, Music, ListMusic, MessageCircle, Send, ImageIcon, Video, FileText, Mic, Heart, Download } from 'lucide-react';
import voAsset from '@/assets/radio-vo.mp3.asset.json';
import type { ExplainerConfig } from '../types';
import { sceneAnim } from '../ExplainerPlayer';

// Radio — navy / amber, Bitter
const AMBER = '#FFB454';
const NAVY = '#38BDF8';
const BG = '#0A1628';
const PANEL = '#13243D';
const MUTED = 'rgba(220,235,247,0.55)';
const TEXT = '#DCEBF7';
const FONT = '"Bitter", Georgia, serif';

function Intro() {
  return (
    <motion.div {...sceneAnim} className="text-center" style={{ fontFamily: FONT }}>
      <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: AMBER }}>How it works</p>
      <h2 className="text-4xl sm:text-6xl mb-3" style={{ fontWeight: 600, color: TEXT }}>Radio</h2>
      <p className="text-sm sm:text-base max-w-md mx-auto" style={{ color: MUTED }}>
        Your broadcast booth — and the tribe's listening room.
      </p>
    </motion.div>
  );
}

function Step1() {
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-5" style={{ background: `${PANEL}CC`, borderColor: `${AMBER}55`, fontFamily: FONT }}>
        <p className="text-xs uppercase tracking-wider mb-4" style={{ color: MUTED }}>Go-Live Launcher</p>
        <motion.button
          animate={{ scale: [1, 1.04, 1], boxShadow: [`0 0 0 0 ${AMBER}66`, `0 0 0 14px ${AMBER}00`, `0 0 0 0 ${AMBER}00`] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold"
          style={{ background: AMBER, color: BG }}
        >
          <RadioIcon className="w-4 h-4" /> Radio
        </motion.button>
        <p className="text-xs mt-4 text-center" style={{ color: MUTED }}>Opens the station.</p>
      </div>
    </motion.div>
  );
}

function Step2() {
  const tabs = [
    { id: 'library', label: 'Library', Icon: Music },
    { id: 'playlists', label: 'Playlists', Icon: ListMusic },
    { id: 'live', label: 'Live', Icon: RadioIcon, active: true },
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-4" style={{ background: `${PANEL}CC`, borderColor: `${AMBER}55`, fontFamily: FONT }}>
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: MUTED }}>Station</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {tabs.map((t, i) => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
              className="flex flex-col items-center gap-1.5 py-3 rounded-lg border"
              style={{
                background: t.active ? `${AMBER}1F` : `${NAVY}10`,
                borderColor: t.active ? AMBER : `${NAVY}33`,
                color: t.active ? AMBER : TEXT,
              }}
            >
              <t.Icon className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">{t.label}</span>
            </motion.div>
          ))}
        </div>

        <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Broadcast</p>
        <div className="grid grid-cols-2 gap-2">
          <motion.div
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
            className="rounded-lg border-2 p-2.5 text-center"
            style={{ borderColor: AMBER, background: `${AMBER}22` }}
          >
            <p className="text-xs font-semibold" style={{ color: TEXT }}>Free</p>
            <p className="text-[10px]" style={{ color: MUTED }}>open air</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.75 }}
            className="rounded-lg border p-2.5 text-center"
            style={{ borderColor: `${NAVY}88`, background: `${NAVY}14` }}
          >
            <p className="text-xs font-semibold" style={{ color: NAVY }}>Entry fee</p>
            <p className="text-[10px]" style={{ color: MUTED }}>your call</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function Step3() {
  const bars = [0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.45, 0.7, 0.55, 0.85, 0.5, 0.75];
  const tools = [
    { Icon: ImageIcon, label: 'Image' },
    { Icon: Video, label: 'Video' },
    { Icon: FileText, label: 'Doc' },
    { Icon: Mic, label: 'Voice' },
    { Icon: Music, label: 'Pick song' },
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-4" style={{ background: `${PANEL}CC`, borderColor: `${AMBER}55`, fontFamily: FONT }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }}
              className="w-2 h-2 rounded-full" style={{ background: AMBER }} />
            <span className="text-xs uppercase tracking-[0.25em] font-semibold" style={{ color: AMBER }}>On Air</span>
          </div>
          <motion.button
            animate={{ scale: [1, 1.06, 1], boxShadow: [`0 0 0 0 ${AMBER}80`, `0 0 0 14px ${AMBER}00`] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: AMBER, color: BG }}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
          </motion.button>
        </div>
        <div className="flex items-end justify-between gap-1 h-12 mb-3 px-1">
          {bars.map((b, i) => (
            <motion.div key={i}
              initial={{ height: 4 }}
              animate={{ height: [b * 100 * 0.3, b * 100 * 0.6, b * 100 * 0.4, b * 100 * 0.55] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.05, repeatType: 'reverse' }}
              className="flex-1 rounded-t"
              style={{ background: `linear-gradient(180deg, ${AMBER} 0%, ${NAVY} 100%)` }}
            />
          ))}
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Host composer</p>
        <div className="grid grid-cols-5 gap-1.5">
          {tools.map((t, i) => (
            <motion.div key={t.label}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.12 }}
              className="flex flex-col items-center gap-1 py-2 rounded-md border"
              style={{ background: `${AMBER}10`, borderColor: `${AMBER}33`, color: TEXT }}
            >
              <t.Icon className="w-3.5 h-3.5" style={{ color: AMBER }} />
              <span className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>{t.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Step4() {
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border overflow-hidden" style={{ background: `${PANEL}CC`, borderColor: `${AMBER}55`, fontFamily: FONT }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: `${AMBER}33` }}>
          <MessageCircle className="w-4 h-4" style={{ color: NAVY }} />
          <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: MUTED }}>Listener chat</span>
        </div>

        <div className="p-3 space-y-2">
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="max-w-[80%] px-3 py-2 rounded-2xl text-xs"
            style={{ background: `${NAVY}22`, color: TEXT, border: `1px solid ${NAVY}66` }}
          >
            <span className="font-bold mr-1.5">Ezra:</span>Request: Sunrise Hymn?
            <span className="ml-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: NAVY, color: BG }}>request</span>
          </motion.div>

          {/* Now playing card with bestow button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45 }}
            className="flex items-center gap-2.5 p-2.5 rounded-lg border"
            style={{ background: `${AMBER}14`, borderColor: `${AMBER}55` }}
          >
            <div className="w-9 h-9 rounded-md flex items-center justify-center"
              style={{ background: `${AMBER}33`, color: AMBER }}>
              <Music className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: TEXT }}>Sunrise Hymn</p>
              <p className="text-[10px] italic" style={{ color: MUTED }}>now playing</p>
            </div>
            <motion.button
              animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ background: AMBER, color: BG }}
            >
              <Heart className="w-3 h-3 fill-current" /> Bestow
            </motion.button>
          </motion.div>

          {/* Arrow flow to 1-on-1 chat */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
            className="text-center text-[10px] uppercase tracking-[0.2em]"
            style={{ color: MUTED }}
          >
            ↓ mp3 forwarded to your 1-on-1 chat
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}
            className="flex items-center gap-2.5 p-2.5 rounded-lg ml-6"
            style={{ background: `${NAVY}14`, border: `1px dashed ${NAVY}66` }}
          >
            <div className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ background: `${NAVY}33`, color: NAVY }}>
              <Music className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold truncate" style={{ color: TEXT }}>Sunrise-Hymn.mp3</p>
              <p className="text-[9px] italic" style={{ color: MUTED }}>from the DJ · ready to download</p>
            </div>
            <Download className="w-3.5 h-3.5" style={{ color: NAVY }} />
          </motion.div>
        </div>

        <div className="px-3 py-2 border-t flex items-center gap-2" style={{ borderColor: `${AMBER}33`, background: `${BG}80` }}>
          <div className="flex-1 px-3 py-1 rounded-full text-[11px]" style={{ background: `${NAVY}14`, color: MUTED }}>Request a song…</div>
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: AMBER }}>
            <Send className="w-3 h-3" style={{ color: BG }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Outro() {
  return (
    <motion.div {...sceneAnim} className="text-center" style={{ fontFamily: FONT }}>
      <h3 className="text-3xl sm:text-4xl mb-3" style={{ fontWeight: 600, color: TEXT }}>Now playing —</h3>
      <p className="text-base italic" style={{ color: AMBER }}>you.</p>
    </motion.div>
  );
}

export const radioConfig: ExplainerConfig = {
  voUrl: voAsset.url,
  estDuration: 33,
  title: 'Radio',
  subtitle: 'Live broadcasts and listening rooms.',
  outroTitle: 'Now playing —',
  outroTagline: 'you.',
  theme: { bg: BG, panel: PANEL, accent: AMBER, ember: NAVY, muted: MUTED, text: TEXT, font: FONT, fontWeight: 600 },
  segments: [
    { id: 'intro', weight: 2,   Scene: Intro },
    { id: 'step1', weight: 3,   Scene: Step1 },
    { id: 'step2', weight: 7,   Scene: Step2 },
    { id: 'step3', weight: 10,  Scene: Step3 },
    { id: 'step4', weight: 9,   Scene: Step4 },
    { id: 'outro', weight: 2,   Scene: Outro },
  ],
};
