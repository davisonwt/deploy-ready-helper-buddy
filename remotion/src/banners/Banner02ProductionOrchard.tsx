import { BannerScene, BannerCaption } from "../components/BannerScene";

const captions: BannerCaption[] = [
  { from: 60,  duration: 75, headline: "From idea to product", subtitle: "Sowers turn vision into supply" },
  { from: 135, duration: 60, headline: "30% funded · production starts", subtitle: "Bestowals flow into 10 glowing pockets" },
  { from: 195, duration: 45, headline: "Deliveries begin instantly", subtitle: "Factory direct to the tribe" },
];

export const Banner02ProductionOrchard: React.FC = () => (
  <BannerScene
    eyebrow="Sow Banner · 02"
    emoji="🏭"
    heroTitle="Production Orchard"
    cta="Plant a Production Orchard"
    voice="02-production-orchard"
    variant="warm"
    captions={captions}
  />
);
