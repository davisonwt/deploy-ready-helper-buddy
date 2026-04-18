import { BannerScene, BannerCaption } from "../components/BannerScene";

const captions: BannerCaption[] = [
  { from: 60,  duration: 75, headline: "Drive for your tribe", subtitle: "Trucks · motorbikes · cars" },
  { from: 135, duration: 60, headline: "Deliveries roll in from the community", subtitle: "Packages, produce, handmade goods" },
  { from: 195, duration: 45, headline: "Deliver. Earn. Serve.", subtitle: "Glowing roads connect every village" },
];

export const Banner04WanderingWheel: React.FC = () => (
  <BannerScene
    eyebrow="Provider Banner · 04"
    emoji="🚚"
    heroTitle="Wandering Wheel"
    cta="Register as a Wandering Wheel"
    voice="04-wandering-wheel"
    variant="cool"
    captions={captions}
  />
);
