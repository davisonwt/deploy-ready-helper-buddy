import { BannerScene, BannerCaption } from "../components/BannerScene";

const captions: BannerCaption[] = [
  { from: 60,  duration: 75, headline: "Farm to tribe · no middleman", subtitle: "Tomatoes · honey · avocados · eggs" },
  { from: 135, duration: 60, headline: "Bestowals fly straight to the field", subtitle: "Direct support, direct delivery" },
  { from: 195, duration: 45, headline: "Your harvest feeds the tribe", subtitle: "Earnings rain down on the field" },
];

export const Banner08WanderingField: React.FC = () => (
  <BannerScene
    eyebrow="Provider Banner · 08"
    emoji="🌾"
    heroTitle="Wandering Field"
    cta="Register as a Wandering Field"
    voice="08-wandering-field"
    variant="warm"
    captions={captions}
  />
);
