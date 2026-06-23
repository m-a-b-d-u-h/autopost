import "dotenv/config";
import express from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readdirSync, unlinkSync, statSync, readFileSync, existsSync } from "fs";
import { startScheduler, restartScheduler, getSchedule } from "./scheduler.js";
import { runPipeline, republishVideo } from "./pipeline.js";
import { getChannels } from "./services/buffer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8000;

app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/videos", express.static(join(__dirname, "output")));
app.use("/music", express.static(join(__dirname, "assets", "music")));

const PUBLISH_PATH = join(__dirname, "publish-status.json");

function getVideos() {
  const dir = join(__dirname, "output");
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".mp4"))
      .map((f) => {
        const st = statSync(join(dir, f));
        const type = f.split("-")[0];
        return {
          file: f,
          type,
          size: (st.size / 1024).toFixed(0) + " KB",
          date: st.mtime.toLocaleDateString("id-ID") + " " + st.mtime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          mtime: st.mtimeMs,
        };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}

function loadPublishStatus() {
  try {
    if (!existsSync(PUBLISH_PATH)) return {};
    return JSON.parse(readFileSync(PUBLISH_PATH, "utf8"));
  } catch {
    return {};
  }
}

app.get("/", (req, res) => {
  const videos = getVideos();
  const pubStatus = loadPublishStatus();
  const publishedWithTypes = new Set(
    videos.filter((v) => {
      const ps = pubStatus[v.file];
      return ps && ps.results && ps.results.some((r) => r.ok);
    }).map((v) => pubStatus[v.file]?.type || v.type)
  );
  const schedule = getSchedule();
  res.render("index", { videos, types: ["lessons"], typesPublished: publishedWithTypes.size, schedule, pubStatus });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/channels", async (req, res) => {
  try {
    const token = process.env.BUFFER_TOKEN;
    if (!token) return res.status(400).json({ error: "BUFFER_TOKEN not set" });
    const result = await getChannels(token);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/generate", async (req, res) => {
  try {
    const result = await runPipeline();
    res.json({
      success: true,
      type: result.content.type,
      videoUrl: result.videoUrl,
      bufferResult: result.bufferResult,
    });
  } catch (err) {
    console.error("[server] /generate error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/schedule", (req, res) => {
  res.json(getSchedule());
});

app.put("/schedule", (req, res) => {
  const count = parseInt(req.body.count, 10);
  if (isNaN(count) || count < 1 || count > 24) {
    return res.status(400).json({ error: "Count must be 1-24" });
  }
  const crons = restartScheduler(count);
  res.json({ count, crons });
});

app.post("/republish", async (req, res) => {
  const { file } = req.body;
  if (!file) return res.status(400).json({ error: "Missing file" });
  const safe = file.replace(/[^a-zA-Z0-9._-]/g, "");
  try {
    const results = await republishVideo(safe);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/delete", (req, res) => {
  const { file } = req.body;
  if (!file) return res.status(400).json({ error: "Missing file name" });
  const safe = file.replace(/[^a-zA-Z0-9._-]/g, "");
  const path = join(__dirname, "output", safe);
  try {
    unlinkSync(path);
    console.log(`[server] Deleted: ${safe}`);
    res.redirect("/");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[server] Autopost backend on :${PORT}`);
  if (process.env.DISABLE_SCHEDULER !== "1") {
    startScheduler();
  }
});
