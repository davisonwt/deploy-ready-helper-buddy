import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

const TERRACOTTA = "#B85042";
const FOREST = "#2C5F2D";
const CREAM = "#E7E8D1";
const NAVY = "#001f3f";

export const BrandBackground: React.FC<{ variant?: "warm" | "cool" | "dark" }> = ({ variant = "warm" }) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 600], [0, 30]);

  const gradients: Record<string, string> = {
    warm: `radial-gradient(ellipse at ${50 + drift * 0.3}% ${40 + Math.sin(frame / 60) * 10}%, ${TERRACOTTA}33 0%, transparent 60%), linear-gradient(135deg, ${CREAM} 0%, #f5efe0 50%, ${CREAM} 100%)`,
    cool: `radial-gradient(ellipse at ${50 + drift * 0.3}% ${40 + Math.sin(frame / 60) * 10}%, ${FOREST}33 0%, transparent 60%), linear-gradient(135deg, ${CREAM} 0%, #e8eed8 50%, ${CREAM} 100%)`,
    dark: `radial-gradient(ellipse at ${50 + drift * 0.3}% ${40 + Math.sin(frame / 60) * 10}%, ${TERRACOTTA}22 0%, transparent 60%), linear-gradient(135deg, ${NAVY} 0%, #0a1628 50%, ${NAVY} 100%)`,
  };

  return <AbsoluteFill style={{ background: gradients[variant] }} />;
};
