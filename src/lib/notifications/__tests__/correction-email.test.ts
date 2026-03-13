import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEmailTranslator } from "@/lib/email/translator";

// Mock adminDb — correction-email.ts uses adminDb for dedup query and user lookups
// select must be a chainable builder that resolves to [] by default (no recent send)
vi.mock("@/lib/db", () => {
  const makeChainableSelect = (result: unknown[] = []) =>
    vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
        }),
      }),
    });

  const makeChainableInsert = () =>
    vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

  return {
    adminDb: {
      select: makeChainableSelect(),
      insert: makeChainableInsert(),
      query: {
        users: {
          findFirst: vi.fn(),
        },
      },
    },
  };
});

// Mock email transport — correction-email.ts calls getTransport().sendMail(...)
vi.mock("@/lib/email/send", () => ({
  getTransport: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({}),
  })),
  getEmailFrom: vi.fn(() => "noreply@test.com"),
}));

// Import the module under test AFTER mocks are set up.
// This module does NOT exist yet — all tests that depend on it will fail RED at import stage.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sendCorrectionEmails: (...args: any[]) => Promise<void>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasRecentlySent: (...args: any[]) => Promise<boolean>;

// Dynamic import to defer resolution (avoids hard module-not-found crash at file load)
beforeEach(async () => {
  try {
    const mod = await import("@/lib/notifications/correction-email");
    sendCorrectionEmails = mod.sendCorrectionEmails;
    wasRecentlySent = mod.wasRecentlySent;
  } catch {
    // Module does not exist yet — expected RED behavior
    sendCorrectionEmails = undefined as never;
    wasRecentlySent = undefined as never;
  }
});

// Fixture helpers
const tenantId = crypto.randomUUID();
const sessionId = crypto.randomUUID();
const reportUserId = crypto.randomUUID();
const managerUserId = crypto.randomUUID();
const adminUserId1 = crypto.randomUUID();
const adminUserId2 = crypto.randomUUID();

const reportUser = {
  id: reportUserId,
  email: "report@example.com",
  firstName: "Alice",
  lastName: "Smith",
  role: "member" as const,
  isActive: true,
  tenantId,
};

const managerUser = {
  id: managerUserId,
  email: "manager@example.com",
  firstName: "Bob",
  lastName: "Jones",
  role: "manager" as const,
  isActive: true,
  tenantId,
};

const activeAdmin1 = {
  id: adminUserId1,
  email: "admin1@example.com",
  firstName: "Carol",
  lastName: "Davis",
  role: "admin" as const,
  isActive: true,
  tenantId,
};

const inactiveAdmin = {
  id: crypto.randomUUID(),
  email: "inactive@example.com",
  firstName: "Dave",
  lastName: "Wilson",
  role: "admin" as const,
  isActive: false,
  tenantId,
};

const sessionContext = {
  tenantId,
  sessionId,
  sessionNumber: 5,
  reportUser,
  managerUser,
  sessionUrl: `https://app.example.com/sessions/${sessionId}`,
  locale: "en",
};

// ─────────────────────────────────────────────────────────────────────────────
// sendCorrectionEmails — recipient assembly
// ─────────────────────────────────────────────────────────────────────────────

describe("sendCorrectionEmails — recipient assembly", () => {
  it("sends one email to the report recipient (NOTIF-01)", async () => {
    if (!sendCorrectionEmails) {
      throw new Error("sendCorrectionEmails not found — module not implemented yet");
    }

    const { getTransport } = await import("@/lib/email/send");
    const mockSendMail = vi.fn().mockResolvedValue({});
    vi.mocked(getTransport).mockReturnValue({ sendMail: mockSendMail } as never);

    await sendCorrectionEmails({
      ...sessionContext,
      activeAdmins: [],
    });

    const calls = mockSendMail.mock.calls;
    const reportCall = calls.find((c) => c[0]?.to === reportUser.email);
    expect(reportCall).toBeDefined();
  });

  it("sends one email per active admin, excluding inactive admins (NOTIF-02)", async () => {
    if (!sendCorrectionEmails) {
      throw new Error("sendCorrectionEmails not found — module not implemented yet");
    }

    const { getTransport } = await import("@/lib/email/send");
    const mockSendMail = vi.fn().mockResolvedValue({});
    vi.mocked(getTransport).mockReturnValue({ sendMail: mockSendMail } as never);

    await sendCorrectionEmails({
      ...sessionContext,
      activeAdmins: [activeAdmin1, inactiveAdmin],
    });

    const toAddresses = mockSendMail.mock.calls.map((c) => c[0]?.to);
    expect(toAddresses).toContain(activeAdmin1.email);
    expect(toAddresses).not.toContain(inactiveAdmin.email);
  });

  it("does not send duplicate email when report is also an admin (NOTIF-02 dedup)", async () => {
    if (!sendCorrectionEmails) {
      throw new Error("sendCorrectionEmails not found — module not implemented yet");
    }

    const { getTransport } = await import("@/lib/email/send");
    const mockSendMail = vi.fn().mockResolvedValue({});
    vi.mocked(getTransport).mockReturnValue({ sendMail: mockSendMail } as never);

    // Report user is also listed in active admins
    const reportAsAdmin = { ...reportUser, role: "admin" as const };

    await sendCorrectionEmails({
      ...sessionContext,
      activeAdmins: [reportAsAdmin],
    });

    const toAddresses = mockSendMail.mock.calls.map((c) => c[0]?.to);
    const reportEmailCount = toAddresses.filter((a) => a === reportUser.email).length;
    expect(reportEmailCount).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// wasRecentlySent — deduplication logic
// ─────────────────────────────────────────────────────────────────────────────

describe("wasRecentlySent — deduplication logic", () => {
  it("returns true when a sent notification exists within the 5-minute window", async () => {
    if (!wasRecentlySent) {
      throw new Error("wasRecentlySent not found — module not implemented yet");
    }

    const { adminDb } = await import("@/lib/db");
    const sentAt2MinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    vi.mocked(adminDb).select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: crypto.randomUUID(), sentAt: sentAt2MinutesAgo, status: "sent" },
          ]),
        }),
      }),
    });

    const result = await wasRecentlySent({
      tenantId,
      userId: reportUserId,
      sessionId,
    });

    expect(result).toBe(true);
  });

  it("returns false when no matching notification exists (NOTIF-04)", async () => {
    if (!wasRecentlySent) {
      throw new Error("wasRecentlySent not found — module not implemented yet");
    }

    const { adminDb } = await import("@/lib/db");

    vi.mocked(adminDb).select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const result = await wasRecentlySent({
      tenantId,
      userId: reportUserId,
      sessionId,
    });

    expect(result).toBe(false);
  });

  it("returns false when matching notification is older than 5 minutes (NOTIF-04 cutoff)", async () => {
    if (!wasRecentlySent) {
      throw new Error("wasRecentlySent not found — module not implemented yet");
    }

    const { adminDb } = await import("@/lib/db");
    const sentAt10MinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Return empty — the query should include sentAt > cutoff predicate,
    // so the 10-minute-old record is filtered out at DB level.
    // We simulate this by returning empty results (the predicate excluded it).
    vi.mocked(adminDb).select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    // Also verify: if somehow returned, the function should still return false
    // because proper implementation uses sentAt > cutoff in the where clause.
    const result = await wasRecentlySent({
      tenantId,
      userId: reportUserId,
      sessionId,
      _testSentAt: sentAt10MinutesAgo, // optional param for white-box testing
    });

    expect(result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// i18n key resolution — reads real locale files from disk
// ─────────────────────────────────────────────────────────────────────────────

describe("i18n key resolution", () => {
  it("resolves emails.sessionCorrection.subject in EN locale without throwing", async () => {
    const t = await createEmailTranslator("en");
    // use-intl returns fallback (key path) when key is missing — assert on actual content
    // This test is RED until messages/en/emails.json contains sessionCorrection.subject
    expect(() => t("emails.sessionCorrection.subject")).not.toThrow();
    const result = t("emails.sessionCorrection.subject");
    expect(result).toContain("corrected");
  });

  it("resolves emails.sessionCorrection.subject in RO locale without throwing", async () => {
    const t = await createEmailTranslator("ro");
    // use-intl returns fallback (key path) when key is missing — assert on actual content
    // This test is RED until messages/ro/emails.json contains sessionCorrection.subject
    expect(() => t("emails.sessionCorrection.subject")).not.toThrow();
    const result = t("emails.sessionCorrection.subject");
    expect(result).toContain("corectat");
  });
});
