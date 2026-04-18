import { BannerScene, BannerCaption } from "../components/BannerScene";

const captions: BannerCaption[] = [
  { from: 60,  duration: 75, headline: "Factory direct · community powered", subtitle: "Furniture · clothing · tools · electronics" },
  { from: 135, duration: 60, headline: "Production flows on bestowals", subtitle: "Conveyor belts glow with purpose" },
  { from: 195, duration: 45, headline: "Zero waste · maximum reach", subtitle: "Every product finds its tribe" },
];

export const Banner10WanderingForge: React.FC = () => (
  <BannerScene
    eyebrow="Provider Banner · 10"
    emoji="⚒️"
    heroTitle="Wandering Forge"
    cta="Register as a Wandering Forge"
    voice="10-wandering-forge"
    variant="cool"
    captions={captions}
  />
);
