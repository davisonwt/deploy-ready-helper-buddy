import { AbsoluteFill, Sequence, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { TitleScene } from "../components/TitleScene";
import { ClosingScene } from "../components/ClosingScene";
import { AnimatedText } from "../components/AnimatedText";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

const AIChatMessage: React.FC<{ text: string; isAI: boolean; delay: number; y: number }> = ({ text, isAI, delay, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14 } });

  const chars = text.split("");
  const visibleChars = isAI ? Math.min(chars.length, Math.max(0, Math.floor((frame - delay - 10) * 1.5))) : chars.length;

  return (
    <div style={{
      position: "absolute", left: isAI ? 160 : undefined, right: isAI ? undefined : 160, top: y,
      transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
      opacity: interpolate(s, [0, 1], [0, 1]),
      background: isAI ? "linear-gradient(135deg, #2C5F2D, #3a7a3a)" : "white",
      color: isAI ? "white" : "#333",
      borderRadius: 20, padding: "18px 28px", maxWidth: 600,
      fontFamily: inter, fontSize: 18,
      boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
    }}>
      {isAI && <span style={{ fontSize: 14, opacity: 0.7, marginRight: 8 }}>✨ AI</span>}
      {isAI ? chars.slice(0, visibleChars).join("") : text}
      {isAI && visibleChars < chars.length && <span style={{ opacity: 0.5 }}>▊</span>}
    </div>
  );
};

const ToolCard: React.FC<{ emoji: string; label: string; delay: number; x: number; y: number }> = ({ emoji, label, delay, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 10 } });
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      transform: `scale(${interpolate(s, [0, 1], [0, 1])})`,
      background: "white", borderRadius: 16, padding: "16px 24px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <span style={{ fontSize: 28 }}>{emoji}</span>
      <span style={{ fontFamily: inter, fontSize: 15, fontWeight: 600, color: "#2C5F2D" }}>{label}</span>
    </div>
  );
};

export const Video10AI: React.FC = () => (
  <AbsoluteFill>
    <BrandBackground variant="dark" />
    <Sequence from={0} durationInFrames={80}>
      <TitleScene emoji="🤖" title="AI Assistant & Tools" subtitle="AI-powered features for your community" />
    </Sequence>
    <Sequence from={80} durationInFrames={430}>
      <AbsoluteFill>
        <AnimatedText text="Your AI-Powered Assistant" delay={0} size={42} x={160} y={50} color="#E7E8D1" />
        <AIChatMessage text="Write a product description for my honey" isAI={false} delay={10} y={160} />
        <AIChatMessage text="Here's a compelling description for your artisan honey: 'Pure, raw & harvested with love from the heart of the community...'" isAI={true} delay={25} y={260} />
        <ToolCard emoji="📝" label="Content Generator" delay={70} x={1100} y={160} />
        <ToolCard emoji="🎨" label="Ad Creator" delay={80} x={1100} y={240} />
        <ToolCard emoji="🎤" label="Voiceover AI" delay={90} x={1100} y={320} />
        <ToolCard emoji="📊" label="Analytics" delay={100} x={1100} y={400} />
        <ToolCard emoji="🖼️" label="Image Gen" delay={110} x={1100} y={480} />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={510} durationInFrames={90}>
      <ClosingScene />
    </Sequence>
  </AbsoluteFill>
);
