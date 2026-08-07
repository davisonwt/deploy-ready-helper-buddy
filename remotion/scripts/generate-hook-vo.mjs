/**
 * Generates one ElevenLabs voiceover per hook clip, measures each line's
 * duration with ffprobe, and writes src/hooks/timings.json used by the
 * Remotion compositions for burned-in caption timing.
 *
 * Run: cd remotion && node scripts/generate-hook-vo.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/audio/hooks");

const VOICE_ID = "nPczCjzI2devNBz1zQrb"; // Brian — warm, grounded
const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) throw new Error("ELEVENLABS_API_KEY missing");

// Mirror of src/hooks/scripts.ts (kept literal so the script has no TS deps).
const src = await fs.readFile(path.resolve(__dirname, "../src/hooks/scripts.ts"), "utf8");
const scripts = [];
for (const block of src.split("  {\n    id: ").slice(1)) {
  const id = block.match(/^"([^"]+)"/)[1];
  const linesRaw = block.split("lines: [")[1].split("\n    ],")[0];
  const lines = [...linesRaw.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) =>
    m[1].replace(/\\"/g, '"')
  );
  scripts.push({ id, lines });
}

await fs.mkdir(OUT_DIR, { recursive: true });

async function tts(text, outFile) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
          style: 0.35,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`TTS ${res.status}: ${await res.text()}`);
  await fs.writeFile(outFile, Buffer.from(await res.arrayBuffer()));
}

async function durationOf(file) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  return parseFloat(stdout.trim());
}

const timings = {};

for (const s of scripts) {
  const partFiles = [];
  const lineDurations = [];
  for (let i = 0; i < s.lines.length; i++) {
    const f = path.join(OUT_DIR, `${s.id}-${i}.mp3`);
    await tts(s.lines[i], f);
    partFiles.push(f);
    lineDurations.push(await durationOf(f));
    console.log(`  ${s.id} line ${i}: ${lineDurations[i].toFixed(2)}s`);
  }

  // Concat with a short breath between lines.
  const GAP = 0.28;
  const silence = path.join(OUT_DIR, "_gap.mp3");
  await execFileAsync("ffmpeg", [
    "-y", "-f", "lavfi", "-i", `anullsrc=r=44100:cl=stereo`,
    "-t", String(GAP), "-q:a", "9", silence,
  ]);

  const listFile = path.join(OUT_DIR, `${s.id}.txt`);
  const seq = [];
  partFiles.forEach((f, i) => {
    seq.push(`file '${f}'`);
    if (i < partFiles.length - 1) seq.push(`file '${silence}'`);
  });
  await fs.writeFile(listFile, seq.join("\n"));

  const finalFile = path.join(OUT_DIR, `${s.id}.mp3`);
  await execFileAsync("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", listFile,
    "-c:a", "libmp3lame", "-q:a", "2", finalFile,
  ]);

  // Frame timings at 30fps.
  const fps = 30;
  const beats = [];
  let t = 0;
  lineDurations.forEach((d, i) => {
    const from = Math.round(t * fps);
    const to = Math.round((t + d) * fps);
    beats.push({ from, durationInFrames: to - from });
    t += d + (i < lineDurations.length - 1 ? GAP : 0);
  });

  const total = await durationOf(finalFile);
  timings[s.id] = {
    audio: `audio/hooks/${s.id}.mp3`,
    beats,
    durationInFrames: Math.ceil(total * fps) + 40,
  };

  await Promise.all([...partFiles.map((f) => fs.rm(f)), fs.rm(listFile)]);
  console.log(`✓ ${s.id}: ${total.toFixed(2)}s`);
}

await fs.rm(path.join(OUT_DIR, "_gap.mp3"), { force: true });
await fs.writeFile(
  path.resolve(__dirname, "../src/hooks/timings.json"),
  JSON.stringify(timings, null, 2)
);
console.log("Wrote src/hooks/timings.json");
