# Reddit Post — AI Prompt Refinement Overlay

## Subreddit: r/webdev (or r/SideProject, r/IndieHackers)

---

### Title
I built an AI prompt refinement overlay that asks clarifying questions before generating UI widgets

### Body

I'm building StickerNest, a spatial operating system (infinite-canvas platform where you compose widgets, stickers, and pipelines into interactive workspaces).

The Widget Lab has AI generation — type a prompt, get a working widget. But I kept running into the same problem: raw prompts produce generic results, and then you spend 4 iterations fixing what the AI guessed wrong.

**The fix: a prompt refinement overlay.**

When you submit a prompt, instead of jumping straight to generation, a glass modal slides in with three sections:

1. **Clarifying questions** — The AI generates 3 questions specific to your prompt. "Weather dashboard" gets: "What data source?", "What visual style?", "What interactions?" Your answers get woven into the enriched prompt automatically.

2. **Compatible widgets** — If you already have widgets on your canvas, the overlay shows ones with matching port contracts. Select them and the AI generates your new widget with compatible event types — so they can talk to each other via the pipeline system out of the box.

3. **Quick toggles** — Interactive mode, dark mode, event emission. Flip them instead of writing "make it interactive and dark themed."

The enriched prompt (original + answers + toggles + selected widgets) feeds into the AI. The difference in output quality is significant — especially for widgets that need to integrate with existing canvas setups.

**Tech stack for this feature:**
- React overlay component with glass morphism styling
- AI clarifying questions generated via the same Anthropic API proxy used for widget generation
- Zod-validated port contracts for widget compatibility matching
- All running in the L2 (Widget Lab) layer of StickerNest's 7-layer architecture

This took about 4 commits to ship: the prompt-questions module, the overlay component, wiring through the prompt bar and Lab page, and tests.

Happy to answer questions about the implementation or the broader StickerNest architecture.

---

### Flair
Show & Tell / Project

### Cross-post note
Adapt tone slightly for r/SideProject (more business context) and r/IndieHackers (more build journey context).
