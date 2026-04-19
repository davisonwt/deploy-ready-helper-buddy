// Generates the Wandering Hand banner voiceover with ElevenLabs.
// Voice: Sarah (EXAVITQu4vr4xnSDxMaL) — warm, trustworthy, friendly.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../public/voiceovers");
const API_KEY = process.env.ELEVENLABS_API_KEY;

const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";

if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY required");
  process.exit(1);
}

const SCRIPT = {
  slug: "05-wandering-hand",
  text: "Need a helping hand? Plumbers, electricians, cleaners — trusted tribe pros at your door. Book a hand on Sow2Grow.",
};

const res = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`,
  {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: SCRIPT.text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
        style: 0.55,
        use_speaker_boost: true,
        speed: 1.05,
      },
    }),
  }
);

if (!res.ok) {
  console.error("ElevenLabs error", res.status, await res.text());
  process.exit(1);
}

await fs.mkdir(PUBLIC_DIR, { recursive: true });
const outPath = path.join(PUBLIC_DIR, `${SCRIPT.slug}.mp3`);
await fs.writeFile(outPath, Buffer.from(await res.arrayBuffer()));
const stat = await fs.stat(outPath);
console.log(`✓ ${SCRIPT.slug}.mp3 (${(stat.size / 1024).toFixed(0)} KB) → ${outPath}`);
