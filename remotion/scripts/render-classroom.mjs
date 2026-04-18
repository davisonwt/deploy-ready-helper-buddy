import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ID = "banner-11-classroom";
const VO_SLUG = "11-classroom";
const OUT_DIR = "/mnt/documents/s2g-banners";
const VO_DIR = path.resolve(__dirname, "../public/voiceovers");
await fs.mkdir(OUT_DIR, { recursive: true });

console.log("Bundling…");
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const silent = `/tmp/${ID}-silent.mp4`;
const final = path.join(OUT_DIR, `${ID}.mp4`);

console.log(`▶ ${ID}`);
const composition = await selectComposition({ serveUrl: bundled, id: ID, puppeteerInstance: browser });
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: silent,
  puppeteerInstance: browser,
  concurrency: 1,
  muted: true,
});

const vo = path.join(VO_DIR, `${VO_SLUG}.mp3`);
// Pad VO with silence so it doesn't truncate the video (-shortest cuts to shortest stream).
// CTA scene plays after VO ends, so we need the full 12s of video.
execSync(
  `ffmpeg -y -i "${silent}" -i "${vo}" -filter_complex "[1:a]apad=pad_dur=3[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "${final}"`,
  { stdio: "pipe" }
);
await fs.unlink(silent).catch(() => {});

await browser.close({ silent: false });
const stat = await fs.stat(final);
console.log(`✓ ${ID} (${(stat.size / 1024 / 1024).toFixed(2)} MB) → ${final}`);
