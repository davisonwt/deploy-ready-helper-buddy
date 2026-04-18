// Build v3 banners: title intro + 4 AI clips + outro CTA, with logo overlay,
// captions burnt-in, and voiceover muxed.
//   node scripts/build-banners-v3.mjs <slug>
//   node scripts/build-banners-v3.mjs all
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
const LOGO = path.join(ROOT, "public/logo.jpeg");
await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(CACHE, { recursive: true });

// Each banner: title shown on opening card, beats[] = AI clip ids ('a','b',...),
// captions list, and CTA shown on closing card.
const BANNERS = {
  "04-wandering-wheel": {
    title: "Become a S2G Wandering Wheel",
    subtitle: "Drive · Earn · Serve your tribe",
    cta: "Register today on Sow2Grow",
    ctaSub: "The tribe books you with one tap",
    beats: ["a", "b", "d", "c"], // driver → road → booking → delivery
    captions: [
      // start/end relative to start of AI footage (after 2.5s title card)
      { h: "Drive for your tribe", s: "Trucks · motorbikes · cars", start: 0.4, end: 4.8 },
      { h: "Carry packages, produce, handmade goods", s: "Across every village in the world", start: 5.2, end: 9.6 },
      { h: "The tribe books you with one tap", s: "S2G connects every job", start: 10.0, end: 14.4 },
      { h: "Deliver. Earn. Serve.", s: "Roll with Sow2Grow", start: 14.8, end: 19.4 },
    ],
  },
};

async function download(url, dest) {
  if (existsSync(dest) && (await fs.stat(dest)).size > 1000) return dest;
  console.log(`  ↓ ${path.basename(dest)}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return dest;
}

function escAss(t) { return t.replace(/\\/g, "\\\\").replace(/\n/g, "\\N").replace(/\{/g, "\\{").replace(/\}/g, "\\}"); }
function fmtTime(t) {
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60), cs = Math.floor((t - Math.floor(t)) * 100);
  return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;
}
function buildAss(captions, offsetSec) {
  const head = `[Script Info]
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
  const lines = captions.flatMap((c) => {
    const s = fmtTime(c.start + offsetSec), e = fmtTime(c.end + offsetSec);
    return [
      `Dialogue: 0,${s},${e},Headline,,0,0,0,,${escAss(c.h)}`,
      `Dialogue: 0,${s},${e},Subtitle,,0,0,0,,${escAss(c.s)}`,
    ];
  });
  return head + lines.join("\n") + "\n";
}

function escFilter(p) { return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'"); }

const FONT = "/nix/store/xhanp47490n743s7zd27d8i9s1khg6c0-dejavu-fonts-minimal-2.37/share/fonts/truetype/DejaVuSans.ttf";

// Build a 2.5s title card MP4 using -filter_complex with multiple lavfi inputs.
async function buildTitleCard(out, title, subtitle, durSec = 2.5) {
  const titleEsc = title.replace(/'/g, "\\'");
  const subEsc = subtitle.replace(/'/g, "\\'");
  const fc = [
    `[0:v][1:v]overlay=0:780[base]`,
    `movie='${escFilter(LOGO)}',scale=320:320:force_original_aspect_ratio=decrease[logo]`,
    `[base][logo]overlay=(W-w)/2:200:format=auto,format=yuv420p[withlogo]`,
    `[withlogo]drawtext=fontfile=${FONT}:text='${titleEsc}':fontsize=82:fontcolor=0x2C5F2D:x=(w-text_w)/2:y=560[t1]`,
    `[t1]drawtext=fontfile=${FONT}:text='${subEsc}':fontsize=44:fontcolor=white:x=(w-text_w)/2:y=860[v]`,
  ].join(";");
  execSync(
    `ffmpeg -y -f lavfi -i "color=c=0xF5E8D0:s=1920x1080:d=${durSec}:r=30" -f lavfi -i "color=c=0xB85042:s=1920x300:d=${durSec}:r=30" -filter_complex "${fc}" -map "[v]" -t ${durSec} -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an "${out}"`,
    { stdio: "pipe" },
  );
}

async function buildOutroCard(out, cta, ctaSub, durSec = 3) {
  const ctaEsc = cta.replace(/'/g, "\\'");
  const subEsc = ctaSub.replace(/'/g, "\\'");
  const fc = [
    `movie='${escFilter(LOGO)}',scale=400:400:force_original_aspect_ratio=decrease[logo]`,
    `[0:v][logo]overlay=(W-w)/2:140:format=auto,format=yuv420p[wl]`,
    `[wl]drawtext=fontfile=${FONT}:text='${ctaEsc}':fontsize=84:fontcolor=0xF5E8D0:x=(w-text_w)/2:y=620[t1]`,
    `[t1]drawtext=fontfile=${FONT}:text='${subEsc}':fontsize=44:fontcolor=0xFFD78A:x=(w-text_w)/2:y=760[v]`,
  ].join(";");
  execSync(
    `ffmpeg -y -f lavfi -i "color=c=0x2C5F2D:s=1920x1080:d=${durSec}:r=30" -filter_complex "${fc}" -map "[v]" -t ${durSec} -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an "${out}"`,
    { stdio: "pipe" },
  );
}

async function buildBanner(slug) {
  const cfg = BANNERS[slug];
  if (!cfg) throw new Error(`No config for ${slug}`);
  console.log(`\n▶ ${slug}`);

  // 1. Download AI beats
  const clips = [];
  for (const beat of cfg.beats) {
    const j = JSON.parse(await fs.readFile(path.join(GEN_DIR, `${slug}-${beat}.mp4.asset.json`), "utf8"));
    const dest = path.join(CACHE, `${slug}-${beat}.mp4`);
    await download(`${PREVIEW}${j.url}`, dest);
    clips.push(dest);
  }

  // 2. Title + outro cards
  const title = path.join(CACHE, `${slug}-title.mp4`);
  const outro = path.join(CACHE, `${slug}-outro.mp4`);
  console.log("  ◆ title + outro cards");
  await buildTitleCard(title, cfg.title, cfg.subtitle, 2.5);
  await buildOutroCard(outro, cfg.cta, cfg.ctaSub, 3);

  // 3. Concat title + 4 clips + outro
  const concatList = path.join(CACHE, `${slug}-list.txt`);
  const all = [title, ...clips, outro];
  await fs.writeFile(concatList, all.map((c) => `file '${c}'`).join("\n"));
  const concat = path.join(CACHE, `${slug}-concat.mp4`);
  console.log("  ⧉ concat");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatList}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -an "${concat}"`,
    { stdio: "pipe" },
  );

  // 4. Burn captions (offset by 2.5s for title card) + persistent logo top-left
  const ass = path.join(CACHE, `${slug}.ass`);
  await fs.writeFile(ass, buildAss(cfg.captions, 2.5));
  const captioned = path.join(CACHE, `${slug}-cap.mp4`);
  console.log("  ✎ captions + logo overlay");
  // Show small logo top-left from t=2.5s (after title card) until t=clipsEnd
  const clipsEnd = 2.5 + cfg.beats.length * 5; // beats end before outro
  execSync(
    `ffmpeg -y -i "${concat}" -i "${LOGO}" -filter_complex "[1:v]scale=130:130:force_original_aspect_ratio=decrease[logo];[0:v]subtitles='${escFilter(ass)}'[withcap];[withcap][logo]overlay=40:40:enable='between(t,2.5,${clipsEnd})':format=auto" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -an "${captioned}"`,
    { stdio: "pipe" },
  );

  // 5. Mux voiceover - aligned to start of AI footage (after title card)
  const vo = path.join(VO_DIR, `${slug}.mp3`);
  const final = path.join(OUT_DIR, `banner-${slug}.mp4`);
  console.log("  ♪ mux voiceover (delayed 2.5s for title)");
  // adelay shifts audio start so VO begins as the first AI scene begins
  execSync(
    `ffmpeg -y -i "${captioned}" -i "${vo}" -filter_complex "[1:a]adelay=2500|2500[a]" -map 0:v:0 -map "[a]" -c:v copy -c:a aac -b:a 192k "${final}"`,
    { stdio: "pipe" },
  );
  const stat = await fs.stat(final);
  const dur = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${final}"`).toString().trim();
  console.log(`  ✓ ${final} (${(stat.size / 1024 / 1024).toFixed(2)} MB, ${dur}s)`);
}

const target = process.argv[2];
if (!target) { console.error("Usage: build-banners-v3.mjs <slug|all>"); process.exit(1); }
const slugs = target === "all" ? Object.keys(BANNERS) : [target];
for (const s of slugs) await buildBanner(s);
console.log("\nDone.");
