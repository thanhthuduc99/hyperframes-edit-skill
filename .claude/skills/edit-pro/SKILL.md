# Edit Chuyên Nghiệp — Hyperframes Landscape

Composition HTML-native 1920×1080 landscape. Face dock phải, graphics trái.
Dùng Hyperframes render qua Chrome headless — cần GPU.

## Trigger

Invoke skill này khi user nói: **"edit chuyên nghiệp"**, "edit pro", "hyperframes",
"edit landscape", "edit 1080p", "edit ngang".

## Style chuẩn (không thay đổi)

| Thành phần | Giá trị |
|-----------|---------|
| Format | 1920×1080, 30fps |
| Background | Deep Space `#060309` |
| Face dock | RIGHT: `top:60px; left:1180px; width:680px; height:960px` · border 4px rgba(255,255,255,0.85) · border-radius 32px |
| Source video fit | `object-fit:cover; object-position:center 18%` (vertical source → landscape dock) |
| Font | Be Vietnam Pro 700/600 — local TTF (không dùng Google Fonts CDN) |
| Emphasis color | Cosmic Red `#E10E1F` (pill labels) |
| Headline accent | Gold `#F0A500` |
| Text base | Stardust `#FAF7F5` |

## Source video

Đặt tại: `video-projects/<slug>/assets/source.mp4`

**Reference**: `examples/example-landscape/` — project mẫu đầy đủ (4 scene, captions, HUD).
Clone structure từ đó cho project mới.

## Cấu trúc 4 scene chuẩn

| # | Tên | Pill color | Nội dung |
|---|-----|-----------|---------|
| S1 | HOOK | Đỏ | Headline 100px 2 dòng, sub-text mô tả |
| S2 | INFO / PRODUCT | Đỏ | Headline + 2 card dark (thông tin sản phẩm) |
| S3 | BENEFITS | Xanh lá | Headline + 2 card green (lý do mua) |
| S4 | CTA | Vàng | Headline + gold box (call to action) |

## Captions

- Track 9, `font-size:36px`, `bottom:52px`, `letter-spacing:0.005em`
- Gold highlight: `<span class="hi">từ khoá</span>` với `.hi { color:#F0A500 }`
- Shave **0.02s** từ mỗi clip duration để tránh track overlap
- Scene transitions: entrance only (`gsap.from()`), không dùng exit animation giữa scene

## Typography spacing (quan trọng)

```css
line-height: 1.18–1.25    /* KHÔNG để 1.0 — chữ dính */
letter-spacing: -0.01em   /* KHÔNG để -0.02em */
margin-bottom: 28–36px    /* giữa các element */
gap: 18–22px              /* giữa các card */
```

## Commands

```powershell
# Lint trước
cd video-projects/<slug>
npx hyperframes lint

# Render (GPU bắt buộc trên máy RTX)
npx hyperframes render --quality standard --output renders/final.mp4 --gpu --browser-gpu
```

## Visual verify (bắt buộc)

```powershell
New-Item -ItemType Directory -Force renders/frames | Out-Null
ffmpeg -y -ss <mid-s1> -i renders/final.mp4 -frames:v 1 -q:v 2 renders/frames/S1.png
ffmpeg -y -ss <mid-s2> -i renders/final.mp4 -frames:v 1 -q:v 2 renders/frames/S2.png
ffmpeg -y -ss <mid-s3> -i renders/final.mp4 -frames:v 1 -q:v 2 renders/frames/S3.png
ffmpeg -y -ss <mid-s4> -i renders/final.mp4 -frames:v 1 -q:v 2 renders/frames/S4.png
```

Read từng PNG, xác nhận:
- Face không bị crop, dock phải đúng vị trí
- Brand colors đúng (Cosmic Red pill, Gold accent)
- Chữ không overflow, không dính

## Tạo project mới

1. `mkdir video-projects/<slug>`
2. Copy `examples/example-landscape/meta.json` + `hyperframes.json`, sửa id/name
3. Tạo `assets/`, `renders/` rỗng
4. Copy fonts từ `examples/example-landscape/assets/fonts/`
5. Đặt source video: `assets/source.mp4`
6. Đọc transcript (nếu có) hoặc tự điền nội dung vào 4 scene
7. Viết `index.html` theo structure của `examples/example-landscape/index.html`
8. Lint → render
