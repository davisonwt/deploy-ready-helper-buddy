// Build v3.3 banner: 10.5s total — matches energized VO with NO silence,
// no burnt-in captions, animated transparent logo.
//
// Structure:
//   0.0 – 1.5s  Vehicles montage card (Ken Burns zoom)
//   1.5 – 9.0s  4 AI clips (~1.875s each) — pure visuals
//   9.0 – 10.5s Phone-in-hand outro card
//
// VO (~9.93s after energizing) starts at 0.3s, ends at ~10.2s. Video ends 10.5s.
// Persistent transparent animated logo top-left throughout.

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
const LOGO = path.join(ROOT, "public/logo-transparent.png");
await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(CACHE, { recursive: true });

const FONT = "/nix/store/xhanp47490n743s7zd27d8i9s1khg6c0-dejavu-fonts-minimal-2.37/share/fonts/truetype/DejaVuSans.ttf";

const BANNERS = {
  "04-wandering-wheel": {
    title: "Register your vehicle — become a Wandering Wheel!",
    cta: "Book us on Sow2Grow",
    beats: ["a", "b", "d", "c"],
    introImg: "04-wandering-wheel-vehicles.jpg",
    outroImg: "04-wandering-wheel-phone.jpg",
  },
};

async function download(url, dest) {
  if (existsSync(dest) && (await fs.stat(dest)).size > 1000) return dest;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return dest;
}

function escFilter(p) { return p.replace(/\\/g,"/").replace(/:/g,"\\:").replace(/'/g,"\\'"); }

async function buildImageCard(imgPath, out, durSec, zoomDir = "in") {
  const frames = Math.round(durSec * 30);
  const zoomExpr = zoomDir === "in"
    ? `min(zoom+0.0020,1.10)`
    : `if(lte(zoom,1.0),1.10,max(1.001,zoom-0.0020))`;
  const fc = `[0:v]scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,zoompan=z='${zoomExpr}':d=${frames}:s=1920x1080:fps=30,format=yuv420p[v]`;
  execSync(
    `ffmpeg -y -loop 1 -t ${durSec} -i "${imgPath}" -filter_complex "${fc}" -map "[v]" -t ${durSec} -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an "${out}"`,
    { stdio: "pipe" },
  );
}

async function buildBeatClip(srcMp4, outMp4, targetDur) {
  const probe = execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${srcMp4}"`).toString().trim();
  const srcDur = parseFloat(probe);
  const speed = (srcDur / targetDur).toFixed(4);
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

  const TOTAL = 10.5;
  const INTRO = 1.5, OUTRO = 1.5;
  const beatDur = (TOTAL - INTRO - OUTRO) / cfg.beats.length; // 7.5/4 = 1.875s

  // 1. Download AI beats and re-time them
  console.log("  ⬇ AI clips + retiming to", beatDur.toFixed(2), "s each");
  const beatClips = [];
  for (const beat of cfg.beats) {
    const j = JSON.parse(await fs.readFile(path.join(GEN_DIR, `${slug}-${beat}.mp4.asset.json`), "utf8"));
    const raw = path.join(CACHE, `${slug}-${beat}.mp4`);
    await download(`${PREVIEW}${j.url}`, raw);
    const trimmed = path.join(CACHE, `${slug}-${beat}-fit.mp4`);
    await buildBeatClip(raw, trimmed, beatDur);
    beatClips.push(trimmed);
  }

  // 2. Image cards
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

  // 4. Animated transparent logo overlay + clean title (intro only) + CTA (outro only)
  //    Logo animation: gentle "breathing" — scale pulse 130-160px + tiny vertical bob
  const titleEsc = cfg.title.replace(/'/g, "\\'");
  const ctaEsc = cfg.cta.replace(/'/g, "\\'");
  const branded = path.join(CACHE, `${slug}-brand.mp4`);
  console.log("  ✎ animated transparent logo + intro title + outro CTA");
  // Pre-scale logo to a generous 200px square; overlay scales it dynamically
  const fc = [
    `[1:v]scale=200:200:force_original_aspect_ratio=decrease,format=rgba[logoBase]`,
    // overlay with time-varying scale — logo "breathes" 0.75→0.95 every 2s
    `[logoBase]scale='200*(0.85+0.10*sin(t*PI))':-1:eval=frame[logoP]`,
    `[0:v][logoP]overlay=x='40':y='40+8*sin(t*PI*0.7)':format=auto:eval=frame[withlogo]`,
    // Title only during intro
    `[withlogo]drawtext=fontfile=${FONT}:text='${titleEsc}':fontsize=64:fontcolor=white:bordercolor=0x2C5F2D:borderw=5:shadowcolor=0x000000AA:shadowx=2:shadowy=3:x=(w-text_w)/2:y=80:enable='between(t,0.2,1.5)'[t1]`,
    // CTA only during outro
    `[t1]drawtext=fontfile=${FONT}:text='${ctaEsc}':fontsize=70:fontcolor=0xF5E8D0:bordercolor=0x2C5F2D:borderw=6:shadowcolor=0x000000CC:shadowx=2:shadowy=3:x=(w-text_w)/2:y=h-160:enable='gte(t,9.0)'[v]`,
  ].join(";");
  execSync(
    `ffmpeg -y -i "${concat}" -i "${LOGO}" -filter_complex "${fc}" -map "[v]" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -an "${branded}"`,
    { stdio: "pipe" },
  );

  // 5. Energize VO (same as before)
  const vo = path.join(VO_DIR, `${slug}.mp3`);
  const voEnergy = path.join(CACHE, `${slug}-vo-energy.mp3`);
  console.log("  ⚡ energizing voiceover");
  execSync(
    `ffmpeg -y -i "${vo}" -af "asetrate=44100*1.06,aresample=44100,atempo=0.97,equalizer=f=3000:width_type=o:width=2:g=4,equalizer=f=180:width_type=o:width=1:g=2,acompressor=threshold=-18dB:ratio=3:attack=5:release=80:makeup=2,volume=1.15" "${voEnergy}"`,
    { stdio: "pipe" },
  );
  const voEnergyDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${voEnergy}"`).toString().trim());
  console.log(`     energized VO duration: ${voEnergyDur.toFixed(2)}s`);

  // 6. Mux: VO starts 0.3s in, video is 10.5s. VO ends ~10.2s — only 0.3s tail silence
  //    To eliminate tail silence completely, trim video to exactly VO end + 0.3s outro
  const finalDur = Math.min(TOTAL, voEnergyDur + 0.6);
  const final = path.join(OUT_DIR, `banner-${slug}.mp4`);
  console.log(`  ♪ mux (final video duration: ${finalDur.toFixed(2)}s, no silence tail)`);
  execSync(
    `ffmpeg -y -i "${branded}" -i "${voEnergy}" -filter_complex "[1:a]adelay=300|300[a]" -map 0:v:0 -map "[a]" -t ${finalDur.toFixed(2)} -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k "${final}"`,
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
