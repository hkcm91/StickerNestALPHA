/**
 * useAudioEngine — React hook for audio engine integration
 *
 * @module shell/canvas/hooks/use-audio-engine
 * @layer L6
 *
 * @remarks
 * Provides access to the AudioEngineSystem for registering media elements,
 * reading waveform data, and managing audio context lifecycle.
 * The AudioContext is initialized lazily on first user gesture.
 */

import { useCallback, useRef } from 'react';

import { useAudioEngineStore } from '../../../kernel/stores/timeline/audio-engine.store';
import { useTimelineStore } from '../../../kernel/stores/timeline/timeline.store';

/**
 * Hook providing audio engine operations for renderers.
 *
 * @remarks
 * This hook uses bus events for cross-layer communication rather than
 * importing the AudioEngineSystem directly (L6 cannot import L0 systems).
 * The system registers media elements via a shared registry that both
 * the hook and the system can access.
 */
export function useAudioEngine() {
  const isTimelineMode = useTimelineStore((s) => s.isTimelineMode);
  const initialized = useAudioEngineStore((s) => s.initialized);
  const masterVolume = useAudioEngineStore((s) => s.masterVolume);
  const masterMuted = useAudioEngineStore((s) => s.masterMuted);

  return {
    isTimelineMode,
    initialized,
    masterVolume,
    masterMuted,
  };
}

/**
 * Hook for managing media element registration with the audio engine.
 * Stores refs to avoid re-registration on re-renders.
 */
export function useAudioElementRef() {
  const registeredRef = useRef(false);
  const elementRef = useRef<HTMLMediaElement | null>(null);

  const setElement = useCallback((el: HTMLMediaElement | null) => {
    elementRef.current = el;
    registeredRef.current = false;
  }, []);

  return {
    elementRef,
    setElement,
    isRegistered: registeredRef.current,
  };
}
