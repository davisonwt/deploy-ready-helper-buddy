import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';
import type { ExplainerConfig, SegmentId } from './types';

interface Props {
  config: ExplainerConfig;
}

interface Boundary {
  id: SegmentId;
  start: number;
  end: number;
}

function buildTimeline(config: ExplainerConfig, duration: number): Boundary[] {
  const total = config.segments.reduce((s, x) => s + x.weight, 0);
  let acc = 0;
  return config.segments.map((seg) => {
    const start = (acc / total) * duration;
    acc += seg.weight;
    const end = (acc / total) * duration;
    return { id: seg.id, start, end };
  });
}

function currentSegment(boundaries: Boundary[], t: number): Boundary {
  return boundaries.find((b) => t >= b.start && t < b.end) ?? boundaries[boundaries.length - 1];
}

const STEP_LABELS: Record<SegmentId, { num: number | null; word: string | null }> = {
  intro: { num: null, word: null },
  step1: { num: 1, word: 'one' },
  step2: { num: 2, word: 'two' },
  step3: { num: 3, word: 'three' },
  step4: { num: 4, word: 'four' },
  outro: { num: null, word: null },
};

function fmt(s: number) {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export default function ExplainerPlayer({ config }: Props) {
  const { theme, voUrl, estDuration } = config;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(estDuration);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onLoaded = () => setDuration(a.duration || estDuration);
    const onEnded = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onLoaded);
    a.addEventListener('ended', onEnded);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onLoaded);
      a.removeEventListener('ended', onEnded);
    };
  }, [estDuration]);

  const boundaries = useMemo(() => buildTimeline(config, duration), [config, duration]);
  const seg = currentSegment(boundaries, time);
  const segConfig = config.segments.find((s) => s.id === seg.id) ?? config.segments[0];
  const SceneComp = segConfig.Scene;
  const progress = Math.min(100, (time / duration) * 100);
  const label = STEP_LABELS[seg.id];

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

  return (
    <div className="w-full">
      <audio ref={audioRef} src={voUrl} preload="auto" />

      <div
        className="relative w-full overflow-hidden rounded-2xl border"
        style={{ aspectRatio: '16 / 9', background: theme.bg, borderColor: `${theme.accent}33` }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(60% 60% at 30% 30%, ${theme.accent}1A 0%, transparent 60%), radial-gradient(50% 50% at 80% 80%, ${theme.ember}14 0%, transparent 60%)`,
          }}
        />

        <AnimatePresence mode="wait">
          {label.num !== null && (
            <motion.div
              key={`badge-${seg.id}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.35 }}
              className="absolute top-4 left-4 z-20 flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold"
                style={{ background: theme.accent, color: theme.bg, fontFamily: theme.font }}
              >
                {label.num}
              </div>
              <span className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.muted }}>
                Step {label.word}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-10">
          <AnimatePresence mode="wait">
            <SceneComp key={seg.id} />
          </AnimatePresence>
        </div>

        <div className="absolute left-0 right-0 bottom-0 h-1" style={{ background: `${theme.accent}1A` }}>
          <div
            className="h-full transition-[width] duration-150"
            style={{ width: `${progress}%`, background: theme.accent }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors"
          style={{ background: theme.accent, color: theme.bg }}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {playing ? 'Pause' : time > 0 ? 'Resume' : 'Play walkthrough'}
        </button>
        <button
          onClick={restart}
          className="flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors"
          style={{ background: 'transparent', color: theme.muted, border: `1px solid ${theme.accent}33` }}
        >
          <RotateCcw className="w-4 h-4" /> Restart
        </button>
        <span className="ml-auto text-xs tabular-nums" style={{ color: theme.muted }}>
          {fmt(time)} / {fmt(duration)}
        </span>
      </div>
    </div>
  );
}

export const sceneAnim = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};
