# Agent Ensemble Trading — Architecture

**Status:** Strategy / Spec
**Date:** 2026-04-29
**Scope:** Personal use first. Productization later.

## Goal

A team of AI agents on the StickerNest canvas, each making independent betting decisions on live MCP-connected markets (Kalshi, Gemini, Polymarket data, etc.) using different reasoning styles. Track performance per agent over time. Cheap to run. Sustainable to scale. Substrate-native.

## The hard constraint

Always-on LLM loops are economically unviable. A naive "agent thinks every minute" architecture costs $50-200/day and burns capital faster than the agents can earn it.

The architecture must:
- Run 24/7 without my computer being on
- Not bombard Claude Routines with always-on polling
- Use deterministic widgets + cheap classifiers as the always-on layer
- Reserve expensive LLM reasoning for actual decisions
- Degrade gracefully when local infrastructure is down

## Three-tier architecture

### Tier 1: Deterministic widgets (always-on, free)

Plain TypeScript in the widget runtime. No AI. Subscribed to market data via the event bus.

Examples:
- Threshold widget: emits `threshold_crossed` when price moves N%
- Spread widget: emits `divergence_alert` when Kalshi/Polymarket spread > N bps
- Volume widget: emits `volume_spike` on Z-stddev volume above rolling avg
- Time tick: emits `tick` every N minutes
- Thesis-condition widget: emits `thesis_violated` when a written assumption no longer holds

These run inside StickerNest. Cost is infrastructure-only (already paid). Filter ~95% of market noise here.

### Tier 2: Local always-on classifier (cheap judgment)

A small local model (Ollama, 7B-13B) running on the home machine, with cloud fallback (Haiku, Gemini Flash) when local is offline.

Job: **filtering, not deciding.** Reads text data Tier 1 can't:
- "Is this news headline relevant to a market we're watching?"
- "Does this contradict any open thesis?"
- "Is this signal or noise?"

Output: structured event to bus, optionally tagged `requires_reasoning: true`.

Cost: free locally, pennies per call in cloud fallback.

### Tier 3: Claude Routines (expensive, big decisions only)

Claude Routines fire only when:
1. A Tier 1 event is tagged `wake_agent` (e.g., open position thesis violated)
2. Tier 2 flags something as decision-worthy
3. Scheduled regular check-in (e.g., once daily review of open positions)

The Routine wakes via webhook, reads canvas state via StickerNest MCP, reasons, acts via execution MCP (Gemini, Kalshi), writes back to the canvas, sleeps.

Cost: ~5-30 wakes per agent per day. Across 5 agents, ~50-150 LLM calls/day. Bounded by signal, not time.

## Component map

```
┌─────────────────────────────────────────────────────────────┐
│                    StickerNest Canvas                       │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Tier 1:     │  │  Agent       │  │  Performance │       │
│  │  Watcher     │──│  Widget      │──│  Ledger      │       │
│  │  Widgets     │  │  (state)     │  │  Widget      │       │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘       │
│         │                 │                                 │
│         │ events          │ thesis/charter                  │
│         ▼                 ▼                                 │
│  ┌─────────────────────────────────────────────────┐        │
│  │             Event Bus (typed pub/sub)           │        │
│  └─────────────────────────────────────────────────┘        │
│         │                 │                                 │
└─────────┼─────────────────┼─────────────────────────────────┘
          │                 │
          ▼                 ▼
┌──────────────────┐  ┌──────────────────────────────┐
│  Tier 2:         │  │  StickerNest MCP Server      │
│  Local           │  │  (canvas state, pipelines)   │
│  Classifier      │  └──────────┬───────────────────┘
│  (Ollama)        │             │
└──────────────────┘             │ called by
                                 ▼
                    ┌──────────────────────────────┐
                    │  Tier 3: Claude Routine      │
                    │  (per-agent, webhook/sched)  │
                    └──────────┬───────────────────┘
                               │
                               ▼
                    ┌──────────────────────────────┐
                    │  Execution MCPs              │
                    │  - Gemini Agentic Trading    │
                    │  - Kalshi API                │
                    │  - Polymarket (read-only)    │
                    └──────────────────────────────┘
```

## Agent personas (initial set)

Five agents, each with distinct reasoning style. Each is a Routine + canvas widget + performance ledger.

1. **Contrarian** — fades crowded sentiment when conviction is moderate
2. **Momentum** — rides confirmed trends with volume support
3. **Mean-Reversion** — bets snapback after sharp moves with no fundamental cause
4. **News/Event** — bets on identified catalysts; webhook-triggered, not scheduled
5. **Cross-Market Arb** — bets on Kalshi/Polymarket divergence on equivalent questions

Each has a charter widget (editable plain-English description), a bankroll, a thesis log, and a performance ledger.

## StickerNest MCP surface (called by Routines)

### Read tools
- `get_canvas_state(filter)` — return relevant widgets and state
- `get_thesis(agent_id, market_id)` — current thesis for a position
- `get_performance(agent_id)` — running P&L, win rate, calibration metrics
- `get_pending_events(agent_id)` — queue of events waiting for reasoning
- `fetch_kalshi_markets(filter)` — live odds via Kalshi API
- `fetch_polymarket_markets(filter)` — read-only Polymarket data
- `compute_divergence(market_pair)` — math, no LLM
- `get_news_relevant(agent_id, hours)` — recent news classified as relevant by Tier 2

### Write tools
- `update_thesis(agent_id, market_id, new_thesis, reasoning)`
- `place_paper_bet(agent_id, market, side, size, reasoning, idempotency_key)`
- `place_live_bet(agent_id, market, side, size, reasoning, idempotency_key)`
- `emit_canvas_event(event)` — for the Routine to write back to the canvas
- `retire_agent(agent_id, reason)` — disable an underperforming agent

All write tools are idempotent via key. Hard caps enforced at the pipeline level, not Routine level.

## Performance metrics tracked per agent

- **Hit rate** — % of bets that won
- **Asymmetry** — avg win size vs avg loss size
- **Sharpe-ish** — return / stddev of returns
- **Max drawdown** — worst peak-to-trough loss
- **Calibration** — when agent says "high conviction," does it actually win more often?
- **Streak length** — both win and loss streaks
- **Bet sizing discipline** — did it follow its own size rules?

Calibration is the most important. An agent that's *correctly uncertain* is more valuable than one that's confidently wrong.

## Risk architecture

- **Per-agent bankroll cap.** Hard-coded at pipeline level. Cannot be exceeded regardless of agent reasoning.
- **Aggregate exposure widget.** Sums across all agents, warns/blocks at total > X%.
- **Correlation guard.** If N agents all open positions in correlated markets, meta-widget flags it.
- **Kill switch.** Single button. Closes everything, all agents, immediately.
- **Paper-first mandate.** Each agent runs paper for 30 days or 50 bets minimum before any live capital.
- **Idempotency keys** on all execution tool calls.

## Graceful degradation

| Local up | Cloud Tier 2 up | Routines up | Behavior |
|----------|-----------------|-------------|----------|
| ✓ | ✓ | ✓ | Normal operation |
| ✗ | ✓ | ✓ | Tier 2 fails over to cloud, slightly higher cost |
| ✗ | ✗ | ✓ | Tier 1 keeps watching, events queue, Routine processes queue on next scheduled wake |
| ✗ | ✗ | ✗ | Events accumulate. Manual review on resume. No execution. |

System is designed so nothing is single-point-of-failure for execution. Worst case is delayed reasoning, never wrong execution.

## Token economics

| Tier | Frequency | Cost/event | Daily cost |
|------|-----------|------------|------------|
| Tier 1 | Continuous | $0 | $0 |
| Tier 2 (local) | ~1000s of events | $0 | $0 |
| Tier 2 (cloud fallback) | ~1000s of events | $0.0001 | ~$0.10 |
| Tier 3 (Routine, Sonnet) | ~50-150/day | $0.05-0.15 | $2-25 |
| Tier 3 escalation (Opus) | ~5/week | $0.50-2 | $0.50-1.50 avg |

Total: bounded $2-30/day depending on activity. Throttle by adjusting Tier 1 thresholds and Routine schedules.

## Phased rollout

### Phase 0 — Substrate (already done)
- Event bus, slug addressing, widget sandboxing, MCP server scaffolding

### Phase 1 — One agent, one market, paper only
- Build agent widget primitive
- Build Kalshi data widget (Tier 1)
- Build thesis widget
- Build performance ledger widget
- Wire one Routine to one agent
- Run paper for 30 days on one Kalshi market
- Validate: did the Routine wake at the right times? Did the thesis tracking work?

### Phase 2 — Five agents, paper
- Add four more agent personas
- Add Tier 2 classifier (local Ollama + cloud fallback)
- Add cross-market data sources (Polymarket read, news)
- Add leaderboard meta-widget
- Run paper for 30 days, all five agents

### Phase 3 — Live, tiny
- Fund Kalshi with $100-200
- Allocate $20-40 per agent
- Live for 30 days
- Validate paper-to-live performance translation

### Phase 4 — Scale what proves itself
- Only agents that earned trust get more capital
- Retire or paper-only the underperformers
- Fork winners with mutations (charter v2, stricter rules, etc.)
- Add Gemini crypto execution if Kalshi proves the model

## Open questions / unresolved

- **Webhook reliability.** Routines triggered by webhook need a public endpoint. StickerNest backend or Cloudflare Worker as receiver?
- **Tier 2 training data.** Off-the-shelf classifier will mis-flag. Plan for labeling loop: every Tier 3 wake that turns out to be noise is a negative example.
- **Routine state retrieval latency.** Every wake reads canvas state via MCP. Need snappy endpoints that return *just what the agent needs*, not the whole canvas.
- **Idempotency window.** How long does an idempotency key stay valid? Need to think through retry semantics for execution tools.

## Why this is uniquely possible on StickerNest

This architecture is structurally impossible without:
1. A spatial canvas where widgets are programs (not Notion/Slack/etc.)
2. A typed event bus connecting all widgets
3. Slug-based addressing for Routine state retrieval
4. MCP at both ends (canvas as MCP server + canvas consuming MCP servers)
5. Sandboxed widget execution for security

Existing trading products have one or two of these. None have all five composed. That's the structural moat.

## Productization notes (later)

The personal-use system is the R&D. Every agent persona, every Tier 1 widget, every pipeline tool is a candidate to ship as part of the StickerNest trading vertical when the time is right. Don't build for users yet. Build for self, prove the loop, then productize.

---

*This doc is a living spec. Update as the architecture proves out.*
