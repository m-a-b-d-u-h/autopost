import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";
import pLimit from "p-limit";

import { generateLessonsVideo } from "../video-builders/lessonsVideo.mjs";

const limit = pLimit(Number(process.env.RENDER_CONCURRENCY || 1));

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "output");

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

export async function generateVideo(content) {
  const timestamp = Date.now();
  const outFile = `lessons-${timestamp}.mp4`;
  const outPath = join(OUT_DIR, outFile);
  await limit(() => generateLessonsVideo({ hook: content.hook, hook_desc: content.hook_desc, hook_icon: content.hook_icon, lesson: content.lesson, cta: content.cta, output: outPath }));
  return outPath;
}
