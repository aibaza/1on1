import { describe, it, expect } from 'vitest';
import { reasonValidationResultSchema } from '../correction';
import { ZodError } from 'zod';

describe('reasonValidationResultSchema', () => {
  it('accepts { pass: true, feedback: "Good reason." } → passes', () => {
    const result = reasonValidationResultSchema.safeParse({
      pass: true,
      feedback: 'Good reason.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts { pass: false, feedback: "Missing specifics." } → passes', () => {
    const result = reasonValidationResultSchema.safeParse({
      pass: false,
      feedback: 'Missing specifics.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing pass field → ZodError', () => {
    const result = reasonValidationResultSchema.safeParse({
      feedback: 'Some feedback here.',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
    }
  });

  it('rejects missing feedback field → ZodError', () => {
    const result = reasonValidationResultSchema.safeParse({
      pass: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
    }
  });

  it('rejects feedback longer than 200 chars → ZodError', () => {
    const result = reasonValidationResultSchema.safeParse({
      pass: true,
      feedback: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
    }
  });
});
