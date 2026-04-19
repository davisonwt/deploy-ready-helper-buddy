import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont as loadEmoji } from "@remotion/google-fonts/NotoColorEmoji";

const { fontFamily: emojiFont } = loadEmoji();
const emojiStack = `${emojiFont}, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;

const FOREST = "#2C5F2D";
const TERRACOTTA = "#B85042";
const OCHRE = "#D4A843";
const GOLD = "#FFD78A";

/** Scene 1: Tribe gathers around a need (60–165) — silhouettes + floating need bubble. */
const SceneNeed: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const float = Math.sin(f / 14) * 8;
  const bubbleS = spring({ frame: f - 8, fps, config: { damping: 12 } });

  const people = ["🧑‍🌾", "👩‍🦱", "🧔", "👵", "🧑", "👨‍🦳", "👩"];
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 180 }}>
      {/* Floating need bubble */}
      <div style={{
        transform: `translateY(${-180 + float}px) scale(${bubbleS})`,
        background: "rgba(255,255,255,0.92)",
        border: `4px solid ${TERRACOTTA}`,
        borderRadius: 32,
        padding: "22px 38px",
        fontSize: 110,
        fontFamily: emojiStack,
        boxShadow: "0 20px 50px rgba(184,80,66,0.35)",
        marginBottom: 40,
      }}>
        🚐
      </div>
      {/* Tribe row */}
      <div style={{ display: "flex", gap: 28 }}>
        {people.map((p, i) => {
          const wobble = Math.sin((f + i * 18) / 18) * 6;
          const enter = spring({ frame: f - i * 5, fps, config: { damping: 15 } });
          return (
            <div key={i} style={{
              fontSize: 130,
              fontFamily: emojiStack,
              transform: `translateY(${interpolate(enter, [0, 1], [60, wobble])}px) scale(${enter})`,
              filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.25))",
              lineHeight: 1,
            }}>{p}</div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Scene 2: Glowing pockets fill with bestowals (165–270) — 10 pockets glow in sequence. */
const ScenePockets: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 10 pockets, light up over ~80 frames
  const pockets = Array.from({ length: 10 });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 36,
        padding: 40,
      }}>
        {pockets.map((_, i) => {
          const fillStart = i * 7;
          const fillS = spring({ frame: f - fillStart, fps, config: { damping: 12, stiffness: 180 } });
          const filled = interpolate(fillS, [0, 1], [0, 1]);
          const glow = interpolate(filled, [0, 1], [0, 1]);
          return (
            <div key={i} style={{
              width: 150,
              height: 150,
              borderRadius: 28,
              background: `radial-gradient(circle, ${GOLD} 0%, ${OCHRE} 55%, ${TERRACOTTA} 100%)`,
              opacity: 0.25 + filled * 0.75,
              transform: `scale(${0.85 + filled * 0.15})`,
              boxShadow: `0 0 ${30 + glow * 60}px ${glow * 30}px ${GOLD}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 64, fontFamily: emojiStack,
              border: `4px solid ${filled > 0.5 ? OCHRE : "rgba(184,80,66,0.4)"}`,
            }}>
              {filled > 0.6 ? "💛" : ""}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Scene 3: Need fulfilled — vehicle delivered, tree grows (270–390). */
const SceneDelivered: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const truckS = spring({ frame: f - 10, fps, config: { damping: 14 } });
  const truckX = interpolate(truckS, [0, 1], [-700, 0]);
  const treeS = spring({ frame: f - 35, fps, config: { damping: 10 } });
  const treeScale = interpolate(treeS, [0, 1], [0.2, 1]);
  const sparkleRot = (f * 3) % 360;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 80 }}>
        {/* Tree growing */}
        <div style={{
          fontSize: 280,
          fontFamily: emojiStack,
          transform: `scale(${treeScale})`,
          transformOrigin: "bottom center",
          filter: "drop-shadow(0 18px 36px rgba(44,95,45,0.4))",
          lineHeight: 1,
        }}>🌳</div>
        {/* Truck arriving */}
        <div style={{
          fontSize: 240,
          fontFamily: emojiStack,
          transform: `translateX(${truckX}px)`,
          filter: "drop-shadow(0 18px 36px rgba(0,0,0,0.3))",
          lineHeight: 1,
        }}>🚐</div>
      </div>
      {/* Celebration sparkles */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const r = 280;
        const x = Math.cos(((deg + sparkleRot) * Math.PI) / 180) * r;
        const y = Math.sin(((deg + sparkleRot) * Math.PI) / 180) * r;
        const sp = spring({ frame: f - 25 - i * 3, fps, config: { damping: 12 } });
        return (
          <div key={i} style={{
            position: "absolute",
            fontSize: 64,
            fontFamily: emojiStack,
            transform: `translate(${x}px, ${y}px) scale(${sp})`,
          }}>✨</div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Cinematic illustrated scenes for Community Orchard.
 *  Plays from frame 60 to 390 in the 540-frame (18s) composition. */
export const CommunityOrchardScenes: React.FC = () => (
  <>
    <Sequence from={60} durationInFrames={105}>
      <SceneNeed />
    </Sequence>
    <Sequence from={165} durationInFrames={105}>
      <ScenePockets />
    </Sequence>
    <Sequence from={270} durationInFrames={120}>
      <SceneDelivered />
    </Sequence>
  </>
);
