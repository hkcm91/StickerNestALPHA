---
name: demo
description: >
  This skill records demonstrations of StickerNest features. Use when the user
  says "demo this feature", "record a walkthrough", "take screenshots", "create
  a demo script", or when a feature needs visual documentation for content or
  stakeholder review.
---

> Records demonstrations of working features. Navigates the app, performs user flows, captures screenshots and video. Produces audience-specific demo scripts.

---

## When to Run

- Content Strategist identifies a demo-worthy feature
- QA Verifier passes a significant feature
- On demand: "Demo the widget lab"

---

## Demo Environment Setup

```bash
# Start the dev server
npm run dev
# Navigate to: http://localhost:5173/StickerNest5.0/
```

Before recording:
1. Clear any debug artifacts from the canvas
2. Set a clean state (empty canvas or curated demo canvas)
3. Set viewport to target size (see below)
4. Verify the feature works before recording (dry run)

---

## Viewport Standards

| Use Case | Resolution | Aspect |
|----------|-----------|--------|
| Screenshots | 1280x720 | 16:9 |
| Video recording | 1920x1080 | 16:9 |
| TikTok/vertical | 1080x1920 | 9:16 |
| Thumbnail | 1280x720 | 16:9 |

---

## Demo Script Structure

Every demo follows this arc regardless of audience:

### Hook (0-5 seconds)
What are we about to see? Grab attention immediately.
- Bad: "Today I want to show you a feature I've been working on"
- Good: "Widgets can now talk to each other across different canvases"

### Context (5-15 seconds)
Why does this matter? What problem does it solve?
- Keep it brief — viewers want to SEE the thing, not hear about it

### Walkthrough (15-90 seconds)
Step-by-step demonstration. One action per beat:
1. Show the starting state
2. Perform the action
3. Show the result
4. Repeat for each step in the flow

### Result (90-100 seconds)
What did we just accomplish? Zoom out to the big picture.

### CTA (100-110 seconds)
What should the viewer do next? (Follow, try it, share, feedback)

---

## Audience-Specific Templates

### Template A: Users/Creators

**Focus:** What you can build. Wow factor. Ease of use.
**Avoid:** Code, architecture, jargon.
**Show:** The experience. Drag-and-drop. Visual results. "Look what I made."

```markdown
## Demo: [Feature] — Creator Version

### Hook
"[What the feature lets you DO]"

### Walkthrough
1. [Visual action — e.g., "Drag a widget onto the canvas"]
2. [Interaction — e.g., "Click to configure it"]
3. [Result — e.g., "It's live and interactive immediately"]

### Key Message
[One sentence: why a creator would care]

### CTA
"Try building your own — link in bio"
```

### Template B: Developers

**Focus:** Architecture. SDK. How it works under the hood.
**Show:** Code snippets, SDK calls, event bus traffic, layer boundaries.
**Tone:** Technical respect. Developers want to understand, not be sold to.

```markdown
## Demo: [Feature] — Developer Version

### Hook
"Here's how [feature] works under the hood"

### Walkthrough
1. [Show the code — e.g., "The widget calls StickerNest.emit()"]
2. [Show the flow — e.g., "The event bus routes it through the pipeline"]
3. [Show the result — e.g., "The target widget receives it via subscribe()"]

### Technical Details
- Layer: [which layer]
- Key files: [file paths]
- SDK methods used: [list]

### CTA
"Check out the SDK docs — build your first widget in 10 minutes"
```

### Template C: Investors/Stakeholders

**Focus:** Market positioning. Vision. Traction metrics.
**Show:** The platform's breadth. User value. Competitive advantages.
**Tone:** Professional but passionate. Confident without hype.

```markdown
## Demo: [Feature] — Investor Version

### Hook
"StickerNest now supports [capability] — here's what that means for the platform"

### Walkthrough
1. [Show scale — e.g., "Multiple users collaborating in real-time"]
2. [Show differentiation — e.g., "Same content works in 2D, 3D, and VR"]
3. [Show commerce — e.g., "Creators can publish and sell widgets"]

### Market Context
[How this positions StickerNest vs. competitors]

### Metrics
[Any relevant numbers: features shipped, test coverage, user interest]

### CTA
"Let's schedule a deeper dive"
```

---

## Screenshot Workflow (Claude in Chrome)

### Capture Process
1. Navigate to the feature
2. Set viewport to 1280x720
3. Perform the user flow step by step
4. Take a screenshot at each key moment
5. Name files descriptively: `01-empty-canvas.png`, `02-widget-placed.png`, `03-pipeline-connected.png`

### Annotation
When annotating screenshots:
- Use bright, high-contrast callout boxes
- Arrow pointing to the relevant UI element
- Brief label text (3-5 words max)
- Number callouts if showing a sequence

### Before/After Comparisons
When relevant (redesigns, new features replacing old behavior):
1. Capture the "before" state with a label
2. Perform the change
3. Capture the "after" state with a label
4. Place side by side in a comparison image

---

## Output Organization

Save all demo outputs to:
```
StickerNest-Agents/demos/{feature-name}/
├── script.md          # Demo script (all audience versions)
├── screenshots/       # Numbered screenshot files
├── recording-notes.md # Timestamps and narration notes for video
└── assets/           # Any supporting visuals
```

---

## Quality Checklist

Before a demo is "done":

- [ ] Feature actually works as shown (no faking)
- [ ] Canvas state is clean (no debug artifacts, no unrelated content)
- [ ] Viewport is at standard resolution
- [ ] Screenshots are well-framed and readable
- [ ] Annotations are clear and non-cluttered
- [ ] Script matches what's shown in the screenshots/video
- [ ] At least one audience-specific script is written
- [ ] CTA is included in every script version
