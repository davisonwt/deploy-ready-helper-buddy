import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from "remotion";

const TEAL = "#1FB6A8";
const TEXT = "#EAF4F2";
const MUTED = "#7E9498";
const GOLD = "#F5A623";
const GREEN = "#10B981";

export function Scene3Solution() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingProgress = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const cardProgress = spring({ frame: frame - 25, fps, config: { damping: 18, stiffness: 100 } });

  const headingY = interpolate(headingProgress, [0, 1], [30, 0]);
  const cardScale = interpolate(cardProgress, [0, 1], [0.92, 1]);

  const steps = [
    { label: "Seed", desc: "A need, a skill, or a product", color: TEAL },
    { label: "Soil", desc: "The tribe gathers around it", color: GREEN },
    { label: "Orchard", desc: "It grows into real income", color: GOLD },
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
      <div style={{ transform: `translateY(${headingY}px)`, textAlign: "center", marginBottom: 56 }}>
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
          The solution
        </p>
        <h2
          style={{
            fontFamily: '"Fraunces", serif',
            fontSize: 64,
            fontWeight: 700,
            color: TEXT,
            maxWidth: 950,
            lineHeight: 1.15,
          }}
        >
          Sow2Grow is a tribal marketplace.
        </h2>
        <p
          style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: 26,
            color: MUTED,
            maxWidth: 780,
            marginTop: 20,
            lineHeight: 1.4,
          }}
        >
          A place where seeds become orchards — and community value flows back to the people who create it.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 32,
          transform: `scale(${cardScale})`,
          opacity: cardProgress,
        }}
      >
        {steps.map((step, i) => {
          const stepProgress = spring({ frame: frame - 60 - i * 20, fps, config: { damping: 15, stiffness: 120 } });
          const stepY = interpolate(stepProgress, [0, 1], [40, 0]);
          return (
            <div
              key={step.label}
              style={{
                width: 280,
                background: "rgba(18,51,48,0.5)",
                border: `1px solid ${step.color}40`,
                borderRadius: 24,
                padding: 36,
                textAlign: "center",
                transform: `translateY(${stepY}px)`,
                opacity: stepProgress,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: `${step.color}22`,
                  border: `2px solid ${step.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                  fontFamily: '"Fraunces", serif',
                  fontSize: 28,
                  color: step.color,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </div>
              <h3
                style={{
                  fontFamily: '"Fraunces", serif',
                  fontSize: 32,
                  color: step.color,
                  margin: "0 0 12px",
                }}
              >
                {step.label}
              </h3>
              <p
                style={{
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: 20,
                  color: MUTED,
                  lineHeight: 1.4,
                }}
              >
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
