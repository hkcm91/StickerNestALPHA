# StickerNest Demo Playbook
## Widget Pipeline Demos for Content

> Every demo must be understandable by someone who has never heard of StickerNest.
> Lead with the visual. Explain later. The pipeline IS the product demo.

---

## BUILD-FIRST PICKS (recommended order)

These four demos cover all three vibes and should be built first:

1. **Pomodoro Dashboard** (practical, easy to build)
2. **Particle Data Flow** (visually stunning, 15-second scroll-stopper)
3. **Weather Canvas** (Wallpaper Engine connection is undeniable)
4. **Emote Chain** (playful, shareable, makes people smile)

---

## PRACTICAL / USEFUL

### 1. Pomodoro Dashboard
**Widgets**: Timer (new), Task Checklist (new), Focus Mode Toggle (new)
**Pipeline**: Timer emits `timer.complete` → Focus Mode dims canvas and disables distractions. Task Checklist subscribes to timer events and auto-logs focus sessions.
**Visual hook**: Start a timer. Canvas dims. Checklist auto-updates with a checkmark on completion. All wired together, no code.
**WE connection**: Background opacity shifts while timer runs — reactive desktop environment.
**Content**: "Build your entire productivity setup without installing a single app."

### 2. Weather Canvas
**Widgets**: Weather API Widget (new), Forecast Display (new), Alert Notifier (new)
**Pipeline**: Weather API fetches data every 5 min → emits `weather.updated` → Forecast Display updates. If temp drops below threshold → Alert Notifier pulses red border.
**Visual hook**: Beautiful weather card updates live. Conditions change, canvas responds. It's your desktop, not your phone.
**WE connection**: Canvas background adapts to weather — rainy = darker tones, sunny = brighter. This is exactly what WE users want.
**Content**: "Your desktop knows what the weather is. And it shows you."

### 3. Habit Tracker
**Widgets**: Habit Grid (new), Streaks Counter (new)
**Pipeline**: Habit Grid emits `habit.completed` → Streaks Counter increments. Hit a milestone → confetti sticker fires.
**Visual hook**: Colorful grid fills in day by day. Badge appears at 7 days. Confetti on milestones.
**Content**: "Gamify your habits. On your desktop. Where you already spend all your time."

### 4. Time-Block Focus Mode
**Widgets**: Calendar Block Editor (new), Focus Blocker (new)
**Pipeline**: Calendar emits `block.starting` → Focus Blocker dims canvas, fades distracting widgets, starts countdown.
**Visual hook**: Hover a "Deep Work 2-4pm" block. Canvas dims. Clock counts down. Distractions fade. Perfect focus.
**WE connection**: Gradual focus mode aesthetic — wallpaper darkens, widgets blur slightly.
**Content**: "Your calendar and your desktop finally work together."

### 5. Inbox Triage
**Widgets**: Email Snippet Widget (new), Task Inbox (new), Archive Sticker
**Pipeline**: Email widget emits `email.arrived` → Task Inbox shows cards. Click Archive sticker → emits `archive.requested` → email marked read.
**Visual hook**: Email arrives on your canvas as a card. Click a sticker. It's archived. No email app opened.
**Content**: "Triage your email without leaving your desktop."

---

## VISUALLY IMPRESSIVE

### 6. Particle Data Flow
**Widgets**: Data Source (new — reads CSV/table), Particle Emitter (new), Visualizer (new)
**Pipeline**: Table emits `row.added` → Particle Emitter creates animated dots flowing across canvas. Dots color/speed based on data values. Visualizer aggregates into live chart.
**Visual hook**: Numbers become light. Colored particles flow across a dark canvas, leaving trails, coalescing into a real-time chart. Mesmerizing.
**WE connection**: THIS IS Wallpaper Engine energy. Reactive particle data viz as your desktop.
**Content**: "Watch your data move. Literally."

### 7. Music Visualizer (3D/Spatial)
**Widgets**: Now Playing (new), Spectrum Analyzer (new), Beat Detector (new)
**Pipeline**: Now Playing emits audio features → Beat Detector processes → emits `beat.detected` + intensity → 3D Analyzer renders pulsing geometric shapes in spatial view.
**Visual hook**: Switch to 3D view. Music plays. Geometric shapes pulse in sync. Rotate around the visualization.
**WE connection**: Animated spatial visualizer responding to music. WE but in 3D.
**Content**: "Your music deserves a stage. Give it one."

### 8. AI Wallpaper Generator
**Widgets**: Prompt Input (new), AI Image Generator (new), Gallery Frame (new), Loop Trigger (new)
**Pipeline**: User types prompt → Input emits `prompt.submitted` → AI Generator queries image API → emits `image.generated` → Gallery displays with fade-in. Loop Trigger repeats every N seconds with variant prompts.
**Visual hook**: Type "sunset over mountains." Image appears with smooth fade. Type again. New image. Loop it. Always changing.
**WE connection**: AI-generated wallpaper that evolves every few seconds. Living, generative desktop.
**Content**: "Infinite wallpapers. Generated in real-time. No two seconds the same."

### 9. Stock Ticker Cascade
**Widgets**: Stock Feed (new), Ticker Display (new), Sparkline Chart (new), Price Alert (new)
**Pipeline**: Stock Feed polls API → emits `price.updated` → Ticker updates with green/red transitions. Sparkline draws itself. Hit threshold → Alert pulses canvas border red.
**Visual hook**: Stock prices update live. Numbers fade red/green. Sparkline traces price history. Bloomberg terminal vibes, but it's your desktop.
**Content**: "Your portfolio on your desktop. Live. No app needed."

### 10. Kaleidoscope Color Mixer
**Widgets**: Color Picker (new), Kaleidoscope Renderer (new), Symmetry Slider (new)
**Pipeline**: Color Picker emits `color.changed` → Kaleidoscope renders symmetrical patterns. Symmetry slider emits `axis.rotated` → patterns rotate.
**Visual hook**: Pick a color. A perfect rotating mandala appears. Adjust symmetry. Hypnotic.
**WE connection**: Animated kaleidoscope wallpaper. The exact aesthetic WE creators love.
**Content**: "Turn your desktop into a living artwork."

### 11. Rain Effect
**Widgets**: Weather Data Source (new), Particle Rain Renderer (new), Wind Simulation (new)
**Pipeline**: Weather emits wind speed/direction → Wind Simulation calculates velocities → Particle Rain renders thousands of droplets flowing across canvas.
**Visual hook**: Sunny = clear. Rain forecast = droplets start falling diagonally, wind-driven. Real weather, real rain on your desktop.
**WE connection**: Dynamic data-driven weather effects. Literally what WE users have asked for.
**Content**: "Your desktop reflects the real world. Not a screenshot. Live."

---

## PLAYFUL / CREATIVE

### 12. Emote Chain
**Widgets**: Emoji Trigger Buttons (new), Confetti Cannon (new), Sound FX (new), Reaction Counter (new)
**Pipeline**: Click emoji button → emits `emoji.triggered` → Confetti Cannon fires with matching colors → Sound FX plays chime → Counter increments.
**Visual hook**: Click a happy face sticker. Confetti explodes. A chime plays. Counter goes up. Click again. Bigger explosion.
**Content**: "One click. Instant joy."

### 13. Desktop Pet
**Widgets**: Pet Sprite (new), Food Dispenser (new), Mood Tracker (new)
**Pipeline**: Click Food sticker → emits `food.given` → Pet plays eating animation, updates energy state. Mood Tracker monitors happiness and shows emoji mood. Pet evolves over weeks.
**Visual hook**: A cute pixel pet sits on your canvas. Feed it. Watch it eat, sleep, play. It has a mood. It remembers. It's alive.
**WE connection**: Living desktop companion. Tamagotchi meets Wallpaper Engine.
**Content**: "Your desktop has a friend now. You have to take care of it."

### 14. Drawing Duet (Multiplayer)
**Widgets**: Sketch Canvas (new), Multiplayer Sync (new), Brush Picker (new)
**Pipeline**: User A draws → Sketch Canvas emits `stroke.drawn` → Multiplayer Sync routes to User B → strokes appear on both canvases live.
**Visual hook**: Two screens side by side. Person A draws a line. It appears on Person B's screen instantly. They draw back. Collaborative art, live.
**Content**: "Draw with your friend. On both desktops. At the same time."

### 15. Sound Board Canvas
**Widgets**: Sound Pad Grid (new), Waveform Visualizer (new), Loop Recorder (new)
**Pipeline**: Tap a pad → emits `sound.played` with audio clip → Waveform Visualizer shows the wave. Loop Recorder captures sequences → emits `loop.recorded` → plays back automatically.
**Visual hook**: A grid of colorful pads on the canvas. Tap tap tap — sounds play, waveforms dance, loops build. A music studio on your desktop.
**Content**: "Your desktop is a drum machine now."

---

## CONTENT FORMAT GUIDE

### Twitter/X
- **Video length**: 15-30 seconds max. Shorter is better for cold audiences.
- **Caption structure**: One sentence saying what it is. One sentence saying why it matters. "This is StickerNest."
- **Threads vs singles**: Singles first. Nobody reads a thread from someone they don't follow yet. Save threads for after you have followers who care.
- **Personal angle**: Use it every 3rd post or so. Not every demo needs "I'm a retail worker." But sprinkle it in — it's your superpower.

### TikTok
- **Hook (0-3s)**: Show the end result FIRST. "Wait for it" doesn't work for cold audiences — they won't wait. Show the wow, then show how.
- **Length**: 15-30s for demos. 30-60s for story/build-in-public posts.
- **Format**: Text overlay + ambient music. Voiceover optional — text overlays perform better for product demos because people watch on mute.
- **Trending fits**: "POV: your desktop is alive", "things on my desktop that just work", before/after (static desktop → StickerNest canvas)

### Posting Rhythm (First 2 Weeks)
**Week 1** — Establish what StickerNest IS:
- Day 1: Concept intro post (from content-drafts-march26.md)
- Day 3: First demo video (Emote Chain or Pomodoro — whichever is ready first)
- Day 5: Personal story post ("building an OS between retail shifts")

**Week 2** — Show the pipelines:
- Day 8: Demo video (Particle Data Flow or Weather Canvas)
- Day 10: "How it works" post — show the pipeline wiring in 15 seconds
- Day 12: Wallpaper Engine origin story ("I loved WE so much I accidentally built an OS")

**Ongoing rule**: Re-explain what StickerNest is in every 3rd post. New followers arrive constantly. They need the context every time.

---

## NEW WIDGET CONCEPTS SUMMARY

These widgets need to be built to support the demos above:

| Widget | Complexity | Used In |
|--------|-----------|---------|
| Timer | Low | Pomodoro Dashboard |
| Task Checklist | Low | Pomodoro Dashboard |
| Focus Mode Toggle | Low | Pomodoro, Time-Block |
| Weather API | Medium | Weather Canvas, Rain Effect |
| Forecast Display | Low | Weather Canvas |
| Alert Notifier | Low | Weather Canvas, Stock Ticker |
| Emoji Trigger Buttons | Low | Emote Chain |
| Confetti Cannon | Medium | Emote Chain, Habit Tracker |
| Sound FX Player | Low | Emote Chain, Sound Board |
| Reaction Counter | Low | Emote Chain |
| Particle Emitter | High | Particle Data Flow, Rain |
| Data Visualizer | Medium | Particle Data Flow |
| Pet Sprite | Medium | Desktop Pet |
| Sketch Canvas | Medium | Drawing Duet |
| Color Picker | Low | Kaleidoscope |
| Kaleidoscope Renderer | High | Kaleidoscope |
| Prompt Input | Low | AI Wallpaper |
| AI Image Generator | Medium | AI Wallpaper |
| Sound Pad Grid | Medium | Sound Board |
| Waveform Visualizer | Medium | Sound Board |

Low = buildable in a few hours as single-file HTML widget
Medium = half-day to a day
High = 1-2 days, involves canvas rendering or particle systems
