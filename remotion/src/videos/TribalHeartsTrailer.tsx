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

type SceneDef = {
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  duration: number;
  image: string;
  imagePosition?: string;
  pill?: string;
};

const PALETTE = {
  blush: "#E48AA0",
  gold: "#E1C16E",
  sage: "#8DA377",
  aqua: "#8BD3E6",
  ivory: "#FFF7F0",
  ink: "#2D1824",
  plum: "#3B1F31",
  mist: "rgba(255,247,240,0.78)",
};

const LOGO_ACCENT = "#5ED7E5";

const SCENES: SceneDef[] = [
  { eyebrow: "Global garden", title: "A living connection takes root", body: "Across oceans and continents.", accent: PALETTE.blush, duration: 240, image: "tribal-hearts/01-map.jpeg", imagePosition: "center center" },
  { eyebrow: "Beyond swipes", title: "Choose something deeper", body: "Sow something deeper than likes and swipes.", accent: PALETTE.gold, duration: 240, image: "tribal-hearts/02-woman.jpeg", imagePosition: "center center" },
  { eyebrow: "Real connection", title: "They’re choosing Tribal Hearts", body: "Choosing growth. Choosing Tribal Hearts.", accent: PALETTE.sage, duration: 240, image: "tribal-hearts/03-man.jpeg", imagePosition: "center center" },
  { eyebrow: "Kindness blooms", title: "A space for authentic souls", body: "Friendships and love grow naturally.", accent: PALETTE.blush, duration: 270, image: "tribal-hearts/04-penguins.jpeg", imagePosition: "center center" },
  { eyebrow: "Your tribe is waiting", title: "From Cape Town to Brazil", body: "Lagos to India and beyond.", accent: PALETTE.aqua, duration: 300, image: "tribal-hearts/05-global-profiles.jpeg", imagePosition: "center center" },
  { eyebrow: "Feels like home", title: "Meaningful conversations", body: "Heartfelt messages, miles apart.", accent: PALETTE.sage, duration: 300, image: "tribal-hearts/06-chat.jpeg", imagePosition: "center center" },
  { eyebrow: "Nurtured with care", title: "The most beautiful relationships grow", body: "Grown with intention and care.", accent: PALETTE.gold, duration: 300, image: "tribal-hearts/07-couple.jpeg", imagePosition: "center center" },
  { eyebrow: "Garden of souls", title: "Where your growth journey begins", body: "Uplift, support, celebrate.", accent: PALETTE.aqua, duration: 300, image: "tribal-hearts/08-community.jpeg", imagePosition: "center center" },
  { eyebrow: "Beautifully bloom", title: "Sow the connection", body: "Watch love and belonging bloom.", accent: PALETTE.blush, duration: 240, image: "tribal-hearts/09-bloom.jpeg", imagePosition: "center center" },
  { eyebrow: "Sow2Grow presents", title: "Find your tribe. Grow together.", body: "Tribal Hearts.", accent: PALETTE.gold, duration: 210, image: "tribal-hearts/10-logo.jpeg", imagePosition: "center center" },
];

const TOTAL_DURATION = SCENES.reduce((sum, scene) => sum + scene.duration, 0);

const LogoBadge: React.FC<{ accent: string; small?: boolean }> = ({ accent, small = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const size = small ? 156 : 188;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: "rgba(255,255,255,0.92)",
        border: `6px solid ${accent}`,
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
          border: `2px dashed ${accent}`,
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

const BackgroundImage: React.FC<{ src: string; position?: string }> = ({ src, position = "center center" }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 180], [1.08, 1.18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const driftX = Math.sin(frame / 32) * 16;
  const driftY = Math.cos(frame / 40) * 10;

  return (
    <>
      <Img
        src={staticFile(src)}
        style={{
          position: "absolute",
          inset: -90,
          width: "calc(100% + 180px)",
          height: "calc(100% + 180px)",
          objectFit: "cover",
          objectPosition: position,
          transform: `translate(${driftX}px, ${driftY}px) scale(${scale})`,
          filter: "saturate(0.92) contrast(1.06) brightness(0.72)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(20,8,16,0.88) 0%, rgba(25,10,20,0.66) 36%, rgba(25,10,20,0.18) 68%, rgba(20,8,16,0.58) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(255,214,177,0.16) 0%, rgba(24,10,18,0.04) 25%, rgba(14,7,13,0.52) 100%)",
        }}
      />
    </>
  );
};

const FloatingDust: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();

  return (
    <>
      {Array.from({ length: 12 }).map((_, index) => {
        const left = 8 + ((index * 7.7) % 84);
        const top = 6 + ((index * 11.3) % 80);
        const size = 8 + (index % 4) * 5;
        const offsetY = Math.sin((frame + index * 10) / 22) * (8 + index);
        const offsetX = Math.cos((frame + index * 8) / 26) * (4 + index * 0.8);
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              borderRadius: 999,
              transform: `translate(${offsetX}px, ${offsetY}px)`,
              background: `${accent}66`,
              boxShadow: `0 0 28px ${accent}55`,
              opacity: 0.65,
            }}
          />
        );
      })}
    </>
  );
};

const TextPanel: React.FC<{ scene: SceneDef; index: number }> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 18, stiffness: 130 } });
  const outro = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: 720,
        marginLeft: 108,
        transform: `translateY(${36 - reveal * 36}px)`,
        opacity: Math.min(1, reveal + 0.08) * outro,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 20px",
          borderRadius: 999,
          background: `${scene.accent}22`,
          border: `1px solid ${scene.accent}66`,
          color: PALETTE.ivory,
          fontFamily: bodyFont,
          fontWeight: 600,
          fontSize: 18,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span>{scene.eyebrow}</span>
      </div>
      <div
        style={{
          marginTop: 28,
          fontFamily: displayFont,
          fontSize: 96,
          lineHeight: 0.94,
          color: PALETTE.ivory,
          textShadow: "0 14px 40px rgba(0,0,0,0.28)",
          maxWidth: 680,
        }}
      >
        {scene.title}
      </div>
      <div
        style={{
          marginTop: 26,
          maxWidth: 640,
          color: "rgba(255,247,240,0.9)",
          fontFamily: bodyFont,
          fontSize: 31,
          lineHeight: 1.34,
        }}
      >
        {scene.body}
      </div>
      {scene.pill ? (
        <div
          style={{
            marginTop: 30,
            display: "inline-flex",
            alignItems: "center",
            padding: "12px 18px",
            borderRadius: 999,
            background: PALETTE.mist,
            color: PALETTE.ink,
            fontFamily: bodyFont,
            fontWeight: 700,
            fontSize: 20,
            boxShadow: "0 14px 34px rgba(0,0,0,0.16)",
          }}
        >
          {scene.pill}
        </div>
      ) : null}
    </div>
  );
};

const RightVisual: React.FC<{ scene: SceneDef; index: number }> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 110 } });
  const floatY = Math.sin(frame / 20) * 10;
  const imageScale = 1.02 + Math.sin(frame / 28) * 0.025;

  return (
    <div
      style={{
        position: "relative",
        width: 690,
        height: 760,
        marginRight: 94,
        transform: `translateY(${42 - rise * 42 + floatY}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 38,
          overflow: "hidden",
          boxShadow: "0 28px 90px rgba(0,0,0,0.34)",
          border: `1px solid ${scene.accent}55`,
        }}
      >
        <Img
          src={staticFile(scene.image)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: scene.imagePosition ?? "center center",
            transform: `scale(${imageScale})`,
            filter: "saturate(0.95) contrast(1.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(19,9,15,0.04) 0%, rgba(19,9,15,0.48) 100%)",
          }}
        />
      </div>

      <div style={{ position: "absolute", top: 82, left: 82, zIndex: 5 }}>
        <LogoBadge accent={LOGO_ACCENT} small />
      </div>

      <div
        style={{
          position: "absolute",
          right: 22,
          bottom: 24,
          padding: "16px 18px",
          borderRadius: 24,
          background: "rgba(255,247,240,0.84)",
          color: PALETTE.ink,
          fontFamily: bodyFont,
          boxShadow: "0 16px 34px rgba(0,0,0,0.16)",
          minWidth: 210,
        }}
      >
        <div style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.68, fontWeight: 700 }}>
          Tribal Hearts
        </div>
        <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>{index === SCENES.length - 1 ? "Enter the garden" : "Sow2Grow"}</div>
      </div>
    </div>
  );
};

const ClosingOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({ frame: frame - 16, fps, config: { damping: 16, stiffness: 120 } });
  const opacity = interpolate(frame, [40, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          transform: `translateY(${30 - reveal * 30}px) scale(${0.92 + reveal * 0.08})`,
        }}
      >
        <LogoBadge accent={LOGO_ACCENT} />
        <div style={{ fontFamily: displayFont, fontSize: 74, color: PALETTE.ivory, textShadow: "0 12px 40px rgba(0,0,0,0.28)" }}>
          Let love grow naturally
        </div>
      </div>
    </div>
  );
};

const Scene: React.FC<{ scene: SceneDef; index: number }> = ({ scene, index }) => {
  const isClosing = index === SCENES.length - 1;

  return (
    <AbsoluteFill>
      <BackgroundImage src={scene.image} position={scene.imagePosition} />
      <FloatingDust accent={scene.accent} />
      {!isClosing ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TextPanel scene={scene} index={index} />
          <RightVisual scene={scene} index={index} />
        </div>
      ) : (
        <ClosingOverlay />
      )}
    </AbsoluteFill>
  );
};

export const TRIBAL_HEARTS_TRAILER_DURATION = TOTAL_DURATION;

export const TribalHeartsTrailer: React.FC = () => {
  let from = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.plum }}>
      {SCENES.map((scene, index) => {
        const start = from;
        from += scene.duration;
        return (
          <Sequence key={scene.title} from={start} durationInFrames={scene.duration}>
            <Scene scene={scene} index={index} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
