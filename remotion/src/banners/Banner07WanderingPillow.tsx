import { BannerScene, BannerCaption } from "../components/BannerScene";

const captions: BannerCaption[] = [
  { from: 60,  duration: 75, headline: "Open your door · welcome the world", subtitle: "Homes · cottages · farm lodges · boutique stays" },
  { from: 135, duration: 60, headline: "Travellers arrive from every nation", subtitle: "Bookings fly in as glowing seeds" },
  { from: 195, duration: 45, headline: "Host with purpose · earn with peace", subtitle: "A rest stop for the wandering tribe" },
];

export const Banner07WanderingPillow: React.FC = () => (
  <BannerScene
    eyebrow="Provider Banner · 07"
    emoji="🛏️"
    heroTitle="Wandering Pillow"
    cta="Register as a Wandering Pillow"
    voice="07-wandering-pillow"
    variant="cool"
    captions={captions}
  />
);
