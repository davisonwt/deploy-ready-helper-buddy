import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";
import { PersistentBackground } from "../components/PersistentBackground";
import { Motif } from "./Motifs";
import type { HookScript } from "./scripts";
import timings from "./timings.json";

loadFont("normal", { weights: ["700"], subsets: ["latin"] });
loadOutfit("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });

export const TEAL = "#1FB6A8";
export const GOLD = "#F5A623";
export const TEXT = "#EAF4F2";
export const MUTED = "#7E9498";

type Beat = { from: number; durationInFrames: number };
type Timing = { audio: string; beats: Beat[]; durationInFrames: number };

export const TIMINGS = timings as Record<string, Timing>;

/** Opening claim: slams in huge, settles smaller so the motif owns the middle. */
function HookCard({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame, fps, config: { damping: 18, stiffness: 170 } });
  const settle = interpolate(frame, [48, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const size = interpolate(settle, [0, 1], [104, 62]);
  const color = settle > 0.5 ? MUTED : TEXT;

  return (
    <div
      style={{
        transform: `scale(${interpolate(inS, [0, 1], [0.84, 1])})`,
        opacity: interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" }),
        textAlign: "center",
        whiteSpace: "pre-line",
        fontFamily: '"Outfit", sans-serif',
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: "-0.02em",
        color,
      }}
    >
      {text}
    </div>
  );
}

function Caption({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inS = spring({ frame, fps, config: { damping: 22, stiffness: 190 } });
  const out = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const drift = interpolate(frame, [0, durationInFrames], [0, -8]);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        opacity: Math.min(inS, out),
        transform: `translateY(${interpolate(inS, [0, 1], [24, 0]) + drift}px)`,
        textAlign: "center",
        fontFamily: '"Outfit", sans-serif',
        fontWeight: 600,
        fontSize: 58,
        lineHeight: 1.2,
        color: TEXT,
        textShadow: "0 6px 30px rgba(0,0,0,0.85)",
      }}
    >
      {text}
    </div>
  );
}

function Lockup({ start }: { start: number }) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, start + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ opacity: p, textAlign: "center", transform: `translateY(${(1 - p) * 18}px)` }}>
      <div
        style={{
          fontFamily: '"Fraunces", serif',
          fontWeight: 700,
          fontSize: 72,
          color: TEXT,
          letterSpacing: "-0.01em",
        }}
      >
        Sow<span style={{ color: GOLD }}>2</span>Grow
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: '"Outfit", sans-serif',
          fontSize: 30,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: TEAL,
        }}
      >
        sow2growapp.com · $5/mo
      </div>
    </div>
  );
}

export function HookClip({ script }: { script: HookScript }) {
  const t = TIMINGS[script.id];
  const lockupStart = Math.max(0, t.durationInFrames - 110);

  return (
    <AbsoluteFill>
      <PersistentBackground />
      <Audio src={staticFile(t.audio)} volume={1} />

      <AbsoluteFill
        style={{
          boxSizing: "border-box",
          padding: "170px 60px 120px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Claim */}
        <div style={{ height: 260, display: "flex", alignItems: "center" }}>
          <HookCard text={script.hookCard} />
        </div>

        {/* Motif */}
        <div
          style={{
            flex: 1,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Motif kind={script.motif} beats={t.beats} />
        </div>

        {/* Burned-in captions */}
        <div style={{ position: "relative", width: "100%", height: 300 }}>
          {script.lines.map((line, i) => (
            <Sequence
              key={i}
              from={t.beats[i].from}
              durationInFrames={t.beats[i].durationInFrames}
              layout="none"
            >
              <Caption text={line} />
            </Sequence>
          ))}
        </div>

        {/* Lockup */}
        <div style={{ height: 190, display: "flex", alignItems: "flex-end" }}>
          <Lockup start={lockupStart} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
