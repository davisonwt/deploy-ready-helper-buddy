import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { GlowParticles } from "../components/GlowParticles";
import { Caption } from "../components/Caption";
import { LogoMark } from "../components/LogoMark";
import { VoiceTrack } from "../components/VoiceTrack";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadEmoji } from "@remotion/google-fonts/NotoColorEmoji";

const { fontFamily: inter } = loadInter();
const { fontFamily: playfair } = loadPlayfair();
const { fontFamily: emojiFont } = loadEmoji();
const emojiStack = `${emojiFont}, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;

const TERRACOTTA = "#B85042";
const FOREST = "#2C5F2D";
const OCHRE = "#D4A843";

// 20s @ 30fps = 600 frames. Closing card uses last 60f (540-600).
const captions = [
  { from: 60,  duration: 90,  headline: "Go Live as a Classroom.",            subtitle: "Teach voice + video to your tribe" },
  { from: 150, duration: 90,  headline: "From the young to the old.",         subtitle: "Anyone can learn. Anyone can teach." },
  { from: 240, duration: 90,  headline: "Share videos, docs & voice notes.",  subtitle: "Everything your class needs, in one room" },
  { from: 330, duration: 90,  headline: "Free or paid in USDT.",              subtitle: "You set the price. Students bestow to join." },
  { from: 420, duration: 120, headline: "Your knowledge is a seed.",          subtitle: "Plant it. Watch it grow." },
];

// Floating themed icons drifting across the scene to evoke a real classroom.
const FloatingIcon: React.FC<{
  emoji: string;
  x: number;       // % of width
  y: number;       // % of height
  size: number;
  delay: number;
  driftAmp?: number;
  rotateAmp?: number;
}> = ({ emoji, x, y, size, delay, driftAmp = 18, rotateAmp = 8 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 90 } });
  const opacity = interpolate(s, [0, 1], [0, 0.95]);
  const scale = interpolate(s, [0, 1], [0.4, 1]);
  const driftY = Math.sin((frame + delay) / 35) * driftAmp;
  const driftX = Math.cos((frame + delay) / 45) * (driftAmp * 0.6);
  const rot = Math.sin((frame + delay) / 40) * rotateAmp;
  return (
    <div style={{
      position: "absolute",
      left: `${x}%`,
      top: `${y}%`,
      transform: `translate(-50%, -50%) translate(${driftX}px, ${driftY}px) scale(${scale}) rotate(${rot}deg)`,
      fontSize: size,
      fontFamily: emojiStack,
      lineHeight: 1,
      opacity,
      filter: "drop-shadow(0 10px 24px rgba(44,95,45,0.35))",
      pointerEvents: "none",
    }}>
      {emoji}
    </div>
  );
};

const HeroIcon: React.FC<{ emoji: string }> = ({ emoji }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 8, stiffness: 100 } });
  const scale = interpolate(s, [0, 1], [0.3, 1]);
  const rot = Math.sin(frame / 30) * 5;
  return (
    <div style={{
      fontSize: 220, transform: `scale(${scale}) rotate(${rot}deg)`,
      filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.25))",
      fontFamily: emojiStack, lineHeight: 1,
    }}>{emoji}</div>
  );
};

export const Banner11Classroom: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const closingFrom = Math.max(60, durationInFrames - 60);
  const heroDuration = closingFrom;

  const eyebrowOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const titleS = spring({ frame: frame - 10, fps, config: { damping: 18 } });
  const titleY = interpolate(titleS, [0, 1], [40, 0]);

  const closingS = spring({ frame: frame - closingFrom, fps, config: { damping: 14 } });
  const closingScale = interpolate(closingS, [0, 1], [0.7, 1]);
  const closingOp = interpolate(frame, [closingFrom, closingFrom + 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <BrandBackground variant="warm" />
      <GlowParticles count={60} color="#FFD78A" />

      {/* Floating classroom-themed icons across the whole scene.
          Positioned around the hero so they frame, never cover, the type. */}
      <Sequence from={0} durationInFrames={heroDuration}>
        <AbsoluteFill>
          {/* Top row: teacher + tools */}
          <FloatingIcon emoji="👩‍🏫" x={12} y={22} size={140} delay={6} />
          <FloatingIcon emoji="📚" x={88} y={20} size={120} delay={14} />
          <FloatingIcon emoji="🎥" x={22} y={70} size={110} delay={22} />
          <FloatingIcon emoji="🎙️" x={78} y={68} size={110} delay={28} />

          {/* All ages — young to old */}
          <FloatingIcon emoji="🧒" x={8}  y={55} size={95}  delay={36} />
          <FloatingIcon emoji="👧" x={92} y={45} size={95}  delay={42} />
          <FloatingIcon emoji="👨" x={18} y={88} size={90}  delay={48} />
          <FloatingIcon emoji="👵" x={82} y={88} size={95}  delay={54} />

          {/* Resources shared in class */}
          <FloatingIcon emoji="📄" x={32} y={90} size={70}  delay={60} driftAmp={10} />
          <FloatingIcon emoji="✏️" x={68} y={92} size={70}  delay={66} driftAmp={10} />
          <FloatingIcon emoji="💡" x={50} y={12} size={80}  delay={72} driftAmp={12} />
        </AbsoluteFill>
      </Sequence>

      {/* Hero block visible until the closing card */}
      <Sequence from={0} durationInFrames={heroDuration}>
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 110 }}>
          <div style={{
            fontFamily: inter, fontWeight: 700, fontSize: 28, color: TERRACOTTA,
            letterSpacing: 6, textTransform: "uppercase", opacity: eyebrowOp, marginBottom: 20,
          }}>
            Go Live · Classroom
          </div>
          <HeroIcon emoji="🎓" />
          <h1 style={{
            fontFamily: playfair, fontSize: 92, color: FOREST, fontWeight: 800,
            transform: `translateY(${titleY}px)`, opacity: interpolate(titleS, [0, 1], [0, 1]),
            margin: "8px 0 0", textAlign: "center", lineHeight: 1.05,
            textShadow: "0 4px 20px rgba(255,255,255,0.6)",
          }}>
            Classroom
          </h1>
        </AbsoluteFill>
      </Sequence>

      {/* English captions with subtitle line */}
      {captions.map((c, i) => (
        <Sequence key={i} from={c.from} durationInFrames={c.duration}>
          <Caption headline={c.headline} subtitle={c.subtitle} delay={0} />
        </Sequence>
      ))}

      {/* Closing card with the real logo and CTA */}
      <Sequence from={closingFrom} durationInFrames={durationInFrames - closingFrom}>
        <AbsoluteFill style={{
          justifyContent: "center", alignItems: "center",
          background: `radial-gradient(ellipse at center, rgba(255,247,230,0.85) 0%, transparent 70%)`,
        }}>
          <div style={{ textAlign: "center", transform: `scale(${closingScale})`, opacity: closingOp }}>
            <LogoMark size={320} delay={0} />
            <div style={{
              fontFamily: inter, fontWeight: 700, fontSize: 32, color: "#333",
              marginTop: 28,
            }}>
              Sow Seeds · Grow Together · Harvest Blessings
            </div>
            <div style={{
              marginTop: 28, display: "inline-block",
              background: `linear-gradient(135deg, ${TERRACOTTA}, ${OCHRE})`,
              color: "white", fontFamily: inter, fontWeight: 800, fontSize: 30,
              padding: "20px 52px", borderRadius: 999,
              boxShadow: "0 12px 40px rgba(184,80,66,0.45)",
            }}>
              Host a Classroom
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      <VoiceTrack name="11-classroom" />
    </AbsoluteFill>
  );
};
