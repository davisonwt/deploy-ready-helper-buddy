// Renders only banner-02-production-orchard at 15s.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ID = "banner-02-production-orchard";
const VO_SLUG = "02-production-orchard";

const OUT = path.resolve(__dirname, "../../public/videos/banners/production-orchard.mp4");
const VO = path.resolve(__dirname, `../public/voiceovers/${VO_SLUG}.mp3`);

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
console.log(`▶ ${ID}`);
const composition = await selectComposition({ serveUrl: bundled, id: ID, puppeteerInstance: browser });
await renderMedia({
  composition, serveUrl: bundled, codec: "h264",
  outputLocation: silent, puppeteerInstance: browser,
  concurrency: 1, muted: true,
});
await browser.close({ silent: false });

execSync(
  `ffmpeg -y -i "${silent}" -i "${VO}" -filter_complex "[1:a]apad[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t 15 "${OUT}"`,
  { stdio: "inherit" },
);
await fs.unlink(silent).catch(() => {});
const stat = await fs.stat(OUT);
console.log(`✓ ${OUT} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
