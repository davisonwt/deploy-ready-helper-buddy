import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../public/voiceovers/onboarding-sower");
const API_KEY = process.env.ELEVENLABS_API_KEY;

// Jessica — warm, friendly young-female premade voice (free tier)
const VOICE_ID = "cgSgspJ2msm6clMCkdW9";
const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";

if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY required");
  process.exit(1);
}

const SCENES = [
  {
    slug: "01-welcome",
    text: "Welcome to sow2grow — the farm stall of the 364yhvh community. Becoming a sower takes just sixty seconds. Let's walk through it together.",
  },
  {
    slug: "02-plant-seed",
    text: "From the welcome page, tap 'Sow your first seed', then choose the full registration form to plant your seed in the garden.",
  },
  {
    slug: "03-tell-us",
    text: "Add your full name, your email, and your country. Phone and referral code are optional — and remember, only one orchard per email.",
  },
  {
    slug: "04-lock-in",
    text: "Pick your currency, then create a strong password — at least twelve characters, with a capital letter, a number, and a special character. Then tap 'Become a Sower and Bestower' — and your orchard is born.",
  },
  {
    slug: "05-sign-in",
    text: "Next time you visit, sign in from the welcome home screen. Enter your email and password, and tap 'Enter the Garden'.",
  },
  {
    slug: "06-secure",
    text: "Super important: on your dashboard, tap the gear icon in the top right and set up your three security questions. This is how you recover your password if you ever forget it.",
  },
  {
    slug: "07-outro",
    text: "You're home. Welcome to the tribe.",
  },
];

async function generateSceneAudio(scene, index) {
  const previousText = index > 0 ? SCENES[index - 1].text : undefined;
  const nextText = index < SCENES.length - 1 ? SCENES[index + 1].text : undefined;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`,
    {
      method: "POST",
      headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: scene.text,
        previous_text: previousText,
        next_text: nextText,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.82,
          style: 0.28,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);

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

// Build silence-padded concat so each scene starts on its frame boundary.
const FPS = 30;
const SCENE_FRAMES = [180, 180, 240, 270, 240, 270, 150]; // matches OnboardingSower.tsx
const SCENE_SECONDS = SCENE_FRAMES.map((f) => f / FPS);

const tmpFiles = [];
for (let i = 0; i < manifest.length; i++) {
  const padded = path.join(PUBLIC_DIR, `_padded-${manifest[i].slug}.mp3`);
  const target = SCENE_SECONDS[i];
  const pad = Math.max(0, target - manifest[i].duration);
  execSync(
    `ffmpeg -y -i "${manifest[i].outPath}" -af "apad=pad_dur=${pad.toFixed(3)}" -t ${target.toFixed(3)} "${padded}"`,
    { stdio: "pipe" }
  );
  tmpFiles.push(padded);
}

const concatList = path.join(PUBLIC_DIR, "concat.txt");
await fs.writeFile(
  concatList,
  tmpFiles.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join("\n")
);

const finalOut = path.join(PUBLIC_DIR, "onboarding-sower-full.mp3");
execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${finalOut}"`, {
  stdio: "inherit",
});

await fs.writeFile(
  path.join(PUBLIC_DIR, "manifest.json"),
  JSON.stringify({ totalSeconds: SCENE_SECONDS.reduce((a, b) => a + b, 0), scenes: manifest, finalOut }, null, 2)
);

console.log(`✓ ${finalOut}`);
