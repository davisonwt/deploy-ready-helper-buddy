import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Cinzel";

const { fontFamily } = loadFont("normal", { weights: ["600"], subsets: ["latin"] });

const FPS = 30;

const Card: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30, 150, 190], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const spread = interpolate(frame, [0, 190], [10, 22], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", opacity }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 34%, rgba(0,0,0,0) 62%)",
        }}
      />
      <div
        style={{
          fontFamily,
          fontWeight: 600,
          fontSize: 96,
          letterSpacing: spread,
          color: "#F3E3C4",
          textShadow: "0 6px 50px rgba(0,0,0,0.95)",
        }}
      >
        SAMSON
      </div>
      <div
        style={{
          marginTop: 26,
          fontFamily,
          fontSize: 34,
          letterSpacing: 12,
          color: "#C9A86A",
          textShadow: "0 4px 30px rgba(0,0,0,0.95)",
        }}
      >
        JUST ONE MORE TIME
      </div>
    </AbsoluteFill>
  );
};

export const TitleCard: React.FC = () => (
  <Sequence from={Math.round(16 * FPS)} durationInFrames={200}>
    <Card />
  </Sequence>
);
