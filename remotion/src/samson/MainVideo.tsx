import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { SHOTS, SONG_DURATION } from "./data";
import { Shot } from "./Shot";
import { Captions } from "./Captions";
import { TitleCard } from "./TitleCard";

const FPS = 30;
export const SAMSON_DURATION = Math.ceil(SONG_DURATION * FPS);

/** Global film-grade layer: subtle flicker + final fade to black. */
const Grade: React.FC = () => {
  const frame = useCurrentFrame();
  const flicker = 0.965 + Math.sin(frame * 0.9) * 0.012 + Math.sin(frame * 0.31) * 0.01;
  const fadeOut = interpolate(
    frame,
    [SAMSON_DURATION - 90, SAMSON_DURATION],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <>
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          opacity: (1 - flicker) * 2 + fadeOut,
          pointerEvents: "none",
        }}
      />
      {/* letterbox bars for scope feel */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{ height: 44, background: "#000" }} />
        <div style={{ flex: 1 }} />
        <div style={{ height: 44, background: "#000" }} />
      </AbsoluteFill>
    </>
  );
};

export const SamsonVideo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {SHOTS.map((shot) => {
      const from = Math.round(shot.start * FPS);
      // +18 frames of tail so the next shot crossfades over this one
      const dur = Math.round((shot.end - shot.start) * FPS) + 18;
      return (
        <Sequence key={shot.i} from={from} durationInFrames={dur} layout="none">
          <Shot shot={shot} clipDur={shot.end - shot.start} />
        </Sequence>
      );
    })}
    <TitleCard />
    <Captions />
    <Grade />
  </AbsoluteFill>
);
