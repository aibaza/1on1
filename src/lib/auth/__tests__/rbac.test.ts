import { describe, it, expect } from 'vitest';
import { canManageTemplates, canCorrectSession } from '../rbac';

describe('canManageTemplates', () => {
  it('returns true for "admin"', () => {
    expect(canManageTemplates('admin')).toBe(true);
  });

  it('returns true for "manager"', () => {
    expect(canManageTemplates('manager')).toBe(true);
  });

  it('returns false for "member"', () => {
    expect(canManageTemplates('member')).toBe(false);
  });

  it('returns false for "" (empty string)', () => {
    expect(canManageTemplates('')).toBe(false);
  });

  it('returns false for "superadmin" (unknown level)', () => {
    expect(canManageTemplates('superadmin')).toBe(false);
  });
});

describe('canCorrectSession', () => {
  const series = { managerId: 'manager-user-id' };

  it('returns true for admin level regardless of series.managerId', () => {
    expect(canCorrectSession('other-user-id', 'admin', series)).toBe(true);
  });

  it('returns true for manager level when userId === series.managerId', () => {
    expect(canCorrectSession('manager-user-id', 'manager', series)).toBe(true);
  });

  it('returns false for manager level when userId !== series.managerId', () => {
    expect(canCorrectSession('other-user-id', 'manager', series)).toBe(false);
  });

  it('returns false for member level even when userId === series.managerId', () => {
    expect(canCorrectSession('manager-user-id', 'member', series)).toBe(false);
  });
});
