// Build v3.5 banner: punchy & saturated, animated colorful logo, music bed,
// MUCH more energetic VO via aggressive ffmpeg processing.
//
// New in v3.5:
//   • Saturated/warm color grade (eq filter — sat 1.35, contrast 1.10, brightness +0.02, gamma 0.95)
//   • Sun-burst sparkle ring rotating behind the logo (golden particles vibe)
//   • Logo "alive" animation: breathing scale + bob + subtle rotation
//   • Soft music bed under VO ("We Sow, We Grow") — ducked to -22dB
//   • VO energy v2: pitch +12%, tempo +6%, brighter EQ, parallel compression — friend who's hyped
//
// Structure (10.5s total):
//   0.0 – 1.5s  Vehicles montage card (Ken Burns zoom, saturated)
//   1.5 – 9.0s  4 AI clips (~1.875s each) — saturated grade
//   9.0 – 10.5s Phone-in-hand outro card

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
const MUSIC = path.join(ROOT, "public/music/we-sow-we-grow.mp3");
await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(CACHE, { recursive: true });

const FONT = "/nix/store/xhanp47490n743s7zd27d8i9s1khg6c0-dejavu-fonts-minimal-2.37/share/fonts/truetype/DejaVuSans.ttf";

// Saturated cinematic color grade — the "punchy & saturated" look
const GRADE = "eq=saturation=1.35:contrast=1.10:brightness=0.02:gamma=0.95,unsharp=5:5:0.5";

const BANNERS = {
  "04-wandering-wheel": {
    title: "List your vehicle —",
    invite: "become a Wandering Wheel!",
    midInvite: "List your vehicle today",
    cta: "Sign up on Sow2Grow",
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

async function buildImageCard(imgPath, out, durSec, zoomDir = "in") {
  const frames = Math.round(durSec * 30);
  const zoomExpr = zoomDir === "in"
    ? `min(zoom+0.0020,1.10)`
    : `if(lte(zoom,1.0),1.10,max(1.001,zoom-0.0020))`;
  const fc = `[0:v]scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,zoompan=z='${zoomExpr}':d=${frames}:s=1920x1080:fps=30,${GRADE},format=yuv420p[v]`;
  runFF(
    `ffmpeg -y -loop 1 -t ${durSec} -i "${imgPath}" -filter_complex "${fc}" -map "[v]" -t ${durSec} -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an "${out}"`,
    "step",
  );
}

async function buildBeatClip(srcMp4, outMp4, targetDur) {
  const probe = execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${srcMp4}"`).toString().trim();
  const srcDur = parseFloat(probe);
  const speed = (srcDur / targetDur).toFixed(4);
  const fc = `[0:v]setpts=PTS/${speed},scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,${GRADE}[v]`;
  runFF(
    `ffmpeg -y -i "${srcMp4}" -filter_complex "${fc}" -map "[v]" -t ${targetDur} -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an "${outMp4}"`,
    "step",
  );
}

// Pre-rendered golden sunburst (black bg, will be color-keyed transparent at composite time)
const SUNBURST = path.join(ROOT, "public/sunburst-sparkle.png");

function runFF(cmd, label) {
  try {
    execSync(cmd, { stdio: "pipe" });
  } catch (e) {
    const stderr = e.stderr?.toString() ?? "";
    const tail = stderr.split("\n").slice(-30).join("\n");
    console.error(`\n✗ ffmpeg failed (${label}):\n${tail}\n`);
    throw e;
  }
}

async function buildBanner(slug) {
  const cfg = BANNERS[slug];
  if (!cfg) throw new Error(`No config for ${slug}`);
  console.log(`\n▶ ${slug}`);

  // v3.7 — let the music breathe: longer intro/outro cards = pure-music moments
  const TOTAL = 13.0;
  const INTRO = 2.5, OUTRO = 2.5;        // pure-music head & tail
  const MUSIC_LEAD = 1.4;                 // VO starts 1.4s in (music alone first)
  const MUSIC_TAIL_START = TOTAL - 2.0;   // music swells back up 2s before end
  const beatDur = (TOTAL - INTRO - OUTRO) / cfg.beats.length;

  console.log("  ⬇ AI clips + retiming + saturate to", beatDur.toFixed(2), "s each");
  const beatClips = [];
  for (const beat of cfg.beats) {
    const j = JSON.parse(await fs.readFile(path.join(GEN_DIR, `${slug}-${beat}.mp4.asset.json`), "utf8"));
    const raw = path.join(CACHE, `${slug}-${beat}.mp4`);
    await download(`${PREVIEW}${j.url}`, raw);
    const trimmed = path.join(CACHE, `${slug}-${beat}-fit.mp4`);
    await buildBeatClip(raw, trimmed, beatDur);
    beatClips.push(trimmed);
  }

  console.log("  🖼 saturated image cards");
  const intro = path.join(CACHE, `${slug}-intro-img.mp4`);
  const outro = path.join(CACHE, `${slug}-outro-img.mp4`);
  await buildImageCard(path.join(KEY_DIR, cfg.introImg), intro, INTRO, "in");
  await buildImageCard(path.join(KEY_DIR, cfg.outroImg), outro, OUTRO, "out");

  const concatList = path.join(CACHE, `${slug}-list.txt`);
  const all = [intro, ...beatClips, outro];
  await fs.writeFile(concatList, all.map((c) => `file '${c}'`).join("\n"));
  const concat = path.join(CACHE, `${slug}-concat.mp4`);
  console.log("  ⧉ concat");
  runFF(
    `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an "${concat}"`,
    "step",
  );

  console.log("  ✎ animated logo + sunburst + title + invite + CTA");
  const titleEsc = cfg.title.replace(/'/g, "\\'");
  const inviteEsc = cfg.invite.replace(/'/g, "\\'");
  const midInviteEsc = cfg.midInvite.replace(/'/g, "\\'");
  const ctaEsc = cfg.cta.replace(/'/g, "\\'");
  const branded = path.join(CACHE, `${slug}-brand.mp4`);

  const fc = [
    `[2:v]colorkey=0x000000:0.30:0.20,format=rgba,scale=280:280[burstK]`,
    `[burstK]rotate='t*0.6':c=none:ow=280:oh=280[burstR]`,
    `[burstR]scale='280*(0.92+0.12*sin(t*PI*1.2))':-1:eval=frame[burstP]`,
    `[1:v]scale=170:170:force_original_aspect_ratio=decrease,format=rgba[logoBase]`,
    `[logoBase]rotate='0.08*sin(t*PI*0.8)':c=none:ow=170:oh=170[logoR]`,
    `[logoR]scale='170*(0.92+0.10*sin(t*PI*1.1))':-1:eval=frame[logoP]`,
    `[0:v][burstP]overlay=x='160-overlay_w/2':y='160-overlay_h/2+8*sin(t*PI*0.7)':format=auto:eval=frame[withBurst]`,
    `[withBurst][logoP]overlay=x='160-overlay_w/2':y='160-overlay_h/2+8*sin(t*PI*0.7)':format=auto:eval=frame[withLogo]`,
    `[withLogo]drawtext=fontfile=${FONT}:text='${titleEsc}':fontsize=64:fontcolor=white:bordercolor=0x2C5F2D:borderw=5:shadowcolor=0x000000AA:shadowx=2:shadowy=3:x=(w-text_w)/2:y=70:enable='between(t,0.2,2.5)'[t0]`,
    `[t0]drawtext=fontfile=${FONT}:text='${inviteEsc}':fontsize=72:fontcolor=0xF5E8D0:bordercolor=0x2C5F2D:borderw=6:shadowcolor=0x000000CC:shadowx=2:shadowy=3:x=(w-text_w)/2:y=160:enable='between(t,0.5,2.7)'[t1]`,
    `[t1]drawbox=x=0:y=940:w=1920:h=140:color=0x2C5F2DCC:t=fill:enable='between(t,5.0,9.5)'[mb]`,
    `[mb]drawtext=fontfile=${FONT}:text='${midInviteEsc}':fontsize=66:fontcolor=0xF5E8D0:bordercolor=0x000000:borderw=3:shadowcolor=0x000000AA:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h-180:enable='between(t,5.0,9.5)'[t2]`,
    `[t2]drawtext=fontfile=${FONT}:text='${ctaEsc}':fontsize=80:fontcolor=0xF5E8D0:bordercolor=0x2C5F2D:borderw=6:shadowcolor=0x000000CC:shadowx=2:shadowy=3:x=(w-text_w)/2:y=h-180:enable='gte(t,10.5)'[v]`,
  ].join(";");

  runFF(
    `ffmpeg -y -i "${concat}" -i "${LOGO}" -i "${SUNBURST}" -filter_complex "${fc}" -map "[v]" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -an "${branded}"`,
    "branding overlay",
  );

  // VO energy v2 — much more excited
  // pitch +12% (asetrate*1.12), tempo +6% (atempo 0.945 to recover speed), brighter
  const vo = path.join(VO_DIR, `${slug}.mp3`);
  const voEnergy = path.join(CACHE, `${slug}-vo-energy.mp3`);
  console.log("  ⚡ energizing VO (warm enthusiastic friend)");
  runFF(
    `ffmpeg -y -i "${vo}" -af "asetrate=44100*1.12,aresample=44100,atempo=0.945,equalizer=f=3500:width_type=o:width=2:g=5,equalizer=f=200:width_type=o:width=1:g=2.5,equalizer=f=8000:width_type=o:width=2:g=3,acompressor=threshold=-20dB:ratio=4:attack=3:release=60:makeup=3,volume=1.25" "${voEnergy}"`,
    "step",
  );
  const voEnergyDur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${voEnergy}"`).toString().trim());
  console.log(`     energized VO duration: ${voEnergyDur.toFixed(2)}s`);

  // Mux: pure music intro → VO with ducked music → pure music outro
  const finalDur = TOTAL;
  const voDelayMs = Math.round(MUSIC_LEAD * 1000);
  const voEndTime = MUSIC_LEAD + voEnergyDur;
  const swellStart = Math.max(voEndTime - 0.2, MUSIC_TAIL_START - 0.5);
  const final = path.join(OUT_DIR, `banner-${slug}.mp4`);
  console.log(`  ♪ mux: ${MUSIC_LEAD}s music intro → VO (${voEnergyDur.toFixed(2)}s) → music swells back at ${swellStart.toFixed(2)}s (total ${finalDur}s)`);
  // Music volume curve: 0.65 (intro) → 0.32 (under VO) → 0.65 (outro)
  // Use volume expression with time gates so music is LOUD when VO is silent
  runFF(
    `ffmpeg -y -i "${branded}" -i "${voEnergy}" -ss 36 -stream_loop -1 -i "${MUSIC}" ` +
    `-filter_complex "` +
      `[1:a]adelay=${voDelayMs}|${voDelayMs},volume=1.0[vo];` +
      `[2:a]volume='if(lt(t,${MUSIC_LEAD - 0.2}),0.65,if(lt(t,${MUSIC_LEAD + 0.3}),0.65-0.33*(t-${MUSIC_LEAD - 0.2})/0.5,if(lt(t,${swellStart}),0.32,if(lt(t,${swellStart + 0.5}),0.32+0.33*(t-${swellStart})/0.5,0.65))))':eval=frame,afade=t=in:st=0:d=0.4,afade=t=out:st=${(finalDur - 1.0).toFixed(2)}:d=1.0[mus];` +
      `[vo][mus]amix=inputs=2:duration=longest:dropout_transition=0:weights='1.0 1.0',alimiter=limit=0.95[a]` +
    `" ` +
    `-map 0:v:0 -map "[a]" -t ${finalDur.toFixed(2)} ` +
    `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k "${final}"`,
    "mux",
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
