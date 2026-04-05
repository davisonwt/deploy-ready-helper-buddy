import { AbsoluteFill, Sequence, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { TitleScene } from "../components/TitleScene";
import { ClosingScene } from "../components/ClosingScene";
import { AnimatedText } from "../components/AnimatedText";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

const WalletCard: React.FC<{ label: string; value: string; emoji: string; delay: number; x: number; y: number; accent: string }> = ({ label, value, emoji, delay, x, y, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px)`,
      opacity: interpolate(s, [0, 1], [0, 1]),
      background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, borderRadius: 24, padding: 32, width: 320,
      boxShadow: "0 12px 40px rgba(0,0,0,0.15)", color: "white",
    }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontFamily: inter, fontSize: 14, opacity: 0.8 }}>{label}</div>
      <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 36, marginTop: 4 }}>{value}</div>
    </div>
  );
};

const FlowStep: React.FC<{ text: string; num: number; delay: number; x: number; y: number }> = ({ text, num, delay, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      transform: `scale(${interpolate(s, [0, 1], [0.5, 1])})`,
      opacity: interpolate(s, [0, 1], [0, 1]),
      display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{ background: "#2C5F2D", color: "white", width: 36, height: 36, borderRadius: 18, display: "flex", justifyContent: "center", alignItems: "center", fontFamily: inter, fontWeight: 700, fontSize: 16 }}>{num}</div>
      <div style={{ fontFamily: inter, fontSize: 18, color: "#333" }}>{text}</div>
    </div>
  );
};

export const Video09Wallet: React.FC = () => (
  <AbsoluteFill>
    <BrandBackground variant="dark" />
    <Sequence from={0} durationInFrames={80}>
      <TitleScene emoji="💰" title="GoSat Wallet" subtitle="Tithing, earnings & financial tools" />
    </Sequence>
    <Sequence from={80} durationInFrames={430}>
      <AbsoluteFill>
        <AnimatedText text="Your Financial Hub" delay={0} size={42} x={160} y={60} color="#E7E8D1" />
        <WalletCard emoji="💳" label="Balance" value="$1,240.00" delay={10} x={160} y={180} accent="#2C5F2D" />
        <WalletCard emoji="🌾" label="Tithe Given" value="$124.00" delay={25} x={560} y={220} accent="#B85042" />
        <WalletCard emoji="📈" label="Earnings" value="$860.00" delay={40} x={960} y={180} accent="#D4A843" />
        <FlowStep text="Sower makes a bestowal" num={1} delay={70} x={160} y={560} />
        <FlowStep text="10% tithe auto-allocated" num={2} delay={80} x={160} y={620} />
        <FlowStep text="5% admin fee deducted" num={3} delay={90} x={160} y={680} />
        <FlowStep text="Sower receives 85%" num={4} delay={100} x={160} y={740} />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={510} durationInFrames={90}>
      <ClosingScene />
    </Sequence>
  </AbsoluteFill>
);
