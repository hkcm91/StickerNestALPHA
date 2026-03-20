/**
 * LabPublish — Publish pipeline wizard with 4-step indicator.
 *
 * Steps: Validate → Test → Thumbnail → Submit
 * Each step shows status with glow indicator:
 * - Pending: dim
 * - Active: pulsing storm glow
 * - Complete: steady moss glow
 * - Failed: ember glow
 *
 * @module lab/components
 * @layer L2
 */

import React, { useCallback, useState } from 'react';

import type { PublishPipeline, PipelineStep } from '../publish/pipeline';

import { labPalette, SPRING } from './shared/palette';

// ═══════════════════════════════════════════════════════════════════
// Step Config
// ═══════════════════════════════════════════════════════════════════

interface StepInfo {
  key: PipelineStep;
  label: string;
  description: string;
}

const STEPS: StepInfo[] = [
  { key: 'validating', label: 'Validate', description: 'Check widget structure and SDK calls' },
  { key: 'testing', label: 'Test', description: 'Run in headless sandbox, verify READY signal' },
  { key: 'thumbnail', label: 'Thumbnail', description: 'Generate preview screenshot' },
  { key: 'submitting', label: 'Submit', description: 'Send to Marketplace API' },
];

type StepState = 'pending' | 'active' | 'complete' | 'failed';

function getStepState(stepKey: PipelineStep, currentStep: PipelineStep): StepState {
  const stepOrder: PipelineStep[] = ['validating', 'testing', 'thumbnail', 'submitting'];
  const stepIdx = stepOrder.indexOf(stepKey);
  const currentIdx = stepOrder.indexOf(currentStep);

  if (currentStep === 'done') return 'complete';
  if (currentStep === 'failed') {
    if (stepIdx < currentIdx) return 'complete';
    if (stepIdx === currentIdx) return 'failed';
    return 'pending';
  }
  if (currentStep === 'idle') return 'pending';

  if (stepIdx < currentIdx) return 'complete';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

function getStepColor(state: StepState): { dot: string; glow: string } {
  switch (state) {
    case 'active': return { dot: '#4E7B8E', glow: 'rgba(78,123,142,0.4)' };
    case 'complete': return { dot: '#5AA878', glow: 'rgba(90,168,120,0.3)' };
    case 'failed': return { dot: '#E8806C', glow: 'rgba(232,128,108,0.4)' };
    default: return { dot: 'rgba(255,255,255,0.15)', glow: 'transparent' };
  }
}

// ═══════════════════════════════════════════════════════════════════
// Step Dot Component
// ═══════════════════════════════════════════════════════════════════

const StepDot: React.FC<{ state: StepState; label: string; description: string }> = ({
  state, label, description,
}) => {
  const colors = getStepColor(state);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0',
    }}>
      {/* Dot */}
      <div style={{
        width: 12, height: 12, borderRadius: '50%',
        background: colors.dot,
        boxShadow: `0 0 8px ${colors.glow}`,
        flexShrink: 0,
        animation: state === 'active' ? 'sn-glow-pulse 2s ease-in-out infinite' : undefined,
        transition: `all 400ms ${SPRING}`,
      }} />

      {/* Label + description */}
      <div>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: state === 'pending' ? labPalette.textMuted : labPalette.text,
          fontFamily: 'var(--sn-font-family)',
          transition: `color 300ms`,
        }}>
          {label}
          {state === 'complete' && (
            <span style={{ marginLeft: 6, fontSize: 10, color: labPalette.moss }}>
              Done
            </span>
          )}
          {state === 'failed' && (
            <span style={{ marginLeft: 6, fontSize: 10, color: labPalette.ember }}>
              Failed
            </span>
          )}
        </div>
        <div style={{
          fontSize: 10, color: labPalette.textMuted,
          fontFamily: 'var(--sn-font-family)',
          lineHeight: 1.5,
        }}>
          {description}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Connecting Line
// ═══════════════════════════════════════════════════════════════════

const StepLine: React.FC<{ active: boolean }> = ({ active }) => (
  <div style={{
    width: 2, height: 16, marginLeft: 5,
    background: active ? 'rgba(78,123,142,0.3)' : 'rgba(255,255,255,0.06)',
    transition: `background 300ms`,
  }} />
);

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface LabPublishProps {
  pipeline: PublishPipeline;
  currentHtml?: string;
  currentManifest?: any;
  authorId?: string;
  onClose?: () => void;
}

export const LabPublishComponent: React.FC<LabPublishProps> = ({
  pipeline,
  currentHtml,
  currentManifest,
  authorId,
  onClose,
}) => {
  const [status, setStatus] = useState(pipeline.getStatus());
  const [running, setRunning] = useState(false);

  const handlePublish = useCallback(async () => {
    if (!currentHtml || !currentManifest || running) return;

    setRunning(true);
    pipeline.reset();
    setStatus({ step: 'validating' });

    // Poll status during pipeline run
    const pollInterval = setInterval(() => {
      setStatus({ ...pipeline.getStatus() });
    }, 100);

    try {
      const result = await pipeline.run(currentHtml, currentManifest, authorId);
      setStatus(result);
    } catch {
      setStatus({ step: 'failed', error: 'Unexpected pipeline error' });
    } finally {
      clearInterval(pollInterval);
      setRunning(false);
    }
  }, [pipeline, currentHtml, currentManifest, authorId, running]);

  const handleReset = useCallback(() => {
    pipeline.reset();
    setStatus({ step: 'idle' });
  }, [pipeline]);

  const currentStep = status.step;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(0,0,0,0.15)',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: labPalette.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.14em',
        }}>
          Publish Pipeline
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close publish panel"
            style={{
              padding: '2px 6px', fontSize: 12,
              color: labPalette.textMuted, background: 'none',
              border: 'none', cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Steps */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {STEPS.map((step, i) => (
          <React.Fragment key={step.key}>
            <StepDot
              state={getStepState(step.key, currentStep)}
              label={step.label}
              description={step.description}
            />
            {i < STEPS.length - 1 && (
              <StepLine active={getStepState(step.key, currentStep) === 'complete'} />
            )}
          </React.Fragment>
        ))}

        {/* Error details */}
        {status.step === 'failed' && status.errors && status.errors.length > 0 && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(232,128,108,0.06)',
            border: '1px solid rgba(232,128,108,0.2)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: labPalette.ember, marginBottom: 6,
              fontFamily: 'var(--sn-font-family)',
            }}>
              {status.error ?? 'Pipeline failed'}
            </div>
            {status.errors.map((err, i) => (
              <div key={i} style={{
                fontSize: 10, color: labPalette.textSoft, lineHeight: 1.6,
                fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
                paddingLeft: 8,
              }}>
                - {err}
              </div>
            ))}
          </div>
        )}

        {/* Success state */}
        {status.step === 'done' && (
          <div style={{
            marginTop: 12, padding: '14px',
            borderRadius: 8,
            background: 'rgba(90,168,120,0.06)',
            border: '1px solid rgba(90,168,120,0.2)',
            boxShadow: '0 0 12px rgba(90,168,120,0.08)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: labPalette.moss,
              fontFamily: 'var(--sn-font-family)', marginBottom: 4,
            }}>
              Published successfully
            </div>
            <div style={{
              fontSize: 11, color: labPalette.textMuted,
              fontFamily: 'var(--sn-font-family)',
            }}>
              Your widget is now live on the Marketplace.
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', gap: 8,
      }}>
        {currentStep === 'idle' && (
          <button
            onClick={handlePublish}
            disabled={!currentHtml || !currentManifest}
            aria-label="Start publish pipeline"
            style={{
              flex: 1, padding: '8px 16px', fontSize: 12, fontWeight: 500,
              fontFamily: 'var(--sn-font-family)', color: '#fff',
              background: labPalette.storm,
              border: 'none', borderRadius: 8, cursor: 'pointer',
              opacity: (!currentHtml || !currentManifest) ? 0.4 : 1,
            }}
          >
            Publish Widget
          </button>
        )}

        {(currentStep === 'failed' || currentStep === 'done') && (
          <button
            onClick={handleReset}
            aria-label="Reset pipeline"
            style={{
              flex: 1, padding: '8px 16px', fontSize: 12, fontWeight: 500,
              fontFamily: 'var(--sn-font-family)',
              color: labPalette.textSoft,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, cursor: 'pointer',
            }}
          >
            {currentStep === 'done' ? 'Publish Again' : 'Try Again'}
          </button>
        )}

        {running && (
          <div style={{
            flex: 1, padding: '8px 16px', fontSize: 12,
            color: labPalette.textMuted,
            fontFamily: 'var(--sn-font-family)',
            textAlign: 'center',
          }}>
            Publishing...
          </div>
        )}
      </div>
    </div>
  );
};
