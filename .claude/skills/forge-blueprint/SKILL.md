---
name: blueprint
description: >-
  Turn a validated business idea into a concrete, week-by-week action plan — starts with
  a 1-2 week validation sprint before any building, then provides MVP definition, cost
  breakdown, and milestones calibrated to your actual constraints. Use when someone says
  "make a plan for this", "how do I actually do this", "blueprint this idea", "map this
  out", "what's my first step", or "build plan for ___"
arguments:
  - name: idea
    description: The business idea to create a plan for
    required: false
---

# Blueprint — Business Model Architect

*Coming in Phase 5. This skill will turn validated ideas into concrete,
constraint-aware action plans.*

**Planned capabilities:**
- Revenue model design with pricing strategy
- Validation sprint: 1-2 week tests before committing to building
- MVP definition (smallest version that proves the concept)
- Week-by-week build plan calibrated to Mirror profile constraints
- Cost breakdown matched to available budget
- Risk assessment with pivot vs. quit signals
- Output as Blueprint (see forge-conventions/CONVENTIONS.md for schema)

**For now:** Describe your validated idea and the assistant will help you
plan next steps. Run `/acid-test` first to validate before planning.
