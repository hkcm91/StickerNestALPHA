/**
 * TextRenderer tests.
 *
 * @module shell/canvas/renderers
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { TextEntity } from '@sn/types';

import { TextRenderer } from './TextRenderer';

function makeText(overrides: Partial<TextEntity> = {}): TextEntity {
  return {
    id: 'text-1',
    type: 'text',
    canvasId: 'canvas-1',
    transform: {
      position: { x: 100, y: 100 },
      size: { width: 200, height: 50 },
      rotation: 0,
      scale: 1,
    },
    zIndex: 1,
    visible: true,
    locked: false,
    opacity: 1,
    borderRadius: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    createdBy: 'user-1',
    content: 'Hello World',
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: 400,
    color: '#111827',
    textAlign: 'left',
    ...overrides,
  } as TextEntity;
}

describe('TextRenderer', () => {
  it('renders the text content', () => {
    const entity = makeText({ content: 'Test content' });
    render(<TextRenderer entity={entity} isSelected={false} />);
    expect(screen.getByText('Test content')).toBeDefined();
  });

  it('applies font styles from entity', () => {
    const entity = makeText({
      fontFamily: 'Courier New',
      fontSize: 24,
      fontWeight: 700,
      color: '#ff0000',
      textAlign: 'center',
    });
    const { container } = render(<TextRenderer entity={entity} isSelected={false} />);
    const el = container.querySelector('[data-entity-type="text"]') as HTMLElement;
    expect(el.style.fontFamily).toContain('Courier New');
    expect(el.style.fontSize).toBe('24px');
    expect(el.style.fontWeight).toBe('700');
    expect(el.style.color).toBe('rgb(255, 0, 0)');
    expect(el.style.textAlign).toBe('center');
  });

  it('renders differently when selected vs not selected', () => {
    const entity = makeText();
    const { container: c1 } = render(<TextRenderer entity={entity} isSelected={true} />);
    const { container: c2 } = render(<TextRenderer entity={entity} isSelected={false} />);
    const sel = c1.querySelector('[data-entity-type="text"]') as HTMLElement;
    const unsel = c2.querySelector('[data-entity-type="text"]') as HTMLElement;
    expect(sel.outerHTML).not.toBe(unsel.outerHTML);
  });

  it('sets data-entity-id and data-entity-type', () => {
    const entity = makeText({ id: 'txt-42' });
    const { container } = render(<TextRenderer entity={entity} isSelected={false} />);
    expect(container.querySelector('[data-entity-id="txt-42"]')).not.toBeNull();
    expect(container.querySelector('[data-entity-type="text"]')).not.toBeNull();
  });

  it('sets cursor to default when locked', () => {
    const entity = makeText({ locked: true } as any);
    const { container } = render(<TextRenderer entity={entity} isSelected={false} />);
    const el = container.querySelector('[data-entity-type="text"]') as HTMLElement;
    expect(el.style.cursor).toBe('default');
  });

  it('sets cursor to text when not locked', () => {
    const entity = makeText({ locked: false } as any);
    const { container } = render(<TextRenderer entity={entity} isSelected={false} />);
    const el = container.querySelector('[data-entity-type="text"]') as HTMLElement;
    expect(el.style.cursor).toBe('text');
  });
});
