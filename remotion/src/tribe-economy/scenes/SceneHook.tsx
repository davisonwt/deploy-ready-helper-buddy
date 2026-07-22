import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from "remotion";
import { loadFont } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";

loadFont("normal", { weights: ["500", "700"], subsets: ["latin"] });
loadOutfit("normal", { weights: ["400", "600"], subsets: ["latin"] });

const TEAL = "#1FB6A8";
const TEXT = "#EAF4F2";
const MUTED = "#7E9498";
const GOLD = "#F5A623";

export function SceneHook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrow = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const title = spring({ frame: frame - 15, fps, config: { damping: 20, stiffness: 120 } });
  const sub = spring({ frame: frame - 45, fps, config: { damping: 20, stiffness: 120 } });

  const titleY = interpolate(title, [0, 1], [40, 0]);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "0 160px",
      }}
    >
      <p
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: 22,
          textTransform: "uppercase",
          letterSpacing: "0.4em",
          color: TEAL,
          marginBottom: 28,
          opacity: eyebrow,
        }}
      >
        The Tribe Economy
      </p>
      <h1
        style={{
          fontFamily: '"Fraunces", serif',
          fontSize: 128,
          fontWeight: 700,
          color: TEXT,
          lineHeight: 1.02,
          margin: 0,
          marginBottom: 32,
          maxWidth: 1400,
          transform: `translateY(${titleY}px)`,
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        Value that <span style={{ color: GOLD, fontStyle: "italic" }}>circles back</span>.
      </h1>
      <p
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: 32,
          color: MUTED,
          maxWidth: 900,
          lineHeight: 1.4,
          margin: 0,
          opacity: sub,
        }}
      >
        In 60 seconds — how Sow2Grow keeps the money inside the tribe.
      </p>
    </AbsoluteFill>
  );
}
