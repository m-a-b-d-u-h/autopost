import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";
import pLimit from "p-limit";

import { generateVideo as renderVideo } from "../video-builders/generateToVideo.mjs";

const limit = pLimit(Number(process.env.RENDER_CONCURRENCY || 1));

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "output");

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

export async function generateVideo(content) {
  const text = content.quote;
  const timestamp = Date.now();
  const outFile = `quote-${timestamp}.mp4`;
  const outPath = join(OUT_DIR, outFile);

  await limit(() => renderVideo({ text, cta: content.cta, output: outPath }));

  return outPath;
}
