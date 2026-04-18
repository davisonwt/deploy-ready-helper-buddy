import { Img, staticFile, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";

interface Props {
  delay?: number;
  size?: number;
  x?: number;
  y?: number;
}

/** Sow2Grow logo image (correct spelling guaranteed by using the actual brand asset). */
export const LogoMark: React.FC<Props> = ({ delay = 0, size = 140, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
  const scale = interpolate(s, [0, 1], [0.5, 1]);
  const op = interpolate(s, [0, 1], [0, 1]);

  return (
    <div style={{
      position: x !== undefined ? "absolute" : "relative",
      left: x, top: y,
      transform: `scale(${scale})`, opacity: op,
    }}>
      <Img src={staticFile("logo.jpeg")} style={{
        width: size, height: "auto", borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
      }} />
    </div>
  );
};
