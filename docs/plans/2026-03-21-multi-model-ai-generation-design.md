# Multi-Model AI Widget Generation — Design

**Date:** 2026-03-21
**Status:** Approved
**Approach:** Separate edge function (Approach B)

## Overview

Add multi-model support to the Widget Lab's AI code generator. Users can switch between Anthropic Claude and Replicate-hosted LLMs (Kimi K2, Llama 4 Maverick, Qwen 3) for generating widget HTML. API keys are managed via the existing BYOK infrastructure in Settings > Integrations.

## Providers

- **Anthropic** (default): Claude Sonnet 4 via `api.anthropic.com/v1/messages`
- **Replicate**: Kimi K2, Llama 4 Maverick, Qwen 3 via `api.replicate.com/v1/models/{model}/predictions` with polling

## Architecture

### 1. Model Registry (`src/lab/ai/models.ts`)

Static list of `AIModel` objects with id, name, provider, replicateModel path, description. Default model stored in `localStorage` as `sn:lab:ai-model`.

### 2. Edge Function (`supabase/functions/ai-widget-generate/`)

- Auth via JWT
- Looks up user's API key for the specified provider
- Routes to Anthropic or Replicate API with widget-generation system prompt
- Returns `{ success, html }` or `{ success: false, error, code }`

### 3. Client Changes

- `ai-generator.ts`: Refactored to call Supabase edge function with model selection
- `PromptBar.tsx`: Model selector dropdown (glassmorphism styled)
- `useLabState.ts`: Updated to use new generator factory
- No new settings UI — existing IntegrationsSection handles BYOK keys

## Security

- No API keys in client code
- Edge function decrypts keys server-side only
- Same BYOK encryption as existing `ai-generate` function
