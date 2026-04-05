import { Composition } from "remotion";
import { Video01Overview } from "./videos/Video01Overview";
import { Video02Marketplace } from "./videos/Video02Marketplace";
import { Video03Gigs } from "./videos/Video03Gigs";
import { Video04Stays } from "./videos/Video04Stays";
import { Video05Chat } from "./videos/Video05Chat";
import { Video06Radio } from "./videos/Video06Radio";
import { Video07Training } from "./videos/Video07Training";
import { Video08Calendar } from "./videos/Video08Calendar";
import { Video09Wallet } from "./videos/Video09Wallet";
import { Video10AI } from "./videos/Video10AI";

const SHARED = { fps: 30, width: 1920, height: 1080 };
const DUR = 600; // 20s

export const RemotionRoot = () => (
  <>
    <Composition id="v01-overview" component={Video01Overview} durationInFrames={DUR} {...SHARED} />
    <Composition id="v02-marketplace" component={Video02Marketplace} durationInFrames={DUR} {...SHARED} />
    <Composition id="v03-gigs" component={Video03Gigs} durationInFrames={DUR} {...SHARED} />
    <Composition id="v04-stays" component={Video04Stays} durationInFrames={DUR} {...SHARED} />
    <Composition id="v05-chat" component={Video05Chat} durationInFrames={DUR} {...SHARED} />
    <Composition id="v06-radio" component={Video06Radio} durationInFrames={DUR} {...SHARED} />
    <Composition id="v07-training" component={Video07Training} durationInFrames={DUR} {...SHARED} />
    <Composition id="v08-calendar" component={Video08Calendar} durationInFrames={DUR} {...SHARED} />
    <Composition id="v09-wallet" component={Video09Wallet} durationInFrames={DUR} {...SHARED} />
    <Composition id="v10-ai" component={Video10AI} durationInFrames={DUR} {...SHARED} />
  </>
);
