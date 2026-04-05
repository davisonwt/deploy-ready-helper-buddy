import { AbsoluteFill, Sequence, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { TitleScene } from "../components/TitleScene";
import { ClosingScene } from "../components/ClosingScene";
import { AnimatedText } from "../components/AnimatedText";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

const ClassCard: React.FC<{ title: string; instructor: string; emoji: string; delay: number; x: number; y: number }> = ({ title, instructor, emoji, delay, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      transform: `scale(${interpolate(s, [0, 1], [0.6, 1])})`,
      opacity: interpolate(s, [0, 1], [0, 1]),
      background: "white", borderRadius: 24, padding: 28, width: 340,
      boxShadow: "0 10px 36px rgba(0,0,0,0.08)",
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 20, color: "#2C5F2D" }}>{title}</div>
      <div style={{ fontFamily: inter, fontSize: 14, color: "#999", marginTop: 6 }}>by {instructor}</div>
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <div style={{ background: "#2C5F2D22", color: "#2C5F2D", fontFamily: inter, fontSize: 12, padding: "6px 14px", borderRadius: 10 }}>🔴 Live</div>
        <div style={{ background: "#D4A84322", color: "#D4A843", fontFamily: inter, fontSize: 12, padding: "6px 14px", borderRadius: 10 }}>Free</div>
      </div>
    </div>
  );
};

export const Video07Training: React.FC = () => (
  <AbsoluteFill>
    <BrandBackground variant="cool" />
    <Sequence from={0} durationInFrames={80}>
      <TitleScene emoji="🎓" title="Training & Classrooms" subtitle="Learn, teach & grow together" />
    </Sequence>
    <Sequence from={80} durationInFrames={430}>
      <AbsoluteFill>
        <AnimatedText text="Live Learning Sessions" delay={0} size={42} x={160} y={60} />
        <ClassCard emoji="🌱" title="Organic Farming 101" instructor="Sower Ruth" delay={15} x={120} y={200} />
        <ClassCard emoji="🧵" title="Crafts & Weaving" instructor="Sower Miriam" delay={30} x={540} y={250} />
        <ClassCard emoji="💻" title="Digital Skills" instructor="Sower David" delay={45} x={960} y={200} />
        <ClassCard emoji="📖" title="Torah Study" instructor="Elder Abraham" delay={60} x={1380} y={250} />
        <AnimatedText text="Join live classrooms with whiteboards, video & chat" delay={90} size={24} color="#666" font="body" weight={400} x={160} y={780} />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={510} durationInFrames={90}>
      <ClosingScene />
    </Sequence>
  </AbsoluteFill>
);
