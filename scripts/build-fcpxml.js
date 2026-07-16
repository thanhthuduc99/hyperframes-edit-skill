#!/usr/bin/env node
/**
 * build-fcpxml.js — generate Final Cut Pro X XML (.fcpxml v1.10) for CapCut Desktop.
 *
 * Usage:
 *   node scripts/build-fcpxml.js <project-folder>
 *
 * The project folder must contain:
 *   - meta.json                          (width, height, fps)
 *   - renders/final-no-caption.mp4       (video without captions baked in)
 *   - assets/<name>.transcript.json      OR assets/transcript.json  (Whisper output)
 *
 * Optional:
 *   - assets/music.mp3 / music-bed.mp3   (music bed)
 *
 * Output:
 *   - renders/final.fcpxml               (open in CapCut Desktop)
 */

const fs = require('fs');
const path = require('path');

// ---------- args ----------
const projectDir = process.argv[2];
if (!projectDir) {
  console.error('Usage: node scripts/build-fcpxml.js <project-folder>');
  process.exit(1);
}
const abs = path.resolve(projectDir);
if (!fs.existsSync(abs)) {
  console.error(`Not found: ${abs}`);
  process.exit(1);
}

// ---------- read meta ----------
const meta = JSON.parse(fs.readFileSync(path.join(abs, 'meta.json'), 'utf8'));
const W = meta.width || 1920;
const H = meta.height || 1080;
const FPS = meta.fps || 30;

// ---------- find video ----------
const videoCandidates = [
  'renders/final-no-caption.mp4',
  'renders/final.mp4',
  'renders/draft.mp4',
  'final-no-caption.mp4',
  'final.mp4',
];
let videoRel = null;
for (const c of videoCandidates) {
  if (fs.existsSync(path.join(abs, c))) { videoRel = c; break; }
}
if (!videoRel) {
  console.error('No render found. Expected one of:', videoCandidates.join(', '));
  process.exit(1);
}
const videoAbs = path.join(abs, videoRel);

// ---------- find transcript ----------
const assetsDir = path.join(abs, 'assets');
let transcriptPath = null;
if (fs.existsSync(path.join(assetsDir, 'transcript.json'))) {
  transcriptPath = path.join(assetsDir, 'transcript.json');
} else if (fs.existsSync(assetsDir)) {
  const file = fs.readdirSync(assetsDir).find(f => f.endsWith('.transcript.json'));
  if (file) transcriptPath = path.join(assetsDir, file);
}
if (!transcriptPath) {
  console.error('No transcript.json found in assets/');
  process.exit(1);
}
const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
const words = transcript.words || [];
if (!words.length) {
  console.error('Transcript has no words[] array');
  process.exit(1);
}

// ---------- find music ----------
const musicCandidates = ['assets/music.mp3', 'assets/music-bed.mp3'];
let musicAbs = null;
for (const c of musicCandidates) {
  if (fs.existsSync(path.join(abs, c))) { musicAbs = path.join(abs, c); break; }
}

// ---------- gather video duration (rough — from transcript end + 1s) ----------
const videoDuration = Math.max(
  transcript.duration || 0,
  words[words.length - 1].end + 1.0,
);

// ---------- group words into sentences ----------
// Prefer transcript.segments[] (Whisper sentence-level output). Each segment
// has { start, end, text }. Fall back to word grouping by gap > 0.3s when no
// segments are present.
function groupSentencesFromSegments(segments) {
  return segments
    .filter(s => s.text && s.text.trim().length > 0)
    .map(s => ({
      text: s.text.trim(),
      start: s.start,
      end: s.end,
    }));
}
function groupSentencesFromWords(words) {
  const out = [];
  let buf = [];
  let lastEnd = 0;
  for (const w of words) {
    const gap = w.start - lastEnd;
    if (buf.length && gap > 0.4) {
      out.push({
        text: buf.map(x => x.word.trim()).join(' '),
        start: buf[0].start,
        end: buf[buf.length - 1].end,
      });
      buf = [];
    }
    buf.push(w);
    lastEnd = w.end;
  }
  if (buf.length) out.push({
    text: buf.map(x => x.word.trim()).join(' '),
    start: buf[0].start,
    end: buf[buf.length - 1].end,
  });
  return out;
}
const sentences = (transcript.segments && transcript.segments.length)
  ? groupSentencesFromSegments(transcript.segments)
  : groupSentencesFromWords(words);

// ---------- helpers ----------
const xmlEscape = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// FCPXML time as N/Ds rational where D = FPS * frame_base.
// For 30fps non-drop: frameDuration = "100/3000s" (1/30 sec per frame).
const TIME_BASE = 3000; // matches 30fps standard
const FRAME_NUM = TIME_BASE / FPS; // 100 for 30fps
const toFcpTime = (seconds) => {
  const ticks = Math.round(seconds * TIME_BASE / FRAME_NUM) * FRAME_NUM;
  return `${ticks}/${TIME_BASE}s`;
};

const fileURL = (absPath) => {
  // file:///C:/path  — Windows: drive letter, forward slashes, leading file:///
  const fwd = absPath.replace(/\\/g, '/');
  return 'file:///' + (fwd.startsWith('/') ? fwd.slice(1) : fwd);
};

// ---------- build XML ----------
const projectName = meta.name || meta.id || path.basename(abs);
const seqDuration = toFcpTime(videoDuration);
const videoDurStr = toFcpTime(videoDuration);
const musicDurStr = musicAbs ? toFcpTime(videoDuration) : null;

const formatId = 'r1';
const videoAssetId = 'r2';
const musicAssetId = 'r3';
const titleEffectId = 'r4';

// Brand color tokens (RGBA 0..1, sRGB)
const COLOR_STARDUST = '0.9804 0.9686 0.9608 1';   // #FAF7F5
const COLOR_DEEP_SPACE = '0.0275 0.0157 0.0353 1'; // #070409
const COLOR_COSMIC_RED = '0.8824 0.0549 0.1216 1'; // #E10E1F

// Build resources
let resourcesXml = `
    <format id="${formatId}" name="FFVideoFormat${H}p${FPS}" frameDuration="${FRAME_NUM}/${TIME_BASE}s" width="${W}" height="${H}"/>
    <asset id="${videoAssetId}" name="${xmlEscape(path.basename(videoAbs, path.extname(videoAbs)))}" src="${fileURL(videoAbs)}" start="0s" duration="${videoDurStr}" hasVideo="1" hasAudio="1" format="${formatId}" videoSources="1" audioSources="1" audioChannels="2" audioRate="48000"/>`;
if (musicAbs) {
  resourcesXml += `
    <asset id="${musicAssetId}" name="${xmlEscape(path.basename(musicAbs, path.extname(musicAbs)))}" src="${fileURL(musicAbs)}" start="0s" duration="${musicDurStr}" hasAudio="1" audioSources="1" audioChannels="2" audioRate="48000"/>`;
}
resourcesXml += `
    <effect id="${titleEffectId}" name="Basic Title" uid=".../Titles.localized/Basic Text.localized/Basic Title.localized/Basic Title.moti"/>`;

// Build title clips
const titles = sentences.map((sent, i) => {
  const text = (sent.text || '').trim();
  if (!text) return '';
  const start = sent.start;
  const end = sent.end;
  const dur = Math.max(0.5, end - start);
  const offset = toFcpTime(start);
  const duration = toFcpTime(dur);
  const styleId = `ts${i + 1}`;
  // Emphasize Vietnamese sentences with the bold-red token (heuristic: short sentences = emphasis)
  const isShort = text.split(/\s+/).length <= 4;
  const fontColor = isShort ? COLOR_COSMIC_RED : COLOR_STARDUST;
  return `
        <title ref="${titleEffectId}" lane="1" offset="${offset}" duration="${duration}" name="${xmlEscape('Caption-' + (i + 1))}">
          <text>
            <text-style ref="${styleId}">${xmlEscape(text)}</text-style>
          </text>
          <text-style-def id="${styleId}">
            <text-style font="Be Vietnam Pro" fontSize="64" fontFace="Bold" fontColor="${fontColor}" strokeColor="${COLOR_DEEP_SPACE}" strokeWidth="3" alignment="center"/>
          </text-style-def>
          <param name="Position" key="9999/999166631/999166633/1/100/101" value="0 -380"/>
        </title>`;
}).join('');

// Build music nested in asset-clip if present
const musicAudio = musicAbs ? `
          <audio ref="${musicAssetId}" lane="-1" offset="0s" duration="${musicDurStr}" role="music" srcCh="1, 2"/>` : '';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>${resourcesXml}
  </resources>
  <library>
    <event name="${xmlEscape(projectName)}">
      <project name="${xmlEscape(projectName)}">
        <sequence format="${formatId}" duration="${seqDuration}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">
          <spine>
            <asset-clip ref="${videoAssetId}" offset="0s" name="${xmlEscape(projectName)}" duration="${videoDurStr}" format="${formatId}" audioRole="dialogue">${musicAudio}${titles}
            </asset-clip>
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
`;

// ---------- write output ----------
const outPath = path.join(abs, 'renders', 'final.fcpxml');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, xml, 'utf8');

console.log(`✓ FCPXML written: ${outPath}`);
console.log(`  Video: ${path.basename(videoAbs)}`);
console.log(`  Captions: ${sentences.length} sentences → ${sentences.length} title clips`);
if (musicAbs) console.log(`  Music: ${path.basename(musicAbs)}`);
console.log(`  Duration: ${videoDuration.toFixed(2)}s @ ${FPS}fps ${W}×${H}`);
console.log(`\nMở trong CapCut Desktop: File → Import → chọn ${path.basename(outPath)}`);
