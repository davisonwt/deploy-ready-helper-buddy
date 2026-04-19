// One-off: re-render banner-05 only (VO was shortened to fit 10s)
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ID = "banner-05-wandering-hand";
const VO_SLUG = "05-wandering-hand";
const VO = path.resolve(__dirname, `../public/voiceovers/${VO_SLUG}.mp3`);
const OUT = path.resolve(__dirname, "../../public/videos/banners/wandering-hand.mp4");
const SILENT = `/tmp/${ID}-silent.mp4`;

console.log("Bundling…");
const bundled = await bundle({ entryPoint: path.resolve(__dirname, "../src/index.ts"), webpackOverride: (c) => c });

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

console.log(`▶ ${ID}`);
const composition = await selectComposition({ serveUrl: bundled, id: ID, puppeteerInstance: browser });
await renderMedia({
  composition, serveUrl: bundled, codec: "h264",
  outputLocation: SILENT, puppeteerInstance: browser,
  concurrency: 1, muted: true,
});
execSync(`ffmpeg -y -i "${SILENT}" -i "${VO}" -c:v copy -c:a aac -b:a 192k "${OUT}"`, { stdio: "pipe" });
await fs.unlink(SILENT).catch(() => {});
const stat = await fs.stat(OUT);
console.log(`✓ ${OUT} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
await browser.close({ silent: false });
