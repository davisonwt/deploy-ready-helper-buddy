import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Img, staticFile } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter();

const TERRACOTTA = "#B85042";
const OCHRE = "#D4A843";

export const ClosingScene: React.FC<{ cta?: string }> = ({ cta = "Join the Sow2Grow Community" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12 } });
  const tagOp = interpolate(frame, [15, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagY = interpolate(spring({ frame: frame - 15, fps, config: { damping: 20 } }), [0, 1], [30, 0]);
  const ctaScale = spring({ frame: frame - 30, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ transform: `scale(${logoScale})`, marginBottom: 24 }}>
          <Img src={staticFile("logo.jpeg")} style={{ width: 360, height: "auto", borderRadius: 24, boxShadow: "0 12px 48px rgba(0,0,0,0.15)" }} />
        </div>
        <p style={{ fontFamily: inter, fontSize: 28, fontWeight: 600, color: "#333", opacity: tagOp, transform: `translateY(${tagY}px)`, margin: "16px 0" }}>
          Sow Seeds · Grow Together · Harvest Blessings
        </p>
        <div style={{
          transform: `scale(${ctaScale})`,
          background: `linear-gradient(135deg, ${TERRACOTTA}, ${OCHRE})`,
          color: "white", fontFamily: inter, fontWeight: 700, fontSize: 26,
          padding: "18px 44px", borderRadius: 999, marginTop: 24, display: "inline-block",
          boxShadow: "0 8px 32px rgba(184,80,66,0.4)",
        }}>
          {cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};
