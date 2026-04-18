import { AbsoluteFill, Sequence, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { BrandBackground } from "./BrandBackground";
import { GlowParticles } from "./GlowParticles";
import { Caption } from "./Caption";
import { LogoMark } from "./LogoMark";
import { VoiceTrack } from "./VoiceTrack";
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

export interface BannerCaption {
  /** start frame (0-indexed within the 300-frame composition) */
  from: number;
  /** duration in frames */
  duration: number;
  headline: string;
  subtitle?: string;
}

export interface BannerSceneProps {
  /** Big icon emoji shown in the hero */
  emoji: string;
  /** Top eyebrow label, e.g. "Sow Banner" */
  eyebrow: string;
  /** Hero headline shown in the opening 2s */
  heroTitle: string;
  /** CTA on the closing card */
  cta: string;
  /** Voiceover MP3 base name in public/voiceovers/ */
  voice: string;
  /** Caption track shown on top of motion */
  captions: BannerCaption[];
  /** Color variant for background glow */
  variant?: "warm" | "cool";
}

const HeroIcon: React.FC<{ emoji: string }> = ({ emoji }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 8, stiffness: 100 } });
  const scale = interpolate(s, [0, 1], [0.3, 1]);
  const rot = Math.sin(frame / 30) * 5;
  return (
    <div style={{
      fontSize: 220, transform: `scale(${scale}) rotate(${rot}deg)`,
      filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.2))",
      fontFamily: emojiStack, lineHeight: 1,
    }}>{emoji}</div>
  );
};

/** Reusable 10-second S2G banner template.
 *  - 0–60f: hero icon + eyebrow + title
 *  - 60–240f: caption track narrating the offer
 *  - 240–300f: closing CTA with logo
 */
export const BannerScene: React.FC<BannerSceneProps> = ({
  emoji, eyebrow, heroTitle, cta, voice, captions, variant = "warm",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Closing card always occupies the last ~2s of the composition,
  // so longer voiceovers (e.g. 13s+) can finish before the CTA appears.
  const closingFrom = Math.max(60, durationInFrames - 60);
  const heroDuration = closingFrom; // hero/captions stretch up to the closing card
  const closingDuration = durationInFrames - closingFrom;

  const eyebrowOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const titleS = spring({ frame: frame - 10, fps, config: { damping: 18 } });
  const titleY = interpolate(titleS, [0, 1], [40, 0]);

  // Closing fade-in for the CTA card
  const closingS = spring({ frame: frame - closingFrom, fps, config: { damping: 14 } });
  const closingScale = interpolate(closingS, [0, 1], [0.7, 1]);
  const closingOp = interpolate(frame, [closingFrom, closingFrom + 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <BrandBackground variant={variant} />
      <GlowParticles count={50} color={variant === "warm" ? "#FFD78A" : "#A8E6CF"} />

      {/* Hero block visible until the closing card */}
      <Sequence from={0} durationInFrames={heroDuration}>
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 120 }}>
          <div style={{
            fontFamily: inter, fontWeight: 700, fontSize: 28, color: TERRACOTTA,
            letterSpacing: 6, textTransform: "uppercase", opacity: eyebrowOp, marginBottom: 24,
          }}>
            {eyebrow}
          </div>
          <HeroIcon emoji={emoji} />
          <h1 style={{
            fontFamily: playfair, fontSize: 88, color: FOREST, fontWeight: 800,
            transform: `translateY(${titleY}px)`, opacity: interpolate(titleS, [0, 1], [0, 1]),
            margin: "12px 0 0", textAlign: "center", lineHeight: 1.05,
            textShadow: "0 4px 20px rgba(255,255,255,0.6)",
          }}>
            {heroTitle}
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
      <Sequence from={closingFrom} durationInFrames={closingDuration}>
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
              {cta}
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      <VoiceTrack name={voice} />
    </AbsoluteFill>
  );
};
