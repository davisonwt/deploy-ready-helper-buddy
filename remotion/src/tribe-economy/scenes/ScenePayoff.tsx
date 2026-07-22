import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from "remotion";

const TEAL = "#1FB6A8";
const EMBER = "#FF8A5B";
const GOLD = "#F5A623";
const GREEN = "#10B981";
const TEXT = "#EAF4F2";
const MUTED = "#7E9498";

const stats = [
  { value: "0%", label: "Middlemen", color: TEAL },
  { value: "100%", label: "To the sower", color: GREEN },
  { value: "1%", label: "Forever referral", color: GOLD },
  { value: "USDC", label: "Real settlement", color: EMBER },
];

export function ScenePayoff() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heading = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const headingY = interpolate(heading, [0, 1], [30, 0]);

  const ctaPulse = spring({ frame: frame - 240, fps, config: { damping: 10, stiffness: 80 } });
  const ctaScale = interpolate(ctaPulse, [0, 1], [0.94, 1]);

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
      <div style={{ textAlign: "center", transform: `translateY(${headingY}px)`, marginBottom: 60 }}>
        <p
          style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: 20,
            textTransform: "uppercase",
            letterSpacing: "0.35em",
            color: GOLD,
            marginBottom: 18,
          }}
        >
          The result
        </p>
        <h2
          style={{
            fontFamily: '"Fraunces", serif',
            fontSize: 72,
            fontWeight: 700,
            color: TEXT,
            margin: 0,
            lineHeight: 1.08,
            maxWidth: 1200,
          }}
        >
          A community that funds itself.
        </h2>
      </div>

      <div style={{ display: "flex", gap: 28, marginBottom: 72 }}>
        {stats.map((s, i) => {
          const p = spring({
            frame: frame - 40 - i * 14,
            fps,
            config: { damping: 15, stiffness: 120 },
          });
          const y = interpolate(p, [0, 1], [40, 0]);
          return (
            <div
              key={s.label}
              style={{
                width: 220,
                background: "rgba(11,20,32,0.5)",
                border: `1px solid ${s.color}40`,
                borderRadius: 22,
                padding: "28px 20px",
                textAlign: "center",
                transform: `translateY(${y}px)`,
                opacity: p,
              }}
            >
              <div
                style={{
                  fontFamily: '"Fraunces", serif',
                  fontSize: 56,
                  fontWeight: 700,
                  color: s.color,
                  lineHeight: 1,
                  marginBottom: 12,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: 16,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: MUTED,
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          transform: `scale(${ctaScale})`,
          background: `linear-gradient(90deg, ${TEAL}, ${GOLD})`,
          borderRadius: 60,
          padding: "22px 56px",
          boxShadow: `0 0 60px ${TEAL}40`,
          opacity: interpolate(frame, [180, 240], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <p
          style={{
            fontFamily: '"Fraunces", serif',
            fontSize: 34,
            fontWeight: 700,
            color: "#0B1420",
            margin: 0,
          }}
        >
          Sow2Grow — the tribe economy.
        </p>
      </div>

      <p
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: 20,
          color: MUTED,
          marginTop: 28,
          letterSpacing: "0.15em",
          opacity: interpolate(frame, [300, 360], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        sow2growapp.com
      </p>
    </AbsoluteFill>
  );
}
