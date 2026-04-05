import { AbsoluteFill, Sequence, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { TitleScene } from "../components/TitleScene";
import { ClosingScene } from "../components/ClosingScene";
import { AnimatedText } from "../components/AnimatedText";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

const WaveBar: React.FC<{ delay: number; x: number; color: string }> = ({ delay, x, color }) => {
  const frame = useCurrentFrame();
  const h = 40 + Math.sin((frame - delay) / 6) * 35 + Math.cos((frame - delay) / 9) * 20;
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", left: x, bottom: 420,
      width: 12, height: Math.max(8, h), background: color,
      borderRadius: 6, opacity, transformOrigin: "bottom",
    }} />
  );
};

const RadioStation: React.FC<{ name: string; genre: string; emoji: string; delay: number; x: number; y: number }> = ({ name, genre, emoji, delay, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      transform: `translateX(${interpolate(s, [0, 1], [100, 0])}px)`,
      opacity: interpolate(s, [0, 1], [0, 1]),
      background: "white", borderRadius: 20, padding: "20px 28px", display: "flex", alignItems: "center", gap: 16,
      boxShadow: "0 6px 24px rgba(0,0,0,0.06)", width: 360,
    }}>
      <div style={{ fontSize: 40 }}>{emoji}</div>
      <div>
        <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 18, color: "#2C5F2D" }}>{name}</div>
        <div style={{ fontFamily: inter, fontSize: 13, color: "#999" }}>{genre}</div>
      </div>
    </div>
  );
};

export const Video06Radio: React.FC = () => {
  const colors = ["#B85042", "#2C5F2D", "#D4A843", "#B85042", "#2C5F2D"];
  return (
    <AbsoluteFill>
      <BrandBackground variant="warm" />
      <Sequence from={0} durationInFrames={80}>
        <TitleScene emoji="📻" title="Radio & Music" subtitle="Grove Station Radio · 364 TTT" />
      </Sequence>
      <Sequence from={80} durationInFrames={430}>
        <AbsoluteFill>
          <AnimatedText text="Tune In to the Community" delay={0} size={40} x={160} y={60} />
          {Array.from({ length: 40 }).map((_, i) => (
            <WaveBar key={i} delay={10 + i * 2} x={200 + i * 36} color={colors[i % colors.length]} />
          ))}
          <RadioStation emoji="🎵" name="Grove Station Radio" genre="Community radio · Live" delay={30} x={160} y={560} />
          <RadioStation emoji="🎶" name="364 TTT" genre="Music · Praise · Worship" delay={45} x={600} y={600} />
          <RadioStation emoji="🎙️" name="Live Sessions" genre="Interviews · Discussions" delay={60} x={1040} y={560} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={510} durationInFrames={90}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
