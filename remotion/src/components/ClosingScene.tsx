import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: playfair } = loadPlayfair();
const { fontFamily: inter } = loadInter();

const TERRACOTTA = "#B85042";
const FOREST = "#2C5F2D";
const OCHRE = "#D4A843";

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12 } });
  const tagOp = interpolate(frame, [15, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagY = interpolate(spring({ frame: frame - 15, fps, config: { damping: 20 } }), [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ transform: `scale(${logoScale})`, marginBottom: 24 }}>
          <div style={{ fontSize: 48, fontFamily: playfair, fontWeight: 800, color: FOREST, letterSpacing: 2 }}>
            SOW<span style={{ color: TERRACOTTA }}>2</span>GROW
          </div>
          <div style={{ fontSize: 14, fontFamily: inter, color: OCHRE, letterSpacing: 6, marginTop: 4 }}>COMMUNITY MARKETPLACE</div>
        </div>
        <p style={{ fontFamily: inter, fontSize: 24, color: "#555", opacity: tagOp, transform: `translateY(${tagY}px)` }}>
          Sow Seeds · Grow Together · Harvest Blessings
        </p>
      </div>
    </AbsoluteFill>
  );
};
