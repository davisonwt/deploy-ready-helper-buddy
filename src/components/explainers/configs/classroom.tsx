import { motion } from 'framer-motion';
import { BookOpen, Plus, FileText, Download, Upload, Check, Star, Hand, Mic, MicOff, MessageSquare } from 'lucide-react';
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
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-4" style={{ background: `${PANEL}CC`, borderColor: `${VIOLET}55`, fontFamily: FONT }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wider" style={{ color: MUTED }}>Create a session</p>
          <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: CHALK, color: BG }}>
            <Plus className="w-3 h-3" /> New
          </motion.div>
        </div>

        <div className="p-3 rounded-lg border mb-3" style={{ background: `${VIOLET}10`, borderColor: `${VIOLET}33` }}>
          <p className="text-sm font-semibold" style={{ color: TEXT }}>Sacred Calendar 101</p>
          <p className="text-xs mt-0.5 italic" style={{ color: MUTED }}>instructor · Ed</p>
        </div>

        <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Attendance</p>
        <div className="grid grid-cols-2 gap-2">
          <motion.div
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="rounded-lg border-2 p-2.5 text-center"
            style={{ borderColor: VIOLET, background: `${VIOLET}22` }}
          >
            <p className="text-xs font-semibold" style={{ color: TEXT }}>Free</p>
            <p className="text-[10px] italic" style={{ color: MUTED }}>open to all</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}
            className="rounded-lg border p-2.5 text-center"
            style={{ borderColor: `${CHALK}66`, background: `${CHALK}10` }}
          >
            <p className="text-xs font-semibold" style={{ color: CHALK }}>Set a fee</p>
            <p className="text-[10px] italic" style={{ color: MUTED }}>your call</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function Step3() {
  const docs = [
    { name: 'Lesson outline.pdf' },
    { name: 'Worksheet · Omer.pdf' },
  ];
  const attendees = [
    { name: 'Mira', raised: true,  unmuted: true,  note: '' },
    { name: 'Ezra', raised: true,  unmuted: false, note: '' },
    { name: 'Amara', raised: false, unmuted: false, note: 'voice note · 0:14' },
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border overflow-hidden" style={{ background: `${PANEL}CC`, borderColor: `${VIOLET}55`, fontFamily: FONT }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: `${VIOLET}33` }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: VIOLET }} />
          <span className="text-sm italic" style={{ color: TEXT }}>Live · Ed is teaching</span>
          <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${CHALK}33`, color: CHALK }}>view · download</span>
        </div>

        <div className="p-3 space-y-2">
          {docs.map((d, i) => (
            <motion.div key={d.name}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.18 }}
              className="flex items-center gap-3 p-2 rounded-lg border"
              style={{ background: `${VIOLET}10`, borderColor: `${VIOLET}33` }}
            >
              <div className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: `${VIOLET}33`, color: VIOLET }}>
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs flex-1" style={{ color: TEXT }}>{d.name}</span>
              <motion.div
                animate={{ y: [0, -2, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: `${CHALK}22`, color: CHALK }}
              >
                <Download className="w-3.5 h-3.5" />
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Step4() {
  const subs = [
    { from: 'Mira', file: 'omer-tasks.pdf', score: 9 },
    { from: 'Ezra', file: 'reflection.docx', score: 8 },
    { from: 'Amara', file: 'notes.pdf', score: null },
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border overflow-hidden" style={{ background: `${PANEL}CC`, borderColor: `${VIOLET}55`, fontFamily: FONT }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: `${VIOLET}33` }}>
          <Upload className="w-4 h-4" style={{ color: VIOLET }} />
          <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: MUTED }}>Student submissions</span>
          <span className="ml-auto text-[10px] italic" style={{ color: CHALK }}>teacher reviews</span>
        </div>
        <div className="p-3 space-y-2 min-h-[170px]">
          {subs.map((s, i) => (
            <motion.div key={s.from}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.3 }}
              className="flex items-center gap-3 p-2.5 rounded-lg border"
              style={{ background: `${VIOLET}0F`, borderColor: `${VIOLET}33` }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                style={{ background: VIOLET, color: BG }}>{s.from[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: TEXT }}>{s.from} · {s.file}</p>
              </div>
              {s.score !== null ? (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 + i * 0.3 }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                  style={{ background: `${CHALK}33`, color: CHALK }}
                >
                  <Star className="w-3 h-3 fill-current" /> {s.score}/10
                </motion.div>
              ) : (
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] italic"
                  style={{ background: `${VIOLET}22`, color: VIOLET }}
                >
                  <Check className="w-3 h-3" /> scoring…
                </motion.div>
              )}
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
      <h3 className="text-3xl sm:text-4xl mb-3 italic" style={{ fontWeight: 600, color: TEXT }}>Real teaching.</h3>
      <p className="text-base italic" style={{ color: CHALK }}>One quiet room.</p>
    </motion.div>
  );
}

export const classroomConfig: ExplainerConfig = {
  voUrl: voAsset.url,
  estDuration: 30,
  title: 'Classroom',
  subtitle: 'Live teaching, structured.',
  outroTitle: 'Real teaching.',
  outroTagline: 'One quiet room.',
  theme: { bg: BG, panel: PANEL, accent: VIOLET, ember: CHALK, muted: MUTED, text: TEXT, font: FONT, fontWeight: 600 },
  segments: [
    { id: 'intro', weight: 2.5, Scene: Intro },
    { id: 'step1', weight: 3,   Scene: Step1 },
    { id: 'step2', weight: 7,   Scene: Step2 },
    { id: 'step3', weight: 7,   Scene: Step3 },
    { id: 'step4', weight: 8,   Scene: Step4 },
    { id: 'outro', weight: 2.5, Scene: Outro },
  ],
};
