import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { TribeEconomyVideo } from "./tribe-economy/MainVideo";

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
  </>
);
