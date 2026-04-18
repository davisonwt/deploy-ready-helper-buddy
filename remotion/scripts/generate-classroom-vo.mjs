// Generates the Classroom Go-Live banner voiceover with ElevenLabs.
// Voice: George (JBFqnCBsd6RMkjVDRZzb) — softer, teacher-friendly settings.
//
// Usage: node scripts/generate-classroom-vo.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../public/voiceovers");
const API_KEY = process.env.ELEVENLABS_API_KEY;

const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";

if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY required");
  process.exit(1);
}

// ~20 seconds of warm, teacher-friendly narration.
const SCRIPT = {
  slug: "11-classroom",
  text: "Go live as a Classroom on Sow2Grow. Teach with live voice and video, from the young to the old. Share videos, documents, and voice notes with your students, all in one room. Host for free, or set a small bestowal in USDT. Your knowledge is a seed. Plant it. Watch it grow.",
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
        // Softer, calmer read for an educational tone
        stability: 0.7,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true,
        speed: 0.95,
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
