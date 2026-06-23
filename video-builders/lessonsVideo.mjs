import { spawn } from "child_process";
import { readdirSync, existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const W = 1080, H = 1920, DUR = 30;
const BG_DIR = join(__dirname, "..", "assets", "backgrounds");
const PROFILE_PNG = join(__dirname, "..", "assets", "logo", "i.png");
const MUSIC_DIR = join(__dirname, "..", "assets", "music");
const OUT_DIR = join(__dirname, "..", "output");
const CACHE_FILE = join(BG_DIR, ".durations.json");

let durationCache = null;

function loadDurationCache() {
  if (durationCache) return durationCache;
  try {
    durationCache = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
  } catch {
    durationCache = {};
  }
  return durationCache;
}

function saveDurationCache() {
  try { writeFileSync(CACHE_FILE, JSON.stringify(durationCache, null, 2)); } catch {}
}

async function getCachedDuration(file) {
  const cache = loadDurationCache();
  const name = file.split("/").pop().split("\\").pop();
  if (cache[name] != null) return cache[name];
  const dur = await getVideoDuration(file);
  cache[name] = dur;
  saveDurationCache();
  return dur;
}

function wrap(text, max) {
  const lines = [];
  let cur = "";
  for (const w of text.split(" ")) {
    const t = cur ? cur + " " + w : w;
    if (t.length > max && cur) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function findMusic() {
  if (!existsSync(MUSIC_DIR)) return null;
  const files = readdirSync(MUSIC_DIR).filter(f => /\.(mp3|wav|m4a|ogg)$/i.test(f));
  return files.length ? join(MUSIC_DIR, files[Math.floor(Math.random() * files.length)]) : null;
}

function getVideoDuration(file) {
  try {
    const r = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { stdio: "pipe" });
    return new Promise((resolve) => {
      let d = "";
      r.stdout.on("data", c => d += c);
      r.on("close", () => resolve(parseFloat(d.trim()) || 10));
    });
  } catch { return 10; }
}

async function findBackground() {
  if (!existsSync(BG_DIR)) return null;
  const files = readdirSync(BG_DIR).filter(f => /\.(mp4|mov|avi|mkv|webm)$/i.test(f));
  if (!files.length) return null;
  const picks = [];
  let total = 0;
  const used = new Set();
  while (total < DUR) {
    const avail = files.filter(f => !used.has(f));
    if (!avail.length) break;
    const f = avail[Math.floor(Math.random() * avail.length)];
    const fp = join(BG_DIR, f);
    picks.push(fp);
    total += await getCachedDuration(fp);
    used.add(f);
  }
  return picks;
}

function isVideo(f) {
  return /\.(mp4|mov|avi|mkv|webm)$/i.test(f);
}

function toAssTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const cs = Math.min(Math.round((s % 1) * 100), 99);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

export async function generateLessonsVideo({ hook, tips, cta, output }) {
  const music = findMusic();
  const bgFiles = await findBackground();
  const ts = Date.now();
  const assFile = join(OUT_DIR, `${ts}.ass`);

  const tipCount = tips.length;
  const openingEnd = 5;
  const endStart = DUR - 5;
  const tipsDuration = endStart - openingEnd;
  const itemDur = Math.floor(tipsDuration / Math.max(tipCount, 1));

  const circled = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

  const hookLines = wrap(hook.replace(/\b\w/g, c => c.toUpperCase()), 16);
  const ctaLines = wrap(cta || "Follow for daily tips", 30);
  const pfpW = 85, pfpH = 85;
  const pfpX = Math.round((W - pfpW) / 2);
  const pfpW_cta = 110, pfpH_cta = 110;
  const pfpX_cta = Math.round((W - pfpW_cta) / 2);

  const hookFontSize = 110;
  const numFontSize = 78;
  const titleFontSize = 68;
  const descFontSize = 44;
  const exFontSize = 40;
  const ctaFontSize = 70;
  const hookLineH = 134;
  const numH = 88;
  const titleH = 76;
  const descLineH = 52;
  const exH = 48;
  const gapNumTitle = 16;
  const gapTitleDesc = 14;
  const gapDescEx = 12;
  const ctaLineH = 84;
  const GOLD = "&H0000D7FF&";
  const LIGHT = "&H00D0D0D0&";
  const contentCenterY = 840;
  const lessonCtaCenterY = contentCenterY + 100;
  const ctaCenterY = lessonCtaCenterY + 100;

  // Hook TEXT centered at contentCenterY, PFP below gold bar
  const hookBlockH = hookLines.length * hookLineH;
  const hookTxtTop = contentCenterY - hookBlockH / 2;
  const hookBarY = Math.round(hookTxtTop + hookBlockH + 30);
  const pfpY_open = Math.round(hookBarY + 20 + pfpH / 2);

  // CTA TEXT centered at contentCenterY, PFP above gold bar
  const ctaBlockH = ctaLines.length * ctaLineH;
  const ctaTxtTop = ctaCenterY - ctaBlockH / 2;
  const ctaBarY = Math.round(ctaTxtTop - 36);
  const pfpY_cta = Math.round(ctaBarY - 50 - pfpH_cta / 2);

  let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hook,Noto Sans,${hookFontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,-1,0,0,0,100,100,0,0,1,1,0,5,60,60,60,1
Style: Num,Noto Sans,${numFontSize},${GOLD},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,60,60,60,1
Style: TipT,Noto Sans,${titleFontSize},&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,5,60,60,60,1
Style: TipD,Noto Sans,${descFontSize},${LIGHT},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,60,60,60,1
Style: TipEx,Noto Sans,${exFontSize},${GOLD},&H00000000,&H00000000,0,1,0,0,100,100,0,0,1,0,0,5,60,60,60,1
Style: EndCTA,Noto Sans,${ctaFontSize},&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,5,60,60,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // --- OPENING UNIT: icon + hook text + gold bar (PFP via ffmpeg) ---
  {
    const top = hookTxtTop;
    const iconY = Math.round(top - 34);
    ass += `Dialogue: 0,${toAssTime(0)},${toAssTime(openingEnd)},Num,,0,0,0,,{\\an5\\pos(${W / 2},${iconY})\\fad(0,300)\\fs50}✦\n`;
    for (let i = 0; i < hookLines.length; i++) {
      const y = Math.round(top + i * hookLineH + hookLineH / 2);
      ass += `Dialogue: 0,${toAssTime(0)},${toAssTime(openingEnd)},Hook,,0,0,0,,{\\an5\\pos(${W / 2},${y})\\fad(0,300)}${hookLines[i]}\n`;
    }
    ass += `Dialogue: 0,${toAssTime(0)},${toAssTime(openingEnd)},,,0,0,0,,{\\fad(0,300)\\p1\\c${GOLD}\\bord0\\pos(${(W - 200) / 2},${hookBarY})}m 0 0 l 200 0{\\p0}\n`;
  }

  // --- TIPS ITEMS (each centered at H/2) ---
  for (let i = 0; i < tipCount; i++) {
    const start = openingEnd + i * itemDur;
    const end = i === tipCount - 1 ? endStart : openingEnd + (i + 1) * itemDur;
    const t = tips[i];
    const titleWrap = wrap(t.title.replace(/\b\w/g, c => c.toUpperCase()), 22);
    const descWrap = wrap(t.description, 30);
    const exWrap = wrap(t.example || "", 30);
    const exHasContent = exWrap.length > 0 && exWrap[0].length > 0;

    const blockH = numH + gapNumTitle + titleH + gapTitleDesc + descWrap.length * descLineH + (exHasContent ? gapDescEx + exH : 0);
    const blockTop = lessonCtaCenterY - blockH / 2;

    const numY = Math.round(blockTop + numH / 2);
    const titleY = Math.round(blockTop + numH + gapNumTitle + titleH / 2);
    const descStartY = Math.round(blockTop + numH + gapNumTitle + titleH + gapTitleDesc + descLineH / 2);

    const CX = W / 2;
    ass += `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},Num,,0,0,0,,{\\an5\\pos(${CX},${numY})\\fad(300,300)}${circled[i]}\n`;
    ass += `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},TipT,,0,0,0,,{\\an5\\pos(${CX},${titleY})\\fad(300,300)}${titleWrap[0]}\n`;

    for (let j = 0; j < descWrap.length; j++) {
      ass += `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},TipD,,0,0,0,,{\\an5\\pos(${CX},${descStartY + j * descLineH})\\fad(300,300)}${descWrap[j]}\n`;
    }

    if (exHasContent) {
      const exY = Math.round(blockTop + numH + gapNumTitle + titleH + gapTitleDesc + descWrap.length * descLineH + gapDescEx + exH / 2);
      ass += `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},TipEx,,0,0,0,,{\\an5\\pos(${CX},${exY})\\fad(300,300)}${"→ " + exWrap[0]}\n`;
    }
  }

  // --- CTA UNIT: PFP (via ffmpeg) + gold bar + CTA text ---
  {
    ass += `Dialogue: 0,${toAssTime(endStart)},${toAssTime(DUR)},,,0,0,0,,{\\fad(400,0)\\p1\\c${GOLD}\\bord0\\pos(${(W - 200) / 2},${ctaBarY})}m 0 0 l 200 0{\\p0}\n`;
    for (let i = 0; i < ctaLines.length; i++) {
      const y = Math.round(ctaTxtTop + i * ctaLineH + ctaLineH / 2);
      ass += `Dialogue: 0,${toAssTime(endStart)},${toAssTime(DUR)},EndCTA,,0,0,0,,{\\an5\\pos(${W / 2},${y})\\fad(400,0)}${ctaLines[i]}\n`;
    }
  }

  writeFileSync(assFile, ass, "utf8");

  const inp = [];
  let idx = 0;
  const hasVid = bgFiles && bgFiles.length > 0 && bgFiles.every(f => isVideo(f));
  const hasImg = bgFiles && bgFiles.length > 0 && !isVideo(bgFiles[0]);

  let bgStart = -1;
  if (hasVid) {
    bgStart = idx;
    for (const f of bgFiles) { inp.push("-i", f); idx++; }
  } else if (hasImg) {
    bgStart = idx;
    inp.push("-loop", "1", "-i", bgFiles[0]); idx++;
  }

  inp.push("-f", "lavfi", "-i", `color=c=#0a0a0a:s=${W}x${H}:r=25`);
  const colorIdx = idx++;

  inp.push("-loop", "1", "-i", PROFILE_PNG);
  const pfpIdx = idx++;

  if (music) inp.push("-i", music);
  const musicIdx = music ? idx++ : -1;

  const flt = [];
  const assRel = join(".", "output", `${ts}.ass`).replace(/\\/g, "/");

  if (hasVid) {
    for (let i = 0; i < bgFiles.length; i++)
      flt.push(`[${bgStart + i}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[b${i}]`);
    const ci = bgFiles.map((_, i) => `[b${i}]`).join("");
    flt.push(`${ci}concat=n=${bgFiles.length}:v=1:a=0[bg]`);
    flt.push(`[bg]drawbox=color=black@0.45:w=iw:h=ih:t=fill[dd]`);
    flt.push(`[${pfpIdx}:v]split=2[raw1][raw2]`);
    flt.push(`[raw1]scale=${pfpW}:${pfpH},format=rgba,fade=t=out:st=${openingEnd - 0.3}:d=0.3:alpha=1[pfpA]`);
    flt.push(`[raw2]scale=${pfpW_cta}:${pfpH_cta},format=rgba,fade=t=in:st=${endStart}:d=0.3:alpha=1,fade=t=out:st=${DUR - 0.3}:d=0.3:alpha=1[pfpB]`);
    flt.push(`[dd][pfpA]overlay=x=${pfpX}:y=${pfpY_open}:enable='between(t,0,${openingEnd})'[tmp]`);
    flt.push(`[tmp][pfpB]overlay=x=${pfpX_cta}:y=${pfpY_cta}:enable='between(t,${endStart},${DUR})'[mm]`);
    flt.push(`[mm]ass=${assRel}:fontsdir=assets/fonts[v]`);
  } else if (hasImg) {
    flt.push(`[${bgStart}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}[bg]`);
    flt.push(`[bg]drawbox=color=black@0.45:w=iw:h=ih:t=fill[dd]`);
    flt.push(`[dd][${colorIdx}:v]overlay=0:0[gg]`);
    flt.push(`[${pfpIdx}:v]split=2[raw1][raw2]`);
    flt.push(`[raw1]scale=${pfpW}:${pfpH},format=rgba,fade=t=out:st=${openingEnd - 0.3}:d=0.3:alpha=1[pfpA]`);
    flt.push(`[raw2]scale=${pfpW_cta}:${pfpH_cta},format=rgba,fade=t=in:st=${endStart}:d=0.3:alpha=1,fade=t=out:st=${DUR - 0.3}:d=0.3:alpha=1[pfpB]`);
    flt.push(`[gg][pfpA]overlay=x=${pfpX}:y=${pfpY_open}:enable='between(t,0,${openingEnd})'[tmp]`);
    flt.push(`[tmp][pfpB]overlay=x=${pfpX_cta}:y=${pfpY_cta}:enable='between(t,${endStart},${DUR})'[mm]`);
    flt.push(`[mm]ass=${assRel}:fontsdir=assets/fonts[v]`);
  } else {
    flt.push(`[${pfpIdx}:v]split=2[raw1][raw2]`);
    flt.push(`[raw1]scale=${pfpW}:${pfpH},format=rgba,fade=t=out:st=${openingEnd - 0.3}:d=0.3:alpha=1[pfpA]`);
    flt.push(`[raw2]scale=${pfpW_cta}:${pfpH_cta},format=rgba,fade=t=in:st=${endStart}:d=0.3:alpha=1,fade=t=out:st=${DUR - 0.3}:d=0.3:alpha=1[pfpB]`);
    flt.push(`[${colorIdx}:v][pfpA]overlay=x=${pfpX}:y=${pfpY_open}:enable='between(t,0,${openingEnd})'[tmp]`);
    flt.push(`[tmp][pfpB]overlay=x=${pfpX_cta}:y=${pfpY_cta}:enable='between(t,${endStart},${DUR})'[mm]`);
    flt.push(`[mm]ass=${assRel}:fontsdir=assets/fonts[v]`);
  }

  const args = ["-y", ...inp,
    "-filter_complex", flt.join(";"),
    "-map", "[v]",
    ...(music ? ["-map", `${musicIdx}:a`, "-af", "volume=0.25"] : []),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    "-t", `${DUR}`,
    ...(music ? ["-c:a", "aac", "-b:a", "128k"] : []),
    output,
  ];

  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", args);
    const timer = setTimeout(() => {
      ff.kill("SIGKILL");
      reject(new Error(`ffmpeg timed out for ${output}`));
    }, 3_600_000);
    ff.stderr.on("data", () => {});
    ff.on("close", (code) => {
      clearTimeout(timer);
      unlinkSync(assFile);
      if (code === 0) {
        console.log(`Done: ${output}`);
        resolve(output);
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
    ff.on("error", (err) => {
      clearTimeout(timer);
      unlinkSync(assFile);
      reject(err);
    });
  });
}
