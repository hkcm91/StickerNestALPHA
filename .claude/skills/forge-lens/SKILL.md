---
name: lens
description: >-
  Deep dive into any industry or market to find pain points, gaps, and solo builder
  opportunities — mines Reddit, forums, and review sites for real complaints, scores
  them by frequency and intensity, and maps where money is being spent. Use when someone
  says "explore the ___ industry", "what problems do ___ have", "deep dive into ___",
  "research ___ for opportunities", or "what's broken in ___"
arguments:
  - name: industry
    description: The industry, market, or audience to research
    required: true
---

# Lens — Industry Deep Diver

*Coming in Phase 3. This skill will replace GummySearch/PainOnSocial ($50-79/mo)
with evidence-based industry research powered by web search.*

**Planned capabilities:**
- Multi-phase research: landscape scan → pain point mining → gap analysis → opportunity mapping
- Pain point scoring by frequency × intensity with actual quotes
- Existing solution assessment with gap identification
- Cross-industry analogy scanning for Spark's remix mode
- Output as Industry Brief (see forge-conventions/CONVENTIONS.md for schema)

**For now:** Use `/acid-test` to validate specific ideas, or describe the industry
you want to explore and the assistant will do manual research.
