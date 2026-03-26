import { describe, it, expect } from 'vitest';
import { computeNextSessionDate } from '../scheduling';

/**
 * Helper: create a Date at midnight UTC for deterministic testing.
 * month is 1-based for readability.
 */
function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

/** Returns the ISO day name abbreviation for a Date (mon..sun). */
function dayName(date: Date): string {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
}

describe('computeNextSessionDate', () => {
  // --- Weekly cadence ---

  it('weekly cadence adds exactly 7 days', () => {
    // 2026-03-02 is a Monday
    const result = computeNextSessionDate(d(2026, 3, 2), 'weekly', null, null);
    expect(result).toEqual(d(2026, 3, 9));
  });

  it('weekly cadence across month boundary', () => {
    // 2026-03-30 is a Monday, +7 = April 6
    const result = computeNextSessionDate(d(2026, 3, 30), 'weekly', null, null);
    expect(result).toEqual(d(2026, 4, 6));
  });

  // --- Biweekly cadence ---

  it('biweekly cadence adds exactly 14 days', () => {
    const result = computeNextSessionDate(d(2026, 3, 2), 'biweekly', null, null);
    expect(result).toEqual(d(2026, 3, 16));
  });

  it('biweekly cadence across month boundary', () => {
    // 2026-03-23 + 14 = April 6
    const result = computeNextSessionDate(d(2026, 3, 23), 'biweekly', null, null);
    expect(result).toEqual(d(2026, 4, 6));
  });

  // --- Monthly cadence ---

  it('monthly cadence adds one calendar month', () => {
    const result = computeNextSessionDate(d(2026, 1, 15), 'monthly', null, null);
    expect(result).toEqual(d(2026, 2, 15));
  });

  it('monthly cadence from Jan 31 overflows into March (JS Date setMonth behavior)', () => {
    // 2026 is not a leap year; Jan 31 + 1 month: JS setMonth(1) on day 31
    // overflows Feb (28 days) to March 3
    const result = computeNextSessionDate(d(2026, 1, 31), 'monthly', null, null);
    expect(result).toEqual(d(2026, 3, 3));
  });

  it('monthly cadence from Jan 31 in a leap year also overflows into March', () => {
    // 2028 is a leap year; Jan 31 + 1 month: JS setMonth(1) on day 31
    // overflows Feb (29 days) to March 2
    const result = computeNextSessionDate(d(2028, 1, 31), 'monthly', null, null);
    expect(result).toEqual(d(2028, 3, 2));
  });

  it('monthly cadence across year boundary', () => {
    const result = computeNextSessionDate(d(2026, 12, 10), 'monthly', null, null);
    expect(result).toEqual(d(2027, 1, 10));
  });

  // --- Custom cadence ---

  it('custom cadence uses cadenceCustomDays', () => {
    const result = computeNextSessionDate(d(2026, 3, 1), 'custom', 10, null);
    expect(result).toEqual(d(2026, 3, 11));
  });

  it('custom cadence defaults to 14 when cadenceCustomDays is null', () => {
    const result = computeNextSessionDate(d(2026, 3, 1), 'custom', null, null);
    expect(result).toEqual(d(2026, 3, 15));
  });

  // --- Unknown cadence fallback ---

  it('unknown cadence string defaults to 7 days (weekly)', () => {
    const result = computeNextSessionDate(d(2026, 3, 2), 'unknown_cadence', null, null);
    expect(result).toEqual(d(2026, 3, 9));
  });

  // --- Preferred day alignment ---

  it('preferred day moves forward when offset lands on a different day', () => {
    // 2026-03-02 (Mon) + 7 = 2026-03-09 (Mon). Preferred = wed => 2026-03-11
    const result = computeNextSessionDate(d(2026, 3, 2), 'weekly', null, 'wed');
    expect(result).toEqual(d(2026, 3, 11));
    expect(dayName(result)).toBe('wed');
  });

  it('preferred day does not change date when already on that day', () => {
    // 2026-03-02 (Mon) + 7 = 2026-03-09 (Mon). Preferred = mon => stays Mon
    const result = computeNextSessionDate(d(2026, 3, 2), 'weekly', null, 'mon');
    expect(result).toEqual(d(2026, 3, 9));
    expect(dayName(result)).toBe('mon');
  });

  it('preferred day fri from a Thursday landing', () => {
    // 2026-03-05 (Thu) + 7 = 2026-03-12 (Thu). Preferred = fri => 2026-03-13
    const result = computeNextSessionDate(d(2026, 3, 5), 'weekly', null, 'fri');
    expect(result).toEqual(d(2026, 3, 13));
    expect(dayName(result)).toBe('fri');
  });

  it('preferred day tue from a Wednesday landing', () => {
    // 2026-03-04 (Wed) + 7 = 2026-03-11 (Wed). Preferred = tue => forward to next Tue = 2026-03-17
    const result = computeNextSessionDate(d(2026, 3, 4), 'weekly', null, 'tue');
    expect(result).toEqual(d(2026, 3, 17));
    expect(dayName(result)).toBe('tue');
  });

  it('preferred day with monthly cadence', () => {
    // 2026-03-10 (Tue) + 1 month = 2026-04-10 (Fri). Preferred = thu => forward to 2026-04-16
    const result = computeNextSessionDate(d(2026, 3, 10), 'monthly', null, 'thu');
    expect(dayName(result)).toBe('thu');
    expect(result.getMonth()).toBe(3); // April (0-based)
    expect(result.getDate()).toBe(16);
  });

  it('null preferredDay skips alignment', () => {
    const result = computeNextSessionDate(d(2026, 3, 4), 'weekly', null, null);
    // Should be exactly +7, no alignment
    expect(result).toEqual(d(2026, 3, 11));
  });

  it('unrecognized preferredDay string (e.g. "sat") skips alignment', () => {
    // DAY_MAP only has mon-fri; "sat" is not in it
    const result = computeNextSessionDate(d(2026, 3, 2), 'weekly', null, 'sat');
    expect(result).toEqual(d(2026, 3, 9)); // no alignment applied
  });

  it('unrecognized preferredDay string "sun" also skips alignment', () => {
    const result = computeNextSessionDate(d(2026, 3, 2), 'weekly', null, 'sun');
    expect(result).toEqual(d(2026, 3, 9));
  });

  // --- firstSession = true ---

  it('firstSession returns nearest upcoming preferred day (tomorrow is that day)', () => {
    // 2026-03-02 is Monday. firstSession + preferred = tue => tomorrow 2026-03-03
    const result = computeNextSessionDate(d(2026, 3, 2), 'weekly', null, 'tue', true);
    expect(result).toEqual(d(2026, 3, 3));
    expect(dayName(result)).toBe('tue');
  });

  it('firstSession finds the next preferred day when it is several days away', () => {
    // 2026-03-02 (Mon). preferred = fri, firstSession => 2026-03-06 (Fri)
    const result = computeNextSessionDate(d(2026, 3, 2), 'weekly', null, 'fri', true);
    expect(result).toEqual(d(2026, 3, 6));
    expect(dayName(result)).toBe('fri');
  });

  it('firstSession wraps to next week if today is the preferred day', () => {
    // 2026-03-02 (Mon). preferred = mon, firstSession => starts from tomorrow (Tue),
    // next Mon is 2026-03-09
    const result = computeNextSessionDate(d(2026, 3, 2), 'weekly', null, 'mon', true);
    expect(result).toEqual(d(2026, 3, 9));
    expect(dayName(result)).toBe('mon');
  });

  it('firstSession from a Sunday reference finds next preferred day correctly', () => {
    // 2026-03-01 is a Sunday. preferred = wed, firstSession.
    // Tomorrow is Mon (day 1). Wed is day 3. diff = (3-1+7)%7 = 2. Mon+2 = Wed Mar 4
    const result = computeNextSessionDate(d(2026, 3, 1), 'weekly', null, 'wed', true);
    expect(result).toEqual(d(2026, 3, 4));
    expect(dayName(result)).toBe('wed');
  });

  it('firstSession ignores cadence and cadenceCustomDays', () => {
    // With firstSession=true, cadence should be irrelevant
    const a = computeNextSessionDate(d(2026, 3, 2), 'weekly', null, 'thu', true);
    const b = computeNextSessionDate(d(2026, 3, 2), 'monthly', null, 'thu', true);
    const c = computeNextSessionDate(d(2026, 3, 2), 'custom', 30, 'thu', true);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
    // All should be 2026-03-05 (Thu)
    expect(a).toEqual(d(2026, 3, 5));
  });

  it('firstSession with null preferredDay falls through to normal cadence logic', () => {
    // firstSession=true but no preferred day => normal weekly +7
    const result = computeNextSessionDate(d(2026, 3, 2), 'weekly', null, null, true);
    expect(result).toEqual(d(2026, 3, 9));
  });

  it('firstSession with unrecognized preferredDay falls through to normal cadence', () => {
    const result = computeNextSessionDate(d(2026, 3, 2), 'weekly', null, 'sat', true);
    expect(result).toEqual(d(2026, 3, 9));
  });

  // --- All recognized day names produce correct day-of-week ---

  describe('all preferred days produce correct day-of-week', () => {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;

    for (const day of days) {
      it(`preferred day "${day}" aligns result to that day`, () => {
        const result = computeNextSessionDate(d(2026, 3, 1), 'weekly', null, day);
        expect(dayName(result)).toBe(day);
      });
    }
  });
});
