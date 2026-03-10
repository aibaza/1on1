import { describe, it, expect } from 'vitest';
import { correctionInputSchema, validateReasonSchema } from '../correction';
import { ZodError } from 'zod';

// Helper to generate a string of exactly N characters
function str(n: number): string {
  return 'a'.repeat(n);
}

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('correctionInputSchema', () => {
  it('rejects reason shorter than 20 chars (19 chars) → ZodError', () => {
    const result = correctionInputSchema.safeParse({
      answerId: VALID_UUID,
      reason: str(19),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
    }
  });

  it('accepts reason with exactly 20 chars → passes', () => {
    const result = correctionInputSchema.safeParse({
      answerId: VALID_UUID,
      reason: str(20),
    });
    expect(result.success).toBe(true);
  });

  it('rejects reason longer than 500 chars (501 chars) → ZodError', () => {
    const result = correctionInputSchema.safeParse({
      answerId: VALID_UUID,
      reason: str(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
    }
  });

  it('accepts reason with exactly 500 chars → passes', () => {
    const result = correctionInputSchema.safeParse({
      answerId: VALID_UUID,
      reason: str(500),
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing answerId → ZodError', () => {
    const result = correctionInputSchema.safeParse({
      reason: str(50),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
    }
  });

  it('rejects non-UUID answerId ("not-a-uuid") → ZodError', () => {
    const result = correctionInputSchema.safeParse({
      answerId: 'not-a-uuid',
      reason: str(50),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
    }
  });

  it('accepts valid UUID answerId → passes', () => {
    const result = correctionInputSchema.safeParse({
      answerId: VALID_UUID,
      reason: str(50),
    });
    expect(result.success).toBe(true);
  });

  it('accepts full valid input with optional fields → passes', () => {
    const result = correctionInputSchema.safeParse({
      answerId: VALID_UUID,
      reason: str(50),
      newAnswerText: 'Updated text answer',
      newAnswerNumeric: 4,
      newAnswerJson: { key: 'value' },
      skipped: false,
    });
    expect(result.success).toBe(true);
  });
});

describe('validateReasonSchema', () => {
  it('rejects reason shorter than 20 chars (19 chars) → ZodError', () => {
    const result = validateReasonSchema.safeParse({ reason: str(19) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
    }
  });

  it('accepts reason with exactly 20 chars → passes', () => {
    const result = validateReasonSchema.safeParse({ reason: str(20) });
    expect(result.success).toBe(true);
  });
});
