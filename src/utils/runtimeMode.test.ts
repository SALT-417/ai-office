import { describe, expect, it } from 'vitest';
import { resolveAppRuntimeMode } from './runtimeMode';

describe('resolveAppRuntimeMode', () => {
  it('accepts the explicit local AI mode', () => expect(resolveAppRuntimeMode('local-ai')).toBe('local-ai'));
  it('accepts the explicit public demo mode', () => expect(resolveAppRuntimeMode('public-demo')).toBe('public-demo'));
  it.each([undefined, '', 'production', 'LOCAL-AI', 1])('falls back to public demo for invalid value %s', (value) => expect(resolveAppRuntimeMode(value)).toBe('public-demo'));
});

