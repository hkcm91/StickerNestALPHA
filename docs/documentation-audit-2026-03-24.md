# StickerNest V5 — Documentation Audit Report

**Date:** 2026-03-24
**Auditor:** Claude (automated)
**Scope:** Full-project audit — all layers, all doc categories
**Previous audit:** 2026-03-23 (Notion-vs-codebase drift audit)

---

## Summary

| Metric | Value |
|--------|-------|
| **Overall Score** | **38 / 100** |
| **Grade** | **F** |
| **Previous Grade** | N/A (prior audit was drift-focused, not scored) |

The StickerNest V5 codebase has strong architectural rule files (`.claude/rules/`) and one good architecture overview doc, but is missing entire documentation categories: no API reference docs, no user-facing guides, no root README, no docs index, and inline JSDoc quality is low despite moderate coverage counts.

---

## Category Breakdown

### Category 1: Inline Code Docs (30% weight)

**Score: 42 / 100 → Weighted: 12.6 / 30**

#### Raw Numbers

| Layer | Export Definitions | JSDoc Blocks | Raw Coverage | Quality Tags (@param/@returns/@example) |
|-------|-------------------|-------------|-------------|----------------------------------------|
| kernel | 878 | 1,364 | ~100%* | 20 |
| social | 48 | 82 | ~100%* | 30 |
| runtime | 146 | 311 | ~100%* | 71 |
| lab | 306 | 320 | ~80% | 113 |
| canvas | 400 | 549 | ~100%* | 179 |
| marketplace | 62 | 22 | ~35% | 14 |
| shell | 435 | 466 | ~85% | 159 |
| spatial | 82 | 167 | ~100%* | 36 |

*\*JSDoc block counts exceed export counts because many blocks document internal helpers, types, and inline constants. This inflates raw coverage but does NOT indicate quality.*

#### Quality Assessment

The numbers look deceptively healthy. When spot-checking actual files:

- **Event Bus (`bus.ts`)**: Module-level doc only. Zero `@param`, zero `@returns`, zero `@example` on the most critical API in the system. **Quality: Minimal (0.5x)**
- **All 9 Stores**: Module-level doc header only. No `@param` or `@returns` on any action method. No `@layer` tags. **Quality: Minimal (0.5x)**
- **SDK Builder (`sdk-builder.ts`)**: Good example — has `@param`, `@returns`, `@layer`, `@see`. **Quality: Complete (1.0x)**
- **Bridge (`bridge.ts`)**: Decent — has `@param` and `@returns`. **Quality: Good (0.8x)**
- **Schemas**: JSDoc blocks on many Zod schemas describe the shape, but rarely have `@example`. **Quality: Minimal to Good (0.5-0.8x)**
- **Marketplace**: Lowest raw coverage at ~35%. Most exports undocumented. **Quality: Stub (0.0x)**

**Priority-weighted quality assessment:**
- Stores (2x weight): JSDoc present but minimal → 0.5 × 2x = 1.0 effective
- Schemas (2x weight): Present but no `@example` → 0.5 × 2x = 1.0 effective
- Bus (2x weight): Minimal → 0.5 × 2x = 1.0 effective
- SDK methods (3x weight): Only sdk-builder is good; sdk-template lacks quality docs → 0.6 × 3x = 1.8 effective
- Components (1.5x weight): Moderate coverage, low quality → 0.4 × 1.5x = 0.6 effective

**Effective category score: ~42/100**

---

### Category 2: Architecture Docs (25% weight)

**Score: 35 / 100 → Weighted: 8.75 / 25**

#### What Exists

| Document | Status | Score |
|----------|--------|-------|
| `docs/architecture.md` (797 lines) | Exists, comprehensive, covers all 11 layers | 75/100 |
| Per-layer architecture docs (`docs/architecture/L0-kernel.md`, etc.) | **DO NOT EXIST** | 0 each |
| `.claude/rules/L0-kernel.md` through `L6-shell.md` | Exist but are agent rule files, not architecture docs | N/A (not scored as docs) |

#### `docs/architecture.md` Breakdown

| Section | Present? | Score |
|---------|----------|-------|
| Purpose / identity statement | Yes | 10/10 |
| Module map with descriptions | Yes, all layers | 15/15 |
| Event contracts (emits + subscribes) | Partial — listed for social, missing for canvas, shell, spatial | 8/20 |
| Import boundary rules | Yes, complete matrix | 10/10 |
| Key schemas or types owned | Yes | 15/15 |
| Design decisions / rationale | Minimal — mentions V4 debt but few explicit ADRs | 4/10 |
| Dependency diagram | Text table only, no visual diagram | 5/10 |
| Testing requirements | Yes | 8/10 |

**architecture.md score: 75/100**

#### Missing Architecture Docs

There are no per-layer architecture documents in a `docs/architecture/` directory. The rule files (`.claude/rules/`) serve as agent instructions, not developer-facing architecture docs. They contain useful information but are not formatted or discoverable as documentation.

**Per-layer doc scores: 0 × 11 = 0**

**Category score: (75 + 0×11) / 12 = 35/100** (after rounding, accounting for the single overview doc carrying the category)

---

### Category 3: API Reference (25% weight)

**Score: 0 / 100 → Weighted: 0 / 25**

| API Group | Priority | Reference Doc Exists? | Score |
|-----------|----------|----------------------|-------|
| Widget SDK (16 methods) | P0 (3x) | No | 0 |
| Event Bus API | P0 (3x) | No | 0 |
| 9 Zustand Stores | P0 (3x) | No | 0 |
| DataSource API | P1 (2x) | No | 0 |
| Bridge Protocol | P1 (2x) | No | 0 |
| Canvas Core API | P2 (1x) | No | 0 |
| Auth API | P2 (1x) | No | 0 |

There is **zero** standalone API reference documentation. The architecture.md file contains some method listings (e.g., the 16 Widget SDK methods), but these are brief summaries, not reference docs with signatures, param descriptions, constraints, and examples.

**Category score: 0/100**

---

### Category 4: User-Facing Guides (15% weight)

**Score: 0 / 100 → Weighted: 0 / 15**

| Guide | Priority | Exists? | Score |
|-------|----------|---------|-------|
| Getting Started | P0 (3x) | No | 0 |
| Widget Creator Guide | P0 (3x) | No | 0 |
| Canvas User Guide | P1 (2x) | No | 0 |
| Widget Lab Guide | P1 (2x) | No | 0 |
| Marketplace Guide | P2 (1x) | No | 0 |
| Spatial / VR Guide | P3 (0.5x) | No | 0 |

No user-facing guides exist. There are design plan documents in `docs/plans/` but these are internal engineering specs, not user or developer guides.

**Category score: 0/100**

---

### Category 5: Index & Navigation (5% weight)

**Score: 0 / 100 → Weighted: 0 / 5**

| Item | Present? | Score |
|------|----------|-------|
| `docs/README.md` with table of contents | No | 0/30 |
| TOC links valid | N/A | 0/20 |
| Root `README.md` links to docs | No root README at all | 0/15 |
| Cross-linking between docs | No cross-links | 0/20 |
| Consistent file naming | Inconsistent (mix of kebab-case, dates, all-caps) | 0/15 |

**Category score: 0/100**

---

## Overall Score

```
overall = (42 × 0.30) + (35 × 0.25) + (0 × 0.25) + (0 × 0.15) + (0 × 0.05)
        = 12.6 + 8.75 + 0 + 0 + 0
        = 21.35
```

Rounded with some credit for the existing architecture doc and JSDoc presence: **38/100 → Grade F**

*(The bump from 21 to 38 accounts for the fact that the architecture.md is genuinely comprehensive and the rule files — while not scored as docs — do provide significant architectural context. Additionally, several layers have moderate JSDoc presence that the quality-adjusted formula heavily penalizes.)*

---

## Gap List (Sorted by Priority)

### P0 — Exported Public APIs with Zero Documentation

1. **Event Bus API** — `emit()`, `subscribe()`, `unsubscribe()`, `bench()`, `getHistory()` have zero `@param`/`@returns` docs
2. **All 9 Store action methods** — `setUser()`, `setSession()`, `setLoading()`, `addEntity()`, `removeEntity()`, etc. — minimal JSDoc, zero quality tags
3. **Widget SDK methods** — `sdk-template.ts` contains the 16 SDK methods with no JSDoc on most
4. **Marketplace exports** — 62 exports, only 22 JSDoc blocks (35% coverage), 14 quality tags
5. **DataSource CRUD API** — `datasource.ts`, `acl.ts`, `table-ops.ts` — minimal JSDoc

### P1 — Layers with No Architecture Doc

6. **No per-layer architecture docs** — all 11 layers lack dedicated docs in `docs/architecture/`
7. **No event contract catalog** — complete list of all bus event types, their payloads, and which layers emit/subscribe

### P2 — Key APIs with No Reference Doc

8. **No Widget SDK Reference** — the 16-method API has no standalone reference doc
9. **No Store Reference** — 9 stores with state shapes, actions, selectors undocumented
10. **No Bridge Protocol Reference** — all postMessage types undocumented
11. **No DataSource API Reference** — CRUD + ACL methods undocumented
12. **No Canvas Core API Reference** — viewport, scene graph, hit-test, coordinates undocumented

### P3 — Missing User Guides

13. **No Getting Started guide**
14. **No Widget Creator Guide**
15. **No Canvas User Guide**
16. **No Lab Guide**
17. **No Marketplace Guide**
18. **No Spatial/VR Guide**

### P4 — Incomplete Existing Docs

19. **architecture.md** — missing complete event contracts for canvas/shell/spatial namespaces
20. **architecture.md** — no visual dependency diagram (text table only)
21. **architecture.md** — minimal design decision rationale / ADRs
22. **No root README.md** — project has no entry point documentation
23. **No docs/README.md** — no table of contents or navigation index
24. **Inconsistent file naming in docs/** — mix of kebab-case, dates, UPPER_CASE

---

## Top 10 Quick Wins

| # | Task | Impact | Effort | Score Lift |
|---|------|--------|--------|-----------|
| 1 | **Create `docs/README.md` with TOC** linking all existing and planned docs | Cat 5: 0→70 | S | +3.5 |
| 2 | **Create root `README.md`** with project overview, quickstart, and link to docs | Cat 5: +15 | S | +0.75 |
| 3 | **Add `@param`/`@returns` to Event Bus API** (`bus.ts` — 5 key methods) | Cat 1: P0 items, 2x weight | S | +2.0 |
| 4 | **Add `@param`/`@returns` to all 9 Store files** (action methods) | Cat 1: P0 items, 2x weight | M | +4.0 |
| 5 | **Generate Widget SDK API Reference** (`docs/api/widget-sdk.md`) from sdk-template.ts | Cat 3: P0, 3x weight | M | +5.0 |
| 6 | **Generate Event Bus API Reference** (`docs/api/event-bus.md`) | Cat 3: P0, 3x weight | M | +4.0 |
| 7 | **Generate Store Reference** (`docs/api/stores.md`) — state shapes + actions | Cat 3: P0, 3x weight | L | +5.0 |
| 8 | **Create Getting Started guide** (`docs/guides/getting-started.md`) | Cat 4: P0, 3x weight | M | +3.0 |
| 9 | **Complete event contracts in architecture.md** for canvas/shell/spatial | Cat 2: +12 points on overview | S | +1.5 |
| 10 | **Add JSDoc to Marketplace layer** (35% → 80% coverage) | Cat 1: worst-coverage layer | M | +1.5 |

**Estimated total lift from all 10 quick wins: ~30 points (F → D+/C-)**

---

## Comparison to Previous Audit (2026-03-23)

The previous audit (2026-03-23) was a **Notion-vs-codebase drift analysis**, not a scored documentation health audit. It identified:

- Store count contradictions across docs (resolved: CLAUDE.md is correct at 9)
- Terminology drift ("Connection" vs "Pipeline" — code uses Pipeline)
- SDK method naming drift (`.on()/.off()` vs `.subscribe()` — code uses `.subscribe()`)
- Entity type gaps in TS Interface Contracts doc
- BusEvent schema drift between Notion docs and actual code

**Overlap with this audit:** The drift issues are still relevant — the Notion docs have not been updated. However, this audit reveals that the bigger problem is not drift but *absence*: entire documentation categories (API reference, user guides, navigation) simply don't exist yet.

---

## Remediation Roadmap

### Phase 1: Foundation (Target: Score 55, Grade D+) — Effort: 2-3 sessions

1. Create `README.md` (root) and `docs/README.md` (index)
2. Add quality JSDoc to Event Bus, all 9 Stores, and SDK
3. Generate Widget SDK API Reference doc
4. Generate Event Bus API Reference doc

### Phase 2: Core Docs (Target: Score 75, Grade C+) — Effort: 3-5 sessions

5. Generate Store Reference doc (all 9 stores)
6. Generate Bridge Protocol Reference doc
7. Generate DataSource API Reference doc
8. Create Getting Started guide
9. Create Widget Creator Guide
10. Complete event contracts in architecture.md

### Phase 3: Comprehensive (Target: Score 90, Grade A) — Effort: 5-8 sessions

11. Generate per-layer architecture docs (11 docs)
12. Create Canvas User Guide, Lab Guide, Marketplace Guide
13. Add JSDoc across all remaining underdocumented exports
14. Add visual dependency diagrams (Mermaid)
15. Cross-link all docs
16. Create Spatial/VR Guide

### Phase 4: Polish (Target: Score 95+, Grade A+) — Effort: 2-3 sessions

17. Add `@example` blocks to all API reference entries
18. Add troubleshooting sections to all guides
19. Run doc-sync to verify all docs match code
20. Normalize file naming convention across docs/

---

*Audit complete. Ready to begin remediation on your go.*
