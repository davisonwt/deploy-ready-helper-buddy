// Build v3 banners: 3 AI clips concatenated + captions overlay + voiceover.
// Usage: node scripts/build-banners-v3.mjs <slug>  (e.g. 04-wandering-wheel)
//        node scripts/build-banners-v3.mjs all
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { createWriteStream, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PREVIEW = "https://id-preview--f76da68e-977d-42e6-85f3-ea2df1aea0df.lovable.app";
const OUT_DIR = "/mnt/documents/s2g-banners/v3";
const CACHE = "/tmp/v3-clips";
const VO_DIR = path.join(ROOT, "public/voiceovers");
const GEN_DIR = path.join(ROOT, "generated/v3");
await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(CACHE, { recursive: true });

// Caption tracks: { headline, subtitle, start (s), end (s) } per beat.
// Beats target ~5s each but we let captions slightly overlap the end of clip seams.
const BANNERS = {
  "04-wandering-wheel": [
    { h: "Drive for your tribe", s: "Trucks · motorbikes · cars", start: 0.4, end: 4.8 },
    { h: "Deliveries roll in from the community", s: "Packages, produce, handmade goods", start: 5.2, end: 9.6 },
    { h: "Deliver. Earn. Serve.", s: "Glowing roads connect every village", start: 10.0, end: 14.4 },
  ],
};

async function download(url, dest) {
  if (existsSync(dest) && (await fs.stat(dest)).size > 1000) return dest;
  console.log(`  ↓ ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return dest;
}

function escapeAss(text) {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\N").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}
function fmtAssTime(t) {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const cs = Math.floor((t - Math.floor(t)) * 100);
  return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;
}
function buildAss(captions) {
  // 1920x1080 stage. Headline ~64px bold white with black box; subtitle 32px ochre.
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Headline,DejaVu Sans,64,&H00FFFFFF,&H00FFFFFF,&H00000000,&HBE000000,1,0,0,0,100,100,0,0,3,8,4,2,80,80,140,1
Style: Subtitle,DejaVu Sans,38,&H00B3E6FF,&H00B3E6FF,&H00000000,&HBE000000,0,0,0,0,100,100,0,0,3,5,3,2,80,80,90,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  // Note: ASS color is &HAABBGGRR. White=&H00FFFFFF; warm cream = &H00B3E6FF.
  const lines = captions.flatMap((c) => {
    const start = fmtAssTime(c.start);
    const end = fmtAssTime(c.end);
    const head = `Dialogue: 0,${start},${end},Headline,,0,0,0,,${escapeAss(c.h)}`;
    const sub = `Dialogue: 0,${start},${end},Subtitle,,0,0,0,,${escapeAss(c.s)}`;
    return [head, sub];
  });
  return header + lines.join("\n") + "\n";
}

async function buildBanner(slug) {
  const captions = BANNERS[slug];
  if (!captions) throw new Error(`No caption track for ${slug}`);
  console.log(`\n▶ ${slug}`);

  // 1. Download the 3 AI clips
  const clips = [];
  for (const beat of ["a", "b", "c"]) {
    const assetJson = JSON.parse(await fs.readFile(path.join(GEN_DIR, `${slug}-${beat}.mp4.asset.json`), "utf8"));
    const url = `${PREVIEW}${assetJson.url}`;
    const dest = path.join(CACHE, `${slug}-${beat}.mp4`);
    await download(url, dest);
    clips.push(dest);
  }

  // 2. Concat (re-encode to normalise frame size/codec)
  const concatList = path.join(CACHE, `${slug}-list.txt`);
  await fs.writeFile(concatList, clips.map((c) => `file '${c}'`).join("\n"));
  const concat = path.join(CACHE, `${slug}-concat.mp4`);
  console.log("  ⧉ concat 3 clips");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatList}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -an "${concat}"`,
    { stdio: "pipe" },
  );

  // 3. Burn captions
  const assPath = path.join(CACHE, `${slug}.ass`);
  await fs.writeFile(assPath, buildAss(captions));
  const captioned = path.join(CACHE, `${slug}-cap.mp4`);
  console.log("  ✎ overlay captions");
  // ffmpeg subtitles filter needs escaped path
  const escAss = assPath.replace(/:/g, "\\:").replace(/'/g, "\\'");
  execSync(
    `ffmpeg -y -i "${concat}" -vf "subtitles='${escAss}'" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -an "${captioned}"`,
    { stdio: "pipe" },
  );

  // 4. Mux voiceover (no -shortest; let video play to end, audio ends naturally)
  const vo = path.join(VO_DIR, `${slug}.mp3`);
  const final = path.join(OUT_DIR, `banner-${slug}.mp4`);
  console.log("  ♪ mux voiceover");
  execSync(
    `ffmpeg -y -i "${captioned}" -i "${vo}" -c:v copy -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 "${final}"`,
    { stdio: "pipe" },
  );
  const stat = await fs.stat(final);
  const dur = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${final}"`).toString().trim();
  console.log(`  ✓ ${final}  (${(stat.size / 1024 / 1024).toFixed(2)} MB, ${dur}s)`);
}

const target = process.argv[2];
if (!target) { console.error("Usage: build-banners-v3.mjs <slug|all>"); process.exit(1); }
const slugs = target === "all" ? Object.keys(BANNERS) : [target];
for (const s of slugs) await buildBanner(s);
console.log("\nDone.");
