// Generates Chatterbox TTS voiceovers for all 10 S2G banners using the
// resemble-ai/chatterbox model on Replicate, with voice cloning from a
// reference WAV at /tmp/s2g-tts/narrator.wav.
//
// Output: remotion/public/voiceovers/<slug>.mp3
//
// Usage: REPLICATE_API_TOKEN=... node scripts/generate-voiceovers.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../public/voiceovers");
const REFERENCE_WAV = process.env.REFERENCE_WAV || "/tmp/s2g-tts/narrator.wav";
const TOKEN = process.env.REPLICATE_API_TOKEN;
const VERSION = "1b8422bc49635c20d0a84e387ed20879c0dd09254ecdb4e75dc4bec10ff94e97"; // resemble-ai/chatterbox

if (!TOKEN) { console.error("REPLICATE_API_TOKEN required"); process.exit(1); }

const SCRIPTS = [
  { slug: "01-community-orchard", text: "Welcome to Sow2Grow. Our tribe needs a vehicle. Open a Community Orchard and watch glowing pockets fill with bestowals from around the world. When the last pocket fills, the seed grows into the gift our community needs. Plant a Community Orchard today." },
  { slug: "02-production-orchard", text: "Sow2Grow Production Orchards turn ideas into supply. Open ten glowing pockets. At thirty percent funded, production starts and deliveries flow instantly to happy customers worldwide. Plant a Production Orchard." },
  { slug: "03-single-seed", text: "Sow a Single Seed on Sow2Grow. Music, produce, services, vehicles, anything you offer. One pocket. One bestowal. One harvest. The simplest way to start." },
  { slug: "04-wandering-wheel", text: "Become a Wandering Wheel on Sow2Grow. Drive trucks, motorbikes, or cars. Carry packages, fresh produce, and handmade goods to your tribe. Deliver. Earn. Serve." },
  { slug: "05-wandering-hand", text: "Become a Wandering Hand on Sow2Grow. Plumbers, electricians, domestic workers, security, engineers. Your skills. Your schedule. Your tribe." },
  { slug: "06-wandering-whisperer", text: "Become a Wandering Whisperer on Sow2Grow. Promote community sellers across Instagram, Facebook, TikTok, and X. Amplify your tribe. Grow their seeds." },
  { slug: "07-wandering-pillow", text: "Become a Wandering Pillow on Sow2Grow. Open your homes, cottages, farm lodges, and boutique stays to travellers from every nation. Open your door. Welcome the world." },
  { slug: "08-wandering-field", text: "Become a Wandering Field on Sow2Grow. Tomatoes, honey, avocados, eggs, straight from your land to the tribe. Farm to tribe. No middleman. Direct bestowals." },
  { slug: "09-wandering-hearth", text: "Become a Wandering Hearth on Sow2Grow. Jams, soaps, candles, baked goods, herbal teas. Handmade with love. Bestowed with purpose." },
  { slug: "10-wandering-forge", text: "Become a Wandering Forge on Sow2Grow. Furniture, clothing, tools, electronics. Factory direct. Community powered. Zero waste." },
];

async function audioPromptUri() {
  const buf = await fs.readFile(REFERENCE_WAV);
  return `data:audio/wav;base64,${buf.toString("base64")}`;
}

async function predict(prompt, audioUri) {
  let create, attempt = 0;
  while (true) {
    create = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        version: VERSION,
        input: { prompt, audio_prompt: audioUri, exaggeration: 0.5, cfg_weight: 0.5, temperature: 0.7 },
      }),
    });
    if (create.ok) break;
    if (create.status === 429 && attempt < 10) {
      const wait = 12000 + attempt * 3000;
      console.log(`  rate-limited, waiting ${wait/1000}s…`);
      await new Promise(r => setTimeout(r, wait));
      attempt++; continue;
    }
    throw new Error(`Replicate create: ${create.status} ${await create.text()}`);
  }
  const pred = await create.json();
  let id = pred.id;
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const p = await poll.json();
    if (p.status === "succeeded") return Array.isArray(p.output) ? p.output[0] : p.output;
    if (p.status === "failed" || p.status === "canceled") throw new Error(`Replicate failed: ${p.error}`);
  }
  throw new Error("Replicate timeout");
}

async function downloadAndConvert(url, outPath) {
  const wavPath = outPath.replace(/\.mp3$/, ".wav");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${url} failed`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(wavPath, buf);
  // Convert WAV -> MP3 via ffmpeg for smaller bundle size
  const { execSync } = await import("node:child_process");
  execSync(`ffmpeg -y -i "${wavPath}" -ar 44100 -ac 1 -b:a 96k "${outPath}"`, { stdio: "pipe" });
  await fs.unlink(wavPath);
}

(async () => {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  const audioUri = await audioPromptUri();
  console.log(`Reference voice loaded (${(audioUri.length / 1024).toFixed(0)} KB base64)`);

  for (const { slug, text } of SCRIPTS) {
    const outPath = path.join(PUBLIC_DIR, `${slug}.mp3`);
    try {
      await fs.access(outPath);
      console.log(`✓ ${slug} (cached)`); continue;
    } catch {}
    console.log(`→ ${slug}: ${text.slice(0, 60)}…`);
    const url = await predict(text, audioUri);
    await downloadAndConvert(url, outPath);
    const stat = await fs.stat(outPath);
    console.log(`✓ ${slug}.mp3 (${(stat.size / 1024).toFixed(0)} KB)`);
  }
  console.log("All voiceovers generated.");
})().catch((e) => { console.error(e); process.exit(1); });
