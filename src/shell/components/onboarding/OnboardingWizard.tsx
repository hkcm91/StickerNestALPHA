/**
 * OnboardingWizard — spotlight-style floating tooltip overlay for first-run tour.
 *
 * Renders as a fixed-position card that does not block interaction with
 * the rest of the page. Progresses through steps and allows skipping.
 *
 * @module shell/components/onboarding
 * @layer L6
 */

import React from 'react';

import { themeVar } from '../../theme/theme-vars';
import type { OnboardingStep } from './useOnboarding';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingWizardProps {
  active: boolean;
  currentStep: OnboardingStep | null;
  stepIndex: number;
  totalSteps: number;
  onSkip: () => void;
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  active,
  currentStep,
  stepIndex,
  totalSteps,
  onSkip,
  onComplete,
}) => {
  if (!active || !currentStep) return null;

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const cardStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '32px',
    right: '32px',
    zIndex: 9000,
    width: '320px',
    background: themeVar('--sn-surface-raised'),
    border: `1px solid ${themeVar('--sn-border')}`,
    borderRadius: themeVar('--sn-radius'),
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18)',
    fontFamily: themeVar('--sn-font-family'),
    color: themeVar('--sn-text'),
    overflow: 'hidden',
    // Does not intercept pointer events on the canvas beneath it
    pointerEvents: 'auto',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px 0',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    margin: 0,
  };

  const stepCounterStyle: React.CSSProperties = {
    fontSize: '12px',
    color: themeVar('--sn-text-muted'),
    whiteSpace: 'nowrap',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '13px',
    color: themeVar('--sn-text-muted'),
    lineHeight: 1.55,
    padding: '10px 16px 14px',
    margin: 0,
  };

  const progressBarContainerStyle: React.CSSProperties = {
    height: '3px',
    background: themeVar('--sn-border'),
    marginBottom: '0',
  };

  const progressBarFillStyle: React.CSSProperties = {
    height: '100%',
    background: themeVar('--sn-accent'),
    width: `${((stepIndex + 1) / totalSteps) * 100}%`,
    transition: 'width 0.25s ease',
    borderRadius: '0 2px 2px 0',
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderTop: `1px solid ${themeVar('--sn-border')}`,
  };

  const skipBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: '4px 0',
    cursor: 'pointer',
    color: themeVar('--sn-text-muted'),
    fontSize: '12px',
    fontFamily: 'inherit',
    textDecoration: 'underline',
  };

  const gotItBtnStyle: React.CSSProperties = {
    padding: '6px 18px',
    border: 'none',
    borderRadius: themeVar('--sn-radius'),
    background: themeVar('--sn-accent'),
    color: '#fff',
    fontSize: '13px',
    fontFamily: 'inherit',
    fontWeight: 500,
    cursor: 'pointer',
  };

  const isLastStep = stepIndex === totalSteps - 1;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={cardStyle} role="dialog" aria-modal="false" aria-label="Onboarding tour" data-testid="onboarding-wizard">
      {/* Progress bar */}
      <div style={progressBarContainerStyle}>
        <div style={progressBarFillStyle} />
      </div>

      {/* Header: title + step counter */}
      <div style={headerStyle}>
        <h3 style={titleStyle} data-testid="onboarding-title">
          {currentStep.title}
        </h3>
        <span style={stepCounterStyle} data-testid="onboarding-counter">
          Step {stepIndex + 1} of {totalSteps}
        </span>
      </div>

      {/* Description */}
      <p style={descriptionStyle} data-testid="onboarding-description">
        {currentStep.description}
      </p>

      {/* Footer: skip + got it */}
      <div style={footerStyle}>
        <button
          type="button"
          onClick={onSkip}
          style={skipBtnStyle}
          data-testid="onboarding-skip"
        >
          Skip tour
        </button>
        <button
          type="button"
          onClick={onComplete}
          style={gotItBtnStyle}
          data-testid="onboarding-got-it"
        >
          {isLastStep ? 'Done' : 'Got it'}
        </button>
      </div>
    </div>
  );
};
