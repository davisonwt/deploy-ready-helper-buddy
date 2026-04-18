// Generates professional voiceovers for all 10 S2G banners using ElevenLabs.
// Voice: George (JBFqnCBsd6RMkjVDRZzb) — warm, grounded male storyteller.
//
// Output: remotion/public/voiceovers/<slug>.mp3 (overwrites existing)
//
// Usage: ELEVENLABS_API_KEY=... node scripts/generate-voiceovers-elevenlabs.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../public/voiceovers");
const API_KEY = process.env.ELEVENLABS_API_KEY;

const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George — warm, mature male storyteller
const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";

if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY required");
  process.exit(1);
}

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

async function generateVoiceover(text, outPath) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.8,
        style: 0.35,
        use_speaker_boost: true,
        speed: 1.0,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${err}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, buf);
}

(async () => {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  console.log(`Generating ${SCRIPTS.length} voiceovers with ElevenLabs (George voice)…\n`);

  for (const { slug, text } of SCRIPTS) {
    const outPath = path.join(PUBLIC_DIR, `${slug}.mp3`);
    console.log(`→ ${slug}: ${text.slice(0, 70)}…`);
    await generateVoiceover(text, outPath);
    const stat = await fs.stat(outPath);
    console.log(`  ✓ ${(stat.size / 1024).toFixed(0)} KB\n`);
    // Tiny pause to be polite to the API
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log("All voiceovers generated with ElevenLabs.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
