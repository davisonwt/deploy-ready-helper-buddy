// Build v3.2 banner: tight 14s structure, no silence, image cards (not text),
// energetic voice via ffmpeg audio processing.
//
// Structure (matches ~13s VO with NO silent tail):
//   0.0 – 2.0s   Vehicles montage card (zoom-in) + intro tag overlay
//   2.0 – 12.5s  4 AI clips (2.6s each, sped slightly to fit) with captions
//   12.5 – 14.0s Phone-in-hand "book a Wandering Wheel" outro
//
// VO is energized: +9% speed (raises pitch + energy), light compression,
// presence EQ boost. This makes a calm narrator sound noticeably more excited.

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
const KEY_DIR = path.join(ROOT, "keyframes/v3");
const LOGO = path.join(ROOT, "public/logo.jpeg");
await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(CACHE, { recursive: true });

const FONT = "/nix/store/xhanp47490n743s7zd27d8i9s1khg6c0-dejavu-fonts-minimal-2.37/share/fonts/truetype/DejaVuSans.ttf";

const BANNERS = {
  "04-wandering-wheel": {
    title: "Become a S2G Wandering Wheel",
    cta: "Book us on Sow2Grow",
    beats: ["a", "b", "d", "c"],
    introImg: "04-wandering-wheel-vehicles.jpg",
    outroImg: "04-wandering-wheel-phone.jpg",
    captions: [
      // start/end relative to start of full muxed video
      { h: "Drive for your tribe", s: "Trucks · vans · motorbikes · cars", start: 0.2, end: 2.0 },
      { h: "Carry packages, produce, handmade goods", s: "Across every village", start: 2.2, end: 5.2 },
      { h: "The tribe books you with one tap", s: "S2G connects every job", start: 5.4, end: 8.4 },
      { h: "Deliver. Earn. Serve.", s: "Roll with Sow2Grow", start: 8.6, end: 11.4 },
      { h: "Book a Wandering Wheel today", s: "Open Sow2Grow on your phone", start: 11.6, end: 14.0 },
    ],
  },
};

async function download(url, dest) {
  if (existsSync(dest) && (await fs.stat(dest)).size > 1000) return dest;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return dest;
}

function escAss(t) { return t.replace(/\\/g,"\\\\").replace(/\n/g,"\\N").replace(/\{/g,"\\{").replace(/\}/g,"\\}"); }
function fmtTime(t) {
  const h=Math.floor(t/3600), m=Math.floor((t%3600)/60), s=Math.floor(t%60), cs=Math.floor((t-Math.floor(t))*100);
  return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;
}
function buildAss(captions) {
  const head = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Headline,DejaVu Sans,68,&H00FFFFFF,&H00FFFFFF,&H00000000,&HBE000000,1,0,0,0,100,100,0,0,3,8,4,2,80,80,150,1
Style: Subtitle,DejaVu Sans,40,&H00B3E6FF,&H00B3E6FF,&H00000000,&HBE000000,0,0,0,0,100,100,0,0,3,5,3,2,80,80,95,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const lines = captions.flatMap((c) => {
    const s = fmtTime(c.start), e = fmtTime(c.end);
    return [
      `Dialogue: 0,${s},${e},Headline,,0,0,0,,${escAss(c.h)}`,
      `Dialogue: 0,${s},${e},Subtitle,,0,0,0,,${escAss(c.s)}`,
    ];
  });
  return head + lines.join("\n") + "\n";
}

function escFilter(p) { return p.replace(/\\/g,"/").replace(/:/g,"\\:").replace(/'/g,"\\'"); }

// Build a static image card with subtle Ken Burns zoom — used for intro/outro.
async function buildImageCard(imgPath, out, durSec, zoomDir = "in") {
  // zoompan: gentle 1.0 → 1.08 zoom over the duration
  const frames = Math.round(durSec * 30);
  const zoomExpr = zoomDir === "in"
    ? `min(zoom+0.0015,1.08)`
    : `if(lte(zoom,1.0),1.08,max(1.001,zoom-0.0015))`;
  // First scale up so zoompan has resolution to crop into without softness
  const fc = `[0:v]scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,zoompan=z='${zoomExpr}':d=${frames}:s=1920x1080:fps=30,format=yuv420p[v]`;
  execSync(
    `ffmpeg -y -loop 1 -t ${durSec} -i "${imgPath}" -filter_complex "${fc}" -map "[v]" -t ${durSec} -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an "${out}"`,
    { stdio: "pipe" },
  );
}

// Trim/speed an AI clip to a target duration.
async function buildBeatClip(srcMp4, outMp4, targetDur) {
  const probe = execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${srcMp4}"`).toString().trim();
  const srcDur = parseFloat(probe);
  const speed = (srcDur / targetDur).toFixed(4); // if src=5s, target=2.6s, speed=1.92x
  // setpts=PTS/speed; cap reasonable speeds
  const fc = `[0:v]setpts=PTS/${speed},scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30[v]`;
  execSync(
    `ffmpeg -y -i "${srcMp4}" -filter_complex "${fc}" -map "[v]" -t ${targetDur} -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an "${outMp4}"`,
    { stdio: "pipe" },
  );
}

async function buildBanner(slug) {
  const cfg = BANNERS[slug];
  if (!cfg) throw new Error(`No config for ${slug}`);
  console.log(`\n▶ ${slug}`);

  // Total target ~14s. Allocate: intro 2s, 4 beats × 2.625s = 10.5s, outro 1.5s
  const INTRO = 2.0, OUTRO = 1.5;
  const beatDur = (14.0 - INTRO - OUTRO) / cfg.beats.length;

  // 1. Download AI beats and re-time them
  console.log("  ⬇ AI clips + retiming");
  const beatClips = [];
  for (const beat of cfg.beats) {
    const j = JSON.parse(await fs.readFile(path.join(GEN_DIR, `${slug}-${beat}.mp4.asset.json`), "utf8"));
    const raw = path.join(CACHE, `${slug}-${beat}.mp4`);
    await download(`${PREVIEW}${j.url}`, raw);
    const trimmed = path.join(CACHE, `${slug}-${beat}-fit.mp4`);
    await buildBeatClip(raw, trimmed, beatDur);
    beatClips.push(trimmed);
  }

  // 2. Image cards (intro vehicles, outro phone)
  console.log("  🖼 image cards");
  const intro = path.join(CACHE, `${slug}-intro-img.mp4`);
  const outro = path.join(CACHE, `${slug}-outro-img.mp4`);
  await buildImageCard(path.join(KEY_DIR, cfg.introImg), intro, INTRO, "in");
  await buildImageCard(path.join(KEY_DIR, cfg.outroImg), outro, OUTRO, "out");

  // 3. Concat all parts
  const concatList = path.join(CACHE, `${slug}-list.txt`);
  const all = [intro, ...beatClips, outro];
  await fs.writeFile(concatList, all.map((c) => `file '${c}'`).join("\n"));
  const concat = path.join(CACHE, `${slug}-concat.mp4`);
  console.log("  ⧉ concat");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an "${concat}"`,
    { stdio: "pipe" },
  );

  // 4. Captions (over full timeline) + persistent logo overlay top-left
  const ass = path.join(CACHE, `${slug}.ass`);
  await fs.writeFile(ass, buildAss(cfg.captions));
  // Title text overlay during intro
  const titleEsc = cfg.title.replace(/'/g, "\\'");
  const ctaEsc = cfg.cta.replace(/'/g, "\\'");
  const captioned = path.join(CACHE, `${slug}-cap.mp4`);
  console.log("  ✎ captions + logo + title overlay");
  const fc = [
    `[1:v]scale=140:140:force_original_aspect_ratio=decrease[logo]`,
    `[0:v]subtitles='${escFilter(ass)}'[withcap]`,
    `[withcap][logo]overlay=40:40:format=auto[withlogo]`,
    `[withlogo]drawtext=fontfile=${FONT}:text='${titleEsc}':fontsize=66:fontcolor=white:bordercolor=black:borderw=4:x=(w-text_w)/2:y=80:enable='between(t,0,2)'[t1]`,
    `[t1]drawtext=fontfile=${FONT}:text='${ctaEsc}':fontsize=72:fontcolor=white:bordercolor=black:borderw=5:x=(w-text_w)/2:y=h-200:enable='gte(t,12.5)'[v]`,
  ].join(";");
  execSync(
    `ffmpeg -y -i "${concat}" -i "${LOGO}" -filter_complex "${fc}" -map "[v]" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -an "${captioned}"`,
    { stdio: "pipe" },
  );

  // 5. Energize VO via ffmpeg audio processing:
  //   atempo=1.10 → +10% speed (raises energy AND pitch slightly via asetrate trick)
  //   We use asetrate to bump pitch ~+1 semitone, then aresample, then atempo to keep duration sensible
  //   acompressor adds punch; equalizer boosts 3kHz "presence" for excitement
  const vo = path.join(VO_DIR, `${slug}.mp3`);
  const voEnergy = path.join(CACHE, `${slug}-vo-energy.mp3`);
  console.log("  ⚡ energizing voiceover");
  // asetrate up 6% (raises pitch by ~1 semitone, faster), atempo back 0.97 (still net faster + brighter)
  execSync(
    `ffmpeg -y -i "${vo}" -af "asetrate=44100*1.06,aresample=44100,atempo=0.97,equalizer=f=3000:width_type=o:width=2:g=4,equalizer=f=180:width_type=o:width=1:g=2,acompressor=threshold=-18dB:ratio=3:attack=5:release=80:makeup=2,volume=1.15" "${voEnergy}"`,
    { stdio: "pipe" },
  );
  const voEnergyDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${voEnergy}"`).toString().trim());
  console.log(`     energized VO duration: ${voEnergyDur.toFixed(2)}s`);

  // 6. Mux: VO starts at 0.4s (just after intro card opens), pad audio to fill full video
  const final = path.join(OUT_DIR, `banner-${slug}.mp4`);
  console.log("  ♪ mux");
  // adelay 400ms then apad to ensure no audio cutoff issues
  execSync(
    `ffmpeg -y -i "${captioned}" -i "${voEnergy}" -filter_complex "[1:a]adelay=400|400,apad[a]" -map 0:v:0 -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "${final}"`,
    { stdio: "pipe" },
  );
  const stat = await fs.stat(final);
  const dur = execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${final}"`).toString().trim();
  console.log(`  ✓ ${final} (${(stat.size / 1024 / 1024).toFixed(2)} MB, ${dur}s)`);
}

const target = process.argv[2];
if (!target) { console.error("Usage: build-banners-v3.mjs <slug|all>"); process.exit(1); }
const slugs = target === "all" ? Object.keys(BANNERS) : [target];
for (const s of slugs) await buildBanner(s);
console.log("\nDone.");
