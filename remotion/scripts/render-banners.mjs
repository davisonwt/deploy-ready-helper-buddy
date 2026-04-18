import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COMPOSITIONS = [
  "banner-01-community-orchard",
  "banner-02-production-orchard",
  "banner-03-single-seed",
  "banner-04-wandering-wheel",
  "banner-05-wandering-hand",
  "banner-06-wandering-whisperer",
  "banner-07-wandering-pillow",
  "banner-08-wandering-field",
  "banner-09-wandering-hearth",
  "banner-10-wandering-forge",
];

const OUT_DIR = "/mnt/documents/s2g-banners";

await fs.mkdir(OUT_DIR, { recursive: true });

console.log("Bundling Remotion project…");
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});
console.log("Bundle ready.");

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

for (const id of COMPOSITIONS) {
  const out = path.join(OUT_DIR, `${id}.mp4`);
  console.log(`\n▶ Rendering ${id} → ${out}`);
  const composition = await selectComposition({ serveUrl: bundled, id, puppeteerInstance: browser });
  await renderMedia({
    composition, serveUrl: bundled, codec: "h264",
    outputLocation: out, puppeteerInstance: browser,
    concurrency: 1,
    audioCodec: "aac",
    enforceAudioTrack: true,
  });
  const stat = await fs.stat(out);
  console.log(`✓ ${id} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

await browser.close({ silent: false });
console.log("\nAll 10 S2G banners rendered to", OUT_DIR);
