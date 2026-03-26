# Capture Pipeline — Agent Integration Guide

This document describes how StickerNest AI agents interact with the capture pipeline.

## MCP Server

The capture pipeline runs as a standalone MCP server. Add it to your MCP config:

```json
{
  "mcpServers": {
    "stickernest-capture": {
      "command": "npx",
      "args": ["tsx", "src/mcp-server.ts"],
      "cwd": "capture/"
    }
  }
}
```

## Available Tools

| Tool | Purpose | Requires |
|------|---------|----------|
| `capture_validate` | Validate a CaptureScript before running | — |
| `capture_run` | Execute a capture (screenshots, video, GIF) | Playwright, dev server |
| `capture_compose` | Generate narration + timeline + render master video | FFmpeg, (edge-tts) |
| `capture_export` | Export master video to platform formats | FFmpeg |
| `capture_pipeline` | Full end-to-end: capture → compose → export | All above |
| `capture_list_formats` | List export format specs | — |
| `capture_list_voices` | List narration voices | — |

## Resources

| URI | Description |
|-----|-------------|
| `capture://capabilities` | System check (FFmpeg, edge-tts, Playwright) |
| `capture://formats` | Full export format specs |
| `capture://script-schema` | CaptureScript JSON schema reference |

---

## Agent Workflows

### Demo Agent → Capture Pipeline

The Demo agent's primary output is a **CaptureScript** — a JSON object defining
the browser actions to perform and what to capture at each step.

**Workflow:**
1. Demo agent receives a feature to demo (from Content Strategy or user)
2. Demo agent writes a CaptureScript using its skill templates
3. Demo agent calls `capture_validate` to check the script
4. Demo agent calls `capture_run` to execute the capture
5. Demo agent calls `capture_compose` to render the master video
6. Demo agent returns the manifest path to the orchestrator

**Example tool call from Demo agent:**
```json
{
  "tool": "capture_pipeline",
  "arguments": {
    "script": {
      "name": "cross-canvas-events",
      "feature": "Cross-Canvas Widget Communication",
      "audience": "developer",
      "target": {
        "baseUrl": "http://localhost:5173/StickerNest5.0/",
        "viewport": { "width": 1920, "height": 1080 }
      },
      "setup": [
        { "id": "login", "label": "Log in", "action": { "type": "navigate", "url": "http://localhost:5173/StickerNest5.0/" } }
      ],
      "steps": [
        {
          "id": "show-canvas",
          "label": "Show the canvas",
          "action": { "type": "wait", "ms": 2000 },
          "capture": { "screenshot": true },
          "narration": "Here's our canvas with two connected widgets"
        }
      ],
      "metadata": {
        "hook": "Widgets can now talk across canvases",
        "cta": "Check out the SDK docs"
      }
    },
    "exportFormats": ["youtube-standard", "tiktok", "gif-hero"]
  }
}
```

### Content Strategy Agent → Demo Agent → Capture Pipeline

Content Strategy identifies what to demo. It doesn't call the capture pipeline
directly — it triggers the Demo agent with a content brief.

**Workflow:**
1. Content Strategy scans the Build Journal for demo-worthy features
2. Content Strategy creates a content brief with: feature, audience, platform, hook
3. Content Strategy triggers the Demo agent (via Command Center)
4. Demo agent generates a CaptureScript and runs the pipeline
5. Demo agent returns paths to the Marketing agent for post-production

### Orchestrator (Full Dev Cycle)

The Orchestrator can chain capture into the post-build content flow:

```
Task Runner (build) → QA (verify) → Scribe (log) → Demo (capture) → Marketing (post)
```

**Command Center session creation:**
```json
{
  "tool": "cc_create_session",
  "arguments": {
    "initial_prompt": "Demo the cross-canvas events feature. Use the capture pipeline. Export for YouTube and TikTok.",
    "wait_for_approval": true
  }
}
```

---

## CaptureScript Quick Reference

### Action Types

| Type | Key Fields |
|------|-----------|
| `navigate` | `url` |
| `click` | `selector`, `button?` |
| `drag` | `from: {x,y}`, `to: {x,y}`, `steps?` |
| `type` | `selector`, `text`, `delay?` |
| `scroll` | `x`, `y` |
| `wait` | `ms` (milliseconds) |
| `waitForSelector` | `selector`, `timeout?` |
| `viewport` | `width`, `height` |
| `keyboard` | `key`, `modifiers?` |
| `hover` | `selector` |
| `eval` | `expression` |

### Capture Config (per step)

```json
{
  "screenshot": true,
  "video": false,
  "gif": false,
  "settleDelay": 500,
  "annotation": "Label shown on screenshot",
  "clip": { "x": 0, "y": 0, "width": 400, "height": 300 }
}
```

### Composition Config (for compose)

```json
{
  "style": {
    "bgColor": "#1a1a2e",
    "accentColor": "#e94560",
    "transitionType": "fade",
    "transitionDuration": 0.5
  },
  "narration": {
    "voice": "en-US-JennyNeural",
    "rate": "+0%",
    "enabled": true
  },
  "branding": {
    "endCard": true,
    "endCardDuration": 3
  },
  "fps": 30,
  "resolution": { "width": 1920, "height": 1080 }
}
```

---

## System Requirements

| Tool | Required For | Install |
|------|-------------|---------|
| FFmpeg | compose, export | `brew install ffmpeg` / `apt install ffmpeg` |
| edge-tts | narration | `pip install edge-tts` |
| Playwright | capture | `npm install` (included in package.json) |
| Dev server | capture | `npm run dev` in StickerNest5.0 root |

---

## Full Content Creator Agent System Map

### Agent Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    SCHEDULED TASKS (cron)                     │
│                                                              │
│  sn-content-scan     9am daily     Scan git + journal        │
│  sn-content-produce  10am Mon/Thu  Produce top queued item   │
│  sn-post-reminder    8am weekdays  Remind what's ready       │
└───────────────┬──────────────────────────────────────────────┘
                │ reads/writes
                ▼
┌──────────────────────────────────────────────────────────────┐
│              content-queue.json (central state)               │
│                                                              │
│  queue: [                                                    │
│    { id, status, idea, platforms, priority, captureScript }  │
│  ]                                                           │
│  posted: [ { id, title, platforms: { twitter: date, ... } } ]│
│  cadence: { twitter: 4/wk, tiktok: 2/wk, ... }             │
└───────────────┬──────────────────────────────────────────────┘
                │ consumed by
                ▼
┌──────────────────────────────────────────────────────────────┐
│                   CONTENT PIPELINE (agents)                   │
│                                                              │
│  Content Strategy ──→ Marketing ──→ Brand Voice ──→ Demo     │
│  (score ideas)      (write posts)  (tone check)   (script)   │
│                                                    │         │
│                                                    ▼         │
│                                            Capture Pipeline  │
│                                            (MCP server)      │
│                                                    │         │
│                                                    ▼         │
│                                          Export Formats       │
│                                          (youtube, tiktok,    │
│                                           gif, screenshots)   │
└──────────────────────────────────────────────────────────────┘
```

### File Map

```
capture/
├── src/
│   ├── types.ts              # CaptureScript Zod schemas
│   ├── runner.ts             # Playwright browser automation
│   ├── gif.ts                # GIF compilation from frames
│   ├── mcp-server.ts         # MCP server (7 tools, 3 resources)
│   ├── index.ts              # CLI entry point
│   └── compose/
│       ├── types.ts          # Composition schemas (style, narration, export)
│       ├── narrate.ts        # Edge TTS narration generation
│       ├── timeline.ts       # Timeline builder from manifest
│       ├── render.ts         # FFmpeg master video renderer
│       └── export.ts         # Multi-format exporter
├── scripts/
│   ├── canvas-editing-demo.json    # Creator audience
│   ├── widget-system-demo.json     # Developer audience
│   ├── platform-overview-demo.json # Investor audience
│   ├── compose-config.json         # Brand composition defaults
│   └── example-canvas-demo.json    # Template reference
├── skills/
│   ├── demo-capture.md       # Demo skill extension for capture pipeline
│   └── content-scheduler.md  # Content Scheduler agent reference
├── scheduled-tasks/
│   ├── SETUP.md                    # How to register the 3 scheduled tasks
│   ├── content-scan-prompt.md      # Daily scan prompt
│   ├── content-produce-prompt.md   # Bi-weekly production prompt
│   └── post-reminder-prompt.md     # Weekday reminder prompt
├── content-queue.json        # Central content queue state
├── mcp-config.json           # Drop-in MCP config for agent .claude.json
├── AGENT-INTEGRATION.md      # This file
├── ORCHESTRATOR-EXTENSION.md # Capture stage for Orchestrator pipeline
├── package.json              # Dependencies (playwright, @mcp/sdk, zod)
├── tsconfig.json
└── vitest.config.ts
```

### Scheduled Tasks (registered)

| Task ID | Schedule | What It Does |
|---------|----------|-------------|
| `sn-content-scan` | 9am daily | Scans git log + Build Journal, scores moments, queues 12+ |
| `sn-content-produce` | 10am Mon + Thu | Picks top queue item, runs Content Pipeline + Capture |
| `sn-post-reminder` | 8am weekdays | Checks for ready items, shows drafts, weekly summary Mon |

### Pipeline Recipes

| Recipe | Flow | Use When |
|--------|------|----------|
| Full Content Sprint | Strategy → Marketing → Brand Voice → Demo → Capture | End-to-end content production |
| Quick Content | Strategy → Marketing → Brand Voice | Text-only posts, no video |
| Demo Only | Demo → Capture | Feature showcase, no marketing copy |
| Parallel Content | Strategy → [Marketing + Demo] → Brand Voice → Capture | Speed run |
| Dev Cycle + Content | Task Runner → QA → Scribe → PM → Strategy → Marketing | Build + share |

### Integration Points

| System | How It Connects |
|--------|----------------|
| Command Center MCP | Orchestrator spawns pipeline agents as `cc_create_session` |
| Notion (via Unified Life) | Optional sync of content-queue to Notion database |
| Build Journal | Content scan reads journal for content-worthy moments |
| TODO.md | Content scan checks for completed milestones |
| SN Content Pipeline plugin | Marketing, Content Strategy, Brand Voice skills |
| SN Demo Design plugin | Demo skill extended with capture workflow |
