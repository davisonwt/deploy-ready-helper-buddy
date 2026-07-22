import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from "remotion";

const TEAL = "#1FB6A8";
const EMBER = "#FF8A5B";
const GOLD = "#F5A623";
const TEXT = "#EAF4F2";
const MUTED = "#7E9498";

const roles = [
  {
    label: "Sower",
    color: TEAL,
    verb: "Creates",
    desc: "Plants a seed — a product, skill, teaching, or song — and offers it to the tribe.",
  },
  {
    label: "Bestower",
    color: EMBER,
    verb: "Supports",
    desc: "Chooses what to fund. Every bestowal is a direct vote for the sowers they believe in.",
  },
  {
    label: "Whisperer",
    color: GOLD,
    verb: "Amplifies",
    desc: "Carries seeds outward and earns a share every time the tribe grows.",
  },
];

export function SceneRoles() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heading = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const headingY = interpolate(heading, [0, 1], [30, 0]);

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
      <div style={{ transform: `translateY(${headingY}px)`, textAlign: "center", marginBottom: 64 }}>
        <p
          style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: 20,
            textTransform: "uppercase",
            letterSpacing: "0.35em",
            color: TEAL,
            marginBottom: 20,
          }}
        >
          Three roles. One circle.
        </p>
        <h2
          style={{
            fontFamily: '"Fraunces", serif',
            fontSize: 68,
            fontWeight: 700,
            color: TEXT,
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Everyone plays a part.
        </h2>
      </div>

      <div style={{ display: "flex", gap: 36 }}>
        {roles.map((r, i) => {
          const p = spring({
            frame: frame - 40 - i * 25,
            fps,
            config: { damping: 15, stiffness: 110 },
          });
          const y = interpolate(p, [0, 1], [60, 0]);
          return (
            <div
              key={r.label}
              style={{
                width: 360,
                background: "rgba(11,20,32,0.55)",
                border: `1px solid ${r.color}55`,
                borderRadius: 28,
                padding: 40,
                transform: `translateY(${y}px)`,
                opacity: p,
                boxShadow: `0 0 40px ${r.color}15`,
              }}
            >
              <div
                style={{
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: 14,
                  textTransform: "uppercase",
                  letterSpacing: "0.3em",
                  color: r.color,
                  marginBottom: 16,
                }}
              >
                {r.verb}
              </div>
              <h3
                style={{
                  fontFamily: '"Fraunces", serif',
                  fontSize: 48,
                  color: TEXT,
                  margin: "0 0 20px",
                }}
              >
                {r.label}
              </h3>
              <div
                style={{
                  width: 48,
                  height: 3,
                  background: r.color,
                  marginBottom: 20,
                }}
              />
              <p
                style={{
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: 20,
                  color: MUTED,
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {r.desc}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
