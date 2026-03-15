// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// --- Mocks ---

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

// Mock next-intl: return the key as the translated string
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({
    dateTime: (date: Date) => date.toISOString(),
    number: (n: number) => String(n),
  }),
}));

// Mock @tanstack/react-query with stable data
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ initialData }: { initialData: unknown }) => ({
    data: initialData,
    isLoading: false,
    error: null,
  }),
  useMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

// Mock sonner (toast)
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock api-error-toast hook
vi.mock("@/lib/i18n/api-error-toast", () => ({
  useApiErrorToast: () => ({ showApiError: vi.fn() }),
}));

// Mock MemberPicker (interactive component not needed here)
vi.mock("@/components/people/member-picker", () => ({
  MemberPicker: () => null,
}));

// Now import the actual component (file exists, but behavior not yet refactored)
import { TeamDetailClient } from "@/app/(dashboard)/teams/[id]/team-detail-client";

const STUB_TEAM = {
  id: "team-1",
  name: "Engineering",
  description: "Engineering team",
  managerId: "user-1",
  managerName: "Alice",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const STUB_MEMBERS = [
  {
    userId: "user-2",
    firstName: "Bob",
    lastName: "Smith",
    email: "bob@example.com",
    avatarUrl: null,
    role: "member",
    joinedAt: new Date().toISOString(),
  },
];

// Danger Zone behavioral contract (SAFE-01):
// - A section heading "dangerZone" (i18n key) exists in the DOM
// - Delete trigger uses variant="outline" with border-destructive + text-destructive classes
// - An AlertDialog wraps the delete action (alertdialog role appears when triggered)
// - Danger Zone section appears AFTER the "addMembers" button in DOM order

describe("TeamDetailClient — Danger Zone (SAFE-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('contains a heading with text "dangerZone" (i18n key)', () => {
    render(
      <TeamDetailClient
        initialTeam={STUB_TEAM}
        initialMembers={STUB_MEMBERS}
        currentUserRole="admin"
      />
    );
    // The Danger Zone section must render a heading with this text
    const heading = screen.queryByText("dangerZone");
    expect(heading).not.toBeNull();
  });

  it("delete button has outline variant with destructive color classes, not filled destructive", () => {
    const { container } = render(
      <TeamDetailClient
        initialTeam={STUB_TEAM}
        initialMembers={STUB_MEMBERS}
        currentUserRole="admin"
      />
    );
    // Find the delete button — it should show "deleteTeam" text (i18n key)
    const deleteButton = screen.queryByText("deleteTeam");
    expect(deleteButton).not.toBeNull();

    if (deleteButton) {
      // The button ancestor should have border-destructive and text-destructive classes
      // (outline variant with destructive styling), NOT the filled destructive variant
      const button = deleteButton.closest("button");
      expect(button).not.toBeNull();
      // border-destructive class must be present (not filled bg-destructive)
      expect(button?.className).toContain("border-destructive");
      // text-destructive class must be present
      expect(button?.className).toContain("text-destructive");
    }
  });

  it("delete action is wrapped in an AlertDialog (not a raw window.confirm)", () => {
    render(
      <TeamDetailClient
        initialTeam={STUB_TEAM}
        initialMembers={STUB_MEMBERS}
        currentUserRole="admin"
      />
    );
    // An AlertDialog renders a trigger via AlertDialogTrigger.
    // The AlertDialog component must be present in the component tree.
    // We check by looking for AlertDialog-related role or data attributes.
    // When the dialog is closed, the trigger is still in the DOM.
    // The "deleteTeam" button must be inside an AlertDialogTrigger (not fire window.confirm directly).
    const deleteButton = screen.queryByText("deleteTeam")?.closest("button");
    expect(deleteButton).not.toBeNull();
    // The button should NOT have onClick that calls confirm()
    // We check indirectly: the parent tree should contain an element with data-slot="alert-dialog"
    // or an ancestor that is an AlertDialogTrigger.
    // Radix AlertDialogTrigger renders with data-slot="alert-dialog-trigger"
    const trigger = document.querySelector('[data-slot="alert-dialog-trigger"]');
    expect(trigger).not.toBeNull();
  });

  it("Danger Zone section appears after the addMembers button in DOM order", () => {
    const { container } = render(
      <TeamDetailClient
        initialTeam={STUB_TEAM}
        initialMembers={STUB_MEMBERS}
        currentUserRole="admin"
      />
    );
    const allText = container.textContent ?? "";
    const addMembersIndex = allText.indexOf("addMembers");
    const dangerZoneIndex = allText.indexOf("dangerZone");

    // dangerZone heading must appear after addMembers button in DOM text order
    expect(addMembersIndex).toBeGreaterThan(-1);
    expect(dangerZoneIndex).toBeGreaterThan(-1);
    expect(dangerZoneIndex).toBeGreaterThan(addMembersIndex);
  });
});
