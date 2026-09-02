import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { TribeEconomyVideo } from "./tribe-economy/MainVideo";
import { HookClip, TIMINGS } from "./hooks/HookClip";
import { HOOK_SCRIPTS } from "./hooks/scripts";


export const RemotionRoot = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={2250}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="tribe-economy"
      component={TribeEconomyVideo}
      durationInFrames={1800}
      fps={30}
      width={1920}
      height={1080}
    />

    {HOOK_SCRIPTS.map((script) => (
      <Composition
        key={script.id}
        id={script.id}
        component={HookClip}
        defaultProps={{ script }}
        durationInFrames={TIMINGS[script.id].durationInFrames}
        fps={30}
        width={1080}
        height={1920}
      />
    ))}
  </>
);
