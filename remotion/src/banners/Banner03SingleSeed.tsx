import { BannerScene, BannerCaption } from "../components/BannerScene";

const captions: BannerCaption[] = [
  { from: 60,  duration: 75, headline: "Sow one seed. Anything you offer.", subtitle: "Music, produce, services, vehicles" },
  { from: 135, duration: 60, headline: "One pocket. One bestowal.", subtitle: "Direct from the community to you" },
  { from: 195, duration: 45, headline: "Seed grows. You get paid.", subtitle: "The simplest way to start" },
];

export const Banner03SingleSeed: React.FC = () => (
  <BannerScene
    eyebrow="Sow Banner · 03"
    emoji="🌱"
    heroTitle="Single Seed"
    cta="Sow a Single Seed"
    voice="03-single-seed"
    variant="warm"
    captions={captions}
  />
);
