import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ID = "onboarding-sower";
const VO = path.resolve(__dirname, "../public/voiceovers/onboarding-sower/onboarding-sower-full.mp3");
const OUT = path.resolve(__dirname, "../../public/videos/onboarding-sower-v1.mp4");
const ARTIFACT = "/mnt/documents/onboarding-sower-v1.mp4";
const SILENT = `/tmp/${ID}-silent.mp4`;

await fs.mkdir(path.dirname(OUT), { recursive: true });

console.log("Bundling onboarding sower video…");
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: ID,
  puppeteerInstance: browser,
});

await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: SILENT,
  puppeteerInstance: browser,
  concurrency: 1,
  muted: true,
});

await browser.close({ silent: false });

const durationSeconds = composition.durationInFrames / composition.fps;
execSync(
  `ffmpeg -y -i "${SILENT}" -i "${VO}" -filter_complex "[1:a]apad[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t ${durationSeconds.toFixed(3)} "${OUT}"`,
  { stdio: "inherit" }
);

await fs.unlink(SILENT).catch(() => {});
await fs.copyFile(OUT, ARTIFACT);

const stat = await fs.stat(OUT);
console.log(`✓ ${OUT} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
console.log(`✓ ${ARTIFACT}`);
