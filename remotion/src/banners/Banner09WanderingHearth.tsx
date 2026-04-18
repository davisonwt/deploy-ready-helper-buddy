import { BannerScene, BannerCaption } from "../components/BannerScene";

const captions: BannerCaption[] = [
  { from: 60,  duration: 75, headline: "Handmade with love", subtitle: "Jams · soaps · candles · baked goods · teas" },
  { from: 135, duration: 60, headline: "Glowing parcels fly to happy homes", subtitle: "Each one a piece of your hearth" },
  { from: 195, duration: 45, headline: "Bestowed with purpose", subtitle: "Your craft · sustained by the tribe" },
];

export const Banner09WanderingHearth: React.FC = () => (
  <BannerScene
    eyebrow="Provider Banner · 09"
    emoji="🕯️"
    heroTitle="Wandering Hearth"
    cta="Register as a Wandering Hearth"
    voice="09-wandering-hearth"
    variant="warm"
    captions={captions}
  />
);
