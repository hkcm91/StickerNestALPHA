import { describe, it, expect, vi } from 'vitest';

import type { AIGenerator } from '../ai/ai-generator';

import { createPrototypeSession, getPrototypeClickScript } from './prototype-mode';

function mockGenerator(html: string, valid = true): AIGenerator {
  return {
    async generate() {
      return { html, isValid: valid, errors: valid ? [] : ['invalid'] };
    },
    async explain() { return { text: '', error: null }; },
    isGenerating() { return false; },
    cancel() {},
    getLastResult() { return null; },
    setModel() {},
    getModel() { return { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic' as const, description: 'Test' }; },
  };
}

describe('createPrototypeSession', () => {
  it('starts with root frame containing base HTML', () => {
    const session = createPrototypeSession(mockGenerator(''), '<div>Base</div>');
    expect(session.getCurrentFrame()?.html).toBe('<div>Base</div>');
    expect(session.getHistory()).toHaveLength(1);
  });

  it('enable/disable toggles mode', () => {
    const session = createPrototypeSession(mockGenerator(''), '<div>X</div>');
    expect(session.isEnabled()).toBe(false);
    session.enable();
    expect(session.isEnabled()).toBe(true);
    session.disable();
    expect(session.isEnabled()).toBe(false);
  });

  it('handleClick generates new frame and navigates to it', async () => {
    const gen = mockGenerator('<div>Screen 2</div>');
    const session = createPrototypeSession(gen, '<div>Screen 1</div>');
    session.enable();

    const frame = await session.handleClick('button.submit', 'Submit');
    expect(frame).not.toBeNull();
    expect(frame?.html).toBe('<div>Screen 2</div>');
    expect(frame?.clickTarget).toBe('button.submit');
    expect(frame?.parentFrameId).toBe(session.getHistory()[0].id);
    expect(session.getHistory()).toHaveLength(2);
    expect(session.getCurrentFrame()?.id).toBe(frame?.id);
  });

  it('handleClick returns null when disabled', async () => {
    const session = createPrototypeSession(mockGenerator('<div>2</div>'), '<div>1</div>');
    const frame = await session.handleClick('button', 'Click');
    expect(frame).toBeNull();
  });

  it('handleClick returns null on generation failure', async () => {
    const session = createPrototypeSession(mockGenerator('bad', false), '<div>1</div>');
    session.enable();
    const frame = await session.handleClick('button', 'Click');
    expect(frame).toBeNull();
  });

  it('goBack navigates to parent frame', async () => {
    const gen = mockGenerator('<div>2</div>');
    const session = createPrototypeSession(gen, '<div>1</div>');
    session.enable();

    await session.handleClick('button', 'Next');
    expect(session.getCurrentFrame()?.html).toBe('<div>2</div>');

    const back = session.goBack();
    expect(back?.html).toBe('<div>1</div>');
    expect(session.getCurrentFrame()?.html).toBe('<div>1</div>');
  });

  it('goForward navigates to child frame', async () => {
    const gen = mockGenerator('<div>2</div>');
    const session = createPrototypeSession(gen, '<div>1</div>');
    session.enable();

    await session.handleClick('button', 'Next');
    session.goBack();

    const fwd = session.goForward();
    expect(fwd?.html).toBe('<div>2</div>');
  });

  it('goBack returns null at root', () => {
    const session = createPrototypeSession(mockGenerator(''), '<div>1</div>');
    expect(session.goBack()).toBeNull();
  });

  it('onFrameChange fires on navigation', async () => {
    const gen = mockGenerator('<div>2</div>');
    const session = createPrototypeSession(gen, '<div>1</div>');
    session.enable();

    const cb = vi.fn();
    session.onFrameChange(cb);

    await session.handleClick('button', 'Click');
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ html: '<div>2</div>' }));
  });

  it('destroy cleans up', () => {
    const session = createPrototypeSession(mockGenerator(''), '<div>1</div>');
    session.destroy();
    expect(session.getHistory()).toHaveLength(0);
    expect(session.getCurrentFrame()).toBeNull();
  });
});

describe('getPrototypeClickScript', () => {
  it('returns a script tag with click interception', () => {
    const script = getPrototypeClickScript();
    expect(script).toContain('<script data-sn-prototype>');
    expect(script).toContain('prototype.click');
    expect(script).toContain('addEventListener');
  });
});
