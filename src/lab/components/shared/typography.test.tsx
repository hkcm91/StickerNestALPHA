/**
 * Lab typography component tests.
 *
 * @vitest-environment happy-dom
 * @module lab/components/shared
 * @layer L2
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { SectionTitle, GroupLabel } from './typography';

describe('SectionTitle', () => {
  it('renders the heading text', () => {
    render(<SectionTitle>My Section</SectionTitle>);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeTruthy();
    expect(heading.textContent).toBe('My Section');
  });

  it('renders subtitle when sub prop is provided', () => {
    render(<SectionTitle sub="A longer description">Title</SectionTitle>);
    expect(screen.getByText('A longer description')).toBeTruthy();
  });

  it('does not render subtitle paragraph when sub prop is omitted', () => {
    const { container } = render(<SectionTitle>Title Only</SectionTitle>);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });
});

describe('GroupLabel', () => {
  it('renders the label text', () => {
    render(<GroupLabel>Controls</GroupLabel>);
    expect(screen.getByText('Controls')).toBeTruthy();
  });

  it('applies uppercase text transform', () => {
    render(<GroupLabel>Label</GroupLabel>);
    const el = screen.getByText('Label');
    expect(el.style.textTransform).toBe('uppercase');
  });

  it('merges additional style prop', () => {
    render(<GroupLabel style={{ marginTop: '20px' }}>Styled</GroupLabel>);
    const el = screen.getByText('Styled');
    expect(el.style.marginTop).toBe('20px');
  });
});
