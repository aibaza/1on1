import { describe, it, expect } from 'vitest';
import { withLanguageInstruction } from '../service';

// ---------------------------------------------------------------------------
// Wave 0 — RED phase
// These tests FAIL until Wave 1 (17-02) exports `withLanguageInstruction` from service.ts
// Expected failure: "withLanguageInstruction is not exported" or similar
// ---------------------------------------------------------------------------

describe('withLanguageInstruction', () => {
  // Test 1: Romanian — appends Romanian language directive
  it('returns string containing "Romanian" when language is "ro"', () => {
    const result = withLanguageInstruction('base prompt', 'ro');
    expect(result).toContain('Romanian');
  });

  // Test 2: English — returns base prompt unchanged
  it('returns base prompt unchanged when language is "en"', () => {
    const result = withLanguageInstruction('base prompt', 'en');
    expect(result).toBe('base prompt');
  });

  // Test 3: undefined — returns base prompt unchanged
  it('returns base prompt unchanged when language is undefined', () => {
    const result = withLanguageInstruction('base prompt', undefined);
    expect(result).toBe('base prompt');
  });

  // Test 4: German — appends German language directive
  it('returns string containing "German" when language is "de"', () => {
    const result = withLanguageInstruction('base prompt', 'de');
    expect(result).toContain('German');
  });
});
