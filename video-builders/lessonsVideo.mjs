import { spawn } from "child_process";
import { readdirSync, existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const W = 1080, H = 1920;
const BG_DIR = join(__dirname, "..", "assets", "backgrounds");
const PROFILE_PNG = join(__dirname, "..", "assets", "logo", "i.png");
const MUSIC_DIR = join(__dirname, "..", "assets", "music");
const OUT_DIR = join(__dirname, "..", "output");

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

async function findBackground(dur = 30) {
  if (!existsSync(BG_DIR)) return null;
  const files = readdirSync(BG_DIR).filter(f => /\.(mp4|mov|avi|mkv|webm)$/i.test(f));
  if (!files.length) return null;
  const f = files[Math.floor(Math.random() * files.length)];
  return join(BG_DIR, f);
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

const CODEPOINTS_PATH = join(__dirname, "..", "assets", "fonts", "MaterialSymbolsOutlined.codepoints");
let codepointsCache = null;

async function getCodepoints() {
  if (codepointsCache) return codepointsCache;
  const text = readFileSync(CODEPOINTS_PATH, "utf8");
  const map = new Map();
  for (const line of text.trim().split("\n")) {
    const [name, hex] = line.trim().split(" ");
    if (name && hex) map.set(name, String.fromCodePoint(parseInt(hex, 16)));
  }
  codepointsCache = map;
  return map;
}

function hexToAssColor(hex) {
  if (!hex || hex.length < 6) return null;
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `&H00${b.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${r.toString(16).padStart(2, "0")}&`;
}

export async function generateLessonsVideo({ hook, hook_desc, hook_icon, lesson, cta, output }) {
  const lessonCount = lesson.length;
  const SLIDE_DUR = 5;
  const openingEnd = 5;
  const endStart = openingEnd + lessonCount * SLIDE_DUR;
  const DUR = endStart + 5;

  const music = findMusic();
  const bgFiles = await findBackground(DUR);
  const ts = Date.now();
  const assFile = join(OUT_DIR, `${ts}.ass`);

  const cpMap = await getCodepoints();

  const iconMap = (map, name) => map.get(name) || map.get("lightbulb") || "\ue90f";

  const hookLines = wrap(hook.replace(/\b\w/g, c => c.toUpperCase()), 16);
  const hookDescLines = hook_desc ? wrap(hook_desc, 30) : [];
  const ctaLines = wrap(cta || "Follow for daily tips", 30);

  const MX = 180;
  const GOLD = "&H0000D7FF&";
  const LIGHT = "&H00D0D0D0&";

  const pfpW = 85, pfpH = 85;
  const pfpX = MX;
  const pfpW_cta = 110, pfpH_cta = 110;
  const pfpX_cta = Math.round((W - pfpW_cta) / 2);

  const hookFontSize = 110;
  const numFontSize = 88;
  const iconFontSize = 130;
  const titleFontSize = 78;
  const descFontSize = 62;
  const exFontSize = 58;
  const ctaFontSize = 75;
  const hookLineH = 115;
  const hookDescFontSize = 54;
  const hookDescLineH = 64;
  const numH = 98;
  const titleH = 86;
  const descLineH = 72;
  const exH = 66;
  const gapNumTitle = 16;
  const gapTitleDesc = 14;
  const gapDescEx = 34;
  const ctaLineH = 89;
  const contentCenterY = 880;
  const lessonCtaCenterY = contentCenterY + 85;
  const ctaCenterY = lessonCtaCenterY + 90;

  // Hook TEXT centered at contentCenterY, PFP below gold bar
  const hasHookDesc = hookDescLines.length > 0;
  const hookDescBlockH = hasHookDesc ? 20 + hookDescLines.length * hookDescLineH : 0;
  const hookBlockH = hookLines.length * hookLineH + hookDescBlockH;
  const hookTxtTop = contentCenterY - hookBlockH / 2 + 60;
  const hookDescTxtTop = hookTxtTop + hookLines.length * hookLineH + 20;
  const hookBarY = Math.round(hookTxtTop + hookBlockH + 30);
  const pfpY_open = Math.round(hookBarY + 20 + pfpH / 2);

  // CTA TEXT centered at contentCenterY, PFP above gold bar
  const ctaBlockH = ctaLines.length * ctaLineH;
  const ctaTxtTop = ctaCenterY - ctaBlockH / 2;
  const ctaBarY = Math.round(ctaTxtTop - 36);
  const pfpY_cta = Math.round(ctaBarY - 50 - pfpH_cta / 2 - 30);

  let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hook,Noto Sans,${hookFontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,5,60,60,60,1
Style: HookDesc,Noto Sans,${hookDescFontSize},${LIGHT},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,60,60,60,1
Style: Num,Noto Sans,${numFontSize},${GOLD},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,60,60,60,1
Style: TipIcon,Material Symbols Outlined,${iconFontSize},${GOLD},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,60,60,60,1
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
    const iconY = Math.round(top - 125);
    ass += `Dialogue: 0,${toAssTime(0)},${toAssTime(openingEnd)},TipIcon,,0,0,0,,{\\an4\\pos(${MX},${iconY})\\fad(0,300)}${iconMap(cpMap, hook_icon || "auto_awesome")}\n`;
    for (let i = 0; i < hookLines.length; i++) {
      const y = Math.round(top + i * hookLineH + hookLineH / 2);
      ass += `Dialogue: 0,${toAssTime(0)},${toAssTime(openingEnd)},Hook,,0,0,0,,{\\an4\\pos(${MX},${y})\\fad(0,300)}${hookLines[i]}\n`;
    }
    if (hasHookDesc) {
      for (let i = 0; i < hookDescLines.length; i++) {
        const y = Math.round(hookDescTxtTop + i * hookDescLineH + hookDescLineH / 2);
        ass += `Dialogue: 0,${toAssTime(0)},${toAssTime(openingEnd)},HookDesc,,0,0,0,,{\\an4\\pos(${MX},${y})\\fad(0,300)}${hookDescLines[i]}\n`;
      }
    }
    ass += `Dialogue: 0,${toAssTime(0)},${toAssTime(openingEnd)},,,0,0,0,,{\\fad(0,300)\\p1\\c${GOLD}\\bord0\\pos(${(W - 200) / 2},${hookBarY})}m 0 0 l 200 0{\\p0}\n`;
  }

  // --- LESSON ITEMS (each centered at H/2) ---
  for (let i = 0; i < lessonCount; i++) {
    const start = openingEnd + i * SLIDE_DUR;
    const end = openingEnd + (i + 1) * SLIDE_DUR;
    const t = lesson[i];
    const titleWrap = wrap(t.title.replace(/\b\w/g, c => c.toUpperCase()), 22);
    const descSentences = t.description.split(/\.\s+/).filter(s => s.trim().length > 0).map(s => wrap(s.trim().replace(/\.$/, "") + ".", 30));
    const descTotalLines = descSentences.reduce((sum, lines) => sum + lines.length, 0);
    const descGaps = Math.max(0, descSentences.length - 1);
    const exWrap = wrap(t.example || "", 30);
    const exHasContent = exWrap.length > 0 && exWrap[0].length > 0;
    const exLines = exHasContent ? exWrap.length : 0;
    const counterH = 68;

    const blockH = numH + gapNumTitle + titleH + gapTitleDesc + descTotalLines * descLineH + descGaps * descLineH + (exHasContent ? gapDescEx + exLines * exH : 0) + counterH;
    const blockTop = lessonCtaCenterY - blockH / 2;

    const numY = Math.round(blockTop + numH / 2 - 45);
    const titleY = Math.round(blockTop + numH + gapNumTitle + titleH / 2);
    const descStartY = Math.round(blockTop + numH + gapNumTitle + titleH + gapTitleDesc + descLineH / 2);

    const CX = W / 2;
    const iconColor = t.color ? `\\c${hexToAssColor(t.color)}` : "";

    ass += `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},TipIcon,,0,0,0,,{\\an4\\pos(${MX},${numY})\\fad(300,300)${iconColor}}${iconMap(cpMap, t.icon)}\n`;
    ass += `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},TipT,,0,0,0,,{\\an4\\pos(${MX},${titleY})\\fad(300,300)}${titleWrap[0]}\n`;
    const wmX = Math.round(W - 0.2 * 1750);
    const wmY = lessonCtaCenterY;
    ass += `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},TipIcon,,0,0,0,,{\\an5\\pos(${wmX},${wmY})\\fad(300,300)\\fs1750\\c&HFFFFFF&\\alpha&HFC&}${iconMap(cpMap, t.icon)}\n`;

    let descY = descStartY;
    for (const sentence of descSentences) {
      for (const line of sentence) {
        ass += `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},TipD,,0,0,0,,{\\an4\\pos(${MX},${descY})\\fad(300,300)}${line}\n`;
        descY += descLineH;
      }
      if (descGaps > 0) descY += descLineH;
    }

    let exLastY = descY - descLineH;
    if (exHasContent) {
      exLastY = Math.round(descY - descLineH + gapDescEx + exH / 2);
      const exColor = t.color ? `\\c${hexToAssColor(t.color)}` : "";
      for (let j = 0; j < exWrap.length; j++) {
        ass += `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},TipEx,,0,0,0,,{\\an4\\pos(${MX},${exLastY})\\fad(300,300)${exColor}}${j === 0 ? "→ " : "   "}${exWrap[j]}\n`;
        exLastY += exH;
      }
    }

    const counterY = Math.round(exLastY + counterH / 2 + 40);
    ass += `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},Num,,0,0,0,,{\\an4\\pos(${MX},${counterY})\\fad(300,300)\\fs56\\b1}${i + 1}/${lessonCount}\n`;
  }

  // --- CTA UNIT: PFP (via ffmpeg) + gold bar + CTA text ---
  {
    ass += `Dialogue: 0,${toAssTime(endStart)},${toAssTime(DUR)},,,0,0,0,,{\\fad(400,0)\\p1\\c${GOLD}\\bord0\\pos(${(W - 200) / 2},${ctaBarY})}m 0 0 l 200 0{\\p0}\n`;
    for (let i = 0; i < ctaLines.length; i++) {
      const y = Math.round(ctaTxtTop + i * ctaLineH + ctaLineH / 2);
      ass += `Dialogue: 0,${toAssTime(endStart)},${toAssTime(DUR)},EndCTA,,0,0,0,,{\\an5\\pos(${W/2},${y})\\fad(400,0)}${ctaLines[i]}\n`;
    }
  }

  writeFileSync(assFile, ass, "utf8");

  const inp = [];
  let idx = 0;
  const hasVid = bgFiles && isVideo(bgFiles);
  const hasImg = bgFiles && !isVideo(bgFiles);

  let bgStart = -1;
  if (hasVid) {
    bgStart = idx;
    inp.push("-stream_loop", "-1", "-i", bgFiles); idx++;
  } else if (hasImg) {
    bgStart = idx;
    inp.push("-loop", "1", "-i", bgFiles); idx++;
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
    flt.push(`[${bgStart}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[bg]`);
    flt.push(`[bg]drawbox=color=black@0.45:w=iw:h=ih:t=fill[dd]`);
    flt.push(`[${pfpIdx}:v]split=2[raw1][raw2]`);
    flt.push(`[raw1]scale=${pfpW}:${pfpH},format=rgba,fade=t=out:st=${openingEnd - 0.3}:d=0.3:alpha=1[pfpA]`);
    flt.push(`[raw2]scale=${pfpW_cta}:${pfpH_cta},format=rgba,fade=t=in:st=${endStart}:d=0.3:alpha=1[pfpB]`);
    flt.push(`[dd][pfpA]overlay=x=${pfpX}:y=${pfpY_open}:enable='between(t,0,${openingEnd})'[tmp]`);
    flt.push(`[tmp][pfpB]overlay=x=${pfpX_cta}:y=${pfpY_cta}:enable='between(t,${endStart},${DUR})'[mm]`);
    flt.push(`[mm]ass=${assRel}:fontsdir=assets/fonts[v]`);
  } else if (hasImg) {
    flt.push(`[${bgStart}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}[bg]`);
    flt.push(`[bg]drawbox=color=black@0.45:w=iw:h=ih:t=fill[dd]`);
    flt.push(`[dd][${colorIdx}:v]overlay=0:0[gg]`);
    flt.push(`[${pfpIdx}:v]split=2[raw1][raw2]`);
    flt.push(`[raw1]scale=${pfpW}:${pfpH},format=rgba,fade=t=out:st=${openingEnd - 0.3}:d=0.3:alpha=1[pfpA]`);
    flt.push(`[raw2]scale=${pfpW_cta}:${pfpH_cta},format=rgba,fade=t=in:st=${endStart}:d=0.3:alpha=1[pfpB]`);
    flt.push(`[gg][pfpA]overlay=x=${pfpX}:y=${pfpY_open}:enable='between(t,0,${openingEnd})'[tmp]`);
    flt.push(`[tmp][pfpB]overlay=x=${pfpX_cta}:y=${pfpY_cta}:enable='between(t,${endStart},${DUR})'[mm]`);
    flt.push(`[mm]ass=${assRel}:fontsdir=assets/fonts[v]`);
  } else {
    flt.push(`[${pfpIdx}:v]split=2[raw1][raw2]`);
    flt.push(`[raw1]scale=${pfpW}:${pfpH},format=rgba,fade=t=out:st=${openingEnd - 0.3}:d=0.3:alpha=1[pfpA]`);
    flt.push(`[raw2]scale=${pfpW_cta}:${pfpH_cta},format=rgba,fade=t=in:st=${endStart}:d=0.3:alpha=1[pfpB]`);
    flt.push(`[${colorIdx}:v][pfpA]overlay=x=${pfpX}:y=${pfpY_open}:enable='between(t,0,${openingEnd})'[tmp]`);
    flt.push(`[tmp][pfpB]overlay=x=${pfpX_cta}:y=${pfpY_cta}:enable='between(t,${endStart},${DUR})'[mm]`);
    flt.push(`[mm]ass=${assRel}:fontsdir=assets/fonts[v]`);
  }

  const args = ["-y", ...inp,
    "-filter_complex", flt.join(";"),
    "-map", "[v]",
    ...(music ? ["-map", `${musicIdx}:a`, "-af", `volume=0.25,afade=t=out:st=${endStart}:d=5`] : []),
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
