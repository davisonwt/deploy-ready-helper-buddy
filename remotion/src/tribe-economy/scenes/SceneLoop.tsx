import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from "remotion";

const TEAL = "#1FB6A8";
const EMBER = "#FF8A5B";
const GOLD = "#F5A623";
const TEXT = "#EAF4F2";
const MUTED = "#7E9498";

export function SceneLoop() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heading = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const headingY = interpolate(heading, [0, 1], [30, 0]);

  // Circle geometry
  const cx = 960;
  const cy = 560;
  const r = 260;
  const nodes = [
    { label: "Sower", color: TEAL, angle: -Math.PI / 2 },
    { label: "Bestower", color: EMBER, angle: -Math.PI / 2 + (2 * Math.PI) / 3 },
    { label: "Whisperer", color: GOLD, angle: -Math.PI / 2 + (4 * Math.PI) / 3 },
  ];

  const circleReveal = spring({ frame: frame - 30, fps, config: { damping: 20, stiffness: 80 } });
  const circumference = 2 * Math.PI * r;

  // Orbiting particles along the loop
  const particleCount = 6;
  const orbit = interpolate(frame, [60, 600], [0, Math.PI * 4], { extrapolateRight: "extend" });

  return (
    <AbsoluteFill>
      <div
        style={{
          textAlign: "center",
          paddingTop: 90,
          transform: `translateY(${headingY}px)`,
        }}
      >
        <p
          style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: 20,
            textTransform: "uppercase",
            letterSpacing: "0.35em",
            color: TEAL,
            marginBottom: 18,
          }}
        >
          The loop
        </p>
        <h2
          style={{
            fontFamily: '"Fraunces", serif',
            fontSize: 60,
            fontWeight: 700,
            color: TEXT,
            margin: 0,
            lineHeight: 1.1,
            maxWidth: 1200,
            marginInline: "auto",
          }}
        >
          Every bestowal feeds the next seed.
        </h2>
      </div>

      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="loopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={TEAL} />
            <stop offset="50%" stopColor={EMBER} />
            <stop offset="100%" stopColor={GOLD} />
          </linearGradient>
        </defs>

        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="url(#loopGrad)"
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - circleReveal)}
          opacity={0.85}
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* orbiting particles */}
        {Array.from({ length: particleCount }).map((_, i) => {
          const a = orbit + (i * 2 * Math.PI) / particleCount;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          const colorStop = ((i % 3) as 0 | 1 | 2);
          const c = [TEAL, EMBER, GOLD][colorStop];
          const appear = interpolate(frame, [60 + i * 8, 90 + i * 8], [0, 1], {
            extrapolateRight: "clamp",
          });
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={8}
              fill={c}
              opacity={appear * 0.9}
            />
          );
        })}

        {nodes.map((n, i) => {
          const x = cx + Math.cos(n.angle) * r;
          const y = cy + Math.sin(n.angle) * r;
          const p = spring({
            frame: frame - 80 - i * 18,
            fps,
            config: { damping: 15, stiffness: 120 },
          });
          const scale = interpolate(p, [0, 1], [0, 1]);
          return (
            <g key={n.label} transform={`translate(${x} ${y}) scale(${scale})`}>
              <circle r={54} fill="#0B1420" stroke={n.color} strokeWidth={3} />
              <circle r={54} fill={n.color} opacity={0.15} />
              <text
                textAnchor="middle"
                y={110}
                fill={n.color}
                fontFamily='"Fraunces", serif'
                fontSize={28}
                fontWeight={700}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 110,
          textAlign: "center",
          opacity: interpolate(frame, [180, 240], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <p
          style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: 26,
            color: MUTED,
            margin: 0,
            maxWidth: 900,
            marginInline: "auto",
            lineHeight: 1.4,
          }}
        >
          Money flows in a circle — not a funnel. What the tribe grows, the tribe keeps.
        </p>
      </div>
    </AbsoluteFill>
  );
}
