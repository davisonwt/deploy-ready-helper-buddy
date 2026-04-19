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

import { Banner01CommunityOrchard } from "./banners/Banner01CommunityOrchard";
import { Banner02ProductionOrchard } from "./banners/Banner02ProductionOrchard";
import { Banner03SingleSeed } from "./banners/Banner03SingleSeed";
import { Banner04WanderingWheel } from "./banners/Banner04WanderingWheel";
import { Banner05WanderingHand } from "./banners/Banner05WanderingHand";
import { Banner06WanderingWhisperer } from "./banners/Banner06WanderingWhisperer";
import { Banner07WanderingPillow } from "./banners/Banner07WanderingPillow";
import { Banner08WanderingField } from "./banners/Banner08WanderingField";
import { Banner09WanderingHearth } from "./banners/Banner09WanderingHearth";
import { Banner10WanderingForge } from "./banners/Banner10WanderingForge";
import { Banner11Classroom } from "./banners/Banner11Classroom";

const SHARED = { fps: 30, width: 1920, height: 1080 };
const DUR = 600;       // legacy 20s explainers
const BANNER_DUR = 300; // S2G banners: 10s

export const RemotionRoot = () => (
  <>
    {/* Legacy 20s feature explainers */}
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

    {/* S2G Banners (10s, English captions, Chatterbox voiceover, real logo) */}
    {/* Community orchard VO is ~16.6s; extend to 18s so VO finishes + ~1.4s music tail */}
    <Composition id="banner-01-community-orchard" component={Banner01CommunityOrchard} durationInFrames={540} {...SHARED} />
    {/* Production orchard VO is ~13.6s; extend to 15s so VO finishes + ~1.4s music tail */}
    <Composition id="banner-02-production-orchard" component={Banner02ProductionOrchard} durationInFrames={450} {...SHARED} />
    <Composition id="banner-03-single-seed" component={Banner03SingleSeed} durationInFrames={BANNER_DUR} {...SHARED} />
    <Composition id="banner-04-wandering-wheel" component={Banner04WanderingWheel} durationInFrames={BANNER_DUR} {...SHARED} />
    <Composition id="banner-05-wandering-hand" component={Banner05WanderingHand} durationInFrames={BANNER_DUR} {...SHARED} />
    {/* Wandering whisperer VO is ~10.7s; extend to 12s so VO finishes + ~1.3s music tail */}
    <Composition id="banner-06-wandering-whisperer" component={Banner06WanderingWhisperer} durationInFrames={360} {...SHARED} />
    <Composition id="banner-07-wandering-pillow" component={Banner07WanderingPillow} durationInFrames={BANNER_DUR} {...SHARED} />
    <Composition id="banner-08-wandering-field" component={Banner08WanderingField} durationInFrames={BANNER_DUR} {...SHARED} />
    <Composition id="banner-09-wandering-hearth" component={Banner09WanderingHearth} durationInFrames={BANNER_DUR} {...SHARED} />
    <Composition id="banner-10-wandering-forge" component={Banner10WanderingForge} durationInFrames={BANNER_DUR} {...SHARED} />

    {/* Go Live explainers — Classroom is a 12s vertical 9:16 illustrated explainer */}
    <Composition
      id="banner-11-classroom"
      component={Banner11Classroom}
      durationInFrames={360}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
