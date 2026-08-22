import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Cinzel";

const { fontFamily } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });

const FPS = 30;

const Card: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30, 150, 190], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const spread = interpolate(frame, [0, 190], [12, 24], {
    extrapolateRight: "clamp",
  });
  const glow =
    "0 2px 2px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,1), 0 0 26px rgba(0,0,0,0.95)";
  return (
    <AbsoluteFill style={{ opacity }}>
      {/* full-frame darkening so the type always reads */}
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.62)" }} />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 55% 32% at 50% 50%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 100%)",
        }}
      />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <div
          style={{
            fontFamily,
            fontWeight: 700,
            fontSize: 132,
            lineHeight: 1,
            letterSpacing: spread,
            color: "#FFF7E6",
            textShadow: glow,
          }}
        >
          SAMSON
        </div>
        <div
          style={{
            marginTop: 26,
            height: 3,
            width: 460,
            background:
              "linear-gradient(90deg, rgba(227,193,119,0) 0%, #E3C177 50%, rgba(227,193,119,0) 100%)",
          }}
        />
        <div
          style={{
            marginTop: 26,
            fontFamily,
            fontWeight: 700,
            fontSize: 44,
            letterSpacing: 12,
            color: "#F5DFA8",
            textShadow: glow,
          }}
        >
          JUST ONE MORE TIME
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const TitleCard: React.FC = () => (
  <Sequence from={Math.round(16 * FPS)} durationInFrames={200}>
    <Card />
  </Sequence>
);
