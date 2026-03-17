# Mirror — Eval Test Prompts

Run these prompts to test the Mirror skill. Check the criteria after each run.

---

## Test 1: Cold Start (Full Interview)

**Prompt:** "Help me figure out what kind of business to start"

**Expected behavior:**
- [ ] Triggers the Mirror skill
- [ ] Reads CONVENTIONS.md for schema
- [ ] Checks if profile already exists
- [ ] Starts with skills/tools question (warm-up)
- [ ] Asks ONE question at a time — never batches questions
- [ ] Follows the interview sequence in order
- [ ] Follows up on thin answers instead of moving on
- [ ] Handles uncomfortable topics (anti-skills, failures) with warmth
- [ ] Produces a complete profile in the correct schema format
- [ ] Saves to forge-suite/data/profile.md
- [ ] Suggests next steps (Spark, Lens, or Acid Test)

**Red flags:**
- Asks multiple questions in one message
- Skips sections
- Produces generic/assumed content instead of asking
- Feels like a form rather than a conversation

---

## Test 2: Update Mode

**Prompt:** "Update my profile — my hours got cut at work so I have more free time now"

**Pre-requisite:** A profile must exist in forge-suite/data/profile.md

**Expected behavior:**
- [ ] Triggers Mirror in update mode
- [ ] Reads existing profile
- [ ] Identifies "Constraints" as the relevant section
- [ ] Shows current constraint values
- [ ] Asks what specifically changed
- [ ] Updates only the relevant section
- [ ] Preserves all other sections unchanged
- [ ] Saves updated profile with new date

**Red flags:**
- Rewrites the entire profile
- Doesn't show current values before asking for updates
- Asks questions about unrelated sections

---

## Test 3: Recall Mode

**Prompt:** "What do you know about my situation?"

**Pre-requisite:** A profile must exist in forge-suite/data/profile.md

**Expected behavior:**
- [ ] Triggers Mirror in recall mode
- [ ] Reads profile
- [ ] Provides a conversational summary (not just dumping the file)
- [ ] Highlights key dimensions: skills, constraints, passions, financial target
- [ ] Notes any thin or potentially outdated sections
- [ ] Offers to update if anything has changed

**Red flags:**
- Just prints the raw profile file
- Misses key dimensions in the summary
- Doesn't offer to update
