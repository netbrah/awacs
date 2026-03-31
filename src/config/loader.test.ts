import { describe, it, expect } from 'vitest';
import { deriveShortName } from './loader.js';

describe('deriveShortName', () => {
  it('derives short name from claude-opus-4.6', () => {
    expect(deriveShortName('claude-opus-4.6')).toBe('opus46');
  });

  it('derives short name from gpt-5.3-codex', () => {
    expect(deriveShortName('gpt-5.3-codex')).toBe('codex53');
  });

  it('derives short name from claude-sonnet-4.6', () => {
    expect(deriveShortName('claude-sonnet-4.6')).toBe('sonnet46');
  });

  it('handles model with no version number', () => {
    expect(deriveShortName('claude-haiku')).toBe('haiku');
  });

  it('handles model id with only prefix', () => {
    const result = deriveShortName('gpt');
    expect(result).toBeTruthy();
  });
});
