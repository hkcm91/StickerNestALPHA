/**
 * Semantic Port Matching Engine — scores port compatibility beyond exact strings.
 *
 * Matching hierarchy (highest score wins):
 * 1. Exact match (1.0) — event types identical
 * 2. Normalized match (0.9) — tokens match after case/delimiter normalization
 * 3. Synonym match (0.7) — tokens are synonyms per synonym-table
 * 4. Schema structural match (0.5) — JSON schema key overlap
 * 5. Wildcard (0.3) — target accepts '*'
 * 6. No match (0.0)
 *
 * @module kernel/pipeline
 * @layer L0
 */

import { areSynonyms } from './synonym-table';

// ─── Types ───────────────────────────────────────────────────────────

/** Minimal port shape needed for matching (works with both PipelinePort and scene Port) */
export interface PortLike {
  id: string;
  name: string;
  direction: 'input' | 'output';
  eventType?: string;
  schema?: Record<string, unknown>;
}

/** How two ports matched */
export type MatchType = 'exact' | 'normalized' | 'synonym' | 'schema' | 'wildcard' | 'none';

/** Result of matching two ports */
export interface PortMatchResult {
  score: number;
  matchType: MatchType;
  /** For schema matches: suggested field rename mapping (source key → target key) */
  suggestedMapping?: Record<string, string>;
}

/** A ranked match of a source port against a candidate target */
export interface RankedMatch {
  port: PortLike;
  result: PortMatchResult;
}

/** A node with ports, for bulk connection finding */
export interface NodeWithPorts {
  id: string;
  label: string;
  inputPorts: PortLike[];
  outputPorts: PortLike[];
}

/** A suggested connection between two nodes */
export interface SuggestedConnection {
  sourceNodeId: string;
  sourceNodeLabel: string;
  sourcePortId: string;
  sourcePortName: string;
  targetNodeId: string;
  targetNodeLabel: string;
  targetPortId: string;
  targetPortName: string;
  score: number;
  matchType: MatchType;
  suggestedMapping?: Record<string, string>;
}

// ─── Tokenization ────────────────────────────────────────────────────

/**
 * Tokenizes an event type string into lowercase word tokens.
 *
 * Handles:
 * - Dot notation: "widget.todo.item.created" → ["widget", "todo", "item", "created"]
 * - camelCase: "itemCreated" → ["item", "created"]
 * - kebab-case: "item-created" → ["item", "created"]
 * - snake_case: "item_created" → ["item", "created"]
 * - Mixed: "widget.itemCreated" → ["widget", "item", "created"]
 */
export function tokenize(eventType: string): string[] {
  // Split on dots, hyphens, underscores
  const segments = eventType.split(/[.\-_]+/);
  const tokens: string[] = [];

  for (const segment of segments) {
    if (!segment) continue;
    // Split camelCase: insert boundary before uppercase letters
    const camelSplit = segment.replace(/([a-z])([A-Z])/g, '$1\0$2').split('\0');
    for (const part of camelSplit) {
      const lower = part.toLowerCase();
      if (lower) tokens.push(lower);
    }
  }

  return tokens;
}

/**
 * Strips common prefixes that don't carry semantic meaning for matching.
 * E.g., "widget.todo.item.created" → "todo.item.created"
 */
function stripPrefix(eventType: string): string {
  return eventType.replace(/^widget\./, '');
}

// ─── Core Matching ───────────────────────────────────────────────────

const NO_MATCH: PortMatchResult = { score: 0, matchType: 'none' };

/**
 * Scores compatibility between a source (output) port and a target (input) port.
 *
 * Direction must be correct (source=output, target=input) or score is 0.
 */
export function matchPorts(source: PortLike, target: PortLike): PortMatchResult {
  // Direction check
  if (source.direction !== 'output' || target.direction !== 'input') {
    return NO_MATCH;
  }

  const sourceEvent = source.eventType ?? source.name;
  const targetEvent = target.eventType ?? target.name;

  // 1. Exact match
  if (sourceEvent === targetEvent) {
    return { score: 1.0, matchType: 'exact' };
  }

  // 2. Wildcard
  if (targetEvent === '*') {
    return { score: 0.3, matchType: 'wildcard' };
  }

  // 3. Normalized match — tokenize and compare sets
  const sourceTokens = tokenize(stripPrefix(sourceEvent));
  const targetTokens = tokenize(stripPrefix(targetEvent));

  if (sourceTokens.length > 0 && targetTokens.length > 0) {
    // Exact token set match
    if (tokensEqual(sourceTokens, targetTokens)) {
      return { score: 0.9, matchType: 'normalized' };
    }

    // 4. Synonym match — check if tokens are pairwise synonymous
    const synonymResult = checkSynonymMatch(sourceTokens, targetTokens);
    if (synonymResult.matched) {
      return { score: 0.7, matchType: 'synonym' };
    }
  }

  // 5. Schema structural match
  if (source.schema && target.schema) {
    const schemaResult = matchSchemas(source.schema, target.schema);
    if (schemaResult.score > 0) {
      return schemaResult;
    }
  }

  return NO_MATCH;
}

/**
 * Finds all compatible target ports for a given source port, ranked by score.
 */
export function findCompatiblePorts(
  sourcePort: PortLike,
  candidates: PortLike[],
): RankedMatch[] {
  const results: RankedMatch[] = [];

  for (const candidate of candidates) {
    const result = matchPorts(sourcePort, candidate);
    if (result.score > 0) {
      results.push({ port: candidate, result });
    }
  }

  return results.sort((a, b) => b.result.score - a.result.score);
}

/**
 * Finds all potential connections between a set of nodes.
 * Returns suggestions sorted by score descending.
 */
export function findAllConnections(
  nodes: NodeWithPorts[],
  minScore = 0.3,
): SuggestedConnection[] {
  const suggestions: SuggestedConnection[] = [];

  for (const sourceNode of nodes) {
    for (const sourcePort of sourceNode.outputPorts) {
      for (const targetNode of nodes) {
        if (targetNode.id === sourceNode.id) continue; // No self-connections

        for (const targetPort of targetNode.inputPorts) {
          const result = matchPorts(sourcePort, targetPort);
          if (result.score >= minScore) {
            suggestions.push({
              sourceNodeId: sourceNode.id,
              sourceNodeLabel: sourceNode.label,
              sourcePortId: sourcePort.id,
              sourcePortName: sourcePort.name,
              targetNodeId: targetNode.id,
              targetNodeLabel: targetNode.label,
              targetPortId: targetPort.id,
              targetPortName: targetPort.name,
              score: result.score,
              matchType: result.matchType,
              suggestedMapping: result.suggestedMapping,
            });
          }
        }
      }
    }
  }

  return suggestions.sort((a, b) => b.score - a.score);
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Check if two token arrays contain the same tokens (order-independent) */
function tokensEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((token, i) => token === sortedB[i]);
}

/** Check if tokens are synonymous (meaningful tokens match via synonym table) */
function checkSynonymMatch(
  sourceTokens: string[],
  targetTokens: string[],
): { matched: boolean } {
  // We need at least some overlap in meaningful tokens.
  // Strategy: for each target token, find a synonym in source tokens.
  // If all target tokens have a synonym match, it's a synonym match.
  if (sourceTokens.length === 0 || targetTokens.length === 0) {
    return { matched: false };
  }

  const usedSource = new Set<number>();
  let matchedCount = 0;

  for (const targetToken of targetTokens) {
    for (let i = 0; i < sourceTokens.length; i++) {
      if (usedSource.has(i)) continue;
      if (areSynonyms(sourceTokens[i], targetToken)) {
        usedSource.add(i);
        matchedCount++;
        break;
      }
    }
  }

  // Require that the majority of tokens match (at least half of the shorter list)
  const minLen = Math.min(sourceTokens.length, targetTokens.length);
  return { matched: matchedCount >= minLen && matchedCount > 0 };
}

/** Compare two JSON schemas structurally by key overlap */
function matchSchemas(
  sourceSchema: Record<string, unknown>,
  targetSchema: Record<string, unknown>,
): PortMatchResult {
  const sourceKeys = Object.keys(sourceSchema);
  const targetKeys = Object.keys(targetSchema);

  if (sourceKeys.length === 0 || targetKeys.length === 0) {
    return NO_MATCH;
  }

  // Find direct key matches
  const directMatches: Record<string, string> = {};
  const unmatchedSource: string[] = [];

  for (const sk of sourceKeys) {
    if (targetKeys.includes(sk)) {
      directMatches[sk] = sk;
    } else {
      unmatchedSource.push(sk);
    }
  }

  // Try synonym matching for unmatched keys
  const synonymMatches: Record<string, string> = {};
  const unmatchedTarget = targetKeys.filter((tk) => !directMatches[tk] && !Object.values(directMatches).includes(tk));

  for (const sk of unmatchedSource) {
    const skTokens = tokenize(sk);
    for (const tk of unmatchedTarget) {
      if (synonymMatches[sk]) break;
      const tkTokens = tokenize(tk);
      // Check if any token pair are synonyms
      for (const st of skTokens) {
        for (const tt of tkTokens) {
          if (areSynonyms(st, tt)) {
            synonymMatches[sk] = tk;
            break;
          }
        }
        if (synonymMatches[sk]) break;
      }
    }
  }

  const totalMatched = Object.keys(directMatches).length + Object.keys(synonymMatches).length;
  const coverage = totalMatched / Math.max(sourceKeys.length, targetKeys.length);

  if (coverage >= 0.5) {
    const suggestedMapping: Record<string, string> = { ...directMatches, ...synonymMatches };
    return {
      score: 0.5,
      matchType: 'schema',
      suggestedMapping,
    };
  }

  return NO_MATCH;
}
