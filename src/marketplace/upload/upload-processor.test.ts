/**
 * Upload Processor tests
 *
 * @module marketplace/upload
 * @layer L5
 */

import { describe, it, expect } from 'vitest';

import { detectFileType } from './upload-processor';

describe('detectFileType', () => {
  it('detects .html files', () => {
    const file = new File(['<html></html>'], 'widget.html', { type: 'text/html' });
    expect(detectFileType(file)).toBe('html');
  });

  it('detects .htm files', () => {
    const file = new File(['<html></html>'], 'widget.htm', { type: 'text/html' });
    expect(detectFileType(file)).toBe('html');
  });

  it('detects .zip files', () => {
    const file = new File([new ArrayBuffer(10)], 'widget.zip', { type: 'application/zip' });
    expect(detectFileType(file)).toBe('zip');
  });

  it('detects .snwidget.zip files', () => {
    const file = new File([new ArrayBuffer(10)], 'my-widget.snwidget.zip', { type: 'application/zip' });
    expect(detectFileType(file)).toBe('zip');
  });

  it('detects .jsx as source', () => {
    const file = new File(['export default App'], 'App.jsx', { type: 'text/javascript' });
    expect(detectFileType(file)).toBe('source');
  });

  it('detects .tsx as source', () => {
    const file = new File(['export default App'], 'App.tsx', { type: 'text/typescript' });
    expect(detectFileType(file)).toBe('source');
  });

  it('detects .vue as source', () => {
    const file = new File(['<template></template>'], 'Widget.vue', { type: 'text/plain' });
    expect(detectFileType(file)).toBe('source');
  });

  it('detects .js as source', () => {
    const file = new File(['const x = 1'], 'widget.js', { type: 'text/javascript' });
    expect(detectFileType(file)).toBe('source');
  });

  it('defaults unknown extensions to source', () => {
    const file = new File(['data'], 'widget.ts', { type: 'text/plain' });
    expect(detectFileType(file)).toBe('source');
  });
});
