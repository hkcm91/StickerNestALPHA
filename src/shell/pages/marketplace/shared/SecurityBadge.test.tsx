/**
 * SecurityBadge tests
 *
 * @module shell/pages/marketplace/shared
 * @layer L6
 */

import React from 'react';
import { describe, it, expect } from 'vitest';

import { SecurityBadge } from './SecurityBadge';

describe('SecurityBadge', () => {
  it('renders nothing for approved status', () => {
    const result = SecurityBadge({ reviewStatus: 'approved' });
    expect(result).toBeNull();
  });

  it('renders "Under Review" for flagged status', () => {
    const el = SecurityBadge({ reviewStatus: 'flagged' });
    expect(el).not.toBeNull();
    expect(el?.props.children).toBe('Under Review');
    expect(el?.props['data-status']).toBe('flagged');
  });

  it('renders "Rejected" for rejected status', () => {
    const el = SecurityBadge({ reviewStatus: 'rejected' });
    expect(el).not.toBeNull();
    expect(el?.props.children).toBe('Rejected');
  });

  it('renders "Pending" for pending status', () => {
    const el = SecurityBadge({ reviewStatus: 'pending' });
    expect(el).not.toBeNull();
    expect(el?.props.children).toBe('Pending');
  });

  it('applies small size styles', () => {
    const el = SecurityBadge({ reviewStatus: 'flagged', size: 'small' });
    expect(el?.props.style.fontSize).toBe('10px');
  });
});
