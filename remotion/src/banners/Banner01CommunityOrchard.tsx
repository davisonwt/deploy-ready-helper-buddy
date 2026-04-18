import { BannerScene, BannerCaption } from "../components/BannerScene";

const captions: BannerCaption[] = [
  { from: 60,  duration: 75, headline: "Our tribe needs a vehicle", subtitle: "A community-driven need is shared" },
  { from: 135, duration: 60, headline: "Open a Community Orchard", subtitle: "Glowing pockets fill with bestowals" },
  { from: 195, duration: 45, headline: "Need fulfilled. Vehicle delivered.", subtitle: "When the last pocket fills, the seed grows" },
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
