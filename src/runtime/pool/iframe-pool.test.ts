import { describe, it } from 'vitest';

describe('IframePool', () => {
  it.todo('warmUp creates requested number of iframes');
  it.todo('acquire returns iframe from pool when available');
  it.todo('acquire creates new iframe when pool is empty');
  it.todo('release returns iframe to pool after clearing srcdoc');
  it.todo('does not exceed maxSize');
  it.todo('destroys excess iframes beyond maxSize');
  it.todo('released iframe has srcdoc cleared');
  it.todo('size() returns current count');
  it.todo('destroy removes all iframes');
  it.todo('handles rapid acquire/release cycles');
});
