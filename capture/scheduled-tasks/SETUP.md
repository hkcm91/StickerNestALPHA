# Content Scheduler — Setup Guide

> Run these commands in a Cowork or Claude session to register the scheduled tasks.

---

## Quick Setup

Tell Claude:

> "Set up the StickerNest content scheduler with daily scans, bi-weekly production,
> and weekday post reminders."

Claude will use the `create_scheduled_task` tool three times:

### 1. Daily Content Scan
```
Task ID: sn-content-scan
Schedule: 0 9 * * * (9am daily)
Prompt: <contents of content-scan-prompt.md>
```

### 2. Bi-Weekly Content Production
```
Task ID: sn-content-produce
Schedule: 0 10 * * 1,4 (Monday + Thursday at 10am)
Prompt: <contents of content-produce-prompt.md>
```

### 3. Weekday Post Reminder
```
Task ID: sn-post-reminder
Schedule: 0 8 * * 1-5 (weekdays at 8am)
Prompt: <contents of post-reminder-prompt.md>
```

---

## Customizing the Schedule

Adjust the cron expressions to match your workflow:

| If you want... | Change to... |
|---|---|
| Scan twice daily | `0 9,17 * * *` |
| Produce 3x/week | `0 10 * * 1,3,5` |
| Weekend reminders too | `0 8 * * *` |
| Only scan on build days | `0 9 * * 1-5` |

---

## Verify Setup

After registering, check your tasks:

> "List my scheduled tasks"

You should see all three tasks listed with their next run times.

---

## Dependencies

Before the first production run:
- [ ] StickerNest dev server can start: `npm run dev`
- [ ] Playwright is installed: `npx playwright install chromium`
- [ ] FFmpeg is available: `ffmpeg -version`
- [ ] Edge TTS is available: `pip install edge-tts`
- [ ] capture/content-queue.json exists (created automatically on first scan)
