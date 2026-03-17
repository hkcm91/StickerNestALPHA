---
name: spark
description: >-
  Generate personalized business ideas using constraint-based creativity and cross-industry
  analogies — reads your Mirror profile and optional Lens briefs to produce ideas that fit
  your specific skills, budget, time, and passions. Use when someone says "give me business
  ideas", "what should I build", "brainstorm ideas for me", "I'm interested in ___ what
  could I do", "remix this idea", or "I noticed a problem with ___"
arguments:
  - name: mode
    description: "broad (default), focused (with industry), remix (adapt existing model), problem (solve a specific problem)"
    required: false
    default: broad
  - name: context
    description: "Industry name (for focused mode), business model (for remix), or problem description (for problem mode)"
    required: false
---

# Spark — Idea Generator

*Coming in Phase 4. This skill will use real creativity methodology — Systematic
Inventive Thinking (SIT) and Cross-Industry Innovation (CII) — to generate
personalized business ideas.*

**Planned capabilities:**
- Four modes: broad exploration, focused (industry-specific), remix (cross-industry analogy), problem-first
- Constraint-based creativity using the Closed World Principle
- Ikigai alignment scoring against Mirror profile
- Idea diversity enforcement (no 5 variations of the same thing)
- Output as Idea Cards (see forge-conventions/CONVENTIONS.md for schema)

**For now:** Describe what you're looking for and the assistant will brainstorm
with you. Run `/mirror` first for better personalization.
