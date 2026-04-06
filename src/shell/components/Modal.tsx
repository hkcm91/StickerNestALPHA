/**
 * Modal — responsive overlay dialog component.
 *
 * @remarks
 * - On desktop: centered overlay with backdrop
 * - On mobile (< 640px): fullscreen takeover
 * - Supports escape key to close
 * - Backdrop click to close (configurable)
 *
 * @module shell/components
 * @layer L6
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Mobile breakpoint — below this width, modal is fullscreen */
const MOBILE_BREAKPOINT = 640;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Modal title displayed in header */
  title: string;
  /** Modal content */
  children: React.ReactNode;
  /** Whether clicking the backdrop closes the modal (default: true) */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes the modal (default: true) */
  closeOnEscape?: boolean;
  /** Maximum width on desktop (default: 480px) */
  maxWidth?: number;
  /** Footer content (e.g., action buttons) */
  footer?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Hook: useMediaQuery
// ---------------------------------------------------------------------------

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Modern browsers
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    // Legacy browsers
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, [query]);

  return matches;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Responsive modal dialog component.
 *
 * On mobile devices, the modal takes over the full screen for better usability.
 * On desktop, it appears as a centered overlay with a backdrop.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  maxWidth = 480,
  footer,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  // Focus trap: focus the modal content when opened
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      data-testid="modal-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        background: isMobile ? 'transparent' : 'rgba(0, 0, 0, 0.5)',
        padding: isMobile ? 0 : '16px',
        fontFamily: 'var(--sn-font-family, system-ui)',
      }}
    >
      <div
        ref={contentRef}
        data-testid="modal-content"
        className={isMobile ? '' : 'sn-elevated sn-holo-border'}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: isMobile ? '100%' : '100%',
          maxWidth: isMobile ? '100%' : maxWidth,
          height: isMobile ? '100%' : 'auto',
          maxHeight: isMobile ? '100%' : 'calc(100vh - 32px)',
          background: 'var(--sn-surface, #ffffff)',
          borderRadius: isMobile ? 0 : 'var(--sn-radius, 8px)',
          overflow: 'hidden',
          outline: 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
            flexShrink: 0,
          }}
        >
          <h2
            id="modal-title"
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--sn-text, #111827)',
            }}
          >
            {title}
          </h2>
          <button
            data-testid="modal-close"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0,
              border: 'none',
              background: 'transparent',
              borderRadius: 'var(--sn-radius, 6px)',
              cursor: 'pointer',
              color: 'var(--sn-text-muted, #7A7784)',
              fontSize: '20px',
              lineHeight: 1,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--sn-bg, #f3f4f6)';
              e.currentTarget.style.color = 'var(--sn-text, #111827)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--sn-text-muted, #7A7784)';
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '20px',
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '16px 20px',
              borderTop: '1px solid var(--sn-border, rgba(255,255,255,0.06))',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Render modal in a portal to escape any parent stacking context
  return createPortal(modalContent, document.body);
};
