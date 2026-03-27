/**
 * useOnboarding — manages the spotlight-style first-run tour state.
 *
 * Reads/writes completion status from localStorage so the tour only
 * shows once per browser.
 *
 * @module shell/components/onboarding
 * @layer L6
 */

import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to StickerNest',
    description: 'This is your infinite canvas workspace. Drag, drop, and arrange anything.',
  },
  {
    id: 'toolbar',
    title: 'Your Toolbar',
    description: 'Select tools, shapes, and modes from the toolbar above.',
  },
  {
    id: 'assets',
    title: 'Asset Panel',
    description: 'Find stickers, widgets, and media in the left sidebar.',
  },
  {
    id: 'widgets',
    title: 'Add Widgets',
    description: 'Drag widgets from the asset panel onto your canvas.',
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    description: 'Discover and install community widgets from the marketplace.',
  },
];

const STORAGE_KEY = 'sn-onboarding-complete';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseOnboardingReturn {
  active: boolean;
  currentStep: OnboardingStep | null;
  stepIndex: number;
  totalSteps: number;
  skip: () => void;
  completeStep: () => void;
}

export function useOnboarding(): UseOnboardingReturn {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setActive(true);
  }, []);

  const skip = () => {
    setActive(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const completeStep = () => {
    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      skip();
    }
  };

  return {
    active,
    currentStep: active ? ONBOARDING_STEPS[stepIndex] : null,
    stepIndex,
    totalSteps: ONBOARDING_STEPS.length,
    skip,
    completeStep,
  };
}
