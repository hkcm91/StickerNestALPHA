# Acid Test — Eval Test Prompts

Run these prompts to test the Acid Test skill. Check the criteria after each run.

---

## Test 1: Expected NO-GO

**Prompt:** "Would a mood board website with affiliate links work for me?"

**Expected behavior:**
- [ ] Triggers the Acid Test skill
- [ ] Reads CONVENTIONS.md for Verdict schema
- [ ] Checks for Mirror profile
- [ ] Runs 5+ web searches for evidence
- [ ] Finds Pinterest as dominant competitor
- [ ] Calculates affiliate commission math (shows it doesn't scale)
- [ ] Delivers a clear NO-GO verdict (not hedged to "maybe")
- [ ] Explains WHY with specific evidence (not vibes)
- [ ] Suggests alternative directions
- [ ] Saves verdict to forge-suite/data/

**Red flags:**
- Gives a CONDITIONAL instead of NO-GO (hedging)
- Doesn't do web searches (generates from training data)
- Sugar-coats the verdict to avoid hurting feelings
- Gives generic advice instead of evidence-specific reasoning

---

## Test 2: Saturation Assessment

**Prompt:** "Should I sell Notion templates on Gumroad?"

**Expected behavior:**
- [ ] Runs web searches to assess Notion template market
- [ ] Finds evidence of market saturation (thousands of templates)
- [ ] Distinguishes between "generic templates" (saturated) and "niche templates" (open)
- [ ] Asks what niche or audience before giving a definitive verdict
- [ ] If niche specified: gives a targeted assessment
- [ ] Payment validation should be strong (proven market)
- [ ] Competition assessment should note both saturation AND opportunities

**Red flags:**
- Blanket NO-GO without acknowledging the niche angle
- Blanket GO without acknowledging saturation in generic templates
- Doesn't search — just says "it's competitive"

---

## Test 3: Client Acquisition Problem

**Prompt:** "Is building landing pages for local businesses viable?"

**Expected behavior:**
- [ ] Finds strong demand evidence (local businesses need web presence)
- [ ] Finds strong payment evidence (existing services charge $500-2K+)
- [ ] Identifies the core challenge: client acquisition
- [ ] Checks Mirror profile anti-skills for sales/client conflicts
- [ ] If profile has "no sales calls" → flags this as a critical constraint
- [ ] Likely verdict: CONDITIONAL (viable IF you can acquire clients without cold outreach)
- [ ] Suggests specific test for the condition

**Red flags:**
- Gives GO without addressing client acquisition
- Ignores anti-skill conflicts with the business model
- Doesn't distinguish between "product is viable" and "viable FOR YOU"

---

## Test 4: Without Mirror Profile

**Prompt:** "What about a micro-SaaS tool for managing gym class schedules?"

**Pre-requisite:** No profile.md exists (delete or rename it)

**Expected behavior:**
- [ ] Notes that no Mirror profile was found
- [ ] Asks 4 inline fallback questions (skills, time, budget, deal-breakers)
- [ ] Proceeds with validation using abbreviated answers
- [ ] Runs competitive research searches
- [ ] Delivers verdict based on evidence
- [ ] Skips detailed personal fit scoring (notes it wasn't available)
- [ ] Recommends running /mirror for better future assessments

**Red flags:**
- Runs full Mirror interview instead of 4 quick questions
- Skips personal context entirely
- Doesn't mention that /mirror would improve results
