import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const TEAL = "#1FB6A8";
const GOLD = "#F5A623";
const TEXT = "#EAF4F2";
const MUTED = "#7E9498";
const RED = "#E05A4F";

type Beat = { from: number; durationInFrames: number };

const face = '"Outfit", sans-serif';

function useIn(delay: number, stiffness = 140) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 20, stiffness } });
}

/* ---------------- H1: commission counter ---------------- */
function Commission({ beats }: { beats: Beat[] }) {
  const frame = useCurrentFrame();
  const flip = beats[2].from;
  const kept = Math.round(
    interpolate(frame, [flip, flip + 26], [70, 100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const isGood = frame >= flip + 26;
  const pulse = 1 + Math.sin(frame / 9) * 0.012;

  return (
    <div style={{ textAlign: "center", transform: `scale(${pulse})` }}>
      <div style={{ fontFamily: face, fontSize: 40, letterSpacing: "0.3em", color: MUTED }}>
        $100 SALE
      </div>
      <div style={{ fontSize: 60, color: MUTED, margin: "18px 0" }}>↓</div>
      <div
        style={{
          fontFamily: face,
          fontWeight: 700,
          fontSize: 240,
          lineHeight: 1,
          color: isGood ? TEAL : RED,
        }}
      >
        ${kept}
      </div>
      <div
        style={{
          marginTop: 14,
          fontFamily: face,
          fontSize: 38,
          letterSpacing: "0.24em",
          color: isGood ? TEAL : RED,
        }}
      >
        {isGood ? "YOU KEEP IT ALL" : "YOU KEEP"}
      </div>
    </div>
  );
}

/* ---------------- H2: anonymous → named ---------------- */
function Anonymous({ beats }: { beats: Beat[] }) {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [beats[2].from, beats[2].from + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: 620,
        borderRadius: 40,
        padding: 54,
        background: `rgba(255,255,255,${0.03 + reveal * 0.03})`,
        border: `2px solid ${reveal > 0.5 ? TEAL : "rgba(126,148,152,0.35)"}`,
        textAlign: "center",
        transform: `translateY(${Math.sin(frame / 24) * 6}px)`,
      }}
    >
      <div
        style={{
          width: 190,
          height: 190,
          borderRadius: "50%",
          margin: "0 auto 30px",
          background: `linear-gradient(140deg, ${
            reveal > 0.5 ? TEAL : "#3A4A4E"
          }, ${reveal > 0.5 ? GOLD : "#223034"})`,
          filter: `grayscale(${1 - reveal})`,
        }}
      />
      <div style={{ fontFamily: face, fontWeight: 700, fontSize: 56, color: TEXT }}>
        {reveal > 0.5 ? "Ed · Musician" : "Seller_8842"}
      </div>
      <div style={{ marginTop: 12, fontFamily: face, fontSize: 34, color: reveal > 0.5 ? TEAL : MUTED }}>
        {reveal > 0.5 ? "Ed's Orchard · 14 seeds" : "no face · no story"}
      </div>
    </div>
  );
}

/* ---------------- H3: seed → sprout → fruit ---------------- */
function StageArt({ stage, on }: { stage: number; on: boolean }) {
  const c = on ? TEAL : "#3A4A4E";
  const f = on ? GOLD : "#3A4A4E";
  return (
    <svg width={170} height={170} viewBox="0 0 100 100" style={{ opacity: on ? 1 : 0.28 }}>
      <line x1="50" y1="92" x2="50" y2={stage === 0 ? 78 : 44} stroke={c} strokeWidth="5" strokeLinecap="round" />
      {stage === 0 && <ellipse cx="50" cy="72" rx="12" ry="9" fill={c} />}
      {stage >= 1 && (
        <>
          <path d="M50 62 C34 60 26 48 26 38 C40 38 50 48 50 62 Z" fill={c} />
          <path d="M50 56 C66 54 74 42 74 32 C60 32 50 42 50 56 Z" fill={c} opacity="0.75" />
        </>
      )}
      {stage === 2 && <circle cx="50" cy="26" r="17" fill={f} />}
    </svg>
  );
}

function Bestow({ beats }: { beats: Beat[] }) {
  const frame = useCurrentFrame();
  const marks = [beats[0].from, beats[1].from + 40, beats[2].from];
  const active = marks.filter((m) => frame >= m).length - 1;

  return (
    <div style={{ display: "flex", gap: 56, alignItems: "center" }}>
      {[0, 1, 2].map((i) => {
        const on = i <= active;
        return (
          <div key={i} style={{ textAlign: "center", transform: `scale(${on ? 1 : 0.88})` }}>
            <StageArt stage={i} on={on} />
            <div
              style={{
                fontFamily: face,
                fontSize: 30,
                letterSpacing: "0.2em",
                color: on ? TEAL : MUTED,
                marginTop: 10,
              }}
            >
              {["SOW", "WATER", "HARVEST"][i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}


/* ---------------- H4: five dollars + icon grid ---------------- */
function FiveDollar({ beats }: { beats: Beat[] }) {
  const frame = useCurrentFrame();
  const items = ["Products", "Music", "Books", "Produce", "Services", "Live Rooms"];
  const gridStart = beats[1].from;

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: face,
          fontWeight: 700,
          fontSize: 220,
          lineHeight: 1,
          color: GOLD,
          transform: `scale(${1 + Math.sin(frame / 11) * 0.015})`,
        }}
      >
        $5
      </div>
      <div style={{ fontFamily: face, fontSize: 36, letterSpacing: "0.3em", color: MUTED, marginTop: 4 }}>
        PER MONTH
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 18,
          marginTop: 46,
          width: 760,
        }}
      >
        {items.map((label, i) => {
          const p = interpolate(frame, [gridStart + i * 8, gridStart + i * 8 + 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={label}
              style={{
                opacity: p,
                transform: `translateY(${(1 - p) * 18}px)`,
                padding: "20px 8px",
                borderRadius: 20,
                border: `1.5px solid rgba(31,182,168,0.45)`,
                background: "rgba(31,182,168,0.08)",
                fontFamily: face,
                fontSize: 30,
                color: TEXT,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- H5: nine hands ---------------- */
function Hands({ beats }: { beats: Beat[] }) {
  const frame = useCurrentFrame();
  const hands = [
    "Farmer",
    "Maker",
    "Musician",
    "Author",
    "Healer",
    "Cook",
    "Builder",
    "Teacher",
    "Trader",
  ];
  const start = beats[0].from;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, width: 840 }}>
      {hands.map((label, i) => {
        const p = interpolate(frame, [start + i * 7, start + i * 7 + 11], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={label}
            style={{
              opacity: p,
              transform: `scale(${0.86 + p * 0.14})`,
              padding: "30px 10px 26px",
              borderRadius: 26,
              border: "1.5px solid rgba(245,166,35,0.35)",
              background: "rgba(245,166,35,0.07)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                margin: "0 auto 14px",
                borderRadius: "50%",
                background: i % 2 ? "rgba(31,182,168,0.85)" : "rgba(245,166,35,0.85)",
              }}
            />
            <div style={{ fontFamily: face, fontSize: 32, color: TEXT }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}


/* ---------------- H6: money path ---------------- */
function MoneyPath({ beats }: { beats: Beat[] }) {
  const frame = useCurrentFrame();
  const flip = beats[1].from;
  const good = frame >= flip;
  const p = interpolate(frame, [flip, flip + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const Node = ({ label, tone }: { label: string; tone: string }) => (
    <div
      style={{
        padding: "22px 34px",
        borderRadius: 22,
        border: `2px solid ${tone}`,
        background: `${tone}14`,
        fontFamily: face,
        fontSize: 36,
        color: TEXT,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
      <Node label="You bestow $100" tone={TEAL} />
      <div style={{ fontSize: 54, color: good ? TEAL : MUTED }}>↓</div>
      {good ? (
        <div style={{ opacity: p, transform: `scale(${0.9 + p * 0.1})` }}>
          <Node label="The hands that made it · $100" tone={GOLD} />
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16, opacity: 1 - p }}>
          <Node label="Warehouse" tone={MUTED} />
          <Node label="Ads" tone={MUTED} />
          <Node label="Shareholders" tone={MUTED} />
        </div>
      )}
    </div>
  );
}

export function Motif({ kind, beats }: { kind: string; beats: Beat[] }) {
  switch (kind) {
    case "commission":
      return <Commission beats={beats} />;
    case "anonymous":
      return <Anonymous beats={beats} />;
    case "bestow":
      return <Bestow beats={beats} />;
    case "fivedollar":
      return <FiveDollar beats={beats} />;
    case "hands":
      return <Hands beats={beats} />;
    case "moneypath":
      return <MoneyPath beats={beats} />;
    default:
      return null;
  }
}
