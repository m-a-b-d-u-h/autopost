import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { generateContent } from "./services/openrouter.js";
import { generateVideo } from "./services/videogen.js";
import { getChannels, createPost } from "./services/buffer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, "rotation-state.json");
const PUBLISH_PATH = join(__dirname, "publish-status.json");
const TYPES = ["quote", "tips"];

function getRotation() {
  if (!existsSync(STATE_PATH)) return 0;
  return JSON.parse(readFileSync(STATE_PATH, "utf-8")).index ?? 0;
}

function advanceRotation() {
  const cur = getRotation();
  const next = (cur + 1) % TYPES.length;
  writeFileSync(STATE_PATH, JSON.stringify({ index: next }));
  return next;
}

function loadPublishStatus() {
  try {
    if (!existsSync(PUBLISH_PATH)) return {};
    return JSON.parse(readFileSync(PUBLISH_PATH, "utf8"));
  } catch {
    return {};
  }
}

function savePublishStatus(status) {
  writeFileSync(PUBLISH_PATH, JSON.stringify(status, null, 2));
}

export async function runPipeline(typeOverride) {
  const type = typeOverride || TYPES[getRotation()];
  console.log(`[pipeline] Starting: ${type}`);

  const content = await generateContent(type);
  console.log(`[pipeline] Content generated (${type})`);
  if (!typeOverride) advanceRotation();

  const videoPath = await generateVideo(content);
  console.log(`[pipeline] Video rendered: ${videoPath}`);

  const token = process.env.BUFFER_TOKEN;
  const publicUrl = process.env.PUBLIC_URL;
  let bufferResult = null;

  if (token && publicUrl) {
    const { channels } = await getChannels(token);
    console.log(`[pipeline] Found ${channels.length} Buffer channels`);

    const videoFile = basename(videoPath);
    const videoUrl = `${publicUrl}/videos/${videoFile}`;

    const results = [];
    for (const ch of channels) {
      try {
        const videoTitle = content.title || content.source || content.hook || "1section";
        await createPost(token, ch.id, content.caption, videoUrl, ch.service, videoTitle);
        results.push({ channel: ch.name, service: ch.service, ok: true });
        console.log(`[pipeline] Posted to ${ch.name} (${ch.service})`);
      } catch (err) {
        results.push({ channel: ch.name, service: ch.service, ok: false, error: err.message });
        console.error(`[pipeline] Failed to post to ${ch.name}: ${err.message}`);
      }
    }
    bufferResult = results;

    const status = loadPublishStatus();
    status[videoFile] = {
      type: content.type,
      caption: content.caption,
      source: content.source,
      results,
      date: new Date().toISOString(),
    };
    savePublishStatus(status);
  } else {
    console.log(`[pipeline] Skipping Buffer publish (PUBLIC_URL${token ? " not set" : " & BUFFER_TOKEN not set"})`);
  }

  return { content, videoPath, videoUrl: publicUrl ? `${publicUrl}/videos/${basename(videoPath)}` : null, bufferResult };
}

export async function republishVideo(videoFile) {
  const token = process.env.BUFFER_TOKEN;
  const publicUrl = process.env.PUBLIC_URL;
  if (!token || !publicUrl) throw new Error("BUFFER_TOKEN or PUBLIC_URL not set");

  const videoUrl = `${publicUrl}/videos/${videoFile}`;
  const { channels } = await getChannels(token);
  const results = [];
  const status = loadPublishStatus();
  const entry = status[videoFile];

  for (const ch of channels) {
    if (entry) {
      const prev = entry.results.find(r => r.channel === ch.name);
      if (prev && prev.ok) {
        results.push(prev);
        continue;
      }
    }

    try {
      const caption = entry?.caption || `New video from 1section ${videoUrl}`;
      await createPost(token, ch.id, caption, videoUrl, ch.service, entry?.source || "1section");
      results.push({ channel: ch.name, service: ch.service, ok: true });
      console.log(`[pipeline] Posted to ${ch.name} (${ch.service})`);
    } catch (err) {
      results.push({ channel: ch.name, service: ch.service, ok: false, error: err.message });
      console.error(`[pipeline] Failed to post to ${ch.name}: ${err.message}`);
    }
  }

  status[videoFile] = { ...(entry || {}), results, date: new Date().toISOString() };
  savePublishStatus(status);
  return results;
}
