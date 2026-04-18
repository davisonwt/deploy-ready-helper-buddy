import { BannerScene, BannerCaption } from "../components/BannerScene";

// 20s @ 30fps = 600 frames. Closing card uses last 60f (540-600).
const captions: BannerCaption[] = [
  { from: 60,  duration: 90,  headline: "Go Live as a Classroom.",            subtitle: "Teach voice + video to your tribe" },
  { from: 150, duration: 90,  headline: "From the young to the old.",         subtitle: "Anyone can learn. Anyone can teach." },
  { from: 240, duration: 90,  headline: "Share videos, docs & voice notes.",  subtitle: "Everything your class needs, in one room" },
  { from: 330, duration: 90,  headline: "Free or paid in USDT.",              subtitle: "You set the price. Students bestow to join." },
  { from: 420, duration: 120, headline: "Your knowledge is a seed.",          subtitle: "Plant it. Watch it grow." },
];

export const Banner11Classroom: React.FC = () => (
  <BannerScene
    eyebrow="Go Live · Classroom"
    emoji="🎓"
    heroTitle="Classroom"
    cta="Host a Classroom"
    voice="11-classroom"
    variant="cool"
    captions={captions}
  />
);
