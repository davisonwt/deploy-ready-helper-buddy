import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from "remotion";
import { GlowParticles } from "../components/GlowParticles";
import { VoiceTrack } from "../components/VoiceTrack";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadEmoji } from "@remotion/google-fonts/NotoColorEmoji";

const { fontFamily: inter } = loadInter();
const { fontFamily: playfair } = loadPlayfair();
const { fontFamily: emojiFont } = loadEmoji();
const emojiStack = `${emojiFont}, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;

const TERRACOTTA = "#B85042";
const FOREST = "#2C5F2D";
const OCHRE = "#D4A843";
const CREAM = "#FFF7E6";
const SUNSET = "#FFB347";
const BLACKBOARD = "#1a3a2e";

// ---------- helpers ----------
const useEnter = (delay: number, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping, stiffness: 120 } });
  return s;
};

const Sparkle: React.FC<{ x: number; y: number; size?: number; delay?: number }> = ({ x, y, size = 24, delay = 0 }) => {
  const frame = useCurrentFrame();
  const t = ((frame + delay * 5) % 60) / 60;
  const op = Math.sin(t * Math.PI);
  const scale = 0.6 + Math.sin(t * Math.PI) * 0.6;
  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      transform: `translate(-50%,-50%) scale(${scale})`,
      fontSize: size, fontFamily: emojiStack, opacity: op,
      filter: `drop-shadow(0 0 12px ${OCHRE})`,
    }}>✨</div>
  );
};

// Soft warm sky / orchard backdrop
const WarmSky: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 80) * 3;
  return (
    <AbsoluteFill style={{
      background: `
        radial-gradient(ellipse 80% 50% at 50% 10%, ${SUNSET}55 0%, transparent 60%),
        radial-gradient(ellipse 100% 60% at 50% 100%, ${FOREST}33 0%, transparent 60%),
        linear-gradient(180deg, #FFE9C2 0%, ${CREAM} 45%, #F4DDB0 100%)
      `,
      transform: `translateY(${drift}px)`,
    }} />
  );
};

// Sun behind everything
const Sun: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 25) * 0.04;
  return (
    <div style={{
      position: "absolute", top: "8%", right: "12%",
      width: 220, height: 220, borderRadius: "50%",
      background: `radial-gradient(circle, ${OCHRE} 0%, ${SUNSET} 60%, transparent 75%)`,
      transform: `scale(${pulse})`,
      filter: "blur(2px)",
      opacity: 0.85,
    }} />
  );
};

// A single fruit tree (SVG-ish via divs)
const FruitTree: React.FC<{ x: number; y: number; scale?: number; delay?: number }> = ({ x, y, scale = 1, delay = 0 }) => {
  const s = useEnter(delay, 12);
  const grow = interpolate(s, [0, 1], [0, 1]);
  const sway = Math.sin(useCurrentFrame() / 30) * 2;
  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      transform: `translate(-50%, -50%) scale(${scale * grow}) rotate(${sway}deg)`,
      transformOrigin: "bottom center",
    }}>
      {/* trunk */}
      <div style={{
        width: 28, height: 140, background: "linear-gradient(180deg,#8B5A2B,#5C3A1E)",
        borderRadius: 8, margin: "0 auto",
      }} />
      {/* canopy */}
      <div style={{
        position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)",
        width: 240, height: 240, borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, #5BA85B, ${FOREST})`,
        boxShadow: `inset -20px -20px 40px rgba(0,0,0,0.2), 0 10px 30px rgba(0,0,0,0.2)`,
      }}>
        {/* fruits */}
        {[[20,30],[70,25],[40,55],[75,60],[25,75],[55,40]].map(([fx,fy],i)=>(
          <div key={i} style={{
            position:"absolute", left:`${fx}%`, top:`${fy}%`,
            width: 22, height: 22, borderRadius: "50%",
            background: `radial-gradient(circle at 30% 30%, #FF8A5C, ${TERRACOTTA})`,
            boxShadow: `0 0 12px ${OCHRE}88`,
          }} />
        ))}
      </div>
    </div>
  );
};

// ---------- characters ----------
const Character: React.FC<{
  emoji: string; x: number; y: number; size?: number; delay?: number; bob?: boolean;
}> = ({ emoji, x, y, size = 140, delay = 0, bob = true }) => {
  const frame = useCurrentFrame();
  const s = useEnter(delay, 10);
  const enter = interpolate(s, [0, 1], [0, 1]);
  const bobY = bob ? Math.sin((frame + delay) / 18) * 6 : 0;
  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      transform: `translate(-50%,-50%) translateY(${bobY}px) scale(${enter})`,
      fontSize: size, fontFamily: emojiStack, lineHeight: 1,
      filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.25))",
      opacity: enter,
    }}>{emoji}</div>
  );
};

// Glowing chat / heart bubble
const FloatBubble: React.FC<{
  emoji: string; x: number; y: number; delay: number; color?: string; size?: number;
}> = ({ emoji, x, y, delay, color = TERRACOTTA, size = 56 }) => {
  const frame = useCurrentFrame();
  const local = frame - delay;
  if (local < 0) return null;
  const op = interpolate(local, [0, 12, 50, 70], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const ty = interpolate(local, [0, 70], [0, -90]);
  const scale = interpolate(local, [0, 12], [0.4, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      transform: `translate(-50%,-50%) translateY(${ty}px) scale(${scale})`,
      opacity: op,
    }}>
      <div style={{
        background: color, color: "white",
        padding: "10px 18px", borderRadius: 20,
        fontFamily: inter, fontWeight: 700, fontSize: size * 0.45,
        boxShadow: `0 8px 24px ${color}88, 0 0 20px ${OCHRE}66`,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ fontFamily: emojiStack, fontSize: size * 0.55 }}>{emoji}</span>
      </div>
    </div>
  );
};

// Phone with student video feed
const StudentPhone: React.FC<{
  x: number; y: number; emoji: string; delay: number; tilt?: number;
}> = ({ x, y, emoji, delay, tilt = 0 }) => {
  const s = useEnter(delay, 10);
  const enter = interpolate(s, [0, 1], [0, 1]);
  const lift = interpolate(s, [0, 1], [40, 0]);
  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      transform: `translate(-50%,-50%) translateY(${lift}px) rotate(${tilt}deg) scale(${enter})`,
      opacity: enter,
    }}>
      <div style={{
        width: 130, height: 200, borderRadius: 22,
        background: "linear-gradient(180deg,#2a2a2a,#0a0a0a)",
        padding: 8,
        boxShadow: `0 12px 30px rgba(0,0,0,0.4), 0 0 24px ${OCHRE}66`,
      }}>
        <div style={{
          width: "100%", height: "100%", borderRadius: 16,
          background: `linear-gradient(135deg, ${SUNSET}, ${TERRACOTTA})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: emojiStack, fontSize: 90, lineHeight: 1,
        }}>{emoji}</div>
      </div>
      {/* live dot */}
      <div style={{
        position: "absolute", top: 14, left: 14,
        background: "#FF3B30", color: "white",
        fontFamily: inter, fontWeight: 800, fontSize: 10,
        padding: "2px 8px", borderRadius: 6,
      }}>LIVE</div>
    </div>
  );
};

// Blackboard with chalk text
const Blackboard: React.FC<{ delay: number; children: React.ReactNode; x: number; y: number; w?: number; h?: number }> = ({ delay, children, x, y, w = 720, h = 420 }) => {
  const s = useEnter(delay, 14);
  const enter = interpolate(s, [0, 1], [0, 1]);
  const sy = interpolate(s, [0, 1], [60, 0]);
  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      transform: `translate(-50%,-50%) translateY(${sy}px) scale(${enter})`,
      opacity: enter,
      width: w, height: h, borderRadius: 20,
      background: BLACKBOARD,
      border: `14px solid #6B4423`,
      boxShadow: `0 20px 50px rgba(0,0,0,0.4), inset 0 0 60px rgba(0,0,0,0.4), 0 0 60px ${OCHRE}33`,
      padding: 32,
      display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
      color: "#FFF7E0", fontFamily: playfair,
    }}>
      {children}
    </div>
  );
};

// Calendar card
const CalendarCard: React.FC<{ delay: number; x: number; y: number }> = ({ delay, x, y }) => {
  const s = useEnter(delay, 12);
  const enter = interpolate(s, [0, 1], [0, 1]);
  const ty = interpolate(s, [0, 1], [40, 0]);
  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      transform: `translate(-50%,-50%) translateY(${ty}px) scale(${enter})`,
      opacity: enter,
      width: 460, borderRadius: 24, background: "white",
      boxShadow: `0 20px 50px rgba(0,0,0,0.25), 0 0 40px ${OCHRE}55`,
      overflow: "hidden",
      fontFamily: inter,
    }}>
      <div style={{
        background: TERRACOTTA, color: "white", padding: "16px 22px",
        fontWeight: 800, fontSize: 24, display: "flex", justifyContent: "space-between",
      }}>
        <span>Schedule Live Class</span>
        <span style={{ fontFamily: emojiStack }}>📅</span>
      </div>
      <div style={{ padding: 22 }}>
        {/* mini calendar grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {Array.from({ length: 21 }).map((_, i) => {
            const isPick = i === 11;
            return (
              <div key={i} style={{
                aspectRatio: "1", borderRadius: 8,
                background: isPick ? OCHRE : "#F3EFE6",
                color: isPick ? "white" : "#333",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: isPick ? 800 : 600, fontSize: 18,
                boxShadow: isPick ? `0 6px 16px ${OCHRE}aa` : "none",
              }}>{i + 1}</div>
            );
          })}
        </div>
        <div style={{
          marginTop: 18, padding: "14px 18px", borderRadius: 14,
          background: `linear-gradient(135deg, ${FOREST}, #4a8c4a)`,
          color: "white", fontWeight: 700, fontSize: 18,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>Entrance Bestowal</span>
          <span style={{ fontWeight: 900 }}>5 USDT</span>
        </div>
      </div>
    </div>
  );
};

// Big text caption that pops in
const PopText: React.FC<{ text: string; sub?: string; delay: number; bottom?: number; size?: number }> = ({ text, sub, delay, bottom = 200, size = 84 }) => {
  const s = useEnter(delay, 14);
  const enter = interpolate(s, [0, 1], [0, 1]);
  const ty = interpolate(s, [0, 1], [60, 0]);
  return (
    <div style={{
      position: "absolute", bottom, left: 0, right: 0,
      textAlign: "center", opacity: enter,
      transform: `translateY(${ty}px)`, padding: "0 60px",
    }}>
      <div style={{
        display: "inline-block",
        background: `linear-gradient(135deg, ${TERRACOTTA}, ${OCHRE})`,
        padding: "20px 36px", borderRadius: 28,
        boxShadow: `0 16px 40px rgba(0,0,0,0.3), 0 0 30px ${OCHRE}66`,
      }}>
        <div style={{
          fontFamily: playfair, fontWeight: 900, fontSize: size, color: "white",
          lineHeight: 1.05, textShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}>{text}</div>
        {sub && (
          <div style={{
            fontFamily: inter, fontWeight: 600, fontSize: 28, color: "#FFF3D6",
            marginTop: 8,
          }}>{sub}</div>
        )}
      </div>
    </div>
  );
};

// ---------- SCENES ----------

// Scene 1: Teacher under tree with blackboard "Classrooms"
const Scene1Teacher: React.FC = () => {
  return (
    <AbsoluteFill>
      <FruitTree x={28} y={62} scale={1.4} delay={0} />
      <FruitTree x={82} y={66} scale={1.0} delay={6} />
      {/* ground */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "22%",
        background: `linear-gradient(180deg, transparent, ${FOREST}66 60%, ${FOREST}aa)`,
      }} />
      <Blackboard delay={4} x={50} y={38} w={760} h={420}>
        <div style={{ fontSize: 28, opacity: 0.7, letterSpacing: 4, marginBottom: 12 }}>SOW2GROW · GO LIVE</div>
        <div style={{ fontSize: 130, fontWeight: 900, lineHeight: 1, textShadow: `0 0 30px ${OCHRE}aa` }}>
          Classrooms
        </div>
        <div style={{ fontSize: 32, marginTop: 16, fontFamily: inter, color: "#FFE6B3" }}>
          Teach. Share. Grow.
        </div>
      </Blackboard>
      {/* Teacher */}
      <Character emoji="👩🏾‍🏫" x={50} y={78} size={260} delay={10} />
      {/* Sparkles */}
      <Sparkle x={20} y={30} size={36} delay={2} />
      <Sparkle x={78} y={28} size={32} delay={6} />
      <Sparkle x={88} y={55} size={28} delay={10} />
      <Sparkle x={12} y={50} size={30} delay={14} />
    </AbsoluteFill>
  );
};

// Scene 2: Schedule + students joining
const Scene2Schedule: React.FC = () => {
  return (
    <AbsoluteFill>
      <CalendarCard delay={0} x={50} y={28} />
      {/* phones with students */}
      <StudentPhone x={18} y={62} emoji="🧒🏽" delay={20} tilt={-8} />
      <StudentPhone x={50} y={66} emoji="👧🏻" delay={28} tilt={2} />
      <StudentPhone x={82} y={62} emoji="👨🏿" delay={36} tilt={8} />
      <StudentPhone x={30} y={86} emoji="👵🏼" delay={44} tilt={-4} />
      <StudentPhone x={70} y={86} emoji="🧑🏻‍🎓" delay={52} tilt={6} />
      {/* hand-up + chat bubbles */}
      <FloatBubble emoji="✋🏽" x={18} y={55} delay={50} color={FOREST} />
      <FloatBubble emoji="💬" x={50} y={58} delay={62} color={TERRACOTTA} />
      <FloatBubble emoji="❓" x={82} y={55} delay={74} color={OCHRE} />
      <Sparkle x={10} y={20} size={28} delay={4} />
      <Sparkle x={92} y={22} size={32} delay={10} />
      <Sparkle x={50} y={48} size={28} delay={14} />
    </AbsoluteFill>
  );
};

// Scene 3: Live class — teacher at board, students send hearts
const Scene3Live: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Blackboard delay={2} x={50} y={28} w={820} h={400}>
        <div style={{ fontSize: 32, opacity: 0.7, marginBottom: 10, letterSpacing: 3 }}>LESSON · LIVE</div>
        <div style={{ fontSize: 96, fontWeight: 900, color: "#FFF7E0", textShadow: `0 0 24px ${OCHRE}aa` }}>
          a² + b² = c²
        </div>
        <div style={{ fontSize: 26, marginTop: 16, fontFamily: inter, color: "#FFE6B3" }}>
          Math · Music · Scripture · Anything
        </div>
      </Blackboard>

      {/* teacher pointing at board */}
      <Character emoji="👩🏾‍🏫" x={20} y={56} size={200} delay={6} />

      {/* Students row */}
      <Character emoji="🧒🏽" x={42} y={62} size={130} delay={14} />
      <Character emoji="👧🏻" x={60} y={62} size={130} delay={20} />
      <Character emoji="👨🏿" x={78} y={62} size={130} delay={26} />

      {/* glowing bestowal hearts rising */}
      <FloatBubble emoji="💝" x={45} y={55} delay={30} color={TERRACOTTA} size={64} />
      <FloatBubble emoji="❤️" x={62} y={55} delay={42} color="#E63946" size={64} />
      <FloatBubble emoji="💛" x={78} y={55} delay={54} color={OCHRE} size={64} />
      <FloatBubble emoji="✋🏿" x={50} y={70} delay={66} color={FOREST} size={56} />
      <FloatBubble emoji="📝" x={70} y={72} delay={78} color={TERRACOTTA} size={56} />

      <PopText
        text="Live or Pre-recorded"
        sub="Free or Bestowal · Ask & Raise Hands"
        delay={20}
        bottom={140}
        size={56}
      />

      <Sparkle x={10} y={40} size={28} delay={2} />
      <Sparkle x={90} y={44} size={28} delay={8} />
      <Sparkle x={50} y={88} size={32} delay={frame % 60} />
    </AbsoluteFill>
  );
};

// Scene 4: Logo + CTA
const Scene4CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const sLogo = useEnter(0, 10);
  const logoScale = interpolate(sLogo, [0, 1], [0.3, 1]);
  const logoSpin = interpolate(sLogo, [0, 1], [-180, 0]);
  const logoOp = interpolate(sLogo, [0, 1], [0, 1]);

  const sBtn = useEnter(20, 12);
  const btnScale = interpolate(sBtn, [0, 1], [0.4, 1]);
  const btnOp = interpolate(sBtn, [0, 1], [0, 1]);
  const btnPulse = 1 + Math.sin(frame / 8) * 0.04;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* radial glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 50% 45%, ${OCHRE}55 0%, transparent 60%)`,
      }} />

      <div style={{ textAlign: "center", marginTop: -120 }}>
        <div style={{
          transform: `scale(${logoScale}) rotate(${logoSpin}deg)`,
          opacity: logoOp,
          display: "inline-block",
          filter: `drop-shadow(0 0 40px ${OCHRE}aa)`,
        }}>
          <Img src={staticFile("logo.jpeg")} style={{
            width: 380, height: "auto", borderRadius: 36,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }} />
        </div>

        <div style={{
          marginTop: 48,
          fontFamily: playfair, fontWeight: 900, fontSize: 76,
          color: FOREST, opacity: btnOp,
          textShadow: "0 4px 20px rgba(255,255,255,0.6)",
        }}>
          Sow2Grow Classrooms
        </div>

        <div style={{
          marginTop: 36, display: "flex", flexDirection: "column", gap: 20,
          alignItems: "center", opacity: btnOp,
          transform: `scale(${btnScale * btnPulse})`,
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${TERRACOTTA}, ${SUNSET})`,
            color: "white", fontFamily: inter, fontWeight: 900, fontSize: 44,
            padding: "26px 70px", borderRadius: 999,
            boxShadow: `0 16px 50px ${TERRACOTTA}aa, 0 0 30px ${OCHRE}88`,
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <span style={{ fontFamily: emojiStack }}>🎓</span>
            <span>Host a Classroom</span>
          </div>
          <div style={{
            background: `linear-gradient(135deg, ${FOREST}, #4a8c4a)`,
            color: "white", fontFamily: inter, fontWeight: 800, fontSize: 36,
            padding: "20px 56px", borderRadius: 999,
            boxShadow: `0 12px 40px ${FOREST}aa`,
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <span style={{ fontFamily: emojiStack }}>✋🏽</span>
            <span>Join a Classroom</span>
          </div>
        </div>
      </div>

      {/* sparkles around */}
      {[[15,20],[85,18],[10,55],[90,55],[20,80],[80,82],[50,15],[50,90]].map(([x,y],i)=>(
        <Sparkle key={i} x={x} y={y} size={32} delay={i * 4} />
      ))}
    </AbsoluteFill>
  );
};

// ---------- MAIN ----------
export const Banner11Classroom: React.FC = () => {
  // 12s @ 30fps = 360 frames
  // Scene 1: 0-75   (2.5s teacher intro)
  // Scene 2: 75-180 (3.5s schedule + students join)
  // Scene 3: 180-285 (3.5s live class with hearts)
  // Scene 4: 285-360 (2.5s logo + CTA)
  return (
    <AbsoluteFill>
      <WarmSky />
      <Sun />
      <GlowParticles count={70} color={OCHRE} />

      <Sequence from={0} durationInFrames={75}>
        <Scene1Teacher />
      </Sequence>

      <Sequence from={75} durationInFrames={105}>
        <Scene2Schedule />
      </Sequence>

      <Sequence from={180} durationInFrames={105}>
        <Scene3Live />
      </Sequence>

      <Sequence from={285} durationInFrames={75}>
        <Scene4CTA />
      </Sequence>

      <VoiceTrack name="11-classroom" />
    </AbsoluteFill>
  );
};
