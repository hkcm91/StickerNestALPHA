import { describe, it, expect } from 'vitest';

import {
  DockerWidgetSlotSchema,
  DockerTabSchema,
  DockerDockModeSchema,
  DockerSchema,
  UserDockerConfigSchema,
  CreateDockerInputSchema,
  UpdateDockerInputSchema,
} from './docker';

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

describe('DockerWidgetSlotSchema', () => {
  it('parses valid slot with height', () => {
    const result = DockerWidgetSlotSchema.parse({
      widgetInstanceId: uuid(),
      height: 200,
    });
    expect(result.height).toBe(200);
  });

  it('parses slot without optional height', () => {
    const result = DockerWidgetSlotSchema.parse({
      widgetInstanceId: uuid(),
    });
    expect(result.height).toBeUndefined();
  });

  it('rejects non-uuid widgetInstanceId', () => {
    expect(() =>
      DockerWidgetSlotSchema.parse({ widgetInstanceId: 'not-a-uuid' }),
    ).toThrow();
  });

  it('rejects zero or negative height', () => {
    expect(() =>
      DockerWidgetSlotSchema.parse({ widgetInstanceId: uuid(), height: 0 }),
    ).toThrow();
    expect(() =>
      DockerWidgetSlotSchema.parse({ widgetInstanceId: uuid(), height: -5 }),
    ).toThrow();
  });

  it('rejects missing widgetInstanceId', () => {
    expect(() => DockerWidgetSlotSchema.parse({})).toThrow();
  });
});

describe('DockerTabSchema', () => {
  it('parses valid tab with defaults', () => {
    const result = DockerTabSchema.parse({ id: uuid() });
    expect(result.name).toBe('Tab');
    expect(result.widgets).toEqual([]);
  });

  it('parses tab with explicit name and widgets', () => {
    const wid = uuid();
    const result = DockerTabSchema.parse({
      id: uuid(),
      name: 'My Tab',
      widgets: [{ widgetInstanceId: wid }],
    });
    expect(result.name).toBe('My Tab');
    expect(result.widgets).toHaveLength(1);
  });

  it('rejects empty name', () => {
    expect(() => DockerTabSchema.parse({ id: uuid(), name: '' })).toThrow();
  });

  it('rejects name exceeding 50 chars', () => {
    expect(() =>
      DockerTabSchema.parse({ id: uuid(), name: 'a'.repeat(51) }),
    ).toThrow();
  });

  it('rejects non-uuid id', () => {
    expect(() => DockerTabSchema.parse({ id: 'bad' })).toThrow();
  });
});

describe('DockerDockModeSchema', () => {
  it('accepts all valid modes', () => {
    expect(DockerDockModeSchema.parse('floating')).toBe('floating');
    expect(DockerDockModeSchema.parse('docked-left')).toBe('docked-left');
    expect(DockerDockModeSchema.parse('docked-right')).toBe('docked-right');
  });

  it('rejects invalid mode', () => {
    expect(() => DockerDockModeSchema.parse('top')).toThrow();
  });
});

describe('DockerSchema', () => {
  const validDocker = () => ({
    id: uuid(),
    size: { width: 300, height: 400 },
    tabs: [{ id: uuid() }],
    createdAt: now(),
    updatedAt: now(),
  });

  it('parses valid docker with defaults', () => {
    const result = DockerSchema.parse(validDocker());
    expect(result.name).toBe('Docker');
    expect(result.dockMode).toBe('floating');
    expect(result.visible).toBe(true);
    expect(result.pinned).toBe(false);
    expect(result.activeTabIndex).toBe(0);
  });

  it('rejects empty tabs array', () => {
    expect(() => DockerSchema.parse({ ...validDocker(), tabs: [] })).toThrow();
  });

  it('rejects negative activeTabIndex', () => {
    expect(() =>
      DockerSchema.parse({ ...validDocker(), activeTabIndex: -1 }),
    ).toThrow();
  });

  it('rejects non-integer activeTabIndex', () => {
    expect(() =>
      DockerSchema.parse({ ...validDocker(), activeTabIndex: 1.5 }),
    ).toThrow();
  });

  it('accepts optional position', () => {
    const result = DockerSchema.parse({
      ...validDocker(),
      position: { x: 10, y: 20 },
    });
    expect(result.position).toEqual({ x: 10, y: 20 });
  });

  it('rejects missing timestamps', () => {
    const { createdAt: _, ...noCreated } = validDocker();
    expect(() => DockerSchema.parse(noCreated)).toThrow();
  });
});

describe('UserDockerConfigSchema', () => {
  it('parses valid config with default empty dockers', () => {
    const result = UserDockerConfigSchema.parse({
      userId: uuid(),
      updatedAt: now(),
    });
    expect(result.dockers).toEqual([]);
  });

  it('rejects non-uuid userId', () => {
    expect(() =>
      UserDockerConfigSchema.parse({ userId: 'abc', updatedAt: now() }),
    ).toThrow();
  });
});

describe('CreateDockerInputSchema', () => {
  it('applies all defaults when only size is given', () => {
    const result = CreateDockerInputSchema.parse({
      size: { width: 200, height: 300 },
    });
    expect(result.name).toBe('Docker');
    expect(result.dockMode).toBe('floating');
    expect(result.visible).toBe(true);
    expect(result.pinned).toBe(false);
  });

  it('allows overriding defaults', () => {
    const result = CreateDockerInputSchema.parse({
      size: { width: 200, height: 300 },
      name: 'Custom',
      dockMode: 'docked-left',
      pinned: true,
    });
    expect(result.name).toBe('Custom');
    expect(result.dockMode).toBe('docked-left');
    expect(result.pinned).toBe(true);
  });
});

describe('UpdateDockerInputSchema', () => {
  it('parses empty update (all optional)', () => {
    const result = UpdateDockerInputSchema.parse({});
    expect(result).toEqual({});
  });

  it('parses partial update', () => {
    const result = UpdateDockerInputSchema.parse({ visible: false, pinned: true });
    expect(result.visible).toBe(false);
    expect(result.pinned).toBe(true);
  });

  it('rejects invalid dockMode in update', () => {
    expect(() => UpdateDockerInputSchema.parse({ dockMode: 'invalid' })).toThrow();
  });
});
