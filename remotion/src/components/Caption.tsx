import { useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

interface Props {
  headline: string;
  subtitle?: string;
  delay?: number;
  bottom?: number;
}

/** Bold readable English caption + smaller subtitle, anchored bottom-center. */
export const Caption: React.FC<Props> = ({ headline, subtitle, delay = 0, bottom = 80 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  const op = interpolate(s, [0, 1], [0, 1]);
  const ty = interpolate(s, [0, 1], [40, 0]);

  return (
    <div style={{
      position: "absolute", bottom, left: 0, right: 0,
      textAlign: "center", opacity: op, transform: `translateY(${ty}px)`,
      padding: "0 80px",
    }}>
      <div style={{
        display: "inline-block",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(0px)",
        padding: "20px 36px", borderRadius: 20,
        maxWidth: 1600,
      }}>
        <div style={{
          fontFamily: inter, fontWeight: 800, fontSize: 56, color: "white",
          lineHeight: 1.1, letterSpacing: -0.5,
          textShadow: "0 2px 12px rgba(0,0,0,0.6)",
        }}>
          {headline}
        </div>
        {subtitle && (
          <div style={{
            fontFamily: inter, fontWeight: 500, fontSize: 28, color: "#FFE6B3",
            marginTop: 10, lineHeight: 1.3,
          }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
