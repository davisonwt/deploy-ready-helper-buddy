import { AbsoluteFill, Audio, staticFile, Sequence } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { PersistentBackground } from "../components/PersistentBackground";
import { SceneHook } from "./scenes/SceneHook";
import { SceneRoles } from "./scenes/SceneRoles";
import { SceneLoop } from "./scenes/SceneLoop";
import { ScenePayoff } from "./scenes/ScenePayoff";

export function TribeEconomyVideo() {
  return (
    <AbsoluteFill>
      <Sequence from={15}>
        <Audio src={staticFile("audio/vo-tribe-economy.mp3")} volume={1} />
      </Sequence>
      <PersistentBackground />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={240}>
          <SceneHook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={480}>
          <SceneRoles />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={600}>
          <SceneLoop />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={540}>
          <ScenePayoff />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
}
