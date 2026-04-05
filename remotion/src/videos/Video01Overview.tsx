import { AbsoluteFill, Sequence } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { TitleScene } from "../components/TitleScene";
import { ClosingScene } from "../components/ClosingScene";
import { FeatureCard } from "../components/FeatureCard";
import { AnimatedText } from "../components/AnimatedText";

export const Video01Overview: React.FC = () => (
  <AbsoluteFill>
    <BrandBackground variant="warm" />
    <Sequence from={0} durationInFrames={90}>
      <TitleScene emoji="🌱" title="Welcome to SOW2GROW" subtitle="A community-driven, chat-first marketplace" />
    </Sequence>
    <Sequence from={90} durationInFrames={420}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <AnimatedText text="Everything your community needs" delay={0} size={44} color="#2C5F2D" />
        <AnimatedText text="In one place" delay={15} size={32} color="#B85042" font="body" weight={500} />
        <FeatureCard emoji="🛒" label="Marketplace" delay={30} x={200} y={350} />
        <FeatureCard emoji="💬" label="ChatApp" delay={40} x={500} y={320} color="#B85042" />
        <FeatureCard emoji="🚗" label="Gig Services" delay={50} x={800} y={350} />
        <FeatureCard emoji="📻" label="Radio" delay={60} x={1100} y={320} color="#D4A843" />
        <FeatureCard emoji="🏡" label="Stays" delay={70} x={1400} y={350} />
        <FeatureCard emoji="📅" label="Calendar" delay={80} x={350} y={580} color="#B85042" />
        <FeatureCard emoji="🎓" label="Training" delay={90} x={650} y={610} />
        <FeatureCard emoji="💰" label="Wallet" delay={100} x={950} y={580} color="#D4A843" />
        <FeatureCard emoji="🤖" label="AI Tools" delay={110} x={1250} y={610} />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={510} durationInFrames={90}>
      <ClosingScene />
    </Sequence>
  </AbsoluteFill>
);
