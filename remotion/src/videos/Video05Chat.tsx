import { AbsoluteFill, Sequence, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { TitleScene } from "../components/TitleScene";
import { ClosingScene } from "../components/ClosingScene";
import { AnimatedText } from "../components/AnimatedText";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

const ChatBubble: React.FC<{ text: string; isMe: boolean; delay: number; y: number }> = ({ text, isMe, delay, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  return (
    <div style={{
      position: "absolute", left: isMe ? undefined : 200, right: isMe ? 200 : undefined, top: y,
      transform: `scale(${interpolate(s, [0, 1], [0.5, 1])})`,
      opacity: interpolate(s, [0, 1], [0, 1]),
      background: isMe ? "#2C5F2D" : "white", color: isMe ? "white" : "#333",
      borderRadius: 20, padding: "16px 24px", maxWidth: 420,
      fontFamily: inter, fontSize: 18,
      boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
    }}>
      {text}
    </div>
  );
};

const FeatureIcon: React.FC<{ emoji: string; label: string; delay: number; x: number; y: number }> = ({ emoji, label, delay, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 10 } });
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      transform: `scale(${interpolate(s, [0, 1], [0, 1])})`,
      opacity: interpolate(s, [0, 1], [0, 1]),
      textAlign: "center",
    }}>
      <div style={{ fontSize: 48, background: "white", borderRadius: 20, width: 80, height: 80, display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "0 6px 20px rgba(0,0,0,0.06)" }}>{emoji}</div>
      <div style={{ fontFamily: inter, fontSize: 13, color: "#555", marginTop: 8 }}>{label}</div>
    </div>
  );
};

export const Video05Chat: React.FC = () => (
  <AbsoluteFill>
    <BrandBackground variant="dark" />
    <Sequence from={0} durationInFrames={80}>
      <TitleScene emoji="💬" title="ChatApp" subtitle="Voice, video & messaging — all in one" />
    </Sequence>
    <Sequence from={80} durationInFrames={430}>
      <AbsoluteFill>
        <AnimatedText text="Stay Connected" delay={0} size={42} x={160} y={60} color="#E7E8D1" />
        <ChatBubble text="Shalom! Is the olive oil still available? 🫒" isMe={false} delay={10} y={180} />
        <ChatBubble text="Yes! I'll prepare it for collection 🌿" isMe={true} delay={25} y={270} />
        <ChatBubble text="Amazing, thank you! Sending bestowal now 💛" isMe={false} delay={40} y={360} />
        <FeatureIcon emoji="📞" label="Voice Call" delay={60} x={1200} y={200} />
        <FeatureIcon emoji="📹" label="Video Call" delay={70} x={1350} y={200} />
        <FeatureIcon emoji="👥" label="Group Chat" delay={80} x={1200} y={350} />
        <FeatureIcon emoji="📎" label="File Share" delay={90} x={1350} y={350} />
        <FeatureIcon emoji="🔔" label="Notifications" delay={100} x={1275} y={500} />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={510} durationInFrames={90}>
      <ClosingScene />
    </Sequence>
  </AbsoluteFill>
);
