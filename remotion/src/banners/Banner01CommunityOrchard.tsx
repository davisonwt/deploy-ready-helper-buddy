import { BannerScene, BannerCaption } from "../components/BannerScene";
import { CommunityOrchardScenes } from "../components/CommunityOrchardScenes";

// VO is ~16.6s. Composition is 540 frames (18s). Closing card occupies the last 60f.
const captions: BannerCaption[] = [
  { from: 60,  duration: 100, headline: "Our tribe needs a vehicle", subtitle: "A community-driven need is shared" },
  { from: 165, duration: 100, headline: "Open a Community Orchard", subtitle: "Glowing pockets fill with bestowals" },
  { from: 270, duration: 120, headline: "Need fulfilled. Vehicle delivered.", subtitle: "When the last pocket fills, the seed grows" },
];

export const Banner01CommunityOrchard: React.FC = () => (
  <BannerScene
    eyebrow="Sow Banner · 01"
    emoji="🌳"
    heroTitle="Community Orchard"
    cta="Plant a Community Orchard"
    voice="01-community-orchard"
    variant="warm"
    captions={captions}
    cinematicScenes={<CommunityOrchardScenes />}
  />
);
