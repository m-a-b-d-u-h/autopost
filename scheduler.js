import cron from "node-cron";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { runPipeline } from "./pipeline.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, "schedule-config.json");
const DEFAULT_COUNT = 6;
const START_HOUR = 6, END_HOUR = 22;

let jobs = [];

function loadConfig() {
  try {
    if (!existsSync(CONFIG_PATH)) return { count: DEFAULT_COUNT };
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return { count: DEFAULT_COUNT };
  }
}

function generateCrons(count) {
  if (count <= 1) return ["0 12 * * *"];
  const span = END_HOUR - START_HOUR;
  const gap = span / (count - 1);
  const crons = [];
  for (let i = 0; i < count; i++) {
    const h = START_HOUR + Math.round(i * gap);
    crons.push(`0 ${h} * * *`);
  }
  return crons;
}

function stopJobs() {
  for (const j of jobs) j.stop();
  jobs = [];
}

function startJobs(crons) {
  const tz = process.env.TZ || "America/New_York";
  for (const expr of crons) {
    const j = cron.schedule(expr, () => {
      console.log(`[scheduler] Trigger at ${new Date().toISOString()} ET`);
      runPipeline().catch((err) => {
        console.error(`[scheduler] Error:`, err.message);
      });
    }, { timezone: tz, scheduled: true });
    jobs.push(j);
  }
}

export function startScheduler() {
  const cfg = loadConfig();
  const crons = generateCrons(cfg.count);
  startJobs(crons);
  console.log(`[scheduler] Started ${cfg.count} jobs (timezone: ${process.env.TZ || "America/New_York"}): ${crons.join(", ")}`);
}

export function restartScheduler(count) {
  stopJobs();
  writeFileSync(CONFIG_PATH, JSON.stringify({ count, startHour: START_HOUR, endHour: END_HOUR }, null, 2));
  const crons = generateCrons(count);
  startJobs(crons);
  console.log(`[scheduler] Restarted ${count} jobs: ${crons.join(", ")}`);
  return crons;
}

export function getSchedule() {
  const cfg = loadConfig();
  return { count: cfg.count, crons: generateCrons(cfg.count) };
}
