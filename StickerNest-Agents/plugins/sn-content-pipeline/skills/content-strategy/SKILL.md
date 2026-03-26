---
name: content-strategy
description: >
  This skill discovers content-worthy moments from StickerNest development and
  plans content. Use when the user says "what content should I post", "content
  ideas", "content calendar", "what's worth sharing", or when scanning the Build
  Journal for shareable updates.
---

> Watches the Build Journal for moments that make good content. Generates content ideas, drafts, and demo scripts.

---

## When to Run

- After new Build Journal entries (after Scribe runs)
- At milestone completions
- On demand: "What content should I post this week?"

---

## Content Discovery Workflow

### Step 1: Read Recent Build Journal

Use `notion_search` or `notion_get_todos` to pull recent Build Journal entries. Look for the last 5-7 entries or entries since the last content review.

### Step 2: Score for Content Potential

For each entry, evaluate on four dimensions:

| Dimension | Question | Score 1-5 |
|-----------|----------|-----------|
| **Visual Appeal** | Can this be shown in a screenshot or video? | |
| **Novelty** | Is this new/interesting to the target audience? | |
| **Reach** | Does this appeal broadly or only to niche users? | |
| **Story Angle** | Is there a compelling narrative (challenge overcome, milestone hit, before/after)? | |

Entries scoring 12+ (out of 20) are strong content candidates. 8-11 are secondary. Below 8, skip unless Kimber specifically asks.

### Step 3: Categorize the Angle

Each content-worthy moment maps to one or more content types:

| Content Type | Best For | Platforms |
|-------------|----------|-----------|
| **Build-in-public** | Daily progress, challenges, small wins | Twitter, Reddit |
| **Feature spotlight** | Completed features with visual demos | All platforms |
| **Behind-the-scenes** | Architecture decisions, dev process | Twitter, Reddit, YouTube |
| **Tutorial/how-to** | Using the platform, building widgets | YouTube, Reddit |
| **Vision/roadmap** | Big-picture direction, milestone reflections | Twitter, Reddit |
| **Demo reel** | Visual showcase of working features | TikTok, YouTube, Twitter |

---

## Content Calendar Format

```markdown
## Content Calendar — Week of [Date]

| Date | Type | Platform | Topic | Key Points | Assets Needed | Status |
|------|------|----------|-------|------------|---------------|--------|
| Mon | Build-in-public | Twitter | [topic] | [points] | Screenshot | Draft |
| Wed | Feature spotlight | YouTube + Twitter | [topic] | [points] | Demo video | Idea |
| Fri | Behind-the-scenes | Reddit | [topic] | [points] | Code snippet | Idea |
```

Aim for 2-3 pieces per week minimum. Quality over quantity — one great post beats three mediocre ones.

---

## Platform Formatting Awareness

### Twitter/X
- 280 characters per tweet
- Threads for longer content (break at natural points, number them)
- 1-2 hashtags max (#buildinpublic, #indiedev, #webdev)
- Images/videos dramatically increase engagement
- Hook in the first tweet — don't bury the interesting part

### TikTok
- 15-60 second videos
- Hook in first 3 seconds ("Watch me build an infinite canvas OS")
- Trending sounds and formats when appropriate
- Vertical format (1080x1920)
- Captions for accessibility

### YouTube
- Title under 60 chars, include key term
- Thumbnail with high contrast text
- Shorts (< 60s) for quick demos; standard for tutorials
- Description with timestamps for longer videos
- End screen with subscribe CTA

### Reddit
- Subreddit-aware (r/webdev, r/gamedev, r/IndieHackers, r/SideProject, r/reactjs)
- Each subreddit has different norms — match them
- Detailed posts with context perform best
- Engage in comments — Reddit rewards conversation
- No self-promotion spam — provide value first

---

## Draft Quality Standards

A good content draft includes:

1. **Hook** — First sentence/frame grabs attention
2. **Value** — The audience gets something (insight, inspiration, knowledge)
3. **Specificity** — Concrete details, not vague claims
4. **Visual** — Screenshot, video, or code snippet where possible
5. **CTA** — What should the viewer do? (follow, try it, give feedback, share)

---

## Demo Script Outline Format

When identifying a demo-worthy feature:

```markdown
## Demo Script: [Feature Name]

### Hook (5 sec)
[What grabs attention]

### Context (10 sec)
[Why this matters]

### Walkthrough (30-90 sec)
1. [Step]: [What to show]
2. [Step]: [What to show]
3. [Step]: [What to show]

### Result (10 sec)
[What we accomplished]

### CTA (5 sec)
[What the viewer should do next]

### Assets Needed
- [ ] Screenshots of [what]
- [ ] Screen recording of [what]
```

---

## Example Content Calendar Entry

```markdown
| Wed | Feature spotlight | Twitter thread + YouTube short | Cross-canvas events | Widgets talking across canvases in real-time. Show two canvases side by side, one widget emitting, the other receiving. | Screen recording of demo, annotated screenshot | Draft ready |
```
