import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: playfair } = loadPlayfair();
const { fontFamily: inter } = loadInter();

interface Props {
  text: string;
  delay?: number;
  size?: number;
  color?: string;
  font?: "display" | "body";
  weight?: number;
  x?: number;
  y?: number;
}

export const AnimatedText: React.FC<Props> = ({ text, delay = 0, size = 36, color = "#2C5F2D", font = "display", weight = 700, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 20 } });
  const translateY = interpolate(s, [0, 1], [50, 0]);
  const opacity = interpolate(s, [0, 1], [0, 1]);

  return (
    <div style={{
      position: x !== undefined ? "absolute" : "relative",
      left: x, top: y,
      fontFamily: font === "display" ? playfair : inter,
      fontSize: size, fontWeight: weight, color,
      transform: `translateY(${translateY}px)`, opacity,
    }}>
      {text}
    </div>
  );
};
