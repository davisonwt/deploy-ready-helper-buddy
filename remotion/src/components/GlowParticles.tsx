import { useCurrentFrame, useVideoConfig } from "remotion";

/** Drifting golden particles for the warm S2G glow aesthetic. */
export const GlowParticles: React.FC<{ count?: number; color?: string }> = ({ count = 40, color = "#FFD78A" }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const particles = Array.from({ length: count }).map((_, i) => {
    const seed = (i * 9301 + 49297) % 233280 / 233280;
    const x = (seed * width + frame * (1 + seed * 1.5)) % width;
    const yBase = ((i * 137) % height);
    const y = yBase + Math.sin((frame + i * 30) / 40) * 30;
    const size = 4 + (seed * 8);
    const op = 0.3 + Math.sin((frame + i * 20) / 30) * 0.3;
    return (
      <div key={i} style={{
        position: "absolute", left: x, top: y,
        width: size, height: size, borderRadius: "50%",
        background: color, opacity: Math.max(0, op),
        boxShadow: `0 0 ${size * 3}px ${color}`,
      }} />
    );
  });

  return <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{particles}</div>;
};
