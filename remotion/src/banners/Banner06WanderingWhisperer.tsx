import { BannerScene, BannerCaption } from "../components/BannerScene";

const captions: BannerCaption[] = [
  { from: 60,  duration: 75, headline: "Amplify the tribe", subtitle: "Promote sellers across every platform" },
  { from: 135, duration: 60, headline: "Glowing posts fly out to the world", subtitle: "Instagram · Facebook · TikTok · X" },
  { from: 195, duration: 45, headline: "Grow their seeds. Earn alongside.", subtitle: "A whisper that becomes a harvest" },
];

export const Banner06WanderingWhisperer: React.FC = () => (
  <BannerScene
    eyebrow="Provider Banner · 06"
    emoji="📣"
    heroTitle="Wandering Whisperer"
    cta="Register as a Wandering Whisperer"
    voice="06-wandering-whisperer"
    variant="warm"
    captions={captions}
  />
);
