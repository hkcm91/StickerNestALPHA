/**
 * Shared marketplace styles — extracted from MarketplacePageFull.
 *
 * @module shell/pages/marketplace
 * @layer L6
 */

import type React from 'react';

import { themeVar } from '../../theme/theme-vars';

export const PAGE_SIZE = 20;

export const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'data', label: 'Data & Databases' },
  { value: 'social', label: 'Social' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'games', label: 'Games' },
  { value: 'media', label: 'Media' },
] as const;

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'installs', label: 'Most Installed' },
] as const;

export type SortBy = (typeof SORT_OPTIONS)[number]['value'];

export const pageStyle: React.CSSProperties = {
  minHeight: '100%',
  padding: '24px',
  boxSizing: 'border-box',
  background: themeVar('--sn-bg'),
  color: themeVar('--sn-text'),
  fontFamily: themeVar('--sn-font-family'),
  maxWidth: '1100px',
  margin: '0 auto',
};

export const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: `1px solid ${themeVar('--sn-border')}`,
  borderRadius: '6px',
  background: themeVar('--sn-surface'),
  color: themeVar('--sn-text'),
  fontSize: '14px',
  fontFamily: 'inherit',
};

export const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

export const btnPrimary: React.CSSProperties = {
  padding: '8px 16px',
  border: 'none',
  borderRadius: '6px',
  background: themeVar('--sn-accent'),
  color: '#fff',
  cursor: 'pointer',
  fontSize: '14px',
  fontFamily: 'inherit',
};

export const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: 'transparent',
  border: `1px solid ${themeVar('--sn-border')}`,
  color: themeVar('--sn-text'),
};

export const btnDanger: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  background: '#dc2626',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '14px',
  fontFamily: 'inherit',
};

export const cardStyle: React.CSSProperties = {
  border: `1px solid ${themeVar('--sn-border')}`,
  borderRadius: themeVar('--sn-radius'),
  background: themeVar('--sn-surface'),
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 150ms cubic-bezier(0.16, 1, 0.3, 1), border-color 150ms cubic-bezier(0.16, 1, 0.3, 1)',
};

export const labelBuiltIn: React.CSSProperties = {
  padding: '4px 12px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 12,
  fontWeight: 500,
};

export const tagStyle: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: '12px',
  fontSize: '12px',
  background: themeVar('--sn-surface'),
  border: `1px solid ${themeVar('--sn-border')}`,
};

export const officialBadge: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 600,
  padding: '1px 6px',
  borderRadius: '8px',
  background: '#2563eb',
  color: '#fff',
  lineHeight: '14px',
  whiteSpace: 'nowrap',
};

export const sectionHeading: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: '18px',
  fontW