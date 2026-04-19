import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily as displayFont } from "@remotion/google-fonts/PlayfairDisplay";
import { fontFamily as bodyFont } from "@remotion/google-fonts/DMSans";

type SceneVariant = "garden" | "ambassador" | "story" | "match" | "chat" | "safety" | "close";

type SceneDef = {
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  duration: number;
  variant: SceneVariant;
};

const PALETTE = {
  bgTop: "#2A1020",
  bgBottom: "#120813",
  surface: "#FFF7F3",
  rose: "#E56B87",
  gold: "#E8B85C",
  sage: "#88A977",
  plum: "#6B3658",
  ink: "#2C1624",
  softInk: "#66495A",
};

const SCENES: SceneDef[] = [
  {
    eyebrow: "Safe tribal dating",
    title: "Welcome to Tribal Hearts",
    body: "A calm, protected dating garden living inside the Sow2Grow tribe.",
    accent: PALETTE.rose,
    duration: 109,
    variant: "garden",
  },
  {
    eyebrow: "Ambassador-only access",
    title: "Real tribe members only",
    body: "Entry is reserved for Ambassadors, keeping the space intentional and trusted.",
    accent: PALETTE.gold,
    duration: 133,
    variant: "ambassador",
  },
  {
    eyebrow: "Guided onboarding",
    title: "Tell Gentoo your story",
    body: "A warm guided flow helps shape your profile, then you refine it in your own voice.",
    accent: PALETTE.sage,
    duration: 127,
    variant: "story",
  },
  {
    eyebrow: "Values-first matching",
    title: "Meet with intention",
    body: "Discover men and women who align with your values, direction, and pace.",
    accent: "#F08E74",
    duration: 112,
    variant: "match",
  },
  {
    eyebrow: "Private connection",
    title: "Keep chat inside ChatApp",
    body: "Conversations stay in-house, so personal details are never pushed out too early.",
    accent: "#7AA7A0",
    duration: 152,
    variant: "chat",
  },
  {
    eyebrow: "Protection layer",
    title: "AI safety watches over the garden",
    body: "Moderation and safety checks help every connection stay respectful and secure.",
    accent: "#C68CE6",
    duration: 126,
    variant: "safety",
  },
  {
    eyebrow: "Enter the garden",
    title: "Let love grow naturally",
    body: "Become an Ambassador and step into a dating space built for the tribe.",
    accent: PALETTE.rose,
    duration: 145,
    variant: "close",
  },
];

const PETALS = [
  { left: 10, top: 14, size: 24, drift: 18 },
  { left: 22, top: 68, size: 16, drift: 12 },
  { left: 34, top: 22, size: 14, drift: 24 },
  { left: 51, top: 60, size: 18, drift: 16 },
  { left: 66, top: 16, size: 20, drift: 20 },
  { left: 77, top: 74, size: 12, drift: 14 },
  { left: 86, top: 32, size: 22, drift: 18 },
];

const MOTTO_LINES = ["Ambassador members only", "ChatApp only", "AI-moderated safety"];

const FloatingPetals: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();

  return (
    <>
      {PETALS.map((petal, index) => {
        const bob = Math.sin((frame + index * 9) / 18) * petal.drift;
        const sway = Math.cos((frame + index * 11) / 25) * (petal.drift * 0.65);

        return (
          <div
            key={`${petal.left}-${petal.top}`}
            style={{
              position: "absolute",
              left: `${petal.left}%`,
              top: `${petal.top}%`,
              width: petal.size,
              height: petal.size,
              borderRadius: 999,
              background: `radial-gradient(circle at 30% 30%, #fff7fb 0%, ${accent} 48%, rgba(255,255,255,0) 100%)`,
              opacity: 0.5,
              transform: `translate(${sway}px, ${bob}px) scale(${1 + Math.sin((frame + index * 7) / 30) * 0.08})`,
              boxShadow: `0 0 40px ${accent}66`,
            }}
          />
        );
      })}
    </>
  );
};

const BackgroundWash: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 45) * 0.03;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 18% 22%, ${accent}33 0%, transparent 32%), radial-gradient(circle at 82% 18%, ${PALETTE.gold}22 0%, transparent 28%), linear-gradient(145deg, ${PALETTE.bgTop} 0%, ${PALETTE.bgBottom} 70%)`,
        transform: `scale(${pulse})`,
      }}
    />
  );
};

const GlassCard: React.FC<React.PropsWithChildren<{ accent: string; style?: React.CSSProperties }>> = ({ accent, style, children }) => (
  <div
    style={{
      background: "linear-gradient(180deg, rgba(255,247,243,0.98) 0%, rgba(255,240,235,0.92) 100%)",
      border: `1px solid ${accent}44`,
      borderRadius: 38,
      boxShadow: `0 25px 70px rgba(0,0,0,0.24), 0 0 0 1px rgba(255,255,255,0.22) inset`,
      ...style,
    }}
  >
    {children}
  </div>
);

const GardenVisual: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const blossom = spring({ frame, fps: 30, config: { damping: 14, stiffness: 90 } });

  return (
    <GlassCard accent={accent} style={{ width: 600, height: 600, padding: 48, position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 36,
          borderRadius: 999,
          border: `2px solid ${accent}55`,
          transform: `scale(${0.82 + blossom * 0.18}) rotate(${frame * 0.2}deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 88,
          borderRadius: 999,
          border: `1px dashed ${PALETTE.gold}88`,
          transform: `scale(${0.88 + blossom * 0.12}) rotate(${-frame * 0.18}deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 172,
          height: 172,
          marginLeft: -86,
          marginTop: -86,
          borderRadius: 999,
          background: `radial-gradient(circle at 35% 30%, #fff, ${accent} 55%, ${PALETTE.plum} 100%)`,
          boxShadow: `0 0 80px ${accent}88`,
          transform: `scale(${0.9 + blossom * 0.14})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          bottom: 94,
          height: 130,
          borderRadius: "50% 50% 42% 42%",
          background: `linear-gradient(180deg, ${PALETTE.sage} 0%, #557347 100%)`,
          filter: "blur(2px)",
        }}
      />
    </GlassCard>
  );
};

const AmbassadorVisual: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const badgeScale = spring({ frame, fps: 30, config: { damping: 12, stiffness: 110 } });

  return (
    <GlassCard accent={accent} style={{ width: 600, height: 600, padding: 46, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: bodyFont, fontSize: 22, letterSpacing: "0.22em", textTransform: "uppercase", color: PALETTE.softInk }}>
            Access Layer
          </div>
          <div style={{ fontFamily: displayFont, fontSize: 54, color: PALETTE.ink, marginTop: 12 }}>Ambassador Gate</div>
        </div>
        <div style={{ padding: "14px 22px", borderRadius: 999, background: `${accent}22`, color: accent, fontFamily: bodyFont, fontWeight: 700 }}>
          Members only
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "53%",
          width: 220,
          height: 260,
          marginLeft: -110,
          marginTop: -130,
          clipPath: "polygon(50% 0%, 90% 14%, 90% 56%, 50% 100%, 10% 56%, 10% 14%)",
          background: `linear-gradient(180deg, ${accent} 0%, ${PALETTE.plum} 100%)`,
          transform: `scale(${0.84 + badgeScale * 0.16})`,
          boxShadow: `0 24px 60px ${accent}55`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "53%",
          width: 120,
          height: 120,
          marginLeft: -60,
          marginTop: -70,
          borderRadius: 999,
          background: "rgba(255,255,255,0.94)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 56,
          color: accent,
        }}
      >
        ♡
      </div>
      <div style={{ position: "absolute", left: 74, right: 74, bottom: 74, display: "flex", gap: 16 }}>
        {MOTTO_LINES.map((line) => (
          <div key={line} style={{ flex: 1, padding: "18px 16px", borderRadius: 22, background: "rgba(255,255,255,0.72)", textAlign: "center", fontFamily: bodyFont, color: PALETTE.softInk, fontSize: 18 }}>
            {line}
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

const StoryVisual: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const rise = spring({ frame, fps: 30, config: { damping: 15, stiffness: 100 } });

  return (
    <GlassCard accent={accent} style={{ width: 600, height: 600, padding: 42, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ width: 94, height: 94, borderRadius: 999, background: `linear-gradient(135deg, ${accent}, ${PALETTE.gold})`, boxShadow: `0 18px 40px ${accent}55` }} />
        <div>
          <div style={{ fontFamily: displayFont, fontSize: 50, color: PALETTE.ink }}>Gentoo listens</div>
          <div style={{ fontFamily: bodyFont, fontSize: 24, color: PALETTE.softInk, marginTop: 6 }}>Warm questions. Your own final edit.</div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 54,
          right: 54,
          top: 180,
          bottom: 56,
          borderRadius: 30,
          background: "rgba(255,255,255,0.78)",
          padding: 30,
          transform: `translateY(${24 - rise * 24}px)`,
        }}
      >
        {[0, 1, 2, 3].map((line) => (
          <div
            key={line}
            style={{
              height: line === 2 ? 86 : 26,
              borderRadius: 14,
              background: line === 2 ? `${accent}18` : `${PALETTE.plum}10`,
              marginBottom: 18,
              width: line === 1 ? "86%" : line === 3 ? "72%" : "100%",
            }}
          />
        ))}
      </div>
    </GlassCard>
  );
};

const MatchVisual: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 16) * 0.04;

  return (
    <div style={{ width: 600, height: 600, position: "relative" }}>
      {[
        { left: 10, top: 120, color: `${accent}22` },
        { left: 320, top: 0, color: `${PALETTE.sage}26` },
      ].map((blob, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: blob.left,
            top: blob.top,
            width: 270,
            height: 360,
            borderRadius: 38,
            background: blob.color,
            filter: "blur(8px)",
          }}
        />
      ))}
      <GlassCard accent={accent} style={{ width: 255, height: 370, padding: 24, position: "absolute", left: 24, top: 110 }}>
        <div style={{ height: 200, borderRadius: 28, background: `linear-gradient(135deg, ${accent}, ${PALETTE.gold})` }} />
        <div style={{ fontFamily: displayFont, fontSize: 38, color: PALETTE.ink, marginTop: 22 }}>She</div>
        <div style={{ fontFamily: bodyFont, fontSize: 20, color: PALETTE.softInk, marginTop: 10 }}>Faith · warmth · intention</div>
      </GlassCard>
      <GlassCard accent={accent} style={{ width: 255, height: 370, padding: 24, position: "absolute", right: 24, top: 110 }}>
        <div style={{ height: 200, borderRadius: 28, background: `linear-gradient(135deg, ${PALETTE.sage}, ${PALETTE.plum})` }} />
        <div style={{ fontFamily: displayFont, fontSize: 38, color: PALETTE.ink, marginTop: 22 }}>He</div>
        <div style={{ fontFamily: bodyFont, fontSize: 20, color: PALETTE.softInk, marginTop: 10 }}>Vision · steadiness · care</div>
      </GlassCard>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 112,
          height: 112,
          marginLeft: -56,
          marginTop: -56,
          borderRadius: 999,
          background: `radial-gradient(circle at 30% 30%, #fff, ${accent} 60%, ${PALETTE.plum})`,
          boxShadow: `0 0 60px ${accent}88`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 44,
          transform: `scale(${pulse})`,
        }}
      >
        ♥
      </div>
    </div>
  );
};

const ChatVisual: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();

  return (
    <GlassCard accent={accent} style={{ width: 600, height: 600, padding: 34, position: "relative", overflow: "hidden" }}>
      <div style={{ fontFamily: displayFont, fontSize: 54, color: PALETTE.ink, marginBottom: 24 }}>ChatApp only</div>
      {[0, 1, 2, 3].map((bubble) => {
        const fromLeft = bubble % 2 === 0;
        const y = 118 + bubble * 92 + Math.sin((frame + bubble * 8) / 18) * 5;
        const width = bubble === 1 ? 320 : bubble === 2 ? 280 : 250;

        return (
          <div
            key={bubble}
            style={{
              position: "absolute",
              top: y,
              left: fromLeft ? 42 : undefined,
              right: fromLeft ? undefined : 42,
              width,
              padding: "20px 24px",
              borderRadius: 28,
              background: fromLeft ? `${accent}22` : "rgba(255,255,255,0.82)",
              border: `1px solid ${fromLeft ? accent : `${PALETTE.plum}18`}`,
            }}
          >
            <div style={{ height: 14, borderRadius: 999, background: fromLeft ? `${accent}66` : `${PALETTE.softInk}22`, width: `${72 - bubble * 6}%` }} />
          </div>
        );
      })}
      <div style={{ position: "absolute", right: 36, top: 28, padding: "10px 18px", borderRadius: 999, background: `${accent}20`, color: accent, fontFamily: bodyFont, fontWeight: 700 }}>
        No PII shared
      </div>
    </GlassCard>
  );
};

const SafetyVisual: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const ring = interpolate(frame, [0, 120], [0.88, 1.08], { extrapolateRight: "clamp" });

  return (
    <GlassCard accent={accent} style={{ width: 600, height: 600, padding: 48, position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 280,
          height: 280,
          marginLeft: -140,
          marginTop: -140,
          borderRadius: 999,
          border: `2px solid ${accent}44`,
          transform: `scale(${ring})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 180,
          height: 220,
          marginLeft: -90,
          marginTop: -110,
          clipPath: "polygon(50% 0%, 88% 12%, 88% 55%, 50% 100%, 12% 55%, 12% 12%)",
          background: `linear-gradient(180deg, ${accent}, ${PALETTE.plum})`,
          boxShadow: `0 24px 60px ${accent}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 58,
        }}
      >
        ✦
      </div>
      <div style={{ position: "absolute", left: 56, right: 56, bottom: 68, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {["moderation", "trust", "respect"].map((item) => (
          <div key={item} style={{ borderRadius: 20, padding: "18px 14px", background: "rgba(255,255,255,0.78)", textAlign: "center", fontFamily: bodyFont, fontSize: 20, color: PALETTE.softInk, textTransform: "capitalize" }}>
            {item}
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

const CloseVisual: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const reveal = spring({ frame, fps: 30, config: { damping: 16, stiffness: 110 } });

  return (
    <div style={{ width: 620, height: 620, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          inset: 44,
          borderRadius: 999,
          border: `1px solid ${accent}66`,
          transform: `scale(${0.92 + reveal * 0.08})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 88,
          borderRadius: 999,
          background: `radial-gradient(circle at 50% 45%, ${accent}28 0%, transparent 62%)`,
          filter: "blur(6px)",
        }}
      />
      <Img src={staticFile("logo-transparent.png")} style={{ width: 280, height: 280, objectFit: "contain", transform: `scale(${0.9 + reveal * 0.1})` }} />
    </div>
  );
};

const VisualPanel: React.FC<{ variant: SceneVariant; accent: string }> = ({ variant, accent }) => {
  switch (variant) {
    case "garden":
      return <GardenVisual accent={accent} />;
    case "ambassador":
      return <AmbassadorVisual accent={accent} />;
    case "story":
      return <StoryVisual accent={accent} />;
    case "match":
      return <MatchVisual accent={accent} />;
    case "chat":
      return <ChatVisual accent={accent} />;
    case "safety":
      return <SafetyVisual accent={accent} />;
    case "close":
      return <CloseVisual accent={accent} />;
  }
};

const Scene: React.FC<{ scene: SceneDef; index: number }> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const exit = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textShift = 70 - enter * 70;
  const visualShift = 90 - enter * 90;
  const opacity = Math.min(1, enter + 0.15) * exit;

  return (
    <AbsoluteFill>
      <BackgroundWash accent={scene.accent} />
      <FloatingPetals accent={scene.accent} />
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          padding: "110px 120px",
          gap: 50,
          alignItems: "center",
          opacity,
        }}
      >
        <div style={{ transform: `translateY(${textShift}px)` }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 22px",
              borderRadius: 999,
              background: `${scene.accent}24`,
              color: "#FFF4F6",
              fontFamily: bodyFont,
              fontSize: 20,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span>{scene.eyebrow}</span>
          </div>
          <div
            style={{
              fontFamily: displayFont,
              color: PALETTE.surface,
              fontSize: 96,
              lineHeight: 0.96,
              marginTop: 34,
              maxWidth: 760,
              textWrap: "balance",
              textShadow: "0 12px 40px rgba(0,0,0,0.22)",
            }}
          >
            {scene.title}
          </div>
          <div
            style={{
              fontFamily: bodyFont,
              color: "rgba(255,247,243,0.86)",
              fontSize: 31,
              lineHeight: 1.35,
              marginTop: 30,
              maxWidth: 700,
            }}
          >
            {scene.body}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", transform: `translateY(${visualShift}px)` }}>
          <VisualPanel variant={scene.variant} accent={scene.accent} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const TRIBAL_HEARTS_TRAILER_DURATION = SCENES.reduce((sum, scene) => sum + scene.duration, 0);

export const TribalHeartsTrailer: React.FC = () => {
  let from = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.bgBottom }}>
      {SCENES.map((scene, index) => {
        const currentFrom = from;
        from += scene.duration;

        return (
          <Sequence key={scene.title} from={currentFrom} durationInFrames={scene.duration}>
            <Scene scene={scene} index={index} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};