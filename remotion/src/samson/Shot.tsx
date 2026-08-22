import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import type { Shot as ShotType } from "./data";

const FPS = 30;

/** Ken Burns move for stills — deterministic variety derived from the index. */
const kenBurns = (i: number, p: number) => {
  const mode = i % 4;
  const ease = p * p * (3 - 2 * p); // smoothstep
  if (mode === 0) return { scale: 1.06 + ease * 0.12, x: 0, y: -ease * 18 };
  if (mode === 1) return { scale: 1.2 - ease * 0.11, x: 0, y: ease * 14 };
  if (mode === 2) return { scale: 1.12 + ease * 0.06, x: -ease * 46, y: 0 };
  return { scale: 1.12 + ease * 0.06, x: ease * 46, y: -ease * 10 };
};

export const Shot: React.FC<{ shot: ShotType; clipDur: number }> = ({
  shot,
  clipDur,
}) => {
  const frame = useCurrentFrame();
  const total = clipDur * FPS;
  const p = Math.min(1, Math.max(0, frame / Math.max(1, total)));

  // Crossfade in over 14 frames (shot 0 is a fade up from black).
  const opacity = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const inner =
    shot.kind === "img" ? (
      (() => {
        const { scale, x, y } = kenBurns(shot.i, p);
        return (
          <Img
            src={staticFile(shot.src)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${scale}) translate(${x}px, ${y}px)`,
            }}
          />
        );
      })()
    ) : (
      <OffthreadVideo
        src={staticFile(shot.src)}
        muted
        // Veo clips are 8s; stretch or compress them onto the shot's slot.
        playbackRate={Math.min(1.6, Math.max(0.55, 8 / clipDur))}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scale(1.04)",
        }}
      />
    );

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: "#000" }}>
      {inner}
      {/* cinematic grade: warm/cool split + vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.62) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(18,10,4,0.30) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 60%, rgba(6,8,14,0.45) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
