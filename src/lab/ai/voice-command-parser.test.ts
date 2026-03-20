import { describe, it, expect } from 'vitest';

import { parseVoiceCommand } from './voice-command-parser';

describe('parseVoiceCommand', () => {
  it('detects generate intent', () => {
    expect(parseVoiceCommand('generate a timer widget').intent).toBe('generate');
    expect(parseVoiceCommand('create a clock').intent).toBe('generate');
    expect(parseVoiceCommand('build me a counter').intent).toBe('generate');
    expect(parseVoiceCommand('make a todo list widget').intent).toBe('generate');
  });

  it('detects edit intent', () => {
    expect(parseVoiceCommand('edit the background to blue').intent).toBe('edit');
    expect(parseVoiceCommand('change the color to red').intent).toBe('edit');
    expect(parseVoiceCommand('modify the font size').intent).toBe('edit');
    expect(parseVoiceCommand('make the button larger').intent).toBe('edit');
    expect(parseVoiceCommand('make it dark themed').intent).toBe('edit');
  });

  it('detects explain intent', () => {
    expect(parseVoiceCommand('explain this pipeline').intent).toBe('explain');
    expect(parseVoiceCommand('what does this widget do').intent).toBe('explain');
    expect(parseVoiceCommand('how does the counter work').intent).toBe('explain');
    expect(parseVoiceCommand('describe the connection flow').intent).toBe('explain');
  });

  it('detects preview intent', () => {
    expect(parseVoiceCommand('preview').intent).toBe('preview');
    expect(parseVoiceCommand('run it').intent).toBe('preview');
    expect(parseVoiceCommand('show me the result').intent).toBe('preview');
    expect(parseVoiceCommand('test it').intent).toBe('preview');
  });

  it('detects save intent', () => {
    expect(parseVoiceCommand('save version').intent).toBe('save');
    expect(parseVoiceCommand('save').intent).toBe('save');
    expect(parseVoiceCommand('take a snapshot').intent).toBe('save');
  });

  it('defaults to generate for unrecognized speech', () => {
    expect(parseVoiceCommand('something completely random').intent).toBe('generate');
  });

  it('preserves original transcript text', () => {
    const cmd = parseVoiceCommand('  generate a timer widget  ');
    expect(cmd.text).toBe('generate a timer widget');
  });
});
