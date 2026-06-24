import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "history.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(
  `CREATE TABLE IF NOT EXISTS hooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hook TEXT NOT NULL UNIQUE,
    hook_desc TEXT,
    caption TEXT,
    video_file TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`
);

export function getAllHooks() {
  const rows = db.prepare("SELECT hook FROM hooks ORDER BY id").all();
  return rows.map(r => r.hook);
}

export function getHookCount() {
  const row = db.prepare("SELECT COUNT(*) as count FROM hooks").get();
  return row.count;
}

export function addHook({ hook, hook_desc, caption, video_file }) {
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO hooks (hook, hook_desc, caption, video_file) VALUES (?, ?, ?, ?)"
  );
  stmt.run(hook, hook_desc || null, caption || null, video_file || null);
}

export function hookExists(hook) {
  const row = db.prepare("SELECT 1 FROM hooks WHERE hook = ?").get(hook);
  return !!row;
}

export function closeDB() {
  db.close();
}
