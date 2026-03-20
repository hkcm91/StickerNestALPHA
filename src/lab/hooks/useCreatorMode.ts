/**
 * useCreatorMode — State hook for Creator Mode layout behavior.
 *
 * Manages:
 * - Whether Creator Mode is active (preview-primary layout)
 * - Onboarding overlay visibility (first-time, no active widget)
 * - Graph/code panel collapsed state
 *
 * @module lab/hooks
 * @layer L2
 */

import { useCallback, useState } from 'react';

export interface CreatorModeState {
  /** Whether Creator Mode (preview-primary layout) is active */
  isCreatorMode: boolean;
  /** Whether the onboarding overlay should be shown */
  showOnboarding: boolean;
  /** Whether the graph/code panel is collapsed (preview fills 100%) */
  graphCollapsed: boolean;

  /** Enable or disable Creator Mode */
  setCreatorMode: (enabled: boolean) => void;
  /** Dismiss the onboarding overlay */
  dismissOnboarding: () => void;
  /** Toggle graph/code panel collapsed state */
  toggleGraphCollapsed: () => void;
  /** Set graph/code panel collapsed state explicitly */
  setGraphCollapsed: (collapsed: boolean) => void;
}

export function useCreatorMode(hasActiveWidget: boolean): CreatorModeState {
  const [isCreatorMode, setCreatorMode] = useState(true);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [graphCollapsed, setGraphCollapsed] = useState(false);

  const showOnboarding = isCreatorMode && !hasActiveWidget && !onboardingDismissed;

  const dismissOnboarding = useCallback(() => {
    setOnboardingDismissed(true);
  }, []);

  const toggleGraphCollapsed = useCallback(() => {
    setGraphCollapsed((prev) => !prev);
  }, []);

  return {
    isCreatorMode,
    showOnboarding,
    graphCollapsed,
    setCreatorMode,
    dismissOnboarding,
    toggleGraphCollapsed,
    setGraphCollapsed,
  };
}
