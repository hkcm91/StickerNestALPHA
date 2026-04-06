/**
 * Reusable tab button for profile panels.
 *
 * @module shell/profile
 * @layer L6
 */

import React from 'react';

import { palette, themeVar } from '../theme/theme-vars';

export interface TabButtonProps {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}

export const TabButton: React.FC<TabButtonProps> = ({ label, count, active, onClick }) => (
  <button
    data-testid={`tab-${label.toLowerCase().replace(/\s+/g, '-')}`}
    onClick={onClick}
    style={{
      flex: 1,
      padding: '14px 0',
      background: 'none',
      border: 'none',
      borderBottom: active ? `2px solid ${palette.opal}` : '2px solid transparent',
      cursor: 'pointer',
      fontFamily: themeVar('--sn-font-family'),
      fontSize: '14px',
      fontWeight: active ? 700 : 500,
      color: active ? palette.text : palette.textMuted,
      transition: 'all 0.15s ease',
    }}
  >
    {label}{count != null && <span style={{ opacity: 0.6 }}> ({count})</span>}
  </button>
);
