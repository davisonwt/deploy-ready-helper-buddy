import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import path from "path";
import fs from "fs";

const root = "/dev-server/remotion";
const out = "/tmp/samson/chunks4";
fs.mkdirSync(out, { recursive: true });

const serveUrl = await bundle({
  entryPoint: path.join(root, "src/index.ts"),
  publicDir: path.join(root, "public"),
});
const composition = await selectComposition({ serveUrl, id: "samson"});
const total = composition.durationInFrames;
console.log("TOTAL", total);

const SIZE = 1000;
for (let start = 0; start < total; start += SIZE) {
  const end = Math.min(total - 1, start + SIZE - 1);
  const f = path.join(out, `c${String(start).padStart(6, "0")}.mp4`);
  if (fs.existsSync(f) && fs.statSync(f).size > 1e6) { console.log("skip", f); continue; }
  console.log("CHUNK", start, end, new Date().toISOString());
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: f,
    frameRange: [start, end],
    concurrency: 4,
    audioCodec: null,
    muted: true,
    crf: 18,
    chromiumOptions: { gl: "swangle" },
    chromeMode: "chrome-for-testing",
    browserExecutable: "/opt/ms-playwright/chromium-1194/chrome-linux/chrome",
    
    onProgress: ({ renderedFrames }) => {
      if (renderedFrames % 200 === 0) console.log("  f", renderedFrames);
    },
  });
  console.log("DONE", f);
}
console.log("ALLDONE");
