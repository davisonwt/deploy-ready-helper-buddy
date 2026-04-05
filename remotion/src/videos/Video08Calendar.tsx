import { AbsoluteFill, Sequence, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { TitleScene } from "../components/TitleScene";
import { ClosingScene } from "../components/ClosingScene";
import { AnimatedText } from "../components/AnimatedText";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();
const MONTHS = ["Abib", "Ziv", "Sivan", "Tammuz", "Ab", "Elul", "Ethanim", "Bul", "Kislev", "Tebeth", "Shebat", "Adar"];
const FEAST_DAYS = [{ month: 0, day: 14, name: "Passover 🐑" }, { month: 2, day: 6, name: "Shavuot 🌾" }, { month: 6, day: 1, name: "Yom Teruah 📯" }];

const CalendarGrid: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 160, top: 180, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      {MONTHS.map((m, i) => {
        const s = spring({ frame: frame - delay - i * 3, fps, config: { damping: 18 } });
        const feast = FEAST_DAYS.find(f => f.month === i);
        return (
          <div key={m} style={{
            transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`,
            opacity: interpolate(s, [0, 1], [0, 1]),
            background: feast ? "#B8504215" : "white", borderRadius: 16, padding: "16px 20px", width: 200,
            boxShadow: "0 4px 16px rgba(0,0,0,0.05)", border: feast ? "2px solid #B85042" : "1px solid #eee",
          }}>
            <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 16, color: "#2C5F2D" }}>{m}</div>
            <div style={{ fontFamily: inter, fontSize: 12, color: "#999", marginTop: 2 }}>Month {i + 1}</div>
            {feast && <div style={{ fontFamily: inter, fontSize: 12, color: "#B85042", marginTop: 6 }}>{feast.name}</div>}
          </div>
        );
      })}
    </div>
  );
};

export const Video08Calendar: React.FC = () => (
  <AbsoluteFill>
    <BrandBackground variant="warm" />
    <Sequence from={0} durationInFrames={80}>
      <TitleScene emoji="📅" title="Sacred Calendar" subtitle="YHVH days · Enochian 364-day system" />
    </Sequence>
    <Sequence from={80} durationInFrames={430}>
      <AbsoluteFill>
        <AnimatedText text="The 364-Day Calendar" delay={0} size={40} x={160} y={60} />
        <CalendarGrid delay={15} />
        <AnimatedText text="Track feast days, sabbaths & community celebrations" delay={60} size={24} color="#666" font="body" weight={400} x={160} y={780} />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={510} durationInFrames={90}>
      <ClosingScene />
    </Sequence>
  </AbsoluteFill>
);
