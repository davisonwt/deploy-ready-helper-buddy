import { BannerScene, BannerCaption } from "../components/BannerScene";

// VO is ~13.3s (399 frames). Closing card appears at frame 372.
// Captions are paced to track the narration without colliding with the CTA.
const captions: BannerCaption[] = [
  { from: 60,  duration: 100, headline: "Our tribe needs a vehicle", subtitle: "A community-driven need is shared" },
  { from: 165, duration: 100, headline: "Open a Community Orchard", subtitle: "Glowing pockets fill with bestowals" },
  { from: 270, duration: 95,  headline: "Need fulfilled. Vehicle delivered.", subtitle: "When the last pocket fills, the seed grows" },
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
  />
);
