import { describe, it, expect } from "vitest";
import { notificationTypeEnum } from "../enums";

describe("notificationTypeEnum", () => {
  it('includes "session_correction" value', () => {
    expect(notificationTypeEnum.enumValues).toContain("session_correction");
  });

  it('still includes "pre_meeting" value', () => {
    expect(notificationTypeEnum.enumValues).toContain("pre_meeting");
  });

  it('still includes "agenda_prep" value', () => {
    expect(notificationTypeEnum.enumValues).toContain("agenda_prep");
  });

  it('still includes "overdue_action" value', () => {
    expect(notificationTypeEnum.enumValues).toContain("overdue_action");
  });

  it('still includes "session_summary" value', () => {
    expect(notificationTypeEnum.enumValues).toContain("session_summary");
  });

  it('still includes "missed_meeting" value', () => {
    expect(notificationTypeEnum.enumValues).toContain("missed_meeting");
  });

  it('still includes "system" value', () => {
    expect(notificationTypeEnum.enumValues).toContain("system");
  });
});
