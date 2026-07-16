# Quy trình edit video HF Studio v2

> Workflow nâng cấp từ `EDIT-VIDEO-PROMPT.md`. Đầu vào video raw, đầu ra MP4 + FCPXML mở được trong CapCut Desktop để chỉnh text/màu cuối.

## Inputs

- 1 file video raw (`.mp4` / `.mov` / `.MP4`)
- (tuỳ chọn) **Style prompt** — vd: "dark cinematic", "playful", "data-heavy", "concept reveal"
- (tuỳ chọn) **Template chỉ định** — vd: "T1, T3, T4" hoặc "all"

## Output

- `renders/final.mp4` — preview đầy đủ (motion graphics + captions baked-in)
- `renders/final-no-caption.mp4` — phiên bản KHÔNG nhúng captions (input cho CapCut)
- `renders/final.fcpxml` — project file mở trong CapCut Desktop, captions là text layers editable

---

## Bước 1 — Scaffold project

```powershell
$slug = "<kebab-case-name>"
New-Item -ItemType Directory -Force "video-projects\$slug\assets", "video-projects\$slug\compositions", "video-projects\$slug\renders"
Copy-Item "<raw-video-path>" "video-projects\$slug\assets\source.mp4"
```

Tạo `meta.json` + `hyperframes.json` (template từ `video-projects/_template-preview/`).

Re-encode nếu raw không phải H.264:
```powershell
ffmpeg -i raw.mov -c:v libx264 -preset medium -crf 20 -c:a aac -b:a 192k -movflags +faststart "video-projects\$slug\assets\source.mp4"
```

## Bước 2 — Transcribe

```powershell
cd "video-projects\$slug"
npx hyperframes transcribe assets\source.mp4 --model small --json --output assets\transcript.json
```

Output: `assets/transcript.json` với `words[]` array `{word, start, end}`.

## Bước 3 — Phân tích + chia scenes

- Đọc transcript, identify các điểm cắt (dấu chấm, im lặng > 1s, chuyển ý)
- Match với style prompt + template chỉ định để chọn mẫu cho từng scene
- Tạo bản nháp scene plan: scene N → template T?, start/end time

Mặc định 5 templates được map như sau:
- **Mở video / brand opener** → T2 (cinematic logo lockup)
- **Câu hook chính** → T3 (karaoke caption full-frame)
- **Insert beat / chuyển ý** → T1 (handwritten card)
- **Demo / số liệu** → T4 (light widget split)
- **Concept reveal / headline lớn** → T5 (side panel headline)

## Bước 4 — Render preview 5 mẫu cho duyệt

Trước khi build timeline thật, render từng template 5s riêng để người duyệt duyệt motion:

```powershell
# Copy template HTML vào project
Copy-Item ..\..\templates\T1-handwritten-objects\landscape.html compositions\preview-T1.html
# ... etc cho T2-T5

# Tạo file index-preview.html link cả 5 (xem _template-preview/ làm mẫu)
npx hyperframes preview                                                      # localhost:3002
```

Hand người duyệt URL → wait sign-off.

## Bước 5 — Lắp template vào timeline thật

1. Copy template HTML đã chọn vào `compositions/` với prefix scene number (`01-`, `02-`, ...)
2. Sửa text/data từng template theo transcript:
   - T3 captions: replace word spans + `data-at` từ transcript words
   - T2 tagline / T5 headline / T1 CTA label: viết tay theo content video
3. Build `index.html`:
   - Face-wrapper với animation state per scene (FULL / HIDDEN / CENTER / RIGHT)
   - 5 sub-comp scenes với `data-start`/`data-duration` chính xác
   - Music bed `<audio>` `data-volume="0.15"`

```powershell
npx hyperframes lint                                                          # phải pass
npx hyperframes preview                                                       # người duyệt duyệt live
```

## Bước 6 — Render draft + visual verify

```powershell
npx hyperframes render --quality draft --output renders\draft.mp4
```

Sau khi xong, extract frames hero và Read PNG vào context để verify visual:

```powershell
New-Item -ItemType Directory -Force renders\frames | Out-Null
# Lấy 1 frame giữa mỗi scene
ffmpeg -y -ss 2.0  -i renders\draft.mp4 -frames:v 1 -q:v 2 renders\frames\T1.png
ffmpeg -y -ss 6.5  -i renders\draft.mp4 -frames:v 1 -q:v 2 renders\frames\T2.png
ffmpeg -y -ss 10.5 -i renders\draft.mp4 -frames:v 1 -q:v 2 renders\frames\T3.png
ffmpeg -y -ss 15.0 -i renders\draft.mp4 -frames:v 1 -q:v 2 renders\frames\T4.png
ffmpeg -y -ss 20.0 -i renders\draft.mp4 -frames:v 1 -q:v 2 renders\frames\T5.png
```

Phải Read cả 5 PNG để verify:
- Mặt người không bị crop
- Text không overflow
- Captions sync đúng word
- Brand colors đúng (Cosmic Red / Stardust / Deep Space)

Serve cho người duyệt:
```powershell
npx serve renders\ -p 8080 -n                                                 # localhost:8080
```

Wait người duyệt duyệt MP4 draft.

## Bước 7 — Render final + xuất FCPXML

```powershell
# Render bản không có T3 caption (caption sẽ ở FCPXML)
# Trong index.html, tạm comment out T3 scene hoặc set data-duration="0" cho caption layer
npx hyperframes render --quality standard --output renders\final-no-caption.mp4

# Restore caption rồi render bản full preview
npx hyperframes render --quality standard --output renders\final.mp4

# Build FCPXML
node ..\..\scripts\build-fcpxml.js .
```

Output:
- `renders/final.mp4` — bản preview đầy đủ
- `renders/final-no-caption.mp4` — bản gốc cho CapCut (motion graphics + nhạc, không captions)
- `renders/final.fcpxml` — mở trong CapCut Desktop, text layers editable

Đường dẫn trả người duyệt:
- Preview: `video-projects/<slug>/renders/final.mp4`
- CapCut project: `video-projects/<slug>/renders/final.fcpxml` (cộng với `final-no-caption.mp4` phải nằm cùng folder)

---

## Templates available

Xem `templates/README.md`. 5 mẫu: T1 (handwritten), T2 (logo lockup), T3 (karaoke caption), T4 (light widget split), T5 (side panel headline). Mỗi mẫu có cả landscape (1920×1080) và vertical (1080×1920).

## Music library

`assets/music/` ở workspace root. Tên file gợi mood: `calm-pad.mp3`, `upbeat-tech.mp3`, `cinematic-build.mp3`, `playful-loop.mp3`, `data-driven.mp3`. Volume mặc định 0.15 (warm pad behind voice).

## Quick reference — common bash

```powershell
# Lint composition
npx hyperframes lint

# Preview live (Studio)
npx hyperframes preview

# List compositions
npx hyperframes compositions

# Render
npx hyperframes render --quality draft|standard|high --output renders/X.mp4

# Doctor (env check)
npx hyperframes doctor
```
