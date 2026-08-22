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
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", opacity }}
    >
      {/* heavy scrim so the type always reads against any shot */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.86) 26%, rgba(0,0,0,0.55) 48%, rgba(0,0,0,0) 72%)",
        }}
      />
      <div
        style={{
          fontFamily,
          fontWeight: 700,
          fontSize: 128,
          letterSpacing: spread,
          color: "#FFF6E2",
          WebkitTextStroke: "2px rgba(0,0,0,0.85)",
          textShadow:
            "0 0 4px rgba(0,0,0,1), 0 4px 14px rgba(0,0,0,1), 0 8px 60px rgba(0,0,0,1)",
        }}
      >
        SAMSON
      </div>
      <div
        style={{
          marginTop: 22,
          height: 3,
          width: 420,
          background:
            "linear-gradient(90deg, rgba(201,168,106,0) 0%, #E3C177 50%, rgba(201,168,106,0) 100%)",
        }}
      />
      <div
        style={{
          marginTop: 24,
          fontFamily,
          fontWeight: 700,
          fontSize: 42,
          letterSpacing: 10,
          color: "#F0D79B",
          WebkitTextStroke: "1px rgba(0,0,0,0.8)",
          textShadow:
            "0 0 4px rgba(0,0,0,1), 0 3px 12px rgba(0,0,0,1), 0 6px 40px rgba(0,0,0,1)",
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
