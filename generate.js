import { generateVideo } from "./video-builders/generateToVideo.mjs";

const text = process.argv[2];
if (!text) {
  console.log("Usage: node generate.js \"quote text\"");
  process.exit(1);
}

const out = await generateVideo({ text, output: `output/${Date.now()}.mp4` });
console.log(`\n\u2705 ${out}`);
