/**
 * LicenseBadge — displays widget license type.
 *
 * @module shell/pages/marketplace/shared
 * @layer L6
 */

import React from 'react';

import { themeVar } from '../../../theme/theme-vars';

const LICENSE_COLORS: Record<string, string> = {
  MIT: '#16a34a',
  'Apache-2.0': '#2563eb',
  proprietary: '#9333ea',
  'no-fork': '#dc2626',
};

export interface LicenseBadgeProps {
  license: string;
}

export const LicenseBadge: React.FC<LicenseBadgeProps> = ({ license }) => {
  const color = LICENSE_COLORS[license] ?? themeVar('--sn-text-muted');

  return (
    <span
      data-testid="license-badge"
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 600,
        color,
        border: `1px solid ${color}`,
        lineHeight: '16px',
      }}
    >
      {license}
    </span>
  );
};
