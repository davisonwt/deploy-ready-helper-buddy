import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Plus, Phone, Video, Mic, Send, Check } from 'lucide-react';
import voAsset from '@/assets/1on1-live-vo.mp3.asset.json';

// Timeline keyed to the actual 33.7s narration recorded via OpenAI TTS (voice: nova).
// Each step's [start, end] in seconds matches the spoken beat.
type Step = {
  id: 'intro' | 'step1' | 'step2' | 'step3' | 'step4' | 'outro';
  start: number;
  end: number;
};

const TIMELINE: Step[] = [
  { id: 'intro', start: 0,    end: 5.5  }, // "Welcome to one on one Live..."
  { id: 'step1', start: 5.5,  end: 11   }, // "Step one. Tap Go Live..."
  { id: 'step2', start: 11,   end: 16.5 }, // "Step two. Pick the tribe member..."
  { id: 'step3', start: 16.5, end: 24   }, // "Step three. Once they join..."
  { id: 'step4', start: 24,   end: 30   }, // "Step four. When you're ready..."
  { id: 'outro', start: 30,   end: 34   }, // "That's it. Private, secure..."
];

const TEAL = '#1FB6A8';
const EMBER = '#FF8A5B';
const BG = '#0B1420';
const PANEL = '#123330';
const MUTED = '#7E9498';
const TEXT = '#EAF4F2';

function currentStep(t: number): Step {
  return TIMELINE.find(s => t >= s.start && t < s.end) ?? TIMELINE[TIMELINE.length - 1];
}

export default function ExplainerPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(34);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onLoaded = () => setDuration(a.duration || 34);
    const onEnded = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onLoaded);
    a.addEventListener('ended', onEnded);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onLoaded);
      a.removeEventListener('ended', onEnded);
    };
  }, []);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      await a.play();
      setPlaying(true);
    }
  };

  const restart = async () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    setTime(0);
    await a.play();
    setPlaying(true);
  };

  const step = currentStep(time);
  const progress = Math.min(100, (time / duration) * 100);

  return (
    <div className="w-full">
      <audio ref={audioRef} src={voAsset.url} preload="auto" />

      {/* 16:9 stage */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border"
        style={{ aspectRatio: '16 / 9', background: BG, borderColor: `${TEAL}33` }}
      >
        {/* Soft radial backdrop */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(60% 60% at 30% 30%, ${TEAL}1A 0%, transparent 60%), radial-gradient(50% 50% at 80% 80%, ${EMBER}14 0%, transparent 60%)`,
          }}
        />

        {/* Step badge (top-left) — sequential walkthrough markers */}
        <AnimatePresence mode="wait">
          {step.id !== 'intro' && step.id !== 'outro' && (
            <motion.div
              key={`badge-${step.id}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.35 }}
              className="absolute top-4 left-4 z-20 flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold"
                style={{ background: TEAL, color: BG, fontFamily: '"Fraunces", serif' }}
              >
                {step.id === 'step1' ? 1 : step.id === 'step2' ? 2 : step.id === 'step3' ? 3 : 4}
              </div>
              <span className="text-xs uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                Step {step.id === 'step1' ? 'one' : step.id === 'step2' ? 'two' : step.id === 'step3' ? 'three' : 'four'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scenes */}
        <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-10">
          <AnimatePresence mode="wait">
            {step.id === 'intro' && <IntroScene key="intro" />}
            {step.id === 'step1' && <Step1Scene key="step1" />}
            {step.id === 'step2' && <Step2Scene key="step2" />}
            {step.id === 'step3' && <Step3Scene key="step3" />}
            {step.id === 'step4' && <Step4Scene key="step4" />}
            {step.id === 'outro' && <OutroScene key="outro" />}
          </AnimatePresence>
        </div>

        {/* Progress bar (bottom) */}
        <div className="absolute left-0 right-0 bottom-0 h-1" style={{ background: `${TEAL}1A` }}>
          <div className="h-full transition-[width] duration-150" style={{ width: `${progress}%`, background: TEAL }} />
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors"
          style={{ background: TEAL, color: BG }}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {playing ? 'Pause' : time > 0 ? 'Resume' : 'Play walkthrough'}
        </button>
        <button
          onClick={restart}
          className="flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors"
          style={{ background: 'transparent', color: MUTED, border: `1px solid ${TEAL}33` }}
        >
          <RotateCcw className="w-4 h-4" /> Restart
        </button>
        <span className="ml-auto text-xs tabular-nums" style={{ color: MUTED }}>
          {fmt(time)} / {fmt(duration)}
        </span>
      </div>
    </div>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
}

// ---------- Scenes ----------

const sceneAnim = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

function IntroScene() {
  return (
    <motion.div {...sceneAnim} className="text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xs uppercase tracking-[0.3em] mb-3"
        style={{ color: EMBER }}
      >
        How it works
      </motion.p>
      <h2
        className="text-4xl sm:text-6xl mb-3"
        style={{ fontFamily: '"Fraunces", serif', fontWeight: 500, color: TEXT }}
      >
        1-on-1 Live
      </h2>
      <p className="text-sm sm:text-base max-w-md mx-auto" style={{ color: MUTED }}>
        A private room for one real conversation with one tribe member.
      </p>
    </motion.div>
  );
}

function Step1Scene() {
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-5" style={{ background: `${PANEL}66`, borderColor: `${TEAL}33` }}>
        <p className="text-xs uppercase tracking-wider mb-4" style={{ color: MUTED }}>
          Communications Hub
        </p>
        <motion.button
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.04, 1], boxShadow: [`0 0 0 0 ${TEAL}66`, `0 0 0 14px ${TEAL}00`, `0 0 0 0 ${TEAL}00`] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium"
          style={{ background: TEAL, color: BG }}
        >
          <Plus className="w-4 h-4" /> Go Live · New room
        </motion.button>
        <p className="text-xs mt-4 text-center" style={{ color: MUTED }}>
          Tap to open the launcher.
        </p>
      </div>
    </motion.div>
  );
}

function Step2Scene() {
  const members = [
    { name: 'Amara', initial: 'A' },
    { name: 'Ezra', initial: 'E', selected: true },
    { name: 'Mira', initial: 'M' },
  ];
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border p-4" style={{ background: `${PANEL}66`, borderColor: `${TEAL}33` }}>
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: MUTED }}>
          Invite tribe member
        </p>
        <div className="space-y-2">
          {members.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3 p-2.5 rounded-lg border"
              style={{
                background: m.selected ? `${TEAL}1A` : 'transparent',
                borderColor: m.selected ? `${TEAL}66` : `${TEAL}1A`,
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-semibold"
                style={{ background: `${TEAL}33`, color: TEXT }}
              >
                {m.initial}
              </div>
              <span className="flex-1 text-sm" style={{ color: TEXT }}>{m.name}</span>
              {m.selected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, type: 'spring' }}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: TEAL }}
                >
                  <Check className="w-3.5 h-3.5" style={{ color: BG }} />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-3 text-center text-xs px-3 py-2 rounded-full inline-block w-full"
          style={{ background: `${EMBER}1A`, color: EMBER }}
        >
          Room key sent to Ezra
        </motion.div>
      </div>
    </motion.div>
  );
}

function Step3Scene() {
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md">
      <div className="rounded-xl border overflow-hidden" style={{ background: `${PANEL}66`, borderColor: `${TEAL}33` }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: `${TEAL}1A` }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: TEAL }} />
          <span className="text-sm" style={{ color: TEXT, fontFamily: '"Fraunces", serif' }}>Ezra</span>
          <span className="text-[10px] uppercase tracking-wider ml-auto" style={{ color: MUTED }}>here now</span>
        </div>
        <div className="p-4 space-y-2.5 min-h-[180px]">
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="max-w-[75%] px-3 py-2 rounded-2xl rounded-tl-sm text-sm"
            style={{ background: `${TEAL}1A`, color: TEXT }}
          >
            Hey, ready to talk?
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
            className="ml-auto max-w-[75%] px-3 py-2 rounded-2xl rounded-tr-sm flex items-center gap-2"
            style={{ background: TEAL, color: BG }}
          >
            <Mic className="w-3.5 h-3.5" />
            <div className="flex items-end gap-0.5 h-4">
              {[6, 12, 8, 14, 10, 7, 11].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 2 }}
                  animate={{ height: h }}
                  transition={{ delay: 1 + i * 0.05 }}
                  className="w-0.5 rounded"
                  style={{ background: BG }}
                />
              ))}
            </div>
            <span className="text-xs">0:08</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }}
            className="max-w-[55%] rounded-xl overflow-hidden border"
            style={{ borderColor: `${TEAL}33` }}
          >
            <div className="aspect-video flex items-center justify-center" style={{ background: `${EMBER}1A` }}>
              <Video className="w-6 h-6" style={{ color: EMBER }} />
            </div>
          </motion.div>
        </div>
        <div className="px-4 py-3 border-t flex items-center gap-2" style={{ borderColor: `${TEAL}1A`, background: `${BG}80` }}>
          <div className="flex-1 px-3 py-1.5 rounded-full text-xs" style={{ background: `${TEAL}14`, color: MUTED }}>
            Message…
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: TEAL }}>
            <Send className="w-3.5 h-3.5" style={{ color: BG }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Step4Scene() {
  return (
    <motion.div {...sceneAnim} className="w-full max-w-md text-center">
      <div className="rounded-xl border p-6" style={{ background: `${PANEL}66`, borderColor: `${TEAL}33` }}>
        <div className="flex items-center justify-center gap-3 mb-5">
          <Avatar label="You" />
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="text-xs uppercase tracking-wider"
            style={{ color: TEAL }}
          >
            connecting
          </motion.div>
          <Avatar label="Ezra" ember />
        </div>
        <motion.button
          initial={{ scale: 0.9 }}
          animate={{ scale: [1, 1.06, 1], boxShadow: [`0 0 0 0 ${EMBER}80`, `0 0 0 18px ${EMBER}00`, `0 0 0 0 ${EMBER}00`] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="mx-auto flex items-center gap-2 px-5 py-3 rounded-full font-medium"
          style={{ background: EMBER, color: BG }}
        >
          <Phone className="w-4 h-4" /> Start live call
        </motion.button>
        <p className="text-xs mt-4" style={{ color: MUTED }}>
          Tap the call button for live voice or video.
        </p>
      </div>
    </motion.div>
  );
}

function Avatar({ label, ember = false }: { label: string; ember?: boolean }) {
  const color = ember ? EMBER : TEAL;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center font-semibold"
        style={{ background: `${color}33`, color: TEXT, border: `2px solid ${color}` }}
      >
        {label[0]}
      </div>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>{label}</span>
    </div>
  );
}

function OutroScene() {
  return (
    <motion.div {...sceneAnim} className="text-center">
      <h3
        className="text-3xl sm:text-4xl mb-3"
        style={{ fontFamily: '"Fraunces", serif', fontWeight: 500, color: TEXT }}
      >
        Private. Secure.
      </h3>
      <p className="text-base" style={{ color: EMBER, fontFamily: '"Fraunces", serif' }}>
        Built for real connection.
      </p>
    </motion.div>
  );
}
