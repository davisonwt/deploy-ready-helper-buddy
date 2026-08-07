import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IDS = [
  "h1-thirty-percent",
  "h2-anonymous",
  "h3-bestow",
  "h4-five-dollars",
  "h5-nine-hands",
  "h6-money-path",
];

const stillOnly = process.argv.includes("--stills");
const only = process.argv.find((a) => a.startsWith("--id="))?.split("=")[1];
const ids = only ? [only] : IDS;

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

for (const id of ids) {
  const composition = await selectComposition({ serveUrl: bundled, id, puppeteerInstance: browser });
  if (stillOnly) {
    for (const frame of [20, 120, 240, composition.durationInFrames - 40]) {
      await renderStill({
        composition,
        serveUrl: bundled,
        output: `/tmp/qa/${id}-${frame}.png`,
        frame,
        puppeteerInstance: browser,
        overwrite: true,
      });
    }
    console.log(`stills ✓ ${id}`);
    continue;
  }
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: `/mnt/documents/s2g-${id}.mp4`,
    puppeteerInstance: browser,
    muted: false,
    enforceAudioTrack: true,
    audioCodec: "aac",
    concurrency: 1,
  });
  console.log(`rendered ✓ ${id}`);
}

await browser.close({ silent: false });
