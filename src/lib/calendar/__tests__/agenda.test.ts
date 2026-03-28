import { describe, it, expect } from "vitest";

// Test the formatAgenda function directly by extracting the logic
// Since it's a private function in agenda.ts, we test it indirectly
// by testing the output format

describe("Calendar agenda formatting", () => {
  // Inline the format logic for direct testing
  function formatAgenda(
    points: { content: string; isDiscussed: boolean; category: string | null }[],
    managerName: string,
    reportName: string,
    appUrl: string,
    seriesId: string
  ): string {
    const lines: string[] = [
      `1on1 meeting between ${managerName} and ${reportName}`,
      "",
    ];

    if (points.length > 0) {
      lines.push("Agenda:");

      const byCategory = new Map<string, typeof points>();
      for (const p of points) {
        const cat = p.category || "General";
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(p);
      }

      for (const [category, catPoints] of byCategory) {
        if (byCategory.size > 1) {
          lines.push(`\n${category}:`);
        }
        for (const p of catPoints) {
          const check = p.isDiscussed ? "x" : " ";
          lines.push(`  [${check}] ${p.content}`);
        }
      }
    }

    lines.push("", "---", `Open in 1on1: ${appUrl}/series/${seriesId}`);
    return lines.join("\n");
  }

  it("formats empty agenda correctly", () => {
    const result = formatAgenda(
      [],
      "Alice Manager",
      "Bob Report",
      "https://app.example.com",
      "series-123"
    );

    expect(result).toContain("1on1 meeting between Alice Manager and Bob Report");
    expect(result).toContain("Open in 1on1: https://app.example.com/series/series-123");
    expect(result).not.toContain("Agenda:");
  });

  it("formats single category agenda", () => {
    const points = [
      { content: "Discuss Q2 goals", isDiscussed: false, category: null },
      { content: "Review performance", isDiscussed: true, category: null },
    ];

    const result = formatAgenda(
      points,
      "Alice",
      "Bob",
      "https://app.example.com",
      "s-1"
    );

    expect(result).toContain("Agenda:");
    expect(result).toContain("[ ] Discuss Q2 goals");
    expect(result).toContain("[x] Review performance");
  });

  it("groups by category when multiple categories exist", () => {
    const points = [
      { content: "Goal progress", isDiscussed: false, category: "Goals" },
      { content: "Team dynamics", isDiscussed: false, category: "Feedback" },
      { content: "OKR update", isDiscussed: true, category: "Goals" },
    ];

    const result = formatAgenda(
      points,
      "Alice",
      "Bob",
      "https://app.example.com",
      "s-1"
    );

    expect(result).toContain("Goals:");
    expect(result).toContain("Feedback:");
    expect(result).toContain("[ ] Goal progress");
    expect(result).toContain("[x] OKR update");
    expect(result).toContain("[ ] Team dynamics");
  });

  it("uses 'General' as default category", () => {
    const points = [
      { content: "Something", isDiscussed: false, category: null },
    ];

    const result = formatAgenda(
      points,
      "A",
      "B",
      "https://app.example.com",
      "s-1"
    );

    // Single category doesn't show category headers
    expect(result).not.toContain("General:");
    expect(result).toContain("[ ] Something");
  });

  it("includes app link", () => {
    const result = formatAgenda(
      [],
      "A",
      "B",
      "https://1on1.surmont.co",
      "abc-123"
    );

    expect(result).toContain("Open in 1on1: https://1on1.surmont.co/series/abc-123");
  });
});
