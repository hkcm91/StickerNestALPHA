# src/content/

Centralized user-facing content for the StickerNest application.

All in-app copy — onboarding steps, tooltip text, empty states, error messages, and
upgrade prompts — lives here instead of being hardcoded in component files. This
makes content easy to review, update, and eventually localize.

## Structure

- `onboarding.ts` — First-run walkthrough steps and welcome content
- `tooltips.ts` — Contextual tooltip text for UI elements
- `empty-states.ts` — Messages shown when a list, panel, or view has no content
- `errors.ts` — User-facing error messages and recovery guidance
- `upgrades.ts` — Tier-gating prompts and upgrade CTAs

## Usage

Import content from this directory in your components:

```ts
import { ONBOARDING_STEPS } from '@/content/onboarding';
import { TOOLTIPS } from '@/content/tooltips';
import { EMPTY_STATES } from '@/content/empty-states';
import { ERROR_MESSAGES } from '@/content/errors';
import { UPGRADE_PROMPTS } from '@/content/upgrades';
```

## Guidelines

- Keep copy concise and conversational — talk to users like a helpful friend, not a manual
- Use sentence case for headings and labels
- Avoid jargon: say "interactive app" not "sandboxed iframe widget"
- Action-oriented: tell users what they can do, not what they can't
- Error messages should explain what happened AND what to do next
