import { AbsoluteFill, Sequence, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { TitleScene } from "../components/TitleScene";
import { ClosingScene } from "../components/ClosingScene";
import { AnimatedText } from "../components/AnimatedText";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

const StayCard: React.FC<{ name: string; loc: string; price: string; emoji: string; delay: number; x: number; y: number }> = ({ name, loc, price, emoji, delay, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      transform: `translateY(${interpolate(s, [0, 1], [80, 0])}px)`,
      opacity: interpolate(s, [0, 1], [0, 1]),
      background: "white", borderRadius: 24, overflow: "hidden", width: 320,
      boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
    }}>
      <div style={{ height: 160, background: `linear-gradient(135deg, #2C5F2D33, #D4A84333)`, display: "flex", justifyContent: "center", alignItems: "center", fontSize: 72 }}>{emoji}</div>
      <div style={{ padding: 24 }}>
        <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 20, color: "#2C5F2D" }}>{name}</div>
        <div style={{ fontFamily: inter, fontSize: 14, color: "#999", marginTop: 4 }}>📍 {loc}</div>
        <div style={{ fontFamily: inter, fontSize: 18, color: "#B85042", fontWeight: 600, marginTop: 12 }}>{price} /night</div>
      </div>
    </div>
  );
};

export const Video04Stays: React.FC = () => (
  <AbsoluteFill>
    <BrandBackground variant="cool" />
    <Sequence from={0} durationInFrames={80}>
      <TitleScene emoji="🏡" title="The Wandering Pillow" subtitle="Community holiday stays & experiences" />
    </Sequence>
    <Sequence from={80} durationInFrames={430}>
      <AbsoluteFill>
        <AnimatedText text="Discover Unique Stays" delay={0} size={42} x={160} y={60} />
        <StayCard emoji="🏡" name="Mountain Retreat" loc="Cape Winelands" price="$65" delay={15} x={120} y={200} />
        <StayCard emoji="🌊" name="Coastal Cottage" loc="Garden Route" price="$80" delay={30} x={520} y={240} />
        <StayCard emoji="🌿" name="Forest Lodge" loc="Knysna" price="$55" delay={45} x={920} y={200} />
        <StayCard emoji="⛺" name="Bush Camp" loc="Kruger Area" price="$40" delay={60} x={1320} y={240} />
        <AnimatedText text="Book community-hosted stays across South Africa" delay={90} size={24} color="#666" font="body" weight={400} x={160} y={780} />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={510} durationInFrames={90}>
      <ClosingScene />
    </Sequence>
  </AbsoluteFill>
);
