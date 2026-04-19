import { BannerScene, BannerCaption } from "../components/BannerScene";

// VO ~13.6s (408 frames). Closing card appears at frame 390 (last 60f of 450).
const captions: BannerCaption[] = [
  { from: 60,  duration: 110, headline: "From idea to product", subtitle: "Sowers turn vision into supply" },
  { from: 175, duration: 110, headline: "30% funded · production starts", subtitle: "Bestowals flow into 10 glowing pockets" },
  { from: 290, duration: 95,  headline: "Deliveries begin instantly", subtitle: "Factory direct to the tribe" },
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
