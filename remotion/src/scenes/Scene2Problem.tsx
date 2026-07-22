import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from "remotion";

const EMBER = "#FF8A5B";
const TEXT = "#EAF4F2";
const MUTED = "#7E9498";
const PANEL = "rgba(18,51,48,0.5)";

export function Scene2Problem() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingProgress = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const cardProgress = spring({ frame: frame - 20, fps, config: { damping: 18, stiffness: 100 } });

  const headingY = interpolate(headingProgress, [0, 1], [30, 0]);
  const cardY = interpolate(cardProgress, [0, 1], [50, 0]);

  const items = [
    "Big platforms take your attention",
    "They sell your data",
    "Creators get crumbs",
    "Community value leaks away",
  ];

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <div style={{ transform: `translateY(${headingY}px)`, textAlign: "center", marginBottom: 48 }}>
        <p
          style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: 20,
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            color: EMBER,
            marginBottom: 20,
          }}
        >
          The problem
        </p>
        <h2
          style={{
            fontFamily: '"Fraunces", serif',
            fontSize: 64,
            fontWeight: 700,
            color: TEXT,
            maxWidth: 900,
            lineHeight: 1.15,
          }}
        >
          Your tribe creates value. Someone else cashes in.
        </h2>
      </div>

      <div
        style={{
          transform: `translateY(${cardY}px)`,
          background: PANEL,
          border: "1px solid rgba(255,138,91,0.25)",
          borderRadius: 24,
          padding: "40px 56px",
          maxWidth: 720,
          width: "100%",
        }}
      >
        {items.map((item, i) => {
          const itemProgress = spring({ frame: frame - 40 - i * 15, fps, config: { damping: 15, stiffness: 120 } });
          const itemX = interpolate(itemProgress, [0, 1], [-30, 0]);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                marginBottom: i < items.length - 1 ? 24 : 0,
                transform: `translateX(${itemX}px)`,
                opacity: itemProgress,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: EMBER,
                  flexShrink: 0,
                }}
              />
              <p
                style={{
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: 28,
                  color: TEXT,
                  margin: 0,
                }}
              >
                {item}
              </p>
            </div>
          );
        })}
      </div>

      <p
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: 22,
          color: MUTED,
          marginTop: 40,
          opacity: interpolate(frame, [120, 180], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        It is time to grow your own economy.
      </p>
    </AbsoluteFill>
  );
}
