import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../public/voiceovers/tribal-hearts");
const API_KEY = process.env.ELEVENLABS_API_KEY;

const VOICE_ID = "4tRn1lSkEn13EVTuqb0g"; // Serafina - Sensual Temptress
const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";

if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY required");
  process.exit(1);
}

const SCENES = [
  {
    slug: "01-intro",
    text: "Tribal Hearts is a safe dating garden inside Sow2Grow.",
  },
  {
    slug: "02-ambassadors",
    text: "Ambassadors only — real tribe members, not random strangers.",
  },
  {
    slug: "03-story",
    text: "Tell Gentoo your story, then shape your profile your own way.",
  },
  {
    slug: "04-match",
    text: "Meet men and women who share your values, vision, and pace.",
  },
  {
    slug: "05-chat",
    text: "Chat only inside ChatApp, so your private details stay protected.",
  },
  {
    slug: "06-safety",
    text: "AI safety watches over every connection with care and respect.",
  },
  {
    slug: "07-close",
    text: "Become an Ambassador, enter the garden, and let love grow naturally.",
  },
];

async function generateSceneAudio(scene, index) {
  const previousText = index > 0 ? SCENES[index - 1].text : undefined;
  const nextText = index < SCENES.length - 1 ? SCENES[index + 1].text : undefined;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: scene.text,
        previous_text: previousText,
        next_text: nextText,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.58,
          similarity_boost: 0.82,
          style: 0.32,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }

  const outPath = path.join(PUBLIC_DIR, `${scene.slug}.mp3`);
  await fs.writeFile(outPath, Buffer.from(await res.arrayBuffer()));
  const duration = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${outPath}"`,
    { encoding: "utf8" }
  ).trim();

  return { outPath, duration: Number(duration) };
}

await fs.mkdir(PUBLIC_DIR, { recursive: true });

const manifest = [];
for (const [index, scene] of SCENES.entries()) {
  console.log(`→ ${scene.slug}`);
  const result = await generateSceneAudio(scene, index);
  manifest.push({ ...scene, ...result });
  console.log(`  ✓ ${result.duration.toFixed(2)}s`);
}

const concatList = path.join(PUBLIC_DIR, "concat.txt");
await fs.writeFile(
  concatList,
  manifest.map((item) => `file '${item.outPath.replaceAll("'", "'\\''")}'`).join("\n")
);

const finalOut = path.join(PUBLIC_DIR, "tribal-hearts-full.mp3");
execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${finalOut}"`, {
  stdio: "inherit",
});

await fs.writeFile(
  path.join(PUBLIC_DIR, "manifest.json"),
  JSON.stringify(
    {
      totalDuration: manifest.reduce((sum, item) => sum + item.duration, 0),
      scenes: manifest,
      finalOut,
    },
    null,
    2
  )
);

console.log(`✓ Combined narration → ${finalOut}`);