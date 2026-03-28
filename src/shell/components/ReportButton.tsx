/**
 * Report Button — flag icon that opens a report modal.
 *
 * @module shell/components
 * @layer L6
 */

import React, { useCallback, useState } from 'react';

import {
  submitReport,
  type ContentType,
  type ReportReason,
} from '../../kernel/moderation';
import { useAuthStore } from '../../kernel/stores/auth';

export interface ReportButtonProps {
  contentType: ContentType;
  contentId: string;
  /** Size variant */
  size?: 'small' | 'medium';
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'nsfw', label: 'Inappropriate Content' },
  { value: 'copyright', label: 'Copyright Violation' },
  { value: 'other', label: 'Other' },
];

export const ReportButton: React.FC<ReportButtonProps> = ({
  contentType,
  contentId,
  size = 'small',
}) => {
  const userId = useAuthStore((s) => s.user?.id);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!userId) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitReport({
        reporterId: userId,
        contentType,
        contentId,
        reason,
        details: details.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setDetails('');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }, [userId, contentType, contentId, reason, details]);

  const iconSize = size === 'small' ? 14 : 18;

  return (
    <>
      <button
        data-testid="report-button"
        onClick={() => setIsOpen(true)}
        title="Report"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          color: 'var(--sn-text-muted, #9ca3af)',
          fontSize: iconSize,
          lineHeight: 1,
        }}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 2v12" />
          <path d="M2 2l10 2-1 5-9 2" />
        </svg>
      </button>

      {isOpen && (
        <div
          data-testid="report-modal"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
            zIndex: 9999,
          }}
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div
            style={{
              background: 'var(--sn-surface, #fff)',
              borderRadius: 12,
              padding: 24,
              width: '90%',
              maxWidth: 400,
            }}
          >
            {submitted ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>Thank you</div>
                <p style={{ color: 'var(--sn-text-muted, #7A7784)', fontSize: 14 }}>
                  Your report has been submitted and will be reviewed.
                </p>
              </div>
            ) : (
              <>
                <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Report Content</h3>

                {error && (
                  <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Reason
                  </label>
                  <select
                    data-testid="report-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReportReason)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
                      borderRadius: 6,
                      fontSize: 14,
                      background: 'var(--sn-bg, #f9fafb)',
                    }}
                  >
                    {REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Details (optional)
                  </label>
                  <textarea
                    data-testid="report-details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Provide additional context..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
                      borderRadius: 6,
                      fontSize: 14,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      background: 'var(--sn-bg, #f9fafb)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setIsOpen(false)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
                      borderRadius: 6,
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    data-testid="report-submit"
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: 6,
                      background: '#dc2626',
                      color: '#fff',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
