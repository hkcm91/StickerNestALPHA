/**
 * Voice Command Parser — Extracts intent from voice transcripts.
 *
 * Simple keyword-based matching (fast, offline-capable).
 * No AI classification needed for command routing.
 *
 * @module lab/ai
 * @layer L2
 */

export type VoiceIntent = 'generate' | 'edit' | 'explain' | 'preview' | 'save';

export interface VoiceCommand {
  intent: VoiceIntent;
  text: string;
}

const INTENT_PATTERNS: Array<{ intent: VoiceIntent; patterns: RegExp[] }> = [
  {
    intent: 'preview',
    patterns: [/\bpreview\b/i, /\brun\b/i, /\btest\s*it\b/i, /\bshow\s*me\b/i],
  },
  {
    intent: 'save',
    patterns: [/\bsave\b/i, /\bsave\s*version\b/i, /\bsnapshot\b/i],
  },
  {
    intent: 'explain',
    patterns: [/\bexplain\b/i, /\bwhat\s+does\b/i, /\bhow\s+does\b/i, /\bdescribe\b/i],
  },
  {
    intent: 'edit',
    patterns: [
      /\bedit\b/i, /\bchange\b/i, /\bmodify\b/i, /\bupdate\b/i,
      /\breplace\b/i, /\bset\s+the\b/i, /\bmake\s+the\b/i, /\bmake\s+it\b/i,
    ],
  },
  {
    intent: 'generate',
    patterns: [
      /\bgenerate\b/i, /\bcreate\b/i, /\bbuild\b/i, /\bmake\s+a\b/i,
      /\bmake\s+an?\b/i, /\bnew\s+widget\b/i,
    ],
  },
];

/**
 * Parse a voice transcript into a structured command.
 *
 * Falls back to 'generate' intent if no specific pattern matches,
 * since unprompted speech is most likely a creation request.
 */
export function parseVoiceCommand(transcript: string): VoiceCommand {
  const trimmed = transcript.trim();

  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(trimmed))) {
      return { intent, text: trimmed };
    }
  }

  // Default to generate for unrecognized speech
  return { intent: 'generate', text: trimmed };
}
