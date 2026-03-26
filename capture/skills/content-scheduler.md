# Content Scheduler — Automated Content Cadence Agent

> This skill manages the StickerNest content publishing cadence. It scans for
> content-worthy development moments, queues content for production, and
> triggers the Content Pipeline on a schedule.

---

## What This Agent Does

The Content Scheduler is the "always-on" content manager for StickerNest. It:

1. **Scans** the Build Journal and git history for content-worthy moments
2. **Scores** each moment using the Content Strategy scoring dimensions
3. **Queues** approved ideas into the content backlog (`content-queue.json`)
4. **Triggers** the Content Pipeline for the highest-priority queued items
5. **Tracks** what's been posted, when, and on which platforms
6. **Schedules** posts at optimal times per platform

---

## Content Queue (`capture/content-queue.json`)

The queue is the central state file. Structure:

```json
{
  "version": 1,
  "lastScanAt": "2026-03-24T10:00:00Z",
  "lastPostAt": "2026-03-23T14:30:00Z",
  "cadence": {
    "twitter": { "postsPerWeek": 4, "bestTimes": ["09:00", "12:30", "17:00"] },
    "tiktok": { "postsPerWeek": 2, "bestTimes": ["11:00", "19:00"] },
    "youtube": { "postsPerWeek": 1, "bestTimes": ["10:00"] },
    "reddit": { "postsPerWeek": 1, "bestTimes": ["10:00", "14:00"] }
  },
  "queue": [
    {
      "id": "content-001",
      "status": "queued",
      "idea": {
        "title": "Canvas drag-and-drop tools demo",
        "angle": "build-in-public",
        "source": "build-journal:2026-03-24",
        "score": { "visual": 4, "novelty": 3, "reach": 4, "story": 3, "total": 14 }
      },
      "platforms": ["twitter", "tiktok"],
      "priority": "high",
      "createdAt": "2026-03-24T10:00:00Z",
      "scheduledFor": null,
      "captureScript": null,
      "assets": null
    }
  ],
  "posted": [
    {
      "id": "content-000",
      "title": "Event bus architecture deep dive",
      "platforms": { "twitter": "2026-03-22T09:00:00Z", "reddit": "2026-03-22T10:00:00Z" },
      "assets": "output/event-bus-architecture/exports/"
    }
  ]
}
```

### Queue Item Statuses

| Status | Meaning |
|--------|---------|
| `queued` | Idea approved, waiting for content production |
| `scripted` | CaptureScript generated, ready for pipeline |
| `producing` | Content Pipeline running |
| `ready` | Assets produced, drafts written, ready to post |
| `scheduled` | Assigned a posting time slot |
| `posted` | Published (moves to `posted` array) |
| `skipped` | Manually skipped by user |

---

## Scheduled Task Configuration

### Daily Content Scan (recommended)

Run every morning to find new content opportunities:

```
Task ID: sn-content-scan
Schedule: 0 9 * * * (9am daily, local time)
```

### Content Production Run (2x per week)

Run the full pipeline for queued items:

```
Task ID: sn-content-produce
Schedule: 0 10 * * 1,4 (Monday + Thursday at 10am)
```

### Post Reminder (daily)

Check for `ready` or `scheduled` items and remind to post:

```
Task ID: sn-content-post-reminder
Schedule: 0 8 * * 1-5 (weekdays at 8am)
```

---

## Scan Workflow

When the scan task runs:

### 1. Load Current State
```
Read capture/content-queue.json
Check lastScanAt — skip if scanned within 4 hours
```

### 2. Find New Content Moments
```
Sources to scan:
- Build Journal entries since lastScanAt
- Git log since lastScanAt: git log --since="<lastScanAt>" --oneline
- TODO.md for recently completed tasks
- Any new capture scripts in capture/scripts/
```

### 3. Score Each Moment

Use the Content Strategy 4-dimension scoring:

| Dimension | Weight | What to Look For |
|-----------|--------|-----------------|
| Visual Appeal | 1-5 | Does this feature look good in a screenshot/video? |
| Novelty | 1-5 | Is this new/surprising to the audience? |
| Reach | 1-5 | How broad is the appeal? (niche dev → general creator) |
| Story Angle | 1-5 | Is there a compelling narrative? (challenge overcome, milestone hit) |

**Threshold: 12+ out of 20** → auto-queue
**8-11** → suggest to user for manual approval
**Below 8** → skip

### 4. Queue Approved Ideas
```
For each idea scoring 12+:
  - Assign platforms based on content type:
    - Visual/demo → Twitter + TikTok
    - Technical deep dive → Twitter + Reddit + YouTube
    - Milestone → all platforms
  - Set priority: high (16+), medium (12-15)
  - Add to queue with status "queued"
```

### 5. Update State
```
Set lastScanAt = now
Write content-queue.json
```

---

## Production Workflow

When the production task runs:

### 1. Pick Next Item
```
From queue, find highest priority item with status "queued"
If none: report "Queue empty — nothing to produce" and exit
```

### 2. Generate CaptureScript
```
Based on the idea's source and angle:
  - Load the relevant Build Journal entry or feature context
  - Select audience: creator (default), developer, investor
  - Generate a CaptureScript JSON targeting the feature
  - Validate via capture_validate()
  - Save to capture/scripts/<id>.json
  - Update queue item: status → "scripted", captureScript → path
```

### 3. Run Content Pipeline
```
Option A — Full pipeline via Command Center (if available):
  cc_create_session for Content Strategy → Marketing → Brand Voice → Demo → Capture

Option B — Direct capture pipeline (faster, less review):
  capture_pipeline(script, exportFormats, composeConfig)

Update queue item: status → "producing"
```

### 4. Collect Results
```
On pipeline completion:
  - Gather asset paths (videos, GIFs, screenshots)
  - Gather draft posts from Marketing agent
  - Update queue item: status → "ready", assets → paths
```

### 5. Assign Posting Slots
```
For each platform in the item's platforms list:
  - Find the next open slot based on cadence config
  - Avoid posting more than cadence.postsPerWeek allows
  - Prefer cadence.bestTimes for the platform
  - Update queue item: status → "scheduled", scheduledFor → slot time
```

---

## Posting Reminder Workflow

When the post reminder task runs:

### 1. Check for Due Posts
```
Find queue items where:
  - status === "scheduled" or status === "ready"
  - scheduledFor <= now (or null for "ready" items)
```

### 2. Format Reminder
```
Output for each due item:
  📬 READY TO POST: "<title>"
  Platforms: Twitter, TikTok
  Assets: output/<slug>/exports/
  Draft: <show first 280 chars of Twitter draft>
  Scheduled for: <time> (or "ASAP" if overdue)
```

### 3. Track Posted Items
```
When user confirms a post was published:
  - Move from queue to posted array
  - Record timestamp per platform
  - Update lastPostAt
```

---

## Cadence Rules

### Platform Frequency Defaults

| Platform | Posts/Week | Best Times (local) | Content Type |
|----------|-----------|-------------------|--------------|
| Twitter/X | 3-5 | 9am, 12:30pm, 5pm | Quick updates, threads, GIFs |
| TikTok | 2-3 | 11am, 7pm | Short demos, before/after |
| YouTube | 1 | 10am Sat | Longer walkthroughs, dev logs |
| Reddit | 1-2 | 10am, 2pm | Technical deep dives, milestones |

### Anti-Spam Rules

- Never post the same content to the same platform twice
- Minimum 4 hours between posts on any single platform
- Maximum 2 posts per day across all platforms combined
- If queue is empty, don't force content — silence is better than filler
- Weekend posts only for YouTube and major milestones

### Content Mix Targets

Per rolling 2-week window:
- 40% Feature spotlights (demos, walkthroughs)
- 25% Build-in-public (decisions, challenges, progress)
- 20% Technical (architecture, SDK, developer content)
- 15% Vision/milestone (roadmap, celebrations)

---

## Integration Points

### With Content Strategy Agent
The scheduler's scan replaces the manual "what content should I post" workflow.
Content Strategy scoring dimensions are used directly in the scan step.

### With Marketing Agent
Queued items with status "ready" include draft posts from the Marketing agent.
The scheduler tracks which drafts have been posted.

### With Demo/Capture Agents
Items with visual requirements get CaptureScripts generated and run through
the capture pipeline automatically.

### With Orchestrator
The production workflow can be run via Command Center for full pipeline
orchestration, or run directly for faster iteration.

### With Notion (via Unified Life MCP)
Optionally sync the content queue to a Notion database for visual board tracking:
- Each queue item → Notion page with status property
- Kanban view: Queued → Scripted → Producing → Ready → Scheduled → Posted

---

## Manual Overrides

The scheduler is advisory — you always have final say:

- **Force post**: Move any item to "ready" regardless of score
- **Skip item**: Set status to "skipped" with a reason
- **Reprioritize**: Change priority to bump items up/down
- **Adjust cadence**: Edit cadence config in content-queue.json
- **Pause scheduler**: Disable the scheduled tasks temporarily
- **Add manual idea**: Insert a queue item directly (no scan needed)
