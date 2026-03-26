# Orchestrator Extension — Capture Pipeline Stage

> This document extends the sn-orchestrator pipeline definitions with the
> automated Capture stage. The Orchestrator SKILL.md is in a read-only plugin,
> so this file serves as the reference for the extended Content Pipeline.

---

## Updated Content Pipeline

```
Content Strategy → Marketing → Brand Voice → Demo → Capture
```

The **Capture** stage is new. It takes the Demo agent's CaptureScript output and
runs it through the automated pipeline: headless browser capture → narration →
video composition → multi-format export.

---

## Step 5 — Capture (new)

### Prompt Template

```
You are a StickerNest capture pipeline agent.

SETUP:
1. Use the /sn-core-context:stickernest-context skill to load project context.
2. The capture pipeline MCP server must be running: cd capture && npm run mcp

CONTEXT FROM PREVIOUS STEPS:
Demo agent output: [PASTE DEMO AGENT OUTPUT — includes CaptureScript JSON]
Content ideas: [PASTE APPROVED CONTENT IDEAS]
Audience: [PASTE TARGET AUDIENCE]

TASK:
Run the automated capture pipeline to produce video and image assets.

WORKFLOW:
1. Validate the CaptureScript:
   capture_validate(script: <CaptureScript from Demo agent>)

2. If validation passes, run the full pipeline:
   capture_pipeline(
     script: <CaptureScript>,
     exportFormats: ["youtube-standard", "tiktok", "gif-hero", "screenshot-set"],
     composeConfig: {
       "narration": {
         "voice": "<voice matching audience — see voice table>",
         "rate": "+5%"
       },
       "branding": {
         "titleCard": {
           "backgroundColor": "#1a1a2e",
           "textColor": "#e94560",
           "showLogo": true
         }
       }
     }
   )

3. If validation fails, fix the CaptureScript and retry.

VOICE TABLE:
| Audience  | Voice              |
|-----------|--------------------|
| Creator   | en-US-SaraNeural   |
| Developer | en-US-DavisNeural  |
| Investor  | en-US-JennyNeural  |

OUTPUT (required):
- Validation result (pass/fail + any fixes applied)
- Pipeline execution status
- List of exported files with paths and formats
- File sizes and durations
- Any quality issues noted
- Handoff summary for Marketing agent (asset paths + metadata)
```

### When to Use

| Scenario | Use Capture Stage? |
|---|---|
| Content has video/GIF asset requirements | Yes — full pipeline |
| Content needs screenshots only | Yes — use `capture_run` only (skip compose/export) |
| Text-only content (tweets, Reddit posts) | No — skip this stage |
| Quick iteration on demo script | Yes — run `capture_validate` + `capture_run` only |

### Spawn Command

```
cc_create_session(
  name: "SN Capture Pipeline",
  type: "claude-code",
  prompt: "<prompt from template above>",
  cwd: "/path/to/StickerNest5.0",
  project: "StickerNest",
  require_approval: true
)
```

Always use `require_approval: true` for capture — it's resource-intensive
(launches headless browser, runs FFmpeg) and you want to verify the
CaptureScript before burning time on a full render.

---

## Updated Pipeline Recipes

### Full Content Sprint (with capture)
```
Content Strategy → Marketing → Brand Voice → Demo → Capture
```

### Quick Content (no video)
```
Content Strategy → Marketing → Brand Voice
```

### Demo Only (for feature showcase)
```
Demo → Capture
```
Skip content strategy and marketing when you just need demo assets for a
specific feature.

### Parallel Content + Capture
```
Content Strategy → [Marketing + Demo in parallel] → Brand Voice → Capture
```
Marketing writes posts while Demo creates the CaptureScript. Brand Voice
reviews the text, then Capture produces the visual assets.

---

## System Requirements for Capture Stage

Before spawning the Capture agent, verify:

1. **Dev server running**: `npm run dev` must be serving on port 5173
2. **Playwright installed**: `npx playwright install chromium` (first run only)
3. **FFmpeg available**: `ffmpeg -version` (for compose/export stages)
4. **Edge TTS available**: `pip install edge-tts` (for narration, Python package)
5. **Capture MCP server**: `cd capture && npm run mcp` (or use capture CLI directly)

The preflight check in the Capture prompt should verify these before proceeding.

---

## Output Handoff Format

After Capture completes, pass this to the Marketing agent for final posting:

```
DEMO ASSETS GENERATED:
- Master video: output/<slug>/capture/master.mp4
- YouTube export: output/<slug>/exports/youtube-standard.mp4
- TikTok export: output/<slug>/exports/tiktok.mp4
- Hero GIF: output/<slug>/exports/gif-hero.gif
- Screenshots: output/<slug>/exports/screenshots/
- Hook: "<metadata.hook>"
- CTA: "<metadata.cta>"
- Audience: <audience>

Please attach these assets to the final posts.
```
