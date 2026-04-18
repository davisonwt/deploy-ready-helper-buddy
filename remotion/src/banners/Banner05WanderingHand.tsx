import { BannerScene, BannerCaption } from "../components/BannerScene";

const captions: BannerCaption[] = [
  { from: 60,  duration: 75, headline: "Skilled hands needed", subtitle: "Plumbers · electricians · domestic · security" },
  { from: 135, duration: 60, headline: "Bookings fly in from the tribe", subtitle: "Your calendar fills with light" },
  { from: 195, duration: 45, headline: "Your skills · your schedule · your tribe", subtitle: "Five-star reviews glow up" },
];

export const Banner05WanderingHand: React.FC = () => (
  <BannerScene
    eyebrow="Provider Banner · 05"
    emoji="🛠️"
    heroTitle="Wandering Hand"
    cta="Register as a Wandering Hand"
    voice="05-wandering-hand"
    variant="cool"
    captions={captions}
  />
);
