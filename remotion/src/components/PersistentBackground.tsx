import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";

const BG_TOP = "#0B1420";
const BG_BOTTOM = "#06140F";
const TEAL = "#1FB6A8";
const EMBER = "#FF8A5B";
const GOLD = "#F5A623";
const GREEN = "#10B981";

export function PersistentBackground() {
  const frame = useCurrentFrame();

  const orb1X = interpolate(frame, [0, 300], [0, 120], { extrapolateRight: "extend" });
  const orb1Y = interpolate(frame, [0, 400], [0, 80], { extrapolateRight: "extend" });
  const orb2X = interpolate(frame, [0, 350], [0, -100], { extrapolateRight: "extend" });
  const orb2Y = interpolate(frame, [0, 450], [0, -60], { extrapolateRight: "extend" });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${BG_TOP} 0%, ${BG_BOTTOM} 100%)`,
        overflow: "hidden",
      }}
    >
      {/* Subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(31,182,168,0.08) 1px, transparent 0)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Floating orbs */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${TEAL}18 0%, transparent 70%)`,
          filter: "blur(60px)",
          transform: `translate(${-100 + orb1X}px, ${-100 + orb1Y}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${EMBER}12 0%, transparent 70%)`,
          filter: "blur(80px)",
          transform: `translate(${100 + orb2X}px, ${100 + orb2Y}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "30%",
          top: "40%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${GOLD}10 0%, transparent 70%)`,
          filter: "blur(70px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "20%",
          top: "10%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${GREEN}10 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
    </AbsoluteFill>
  );
}
