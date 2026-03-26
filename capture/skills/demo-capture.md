# Demo Agent — Capture Pipeline Extension

> This file extends the sn-demo-design:demo skill with automated capture pipeline
> integration. When the Demo agent runs, it should use these tools instead of
> manual Claude-in-Chrome screenshots.

---

## Automated Capture Workflow

Instead of manually navigating the app and taking screenshots via Claude in Chrome,
the Demo agent now generates a **CaptureScript** and runs it through the capture pipeline.

### Step 1: Generate a CaptureScript

Convert the demo brief into a CaptureScript JSON. Map the demo arc directly:

| Demo Arc | CaptureScript Section |
|----------|----------------------|
| Hook | `metadata.hook` |
| Context | First 1-2 steps with narration |
| Walkthrough | Main demo steps with screenshots/GIFs |
| Result | Final step showing the outcome |
| CTA | `metadata.cta` |

### Step 2: Validate

```
capture_validate(script: <the CaptureScript JSON>)
```

Fix any validation errors before proceeding.

### Step 3: Run the Full Pipeline

For one-shot production:
```
capture_pipeline(
  script: <CaptureScript>,
  exportFormats: ["youtube-standard", "tiktok", "gif-hero", "screenshot-set"]
)
```

Or run each stage separately for more control:
```
capture_run(script: <CaptureScript>)
→ returns manifestPath

capture_compose(manifestPath: <from above>)
→ returns masterVideoPath

capture_export(masterVideo: <from above>, formats: [...])
→ returns exported file paths
```

---

## CaptureScript Templates

### Template A: Creator Demo

```json
{
  "name": "{{feature-slug}}",
  "feature": "{{Feature Name}}",
  "audience": "creator",
  "target": {
    "baseUrl": "http://localhost:5173/StickerNest5.0/",
    "viewport": { "width": 1920, "height": 1080 },
    "deviceScaleFactor": 2
  },
  "setup": [
    {
      "id": "load-app",
      "label": "Load StickerNest",
      "action": { "type": "navigate", "url": "http://localhost:5173/StickerNest5.0/" }
    },
    {
      "id": "wait-ready",
      "label": "Wait for app ready",
      "action": { "type": "waitForSelector", "selector": "[data-testid='canvas-viewport']", "timeout": 10000 }
    }
  ],
  "steps": [
    {
      "id": "show-starting-state",
      "label": "Show the empty canvas",
      "action": { "type": "wait", "ms": 1500 },
      "capture": { "screenshot": true, "annotation": "Starting state" },
      "narration": "{{Hook — what the feature lets you DO}}"
    },
    {
      "id": "perform-action",
      "label": "{{Perform the key action}}",
      "action": { "type": "click", "selector": "{{target selector}}" },
      "capture": { "screenshot": true, "gif": true, "annotation": "{{Action label}}" },
      "narration": "{{Describe what's happening — keep it visual}}"
    },
    {
      "id": "show-result",
      "label": "Show the result",
      "action": { "type": "wait", "ms": 2000 },
      "capture": { "screenshot": true, "annotation": "Result" },
      "narration": "{{What we just accomplished — zoom out to big picture}}"
    }
  ],
  "metadata": {
    "hook": "{{Grab attention in one sentence}}",
    "cta": "Try building your own — link in bio",
    "tags": ["stickernest", "{{feature-tag}}"],
    "description": "{{Brief description for video description fields}}"
  }
}
```

### Template B: Developer Demo

Same structure, but:
- `audience`: `"developer"`
- Steps show code, inspector, event bus traffic
- Narration is technical ("The widget calls StickerNest.emit()")
- Include `eval` actions to trigger dev tools or show console output
- CTA: "Check out the SDK docs"

### Template C: Investor Demo

Same structure, but:
- `audience`: `"investor"`
- Steps show scale (multiple users, real-time collab)
- Show commerce features, marketplace, cross-platform
- Narration focuses on market positioning
- CTA: "Let's schedule a deeper dive"

---

## Narration Voice Selection

Match voice to audience:

| Audience | Recommended Voice | Tone |
|----------|------------------|------|
| Creator | `en-US-SaraNeural` | Young, energetic |
| Developer | `en-US-DavisNeural` | Calm, professional |
| Investor | `en-US-JennyNeural` | Warm, authoritative |

Set in the compose config:
```json
{ "narration": { "voice": "en-US-SaraNeural", "rate": "+5%" } }
```

Or pass as `composeConfig` in `capture_pipeline`.

---

## Output Structure (Automated)

After `capture_pipeline` completes, outputs are at:

```
output/{{feature-slug}}/
├── capture/
│   ├── screenshots/        # Per-step screenshots
│   ├── recordings/         # Video recordings
│   ├── gifs/              # Animated GIFs
│   ├── narration/         # Per-step MP3 audio
│   ├── master.mp4         # Composed master video
│   └── manifest.json      # Capture manifest
└── exports/
    ├── youtube-standard.mp4
    ├── tiktok.mp4
    ├── gif-hero.gif
    └── screenshots/        # Annotated screenshot set
```

---

## Handoff to Marketing Agent

After the pipeline completes, pass these to the Marketing agent:

```
DEMO ASSETS GENERATED:
- Master video: output/{{slug}}/capture/master.mp4
- YouTube export: output/{{slug}}/exports/youtube-standard.mp4
- TikTok export: output/{{slug}}/exports/tiktok.mp4
- Hero GIF: output/{{slug}}/exports/gif-hero.gif
- Screenshots: output/{{slug}}/exports/screenshots/
- Hook: "{{metadata.hook}}"
- CTA: "{{metadata.cta}}"
- Audience: {{audience}}

Please write publish-ready posts using these assets.
```

---

## Quality Checklist (Automated)

The pipeline handles most quality checks automatically:

- [x] Feature actually works (capture runs against live dev server)
- [x] Canvas state is clean (setup steps prepare the state)
- [x] Viewport is at standard resolution (set in CaptureScript target)
- [x] Screenshots are well-framed (capture config with optional clip regions)
- [x] Annotations are included (capture config annotation field)
- [x] Script matches screenshots (they're generated from the same script)
- [x] Audience-specific versions (set audience field, use matching voice)
- [x] CTA included (metadata.cta)

Manual checks still needed:
- [ ] Review the exported video for visual quality
- [ ] Verify narration sounds natural (adjust rate/pitch if needed)
- [ ] Confirm the hook is attention-grabbing for the platform
