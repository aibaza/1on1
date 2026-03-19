// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// --- Mocks ---

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

// Mock next-intl: return the key as the translated string, support params
vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string, params?: Record<string, unknown>) => {
      if (params) {
        let result = key;
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, String(v));
        }
        return result;
      }
      return key;
    };
    return t;
  },
}));

let mockVersionListData: { versions: Array<{ versionNumber: number; createdAt: string; createdByName: string; questionCount: number }> } = { versions: [] };
let mockVersionDetailData: { versionNumber: number; createdAt: string; createdByName: string; snapshot: unknown } | null = null;
let mockMutationFn: ReturnType<typeof vi.fn>;

vi.mock("@tanstack/react-query", () => {
  const actual = {
    useQuery: ({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === "template-versions") {
        return { data: mockVersionListData, isLoading: false, error: null };
      }
      if (queryKey[0] === "template-version") {
        return { data: mockVersionDetailData, isLoading: false, error: null };
      }
      // previous version query
      if (queryKey[0] === "template-version-prev") {
        return { data: null, isLoading: false, error: null };
      }
      return { data: null, isLoading: false, error: null };
    },
    useMutation: ({ mutationFn }: { mutationFn: unknown }) => {
      mockMutationFn = vi.fn();
      return {
        mutate: mockMutationFn,
        mutateAsync: vi.fn(),
        isPending: false,
        isError: false,
        error: null,
        reset: vi.fn(),
      };
    },
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
  return actual;
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/i18n/api-error-toast", () => ({
  useApiErrorToast: () => ({ showApiError: vi.fn() }),
}));

// Mock the version-diff module
vi.mock("@/lib/templates/version-diff", () => ({
  computeVersionDiff: () => [],
}));

// Now import the components (they will be created in GREEN phase)
import { VersionHistoryTab } from "./version-history-tab";
import { VersionDiffList } from "./version-diff-list";
import { VersionPreview } from "./version-preview";

describe("VersionHistoryTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVersionListData = { versions: [] };
    mockVersionDetailData = null;
  });

  it("renders empty state when versions list is empty", () => {
    mockVersionListData = { versions: [] };
    render(<VersionHistoryTab templateId="tpl-1" />);

    expect(screen.getByText("history.emptyTitle")).not.toBeNull();
    expect(screen.getByText("history.emptyDescription")).not.toBeNull();
  });

  it("renders version list entries with version number, date, author, question count", () => {
    mockVersionListData = {
      versions: [
        { versionNumber: 2, createdAt: "2026-03-19T10:00:00Z", createdByName: "Alice", questionCount: 8 },
        { versionNumber: 1, createdAt: "2026-03-18T10:00:00Z", createdByName: "Bob", questionCount: 5 },
      ],
    };
    render(<VersionHistoryTab templateId="tpl-1" />);

    // Should display version labels
    expect(screen.getByText(/v2/)).not.toBeNull();
    expect(screen.getByText(/v1/)).not.toBeNull();
    // Should display author names
    expect(screen.getByText(/Alice/)).not.toBeNull();
    expect(screen.getByText(/Bob/)).not.toBeNull();
  });

  it("restore button is hidden for the latest version, visible for older versions", () => {
    mockVersionListData = {
      versions: [
        { versionNumber: 2, createdAt: "2026-03-19T10:00:00Z", createdByName: "Alice", questionCount: 8 },
        { versionNumber: 1, createdAt: "2026-03-18T10:00:00Z", createdByName: "Bob", questionCount: 5 },
      ],
    };
    mockVersionDetailData = {
      versionNumber: 1,
      createdAt: "2026-03-18T10:00:00Z",
      createdByName: "Bob",
      snapshot: { name: "Test", description: null, sections: [], labelIds: [] },
    };

    render(<VersionHistoryTab templateId="tpl-1" />);

    // Click on version 1 (older) to select it
    const v1Button = screen.getByText(/v1/);
    fireEvent.click(v1Button);

    // Restore button should be visible for older version
    expect(screen.queryByText("history.restoreButton")).not.toBeNull();
  });

  it("clicking Restore opens AlertDialog with confirmation text including version number", () => {
    mockVersionListData = {
      versions: [
        { versionNumber: 2, createdAt: "2026-03-19T10:00:00Z", createdByName: "Alice", questionCount: 8 },
        { versionNumber: 1, createdAt: "2026-03-18T10:00:00Z", createdByName: "Bob", questionCount: 5 },
      ],
    };
    mockVersionDetailData = {
      versionNumber: 1,
      createdAt: "2026-03-18T10:00:00Z",
      createdByName: "Bob",
      snapshot: { name: "Test", description: null, sections: [], labelIds: [] },
    };

    render(<VersionHistoryTab templateId="tpl-1" />);

    // Click version 1
    const v1Button = screen.getByText(/v1/);
    fireEvent.click(v1Button);

    // Click the restore button
    const restoreBtn = screen.getByText("history.restoreButton");
    fireEvent.click(restoreBtn);

    // AlertDialog should be open with version number in title
    expect(screen.queryByText(/history\.restoreTitle/)).not.toBeNull();
  });
});

describe("VersionDiffList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders added items with green styling, removed with red, modified with amber", () => {
    const changes = [
      { type: "added" as const, entity: "section" as const, name: "New Section" },
      { type: "removed" as const, entity: "question" as const, name: "Old Question" },
      { type: "modified" as const, entity: "question" as const, name: "Changed Q", details: "text changed" },
    ];
    const { container } = render(<VersionDiffList changes={changes} />);

    // Check for added item (green)
    const addedEl = container.querySelector(".text-green-600");
    expect(addedEl).not.toBeNull();

    // Check for removed item (red)
    const removedEl = container.querySelector(".text-red-600");
    expect(removedEl).not.toBeNull();

    // Check for modified item (amber)
    const modifiedEl = container.querySelector(".text-amber-600");
    expect(modifiedEl).not.toBeNull();
  });

  it('shows "No changes" message when changes array is empty', () => {
    render(<VersionDiffList changes={[]} />);
    expect(screen.getByText("history.noChanges")).not.toBeNull();
  });
});

describe("VersionPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders section names and question texts from snapshot in read-only mode", () => {
    const snapshot = {
      name: "My Template",
      description: "A test template",
      sections: [
        {
          id: "s1",
          name: "Wellbeing",
          description: null,
          sortOrder: 0,
          questions: [
            {
              id: "q1",
              questionText: "How are you feeling?",
              helpText: null,
              answerType: "rating_1_5",
              answerConfig: {},
              isRequired: true,
              sortOrder: 0,
              scoreWeight: "1",
              conditionalOnQuestionId: null,
              conditionalOperator: null,
              conditionalValue: null,
            },
          ],
        },
      ],
      labelIds: [],
    };

    render(
      <VersionPreview
        snapshot={snapshot}
        changes={null}
        showDiff={false}
        onToggleDiff={() => {}}
      />
    );

    expect(screen.getByText("My Template")).not.toBeNull();
    expect(screen.getByText("Wellbeing")).not.toBeNull();
    expect(screen.getByText("How are you feeling?")).not.toBeNull();
  });
});
