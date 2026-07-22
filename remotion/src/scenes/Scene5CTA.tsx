import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from "remotion";

const TEAL = "#1FB6A8";
const EMBER = "#FF8A5B";
const TEXT = "#EAF4F2";
const MUTED = "#7E9498";
const GOLD = "#F5A623";

export function Scene5CTA() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingProgress = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const headingY = interpolate(headingProgress, [0, 1], [30, 0]);

  const incomeItems = [
    { label: "Sell a seed", color: TEAL },
    { label: "Host a room", color: EMBER },
    { label: "Whisper for %", color: GOLD },
    { label: "Refer forever", color: "#10B981" },
  ];

  const pulse = spring({ frame: frame - 120, fps, config: { damping: 10, stiffness: 80 } });
  const ctaScale = interpolate(pulse, [0, 1], [1, 1.06]);

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
            color: TEAL,
            marginBottom: 20,
          }}
        >
          How to earn
        </p>
        <h2
          style={{
            fontFamily: '"Fraunces", serif',
            fontSize: 56,
            fontWeight: 700,
            color: TEXT,
            maxWidth: 900,
            lineHeight: 1.15,
            marginBottom: 16,
          }}
        >
          Anyone can generate income on S2G.
        </h2>
        <p
          style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: 24,
            color: MUTED,
            maxWidth: 720,
            lineHeight: 1.4,
          }}
        >
          No middlemen. No hidden fees. Just your tribe, supporting what you create.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 56,
        }}
      >
        {incomeItems.map((item, i) => {
          const itemProgress = spring({ frame: frame - 50 - i * 15, fps, config: { damping: 15, stiffness: 120 } });
          const itemY = interpolate(itemProgress, [0, 1], [30, 0]);
          return (
            <div
              key={item.label}
              style={{
                background: `${item.color}15`,
                border: `2px solid ${item.color}`,
                borderRadius: 16,
                padding: "20px 32px",
                transform: `translateY(${itemY}px)`,
                opacity: itemProgress,
              }}
            >
              <p
                style={{
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: 20,
                  fontWeight: 600,
                  color: item.color,
                  margin: 0,
                }}
              >
                {item.label}
              </p>
            </div>
          );
        })}
      </div>

      <div
        style={{
          transform: `scale(${ctaScale})`,
          background: `linear-gradient(90deg, ${TEAL}, ${EMBER})`,
          borderRadius: 50,
          padding: "24px 56px",
          boxShadow: `0 0 60px ${TEAL}50`,
        }}
      >
        <p
          style={{
            fontFamily: '"Fraunces", serif',
            fontSize: 36,
            fontWeight: 700,
            color: "#0B1420",
            margin: 0,
          }}
        >
          Join the tribe. Plant your first seed.
        </p>
      </div>

      <p
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: 20,
          color: MUTED,
          marginTop: 32,
          opacity: interpolate(frame, [180, 240], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        sow2growapp.com
      </p>
    </AbsoluteFill>
  );
}
