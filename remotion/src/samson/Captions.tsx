import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/BarlowCondensed";
import { LINES } from "./data";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "600"],
  subsets: ["latin"],
});

const FPS = 30;

const Line: React.FC<{ text: string; dur: number }> = ({ text, dur }) => {
  const frame = useCurrentFrame();
  const total = dur * FPS;
  const opacity = interpolate(
    frame,
    [0, 8, Math.max(9, total - 10), total],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const rise = interpolate(frame, [0, 14], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const clean = text.replace(/^"|"$/g, "").trim();

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 96,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${rise}px)`,
          maxWidth: 1450,
          textAlign: "center",
          fontFamily,
          fontWeight: 600,
          fontSize: 62,
          lineHeight: 1.12,
          letterSpacing: 1.2,
          color: "#F6EBD9",
          textShadow:
            "0 3px 26px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,1), 0 0 70px rgba(0,0,0,0.8)",
        }}
      >
        {clean}
      </div>
    </AbsoluteFill>
  );
};

export const Captions: React.FC = () => (
  <>
    {LINES.map((l, idx) => {
      const from = Math.round(l.start * FPS);
      const dur = Math.max(24, Math.round((l.end - l.start) * FPS));
      return (
        <Sequence key={idx} from={from} durationInFrames={dur}>
          <Line text={l.text} dur={dur / FPS} />
        </Sequence>
      );
    })}
  </>
);
