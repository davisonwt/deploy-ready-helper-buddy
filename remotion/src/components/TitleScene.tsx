import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: playfair } = loadPlayfair();
const { fontFamily: inter } = loadInter();

const TERRACOTTA = "#B85042";
const FOREST = "#2C5F2D";
const OCHRE = "#D4A843";

export const TitleScene: React.FC<{ emoji: string; title: string; subtitle: string }> = ({ emoji, title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const emojiScale = spring({ frame, fps, config: { damping: 8, stiffness: 120 } });
  const titleY = interpolate(spring({ frame: frame - 8, fps, config: { damping: 20 } }), [0, 1], [60, 0]);
  const titleOp = interpolate(frame, [8, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [18, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subY = interpolate(spring({ frame: frame - 18, fps, config: { damping: 20 } }), [0, 1], [40, 0]);

  const lineW = interpolate(spring({ frame: frame - 12, fps, config: { damping: 15 } }), [0, 1], [0, 200]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 80, transform: `scale(${emojiScale})`, marginBottom: 20 }}>{emoji}</div>
        <h1 style={{ fontFamily: playfair, fontSize: 72, color: FOREST, fontWeight: 700, transform: `translateY(${titleY}px)`, opacity: titleOp, margin: 0, lineHeight: 1.1 }}>
          {title}
        </h1>
        <div style={{ width: lineW, height: 4, background: `linear-gradient(90deg, ${TERRACOTTA}, ${OCHRE})`, margin: "20px auto", borderRadius: 2 }} />
        <p style={{ fontFamily: inter, fontSize: 28, color: "#666", opacity: subOp, transform: `translateY(${subY}px)`, margin: 0 }}>
          {subtitle}
        </p>
      </div>
    </AbsoluteFill>
  );
};
