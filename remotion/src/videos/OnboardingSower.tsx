import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";

const { fontFamily: displayFont } = loadPlayfair("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});
const { fontFamily: bodyFont } = loadDMSans("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

const PALETTE = {
  gold: "#E1C16E",
  goldGlow: "#F5D98C",
  blush: "#E48AA0",
  aqua: "#5ED7E5",
  ivory: "#FFF7F0",
  ink: "#2D1824",
  plum: "#3B1F31",
  plumDeep: "#241019",
};

type Hotspot = {
  // percent of the screenshot (not the video frame)
  x: number;
  y: number;
  label: string;
  delay?: number;
};

type SceneDef = {
  step: number;
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  /** Object-position for the screenshot inside its frame */
  imagePosition?: string;
  hotspots?: Hotspot[];
  duration: number;
};

const SCENES: SceneDef[] = [
  {
    step: 1,
    eyebrow: "Welcome",
    title: "Become a Sower in 60 seconds",
    body: "The farm stall of the 364yhvh community.",
    image: "onboarding/01-landing.jpeg",
    imagePosition: "center top",
    duration: 390, // 0–13s
  },
  {
    step: 2,
    eyebrow: "Step 1 · Plant your seed",
    title: "Tap 'Sow your first seed'",
    body: "Then choose the full registration form.",
    image: "onboarding/02-plant-seed.jpeg",
    imagePosition: "center top",
    hotspots: [{ x: 50, y: 62, label: "Sow your first seed" }],
    duration: 120, // 13–17s
  },
  {
    step: 3,
    eyebrow: "Step 2 · Tell us about you",
    title: "Name, email & country",
    body: "Phone and referral code are optional — one orchard per email.",
    image: "onboarding/03-form-name.jpeg",
    imagePosition: "center top",
    hotspots: [{ x: 50, y: 50, label: "Fill in your details" }],
    duration: 300, // 17–27s
  },
  {
    step: 4,
    eyebrow: "Step 3 · Lock it in",
    title: "Pick currency & set a strong password",
    body: "12+ chars · capital · number · special. Then tap 'Become a Sower & Bestower'.",
    image: "onboarding/05-become-sower.jpeg",
    imagePosition: "center bottom",
    hotspots: [{ x: 50, y: 78, label: "Become a Sower & Bestower" }],
    duration: 390, // 27–40s
  },
  {
    step: 5,
    eyebrow: "Step 4 · First sign-in",
    title: "Enter the Garden",
    body: "Sign in with your email & password from the welcome home screen.",
    image: "onboarding/07-enter-garden.jpeg",
    imagePosition: "center center",
    hotspots: [{ x: 50, y: 70, label: "Enter the Garden" }],
    duration: 300, // 40–50s
  },
  {
    step: 6,
    eyebrow: "Step 5 · Super important",
    title: "Set your security questions",
    body: "Tap the ⚙ gear icon (top-right) on your dashboard. This is how you recover your password.",
    image: "onboarding/08-dashboard-gear.jpeg",
    imagePosition: "right top",
    hotspots: [{ x: 92, y: 12, label: "Tap the gear icon" }],
    duration: 210, // 50–57s
  },
  {
    step: 7,
    eyebrow: "Welcome to the tribe",
    title: "You're home.",
    body: "Your orchard is planted. 🌱",
    image: "onboarding/01-landing.jpeg",
    imagePosition: "center top",
    duration: 330, // 57–68s
  },
];

const TOTAL_DURATION = SCENES.reduce((sum, s) => sum + s.duration, 0);
export const ONBOARDING_SOWER_DURATION = TOTAL_DURATION;

/* ---------------- Persistent background ---------------- */
const SanctuaryBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const driftA = Math.sin(frame / 90) * 8;
  const driftB = Math.cos(frame / 120) * 6;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at ${50 + driftA}% ${30 + driftB}%, ${PALETTE.plum} 0%, ${PALETTE.plumDeep} 55%, #160910 100%)`,
      }}
    />
  );
};

const FloatingDust: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 22 }).map((_, i) => {
        const left = (i * 13.7) % 100;
        const top = (i * 19.3) % 100;
        const size = 4 + (i % 5) * 3;
        const oy = Math.sin((frame + i * 14) / 28) * 18;
        const ox = Math.cos((frame + i * 11) / 32) * 14;
        const op = 0.35 + Math.sin((frame + i * 9) / 36) * 0.2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              borderRadius: 999,
              background: PALETTE.gold,
              boxShadow: `0 0 ${size * 4}px ${PALETTE.gold}`,
              opacity: Math.max(0, op),
              transform: `translate(${ox}px, ${oy}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const LogoBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const size = 138;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: "rgba(255,255,255,0.92)",
        border: `6px solid ${PALETTE.aqua}`,
        boxShadow: "0 20px 50px rgba(0,0,0,0.24)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${0.82 + reveal * 0.18})`,
      }}
    >
      <div
        style={{
          width: size - 18,
          height: size - 18,
          borderRadius: 999,
          border: `2px dashed ${PALETTE.aqua}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Img
          src={staticFile("logo-transparent.png")}
          style={{ width: size * 0.56, height: size * 0.56, objectFit: "contain" }}
        />
      </div>
    </div>
  );
};

/* ---------------- Step counter pill ---------------- */
const StepPill: React.FC<{ step: number; total: number }> = ({ step, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 140 } });
  return (
    <div
      style={{
        position: "absolute",
        top: 48,
        right: 56,
        padding: "14px 26px",
        borderRadius: 999,
        background: "rgba(255,247,240,0.08)",
        border: `1.5px solid ${PALETTE.gold}88`,
        color: PALETTE.ivory,
        fontFamily: bodyFont,
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        backdropFilter: "blur(8px)",
        transform: `scale(${0.9 + pop * 0.1})`,
        boxShadow: `0 8px 28px rgba(0,0,0,0.4), inset 0 0 0 1px ${PALETTE.gold}22`,
      }}
    >
      <span style={{ color: PALETTE.gold }}>Step {step}</span>
      <span style={{ opacity: 0.5, margin: "0 10px" }}>·</span>
      <span style={{ opacity: 0.85 }}>of {total}</span>
    </div>
  );
};

/* ---------------- Phone-frame screenshot ---------------- */
const ScreenshotCard: React.FC<{
  src: string;
  imagePosition?: string;
  hotspots?: Hotspot[];
}> = ({ src, imagePosition = "center top", hotspots = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });
  // gentle Ken Burns
  const scale = 1.02 + Math.sin(frame / 40) * 0.012 + interpolate(frame, [0, 240], [0, 0.04]);
  const driftY = Math.sin(frame / 50) * 6;

  return (
    <div
      style={{
        position: "relative",
        width: 1120,
        height: 770,
        borderRadius: 36,
        overflow: "hidden",
        boxShadow: `0 40px 110px rgba(0,0,0,0.55), 0 0 0 1px ${PALETTE.gold}55, 0 0 80px ${PALETTE.gold}22`,
        border: `1px solid ${PALETTE.gold}44`,
        transform: `translateY(${50 - rise * 50 + driftY}px) scale(${0.96 + rise * 0.04})`,
        opacity: rise,
        background: "#0c0508",
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: imagePosition,
          transform: `scale(${scale})`,
          filter: "saturate(1.05) contrast(1.02)",
        }}
      />
      {/* subtle vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)",
          pointerEvents: "none",
        }}
      />
      {/* hotspots layered above */}
      {hotspots.map((h, i) => (
        <Hotspot key={i} hotspot={h} index={i} />
      ))}
    </div>
  );
};

const Hotspot: React.FC<{ hotspot: Hotspot; index: number }> = ({ hotspot, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = hotspot.delay ?? 30 + index * 8;
  const reveal = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
  if (reveal < 0.01) return null;

  // pulsing ring
  const pulse = ((frame - delay) % 60) / 60;
  const ringScale = 1 + pulse * 0.9;
  const ringOpacity = (1 - pulse) * 0.85;

  return (
    <div
      style={{
        position: "absolute",
        left: `${hotspot.x}%`,
        top: `${hotspot.y}%`,
        transform: `translate(-50%, -50%) scale(${reveal})`,
        opacity: reveal,
        pointerEvents: "none",
      }}
    >
      {/* outer pulse */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 120,
          height: 120,
          marginLeft: -60,
          marginTop: -60,
          borderRadius: 999,
          border: `3px solid ${PALETTE.gold}`,
          transform: `scale(${ringScale})`,
          opacity: ringOpacity,
        }}
      />
      {/* core */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          border: `4px solid ${PALETTE.goldGlow}`,
          background: `radial-gradient(circle, ${PALETTE.gold}88 0%, ${PALETTE.gold}22 70%, transparent 100%)`,
          boxShadow: `0 0 40px ${PALETTE.gold}, 0 0 80px ${PALETTE.gold}88`,
        }}
      />
      {/* label */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "10px 18px",
          borderRadius: 999,
          background: PALETTE.ivory,
          color: PALETTE.ink,
          fontFamily: bodyFont,
          fontWeight: 700,
          fontSize: 18,
          whiteSpace: "nowrap",
          boxShadow: `0 12px 30px rgba(0,0,0,0.45), 0 0 0 2px ${PALETTE.gold}`,
        }}
      >
        {hotspot.label}
      </div>
    </div>
  );
};

/* ---------------- Scene caption (left side) ---------------- */
const CaptionPanel: React.FC<{ scene: SceneDef }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 18, stiffness: 130 } });
  const outro = interpolate(
    frame,
    [durationInFrames - 16, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <div
      style={{
        width: 660,
        transform: `translateY(${28 - reveal * 28}px)`,
        opacity: Math.min(1, reveal + 0.05) * outro,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          padding: "10px 20px",
          borderRadius: 999,
          background: `${PALETTE.gold}22`,
          border: `1px solid ${PALETTE.gold}88`,
          color: PALETTE.gold,
          fontFamily: bodyFont,
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        {scene.eyebrow}
      </div>
      <div
        style={{
          marginTop: 28,
          fontFamily: displayFont,
          fontSize: 78,
          lineHeight: 1.0,
          color: PALETTE.ivory,
          textShadow: "0 12px 40px rgba(0,0,0,0.5)",
          fontWeight: 700,
        }}
      >
        {scene.title}
      </div>
      <div
        style={{
          marginTop: 26,
          color: "rgba(255,247,240,0.88)",
          fontFamily: bodyFont,
          fontSize: 28,
          lineHeight: 1.38,
          maxWidth: 620,
        }}
      >
        {scene.body}
      </div>
    </div>
  );
};

/* ---------------- Outro overlay ---------------- */
const OutroOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 10, fps, config: { damping: 14, stiffness: 110 } });
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(36,16,25,0.78)",
      }}
    >
      <div
        style={{
          textAlign: "center",
          transform: `scale(${0.9 + pop * 0.1}) translateY(${30 - pop * 30}px)`,
          opacity: pop,
        }}
      >
        <div
          style={{
            width: 180,
            height: 180,
            margin: "0 auto 32px",
            borderRadius: 999,
            background: PALETTE.ivory,
            border: `6px solid ${PALETTE.gold}`,
            boxShadow: `0 0 80px ${PALETTE.gold}, 0 30px 80px rgba(0,0,0,0.5)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Img
            src={staticFile("logo-transparent.png")}
            style={{ width: 130, height: 130, objectFit: "contain" }}
          />
        </div>
        <div
          style={{
            fontFamily: displayFont,
            fontSize: 110,
            color: PALETTE.ivory,
            fontWeight: 700,
            textShadow: `0 0 40px ${PALETTE.gold}88`,
          }}
        >
          You're home.
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: bodyFont,
            fontSize: 36,
            color: PALETTE.gold,
            letterSpacing: "0.1em",
          }}
        >
          Welcome to the tribe 🌱
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Single scene layout ---------------- */
const SceneView: React.FC<{ scene: SceneDef; index: number; isOutro?: boolean }> = ({
  scene,
  isOutro,
}) => {
  return (
    <AbsoluteFill>
      {!isOutro && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 90px",
          }}
        >
          <CaptionPanel scene={scene} />
          <ScreenshotCard
            src={scene.image}
            imagePosition={scene.imagePosition}
            hotspots={scene.hotspots}
          />
        </div>
      )}
      {isOutro && <OutroOverlay />}
      <StepPill step={scene.step} total={6} />
    </AbsoluteFill>
  );
};

/* ---------------- Root composition ---------------- */
export const OnboardingSower: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.plum }}>
      <SanctuaryBackground />
      <FloatingDust />

      {SCENES.map((scene, index) => {
        const start = from;
        from += scene.duration;
        return (
          <Sequence key={index} from={start} durationInFrames={scene.duration}>
            <SceneView scene={scene} index={index} isOutro={index === SCENES.length - 1} />
          </Sequence>
        );
      })}

      {/* Voiceover (single padded track) */}
      <Audio src={staticFile("voiceovers/onboarding-sower/onboarding-sower-full.mp3")} />
    </AbsoluteFill>
  );
};
