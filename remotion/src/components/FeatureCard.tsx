import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

interface Props {
  emoji: string;
  label: string;
  delay: number;
  x?: number;
  y?: number;
  color?: string;
}

export const FeatureCard: React.FC<Props> = ({ emoji, label, delay, x = 0, y = 0, color = "#2C5F2D" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
  const scale = interpolate(s, [0, 1], [0.3, 1]);
  const opacity = interpolate(s, [0, 1], [0, 1]);

  return (
    <div style={{
      position: "absolute", left: x, top: y,
      transform: `scale(${scale})`, opacity,
      background: "white", borderRadius: 20, padding: "24px 32px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      border: `2px solid ${color}22`,
    }}>
      <div style={{ fontSize: 48 }}>{emoji}</div>
      <div style={{ fontFamily: inter, fontSize: 18, fontWeight: 600, color, textAlign: "center", maxWidth: 140 }}>{label}</div>
    </div>
  );
};
