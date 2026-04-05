import { AbsoluteFill, Sequence, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { TitleScene } from "../components/TitleScene";
import { ClosingScene } from "../components/ClosingScene";
import { AnimatedText } from "../components/AnimatedText";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();
const TERRACOTTA = "#B85042";
const FOREST = "#2C5F2D";

const ProductCard: React.FC<{ name: string; price: string; emoji: string; delay: number; x: number; y: number }> = ({ name, price, emoji, delay, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      transform: `scale(${interpolate(s, [0, 1], [0.5, 1])}) rotate(${interpolate(s, [0, 1], [-5, 0])}deg)`,
      opacity: interpolate(s, [0, 1], [0, 1]),
      background: "white", borderRadius: 24, padding: 28, width: 260,
      boxShadow: "0 12px 40px rgba(0,0,0,0.08)", textAlign: "center",
    }}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 20, color: FOREST }}>{name}</div>
      <div style={{ fontFamily: inter, fontSize: 16, color: TERRACOTTA, marginTop: 6 }}>{price}</div>
      <div style={{ marginTop: 16, background: FOREST, color: "white", fontFamily: inter, fontSize: 13, padding: "8px 20px", borderRadius: 12, display: "inline-block" }}>Add to Basket 🧺</div>
    </div>
  );
};

export const Video02Marketplace: React.FC = () => (
  <AbsoluteFill>
    <BrandBackground variant="cool" />
    <Sequence from={0} durationInFrames={80}>
      <TitleScene emoji="🛒" title="Marketplace" subtitle="Buy, sell & harvest seeds from fellow sowers" />
    </Sequence>
    <Sequence from={80} durationInFrames={430}>
      <AbsoluteFill>
        <AnimatedText text="Browse Orchards & Discover Seeds" delay={0} size={40} x={120} y={60} />
        <ProductCard emoji="🫒" name="Organic Olive Oil" price="$12.00" delay={15} x={120} y={200} />
        <ProductCard emoji="🧵" name="Handwoven Scarf" price="$28.00" delay={30} x={480} y={240} />
        <ProductCard emoji="🍯" name="Raw Honey" price="$9.50" delay={45} x={840} y={200} />
        <ProductCard emoji="📖" name="Community Book" price="$15.00" delay={60} x={1200} y={240} />
        <AnimatedText text="Plant seeds, grow your orchard, bless the community" delay={100} size={26} color="#666" font="body" weight={400} x={120} y={750} />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={510} durationInFrames={90}>
      <ClosingScene />
    </Sequence>
  </AbsoluteFill>
);
