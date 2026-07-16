# HyperFrames Edit Skill — Professional Landscape (1920×1080)

A [Claude Code](https://claude.com/claude-code) skill for editing **talking-head + motion-graphics** videos in landscape 1920×1080, built on top of [HyperFrames](https://github.com/heygen-com/hyperframes).

Face-cam docks to one side, motion-graphics fill the other, captions burn in — the whole edit is authored as HTML and rendered through a headless browser.

> **Style is a starting point, not a lock-in.** The bundled palette (Cosmic Red / Deep Space / Stardust) and Be Vietnam Pro fonts are a sample. Swap the tokens in `MOTION_PHILOSOPHY.md` for your own brand.

## What's inside

```
.claude/skills/
  edit-pro/                 ← the main skill (landscape edit style + workflow)
  hyperframes/              ┐
  hyperframes-cli/          │
  hyperframes-registry/     ├─ HeyGen HyperFrames core (see NOTICE)
  gsap/                     │
  website-to-hyperframes/   ┘
MOTION_PHILOSOPHY.md        ← design system: templates, palette, motion rules
WORKFLOW.md                 ← 6-step edit pipeline
scripts/
  preflight.mjs             ← catches authoring bugs before render
  build-fcpxml.js           ← export a FinalCutPro XML (for CapCut Desktop)
examples/example-landscape/ ← a working 4-scene composition to clone
```

## Prerequisites

- **Node.js ≥ 22**
- **FFmpeg** on PATH
- **Google Chrome** (headless) — GPU strongly recommended for render speed
- **HyperFrames CLI** — used via `npx hyperframes` (installed on first run)

## Quick start

1. Copy the `.claude/skills/` folders into your project's `.claude/skills/`.
2. Clone the example:
   ```bash
   cp -r examples/example-landscape my-video
   cd my-video
   ```
3. Drop your footage in as `assets/source.mp4` (this repo ships **no** media — bring your own).
4. Edit `index.html` (4 scenes: HOOK / INFO / BENEFITS / CTA) and `meta.json`.
5. Validate and render:
   ```bash
   npx hyperframes lint
   npx hyperframes render --quality standard --output renders/final.mp4 --gpu --browser-gpu
   ```

In Claude Code, just say **"edit chuyên nghiệp"** / **"edit hyperframes"** / **"edit landscape"** to trigger the `edit-pro` skill.

## Style at a glance

| Thing | Value |
|-------|-------|
| Format | 1920×1080, 30fps |
| Background | Deep Space `#060309` |
| Face dock | RIGHT: `top:60px; left:1180px; width:680px; height:960px` |
| Font | Be Vietnam Pro (local TTF) |
| Emphasis | Cosmic Red `#E10E1F` |
| Accent | Gold `#F0A500` |

See `MOTION_PHILOSOPHY.md` for the full design system and `WORKFLOW.md` for the pipeline.

## Credits & license

- Original work (`edit-pro`, docs, `scripts/`, `examples/`) — MIT, see [LICENSE](LICENSE).
- Bundled `hyperframes*`, `gsap`, `website-to-hyperframes` skills are from HeyGen's [HyperFrames](https://github.com/heygen-com/hyperframes) — see [NOTICE](NOTICE) and the upstream license.
