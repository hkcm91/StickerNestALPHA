/**
 * ToastContainer — renders the global toast notifications.
 *
 * @module shell/components
 * @layer L6
 */

import React from 'react';

import { useUIStore } from '../../kernel/stores/ui/ui.store';
import type { Toast } from '../../kernel/stores/ui/ui.store';
import { ANIMATION_EASING, ANIMATION_DURATION } from '../theme/animation-tokens';
import { palette } from '../theme/theme-vars';

export const ToastContainer: React.FC = () => {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  return (
    <div
      data-testid="toast-container"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast: Toast) => (
        <div
          key={toast.id}
          data-testid={`toast-${toast.type}`}
          style={{
            padding: '12px 20px',
            borderRadius: '8px',
            background: getToastBackground(toast.type),
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            pointerEvents: 'auto',
            animation: `sn-toast-in ${ANIMATION_DURATION.normal} ${ANIMATION_EASING.spring}`,
            minWidth: '200px',
            maxWidth: '400px',
          }}
        >
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

function getToastBackground(type: Toast['type']): string {
  switch (type) {
    case 'success': return palette.success;
    case 'error': return palette.error;
    case 'info': return palette.accent;
    case 'warning': return palette.warning;
    default: return palette.surfaceRaised;
  }
}
