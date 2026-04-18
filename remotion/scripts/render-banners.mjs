import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COMPOSITIONS = [
  ["banner-01-community-orchard", "01-community-orchard"],
  ["banner-02-production-orchard", "02-production-orchard"],
  ["banner-03-single-seed", "03-single-seed"],
  ["banner-04-wandering-wheel", "04-wandering-wheel"],
  ["banner-05-wandering-hand", "05-wandering-hand"],
  ["banner-06-wandering-whisperer", "06-wandering-whisperer"],
  ["banner-07-wandering-pillow", "07-wandering-pillow"],
  ["banner-08-wandering-field", "08-wandering-field"],
  ["banner-09-wandering-hearth", "09-wandering-hearth"],
  ["banner-10-wandering-forge", "10-wandering-forge"],
];

const OUT_DIR = "/mnt/documents/s2g-banners";
const VO_DIR = path.resolve(__dirname, "../public/voiceovers");
await fs.mkdir(OUT_DIR, { recursive: true });

console.log("Bundling…");
const bundled = await bundle({ entryPoint: path.resolve(__dirname, "../src/index.ts"), webpackOverride: (c) => c });

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

for (const [id, voSlug] of COMPOSITIONS) {
  const silent = `/tmp/${id}-silent.mp4`;
  const final = path.join(OUT_DIR, `${id}.mp4`);
  console.log(`\n▶ ${id}`);
  const composition = await selectComposition({ serveUrl: bundled, id, puppeteerInstance: browser });
  await renderMedia({
    composition, serveUrl: bundled, codec: "h264",
    outputLocation: silent, puppeteerInstance: browser,
    concurrency: 1, muted: true,
  });
  // Mux voiceover MP3 with system ffmpeg (has aac encoder)
  const vo = path.join(VO_DIR, `${voSlug}.mp3`);
  execSync(`ffmpeg -y -i "${silent}" -i "${vo}" -c:v copy -c:a aac -b:a 192k -shortest "${final}"`, { stdio: "pipe" });
  await fs.unlink(silent).catch(() => {});
  const stat = await fs.stat(final);
  console.log(`✓ ${id} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}
await browser.close({ silent: false });
console.log("\nDone:", OUT_DIR);
