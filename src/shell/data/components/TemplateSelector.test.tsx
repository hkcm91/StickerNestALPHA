/**
 * TemplateSelector component tests.
 *
 * @vitest-environment happy-dom
 * @module shell/data
 * @layer L6
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { TemplateSelector } from './TemplateSelector';

const MOCK_TEMPLATES = [
  { id: 't-1', name: 'Bug Tracker', icon: 'B', description: 'Track bugs', columns: [{ id: 'c1' }, { id: 'c2' }], category: 'engineering' },
  { id: 't-2', name: 'CRM', icon: 'C', description: 'Manage contacts', columns: [{ id: 'c3' }], category: 'sales' },
  { id: 't-3', name: 'Tasks', icon: 'T', description: 'Project tasks', columns: [{ id: 'c4' }, { id: 'c5' }, { id: 'c6' }], category: 'project_management' },
];

vi.mock('../../../kernel/datasource', () => ({
  getTemplates: vi.fn(() => MOCK_TEMPLATES),
  getTemplatesByCategory: vi.fn((cat: string) => MOCK_TEMPLATES.filter((t) => t.category === cat)),
}));

describe('TemplateSelector', () => {
  it('renders modal with title and all templates by default', () => {
    render(<TemplateSelector onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('template-selector')).toBeTruthy();
    expect(screen.getByText('Choose a Template')).toBeTruthy();
    expect(screen.getByTestId('template-t-1')).toBeTruthy();
    expect(screen.getByTestId('template-t-2')).toBeTruthy();
    expect(screen.getByTestId('template-t-3')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<TemplateSelector onSelect={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('btn-close-template'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect with the chosen template', () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('template-t-2'));
    expect(onSelect).toHaveBeenCalledWith(MOCK_TEMPLATES[1]);
  });

  it('filters templates by category when a category button is clicked', () => {
    render(<TemplateSelector onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('category-engineering'));
    // After filtering, only engineering templates should display
    expect(screen.getByTestId('template-t-1')).toBeTruthy();
    expect(screen.queryByTestId('template-t-2')).toBeNull();
    expect(screen.queryByTestId('template-t-3')).toBeNull();
  });

  it('displays column count for each template', () => {
    render(<TemplateSelector onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('2 columns')).toBeTruthy();
    expect(screen.getByText('1 columns')).toBeTruthy();
    expect(screen.getByText('3 columns')).toBeTruthy();
  });
});
