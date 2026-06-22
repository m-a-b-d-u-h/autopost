import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";
import pLimit from "p-limit";

import { generateVideo as renderQuoteVideo } from "../video-builders/generateToVideo.mjs";
import { generateTipsVideo } from "../video-builders/tipsVideo.mjs";

const limit = pLimit(Number(process.env.RENDER_CONCURRENCY || 1));

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "output");

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

export async function generateVideo(content) {
  const timestamp = Date.now();

  if (content.type === "tips") {
    const outFile = `tips-${timestamp}.mp4`;
    const outPath = join(OUT_DIR, outFile);
    await limit(() => generateTipsVideo({ hook: content.hook, tips: content.tips, cta: content.cta, output: outPath }));
    return outPath;
  }

  const outFile = `quote-${timestamp}.mp4`;
  const outPath = join(OUT_DIR, outFile);
  await limit(() => renderQuoteVideo({ text: content.quote, cta: content.cta, output: outPath }));
  return outPath;
}
