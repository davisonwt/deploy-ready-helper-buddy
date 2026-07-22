import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from "remotion";
import { loadFont } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadOutfit } from "@remotion/google-fonts/Outfit";

loadFont("normal", { weights: ["500", "700"], subsets: ["latin"] });
loadOutfit("normal", { weights: ["400", "600"], subsets: ["latin"] });

const TEAL = "#1FB6A8";
const TEXT = "#EAF4F2";
const MUTED = "#7E9498";

export function Scene1Hook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const subtitleProgress = spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 120 } });
  const tagProgress = spring({ frame: frame - 40, fps, config: { damping: 20, stiffness: 120 } });

  const titleY = interpolate(titleProgress, [0, 1], [40, 0]);
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <div
        style={{
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: 22,
            textTransform: "uppercase",
            letterSpacing: "0.35em",
            color: TEAL,
            marginBottom: 28,
            opacity: tagProgress,
          }}
        >
          Introducing
        </p>
        <h1
          style={{
            fontFamily: '"Fraunces", serif',
            fontSize: 96,
            fontWeight: 700,
            color: TEXT,
            lineHeight: 1.1,
            margin: 0,
            marginBottom: 24,
          }}
        >
          Sow2Grow
        </h1>
        <p
          style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: 32,
            color: MUTED,
            maxWidth: 800,
            lineHeight: 1.4,
            opacity: subtitleProgress,
          }}
        >
          What if your community could fund itself?
        </p>
      </div>
    </AbsoluteFill>
  );
}
