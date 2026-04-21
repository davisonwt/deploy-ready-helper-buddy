// Fallback voiceover generator using espeak-ng (offline, no quota).
// Use this when ElevenLabs quota is exhausted.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../public/voiceovers/onboarding-sower");

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
    text: "Add your full name, your email, and your country. Phone and referral code are optional. Remember, only one orchard per email.",
  },
  {
    slug: "04-lock-in",
    text: "Pick your currency, then create a strong password. At least twelve characters, with a capital letter, a number, and a special character. Then tap 'Become a Sower and Bestower'. Your orchard is born.",
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

const FPS = 30;
// Scene frame counts MUST match SCENES[].duration in OnboardingSower.tsx
const SCENE_FRAMES = [420, 330, 360, 510, 330, 450, 150]; // 85s total
const SCENE_SECONDS = SCENE_FRAMES.map((f) => f / FPS);

await fs.mkdir(PUBLIC_DIR, { recursive: true });

// Use nix-provided espeak-ng. Voice en+f3 = warmer female English variant.
const ESPEAK = `nix run nixpkgs#espeak-ng --`;

const manifest = [];
for (let i = 0; i < SCENES.length; i++) {
  const scene = SCENES[i];
  const wav = path.join(PUBLIC_DIR, `${scene.slug}.wav`);
  const mp3 = path.join(PUBLIC_DIR, `${scene.slug}.mp3`);
  console.log(`→ ${scene.slug}`);

  // -v voice, -s words/min, -p pitch (0-99), -g word-gap (10ms units)
  execSync(
    `${ESPEAK} -v en+f3 -s 158 -p 52 -g 4 -w "${wav}" ${JSON.stringify(scene.text)}`,
    { stdio: "pipe" }
  );

  // Convert to mp3 and gently process: highpass + slight reverb-ish lowpass smoothing
  execSync(
    `ffmpeg -y -i "${wav}" -af "highpass=f=80,lowpass=f=10000,acompressor=threshold=-18dB:ratio=3:attack=15:release=120,volume=1.4" -ar 44100 -b:a 128k "${mp3}"`,
    { stdio: "pipe" }
  );
  await fs.unlink(wav).catch(() => {});

  const dur = Number(
    execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${mp3}"`, {
      encoding: "utf8",
    }).trim()
  );
  manifest.push({ ...scene, outPath: mp3, duration: dur });
  console.log(`  ✓ ${dur.toFixed(2)}s (target ${SCENE_SECONDS[i].toFixed(2)}s)`);
}

// Pad each segment to exact scene length so audio aligns with frames.
const tmpFiles = [];
for (let i = 0; i < manifest.length; i++) {
  const padded = path.join(PUBLIC_DIR, `_padded-${manifest[i].slug}.mp3`);
  const target = SCENE_SECONDS[i];
  const pad = Math.max(0, target - manifest[i].duration);
  execSync(
    `ffmpeg -y -i "${manifest[i].outPath}" -af "apad=pad_dur=${pad.toFixed(3)}" -t ${target.toFixed(3)} -ar 44100 -b:a 128k "${padded}"`,
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
  JSON.stringify(
    { totalSeconds: SCENE_SECONDS.reduce((a, b) => a + b, 0), scenes: manifest, finalOut, engine: "espeak-ng" },
    null,
    2
  )
);

console.log(`✓ ${finalOut}`);
