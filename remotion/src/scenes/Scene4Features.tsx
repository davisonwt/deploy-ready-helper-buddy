import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from "remotion";

const TEAL = "#1FB6A8";
const EMBER = "#FF8A5B";
const GOLD = "#F5A623";
const GREEN = "#10B981";
const NAVY = "#38BDF8";
const TEXT = "#EAF4F2";
const MUTED = "#7E9498";

export function Scene4Features() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingProgress = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const headingY = interpolate(headingProgress, [0, 1], [30, 0]);

  const features = [
    { icon: "🌱", title: "Orchards & Seeds", desc: "Sell products, courses, music, art", color: GREEN },
    { icon: "🤝", title: "1-on-1 Live", desc: "Private voice & video chats", color: TEAL },
    { icon: "👥", title: "Community Chats", desc: "Open rooms for the tribe", color: NAVY },
    { icon: "📚", title: "Classroom", desc: "Teach live with files & fees", color: EMBER },
    { icon: "⚡", title: "SkillDrop", desc: "Share a skill in minutes", color: GOLD },
    { icon: "🏋️", title: "Training", desc: "Daily practice rooms", color: "#F472B6" },
    { icon: "📻", title: "Radio", desc: "Broadcast & listen live", color: "#FFB454" },
    { icon: "🚗", title: "Wandering Directory", desc: "Services, stays, transport, crafts", color: "#A855F7" },
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
            color: TEAL,
            marginBottom: 20,
          }}
        >
          What you can do
        </p>
        <h2
          style={{
            fontFamily: '"Fraunces", serif',
            fontSize: 56,
            fontWeight: 700,
            color: TEXT,
            maxWidth: 1000,
            lineHeight: 1.15,
          }}
        >
          One tribe. A hundred ways to grow.
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24,
          maxWidth: 1200,
        }}
      >
        {features.map((feature, i) => {
          const featureProgress = spring({ frame: frame - 40 - i * 12, fps, config: { damping: 15, stiffness: 120 } });
          const featureY = interpolate(featureProgress, [0, 1], [30, 0]);
          return (
            <div
              key={feature.title}
              style={{
                background: "rgba(18,51,48,0.4)",
                border: `1px solid ${feature.color}30`,
                borderRadius: 20,
                padding: 28,
                textAlign: "center",
                transform: `translateY(${featureY}px)`,
                opacity: featureProgress,
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 16 }}>{feature.icon}</div>
              <h3
                style={{
                  fontFamily: '"Fraunces", serif',
                  fontSize: 22,
                  color: feature.color,
                  margin: "0 0 8px",
                }}
              >
                {feature.title}
              </h3>
              <p
                style={{
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: 16,
                  color: MUTED,
                  lineHeight: 1.4,
                }}
              >
                {feature.desc}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
