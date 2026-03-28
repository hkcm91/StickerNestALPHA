/**
 * SecurityBadge — displays widget review status badge.
 *
 * @module shell/pages/marketplace/shared
 * @layer L6
 */

import React from 'react';

import type { ReviewStatus } from '@sn/types';

import { themeVar } from '../../../theme/theme-vars';

export interface SecurityBadgeProps {
  reviewStatus: ReviewStatus;
  size?: 'small' | 'normal';
}

const BADGE_CONFIG: Record<ReviewStatus, { label: string; bg: string; color: string } | null> = {
  approved: null, // no badge for approved
  flagged: { label: 'Under Review', bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308' },
  rejected: { label: 'Rejected', bg: 'rgba(220, 38, 38, 0.15)', color: '#dc2626' },
  pending: { label: 'Pending', bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
};

export const SecurityBadge: React.FC<SecurityBadgeProps> = ({ reviewStatus, size = 'normal' }) => {
  const config = BADGE_CONFIG[reviewStatus];
  if (!config) return null;

  const isSmall = size === 'small';

  return (
    <span
      data-testid="security-badge"
      data-status={reviewStatus}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: isSmall ? '1px 6px' : '2px 8px',
        borderRadius: '6px',
        fontSize: isSmall ? '10px' : '11px',
        fontWeight: 600,
        fontFamily: themeVar('--sn-font-family'),
        background: config.bg,
        color: config.color,
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
};
