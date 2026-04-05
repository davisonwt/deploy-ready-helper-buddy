import { AbsoluteFill, Sequence, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { TitleScene } from "../components/TitleScene";
import { ClosingScene } from "../components/ClosingScene";
import { AnimatedText } from "../components/AnimatedText";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

const ServiceRow: React.FC<{ emoji: string; title: string; desc: string; delay: number; y: number }> = ({ emoji, title, desc, delay, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  const x = interpolate(s, [0, 1], [-600, 0]);
  return (
    <div style={{
      position: "absolute", left: 160, top: y,
      transform: `translateX(${x}px)`, opacity: interpolate(s, [0, 1], [0, 1]),
      display: "flex", alignItems: "center", gap: 24,
      background: "white", borderRadius: 20, padding: "20px 36px", width: 700,
      boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
    }}>
      <div style={{ fontSize: 44 }}>{emoji}</div>
      <div>
        <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 22, color: "#2C5F2D" }}>{title}</div>
        <div style={{ fontFamily: inter, fontSize: 15, color: "#777", marginTop: 4 }}>{desc}</div>
      </div>
    </div>
  );
};

const BookingMockup: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  return (
    <div style={{
      position: "absolute", right: 120, top: 180,
      transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`,
      opacity: interpolate(s, [0, 1], [0, 1]),
      background: "white", borderRadius: 28, padding: 36, width: 440,
      boxShadow: "0 16px 60px rgba(0,0,0,0.12)",
    }}>
      <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 20, color: "#2C5F2D", marginBottom: 20 }}>Book a Ride 🚗</div>
      <div style={{ background: "#f5f5f5", borderRadius: 12, padding: "12px 16px", marginBottom: 12, fontFamily: inter, fontSize: 14, color: "#999" }}>📍 Pickup: Community Centre</div>
      <div style={{ background: "#f5f5f5", borderRadius: 12, padding: "12px 16px", marginBottom: 12, fontFamily: inter, fontSize: 14, color: "#999" }}>📍 Drop-off: Market Square</div>
      <div style={{ background: "#f5f5f5", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontFamily: inter, fontSize: 14, color: "#999" }}>👥 2 Passengers</div>
      <div style={{ background: "#B85042", color: "white", fontFamily: inter, fontWeight: 600, fontSize: 16, padding: "14px 0", borderRadius: 14, textAlign: "center" }}>Confirm Booking</div>
    </div>
  );
};

export const Video03Gigs: React.FC = () => (
  <AbsoluteFill>
    <BrandBackground variant="warm" />
    <Sequence from={0} durationInFrames={80}>
      <TitleScene emoji="🚗" title="Services & Gigs" subtitle="Rides, skills, whisperers & more" />
    </Sequence>
    <Sequence from={80} durationInFrames={430}>
      <AbsoluteFill>
        <AnimatedText text="Community Services" delay={0} size={38} x={160} y={60} />
        <ServiceRow emoji="🚗" title="Community Rides" desc="Book a driver for pickups & deliveries" delay={15} y={180} />
        <ServiceRow emoji="🔧" title="Skill Services" desc="Hire skilled sowers for tasks & projects" delay={30} y={300} />
        <ServiceRow emoji="📢" title="Whisperers" desc="Promote orchards as a community influencer" delay={45} y={420} />
        <ServiceRow emoji="🎓" title="Ambassadors" desc="Represent & grow the S2G community" delay={60} y={540} />
        <BookingMockup delay={40} />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={510} durationInFrames={90}>
      <ClosingScene />
    </Sequence>
  </AbsoluteFill>
);
