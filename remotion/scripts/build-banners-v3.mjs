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
  "01-community-orchard": {
    title: "When a tribe member has a need —",
    invite: "the tribe answers.",
    midInvite: "Open a Community Orchard · fill the pockets",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "b", "c"],
    introImg: "01-community-orchard-intro.jpg",
    outroImg: "01-community-orchard-outro.jpg",
    musicStart: 6,
    // VO is ~12.5s after energizing → needs ~14s playback + 1s music tail
    totalDur: 15.5,
  },
  "02-production-orchard": {
    title: "Have an idea — but no capital?",
    invite: "Plant a Production Orchard.",
    midInvite: "Half the pockets fill · the factory begins",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "b", "c"],
    introImg: "02-production-orchard-intro.jpg",
    outroImg: "02-production-orchard-outro.jpg",
    musicStart: 18,
    // VO is ~11.66s → after +6% tempo ≈ 11s; pad to 13.5s for music tail
    totalDur: 13.5,
  },
  "03-single-seed": {
    title: "Got something to offer today?",
    invite: "Sow a Single Seed.",
    midInvite: "List it · set the bestowal · the tribe harvests",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "b", "c"],
    introImg: "03-single-seed-intro.jpg",
    outroImg: "03-single-seed-outro.jpg",
    musicStart: 30,
    // VO regenerated in clear English (~26s raw) → no pitch/tempo lift to keep it natural
    // Total: 1.4s music intro + ~26s VO + 2s outro tail = ~29.5s
    totalDur: 29.5,
    skipEnergize: true,
  },
  "04-wandering-wheel": {
    title: "List your vehicle —",
    invite: "become a Wandering Wheel!",
    midInvite: "List your vehicle today",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "d", "c"],
    introImg: "04-wandering-wheel-vehicles.jpg",
    outroImg: "04-wandering-wheel-phone.jpg",
    musicStart: 36,
  },
  "05-wandering-hand": {
    title: "Offer your skills —",
    invite: "become a Wandering Hand!",
    midInvite: "Plumbers · electricians · cleaners · security",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "c", "d"],
    introImg: "05-wandering-hand-tools.jpg",
    outroImg: "05-wandering-hand-handshake.jpg",
    musicStart: 12,
  },
  "06-wandering-whisperer": {
    title: "Amplify the tribe —",
    invite: "become a Wandering Whisperer!",
    midInvite: "Promote sellers · earn alongside",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "c", "d"],
    introImg: "06-wandering-whisperer-phones.jpg",
    outroImg: "06-wandering-whisperer-creator.jpg",
    musicStart: 24,
  },
  "07-wandering-pillow": {
    title: "Open your doors —",
    invite: "become a Wandering Pillow!",
    midInvite: "Host travellers · share your home",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "c", "d"],
    introImg: "07-wandering-pillow-cottage.jpg",
    outroImg: "07-wandering-pillow-breakfast.jpg",
    musicStart: 48,
  },
  "08-wandering-field": {
    title: "Sow your harvest —",
    invite: "become a Wandering Field!",
    midInvite: "Farm to tribe · no middleman",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "c", "d"],
    introImg: "08-wandering-field-tomatoes.jpg",
    outroImg: "08-wandering-field-family.jpg",
    musicStart: 60,
  },
  "09-wandering-hearth": {
    title: "Craft with love —",
    invite: "become a Wandering Hearth!",
    midInvite: "Handmade · jam · candles · soap",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "c", "d"],
    introImg: "09-wandering-hearth-jam.jpg",
    outroImg: "09-wandering-hearth-unboxing.jpg",
    musicStart: 72,
  },
  "10-wandering-forge": {
    title: "Manufacture for the tribe —",
    invite: "become a Wandering Forge!",
    midInvite: "Clothing · cutlery · electronics · more",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "c", "d"],
    introImg: "10-wandering-forge-workshop.jpg",
    outroImg: "10-wandering-forge-delivery.jpg",
    musicStart: 84,
  },
  "11-classroom": {
    title: "Have a skill to share —",
    invite: "host a Live Classroom!",
    midInvite: "Live voice & video · free or bestowal",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "c", "d"],
    introImg: "11-classroom-intro.jpg",
    outroImg: "11-classroom-outro.jpg",
    musicStart: 96,
    // VO ~9.8s raw → ~9.3s energized; total = 1.4 intro + 9.3 + 2 tail ≈ 12.7s
    totalDur: 13.0,
  },
  "12-skilldrop": {
    title: "Got a skill the tribe needs?",
    invite: "Open a SkillDrop Room!",
    midInvite: "Pottery · painting · cooking · repair",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "c", "d"],
    introImg: "12-skilldrop-intro.jpg",
    outroImg: "12-skilldrop-outro.jpg",
    musicStart: 108,
    // Energized VO ~14.9s; total = 1.4 intro + 14.9 + 1.5 tail ≈ 17.8s
    totalDur: 17.8,
  },
  "13-training": {
    title: "Train the tribe —",
    invite: "host a Live Training session!",
    midInvite: "Yoga · fitness · meditation · mindfulness",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "c", "d"],
    introImg: "13-training-intro.jpg",
    outroImg: "13-training-outro.jpg",
    musicStart: 60,
    // Calm VO ~13.3s energized; total = 1.4 lead + 13.3 + 1.5 tail ≈ 16.2s
    totalDur: 16.2,
  },
  "14-radio": {
    title: "Go live on the airwaves —",
    invite: "host your own Radio show!",
    midInvite: "Music · talk · product promos · ads",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "c", "d"],
    introImg: "14-radio-intro.jpg",
    outroImg: "14-radio-outro.jpg",
    musicStart: 24,
    // Upbeat VO ~12s energized; total = 1.4 lead + 12 + 1.5 tail ≈ 14.9s
    totalDur: 14.9,
  },
  "15-one-on-one": {
    title: "Connect privately —",
    invite: "start a 1-on-1 Chat!",
    midInvite: "Text · voice · video · calls — full control",
    cta: "Sign up on Sow2Grow",
    beats: ["a", "b", "c", "d"],
    introImg: "15-one-on-one-intro.jpg",
    outroImg: "15-one-on-one-outro.jpg",
    musicStart: 48,
    // Warm VO ~10.5s raw → ~10s energized; total = 1.4 lead + 10 + 1.5 tail ≈ 12.9s
    totalDur: 12.9,
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
  const fc = `[0:v]scale=3840:2160:force_original_aspect_ratio=increase:flags=lanczos,crop=3840:2160,zoompan=z='${zoomExpr}':d=${frames}:s=1920x1080:fps=30,${GRADE},format=yuv420p[v]`;
  runFF(
    `ffmpeg -y -loop 1 -t ${durSec} -i "${imgPath}" -filter_complex "${fc}" -map "[v]" -t ${durSec} -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -an "${out}"`,
    "step",
  );
}

async function buildBeatClip(srcMp4, outMp4, targetDur) {
  const probe = execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${srcMp4}"`).toString().trim();
  const srcDur = parseFloat(probe);
  const speed = (srcDur / targetDur).toFixed(4);
  // Match intro/outro framing: fill the 1920x1080 frame edge-to-edge (no black bars)
  // by upscaling+cropping instead of letterboxing. Keeps every scene the same wide size.
  const fc = `[0:v]setpts=PTS/${speed},scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080,fps=30,${GRADE}[v]`;
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
  // Per-banner totalDur override allows longer voiceovers (e.g. community orchard ~14s VO)
  const TOTAL = cfg.totalDur ?? 13.0;
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

  // Text overlay timings scale to TOTAL: title intro at 0.2-2.5s,
  // mid-invite in middle 1/3, CTA in last 2.5s
  const midStart = (TOTAL * 0.4).toFixed(2);
  const midEnd = (TOTAL * 0.7).toFixed(2);
  const ctaStart = (TOTAL - 2.5).toFixed(2);
  const fc = [
    `[1:v]scale=170:170:force_original_aspect_ratio=decrease,format=rgba[logoBase]`,
    `[logoBase]rotate='0.08*sin(t*PI*0.8)':c=none:ow=170:oh=170[logoR]`,
    `[logoR]scale='170*(0.92+0.10*sin(t*PI*1.1))':-1:eval=frame[logoP]`,
    `[0:v][logoP]overlay=x='160-overlay_w/2':y='160-overlay_h/2+8*sin(t*PI*0.7)':format=auto:eval=frame[withLogo]`,
    `[withLogo]drawtext=fontfile=${FONT}:text='${titleEsc}':fontsize=64:fontcolor=white:bordercolor=0x2C5F2D:borderw=5:shadowcolor=0x000000AA:shadowx=2:shadowy=3:x=(w-text_w)/2:y=70:enable='between(t,0.2,2.5)'[t0]`,
    `[t0]drawtext=fontfile=${FONT}:text='${inviteEsc}':fontsize=72:fontcolor=0xF5E8D0:bordercolor=0x2C5F2D:borderw=6:shadowcolor=0x000000CC:shadowx=2:shadowy=3:x=(w-text_w)/2:y=160:enable='between(t,0.5,2.7)'[t1]`,
    `[t1]drawbox=x=0:y=940:w=1920:h=140:color=0x2C5F2DCC:t=fill:enable='between(t,${midStart},${midEnd})'[mb]`,
    `[mb]drawtext=fontfile=${FONT}:text='${midInviteEsc}':fontsize=66:fontcolor=0xF5E8D0:bordercolor=0x000000:borderw=3:shadowcolor=0x000000AA:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h-180:enable='between(t,${midStart},${midEnd})'[t2]`,
    `[t2]drawtext=fontfile=${FONT}:text='${ctaEsc}':fontsize=80:fontcolor=0xF5E8D0:bordercolor=0x2C5F2D:borderw=6:shadowcolor=0x000000CC:shadowx=2:shadowy=3:x=(w-text_w)/2:y=h-180:enable='gte(t,${ctaStart})'[v]`,
  ].join(";");

  runFF(
    `ffmpeg -y -i "${concat}" -i "${LOGO}" -filter_complex "${fc}" -map "[v]" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -an "${branded}"`,
    "branding overlay",
  );

  // VO energy v2 — much more excited
  // pitch +12% (asetrate*1.12), tempo +6% (atempo 0.945 to recover speed), brighter
  // skipEnergize: gentler processing for already-clear synth voices (e.g. espeak English)
  const vo = path.join(VO_DIR, `${slug}.mp3`);
  const voEnergy = path.join(CACHE, `${slug}-vo-energy.mp3`);
  console.log("  ⚡ energizing VO (warm enthusiastic friend)");
  const voFilter = cfg.skipEnergize
    ? `equalizer=f=200:width_type=o:width=1:g=2,equalizer=f=3000:width_type=o:width=2:g=3,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=2,volume=1.4`
    : `asetrate=44100*1.12,aresample=44100,atempo=0.945,equalizer=f=3500:width_type=o:width=2:g=5,equalizer=f=200:width_type=o:width=1:g=2.5,equalizer=f=8000:width_type=o:width=2:g=3,acompressor=threshold=-20dB:ratio=4:attack=3:release=60:makeup=3,volume=1.65`;
  runFF(
    `ffmpeg -y -i "${vo}" -af "${voFilter}" "${voEnergy}"`,
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
  // Music volume curve: 0.70 (intro) → 0.16 (ducked under VO) → 0.70 (outro)
  // Aggressive duck so VO sits clearly on top
  runFF(
    `ffmpeg -y -i "${branded}" -i "${voEnergy}" -ss ${cfg.musicStart ?? 36} -stream_loop -1 -i "${MUSIC}" ` +
    `-filter_complex "` +
      `[1:a]adelay=${voDelayMs}|${voDelayMs},volume=1.0[vo];` +
      `[2:a]volume='if(lt(t,${MUSIC_LEAD - 0.2}),0.70,if(lt(t,${MUSIC_LEAD + 0.3}),0.70-0.54*(t-${MUSIC_LEAD - 0.2})/0.5,if(lt(t,${swellStart}),0.16,if(lt(t,${swellStart + 0.5}),0.16+0.54*(t-${swellStart})/0.5,0.70))))':eval=frame,afade=t=in:st=0:d=0.4,afade=t=out:st=${(finalDur - 1.0).toFixed(2)}:d=1.0[mus];` +
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
