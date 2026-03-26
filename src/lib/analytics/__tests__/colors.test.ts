import { describe, it, expect } from "vitest";
import {
  SCORE_THRESHOLD_HEALTHY,
  SCORE_THRESHOLD_ATTENTION,
  DISTRIBUTION_COLORS,
  LEGEND_DOT_COLORS,
  scoreDotColor,
  scoreTextColor,
  scoreBadgeColor,
  scoreBorderColor,
  sparkBarColor,
  trendBadgeColor,
  trendIconColor,
  alertBadgeColor,
  scoreChartColor,
} from "../colors";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("threshold constants", () => {
  it("healthy threshold is 3.5", () => {
    expect(SCORE_THRESHOLD_HEALTHY).toBe(3.5);
  });

  it("attention threshold is 2.5", () => {
    expect(SCORE_THRESHOLD_ATTENTION).toBe(2.5);
  });
});

describe("DISTRIBUTION_COLORS", () => {
  it("has all four keys", () => {
    expect(Object.keys(DISTRIBUTION_COLORS)).toEqual(
      expect.arrayContaining(["healthy", "attention", "critical", "noData"]),
    );
  });
});

describe("LEGEND_DOT_COLORS", () => {
  it("has all four keys", () => {
    expect(Object.keys(LEGEND_DOT_COLORS)).toEqual(
      expect.arrayContaining(["healthy", "attention", "critical", "noData"]),
    );
  });
});

// ---------------------------------------------------------------------------
// Score-based color functions
// ---------------------------------------------------------------------------

describe("scoreDotColor", () => {
  it("returns muted for null", () => {
    expect(scoreDotColor(null)).toBe("bg-muted-foreground");
  });

  it("returns emerald for healthy scores (>= 3.5)", () => {
    expect(scoreDotColor(3.5)).toBe("bg-emerald-500");
    expect(scoreDotColor(4.0)).toBe("bg-emerald-500");
    expect(scoreDotColor(5.0)).toBe("bg-emerald-500");
  });

  it("returns amber for attention scores (2.5 - 3.49)", () => {
    expect(scoreDotColor(2.5)).toBe("bg-amber-400");
    expect(scoreDotColor(3.0)).toBe("bg-amber-400");
    expect(scoreDotColor(3.49)).toBe("bg-amber-400");
  });

  it("returns red for critical scores (< 2.5)", () => {
    expect(scoreDotColor(2.4)).toBe("bg-red-500");
    expect(scoreDotColor(1.0)).toBe("bg-red-500");
    expect(scoreDotColor(0)).toBe("bg-red-500");
  });
});

describe("scoreTextColor", () => {
  it("returns muted for null", () => {
    expect(scoreTextColor(null)).toBe("text-muted-foreground");
  });

  it("returns emerald for healthy scores", () => {
    expect(scoreTextColor(4.0)).toContain("emerald");
  });

  it("returns amber for attention scores", () => {
    expect(scoreTextColor(3.0)).toContain("amber");
  });

  it("returns red for critical scores", () => {
    expect(scoreTextColor(1.5)).toContain("red");
  });
});

describe("scoreBadgeColor", () => {
  it("returns muted classes for null", () => {
    expect(scoreBadgeColor(null)).toBe("bg-muted text-muted-foreground");
  });

  it("returns emerald classes for healthy scores", () => {
    const result = scoreBadgeColor(4.5);
    expect(result).toContain("emerald");
    expect(result).toContain("bg-");
    expect(result).toContain("text-");
  });

  it("returns amber classes for attention scores", () => {
    const result = scoreBadgeColor(3.0);
    expect(result).toContain("amber");
  });

  it("returns red classes for critical scores", () => {
    const result = scoreBadgeColor(1.0);
    expect(result).toContain("red");
  });
});

describe("scoreBorderColor", () => {
  it("returns muted for null", () => {
    expect(scoreBorderColor(null)).toBe("border-muted-foreground");
  });

  it("returns emerald border for healthy", () => {
    expect(scoreBorderColor(3.5)).toBe("border-emerald-500");
  });

  it("returns amber border for attention", () => {
    expect(scoreBorderColor(2.5)).toBe("border-amber-400");
  });

  it("returns red border for critical", () => {
    expect(scoreBorderColor(2.0)).toBe("border-red-500");
  });
});

describe("sparkBarColor", () => {
  it("returns emerald for healthy scores", () => {
    expect(sparkBarColor(4.0)).toBe("bg-emerald-400/60");
  });

  it("returns amber for attention scores", () => {
    expect(sparkBarColor(3.0)).toBe("bg-amber-400/60");
  });

  it("returns red for critical scores", () => {
    expect(sparkBarColor(1.5)).toBe("bg-red-400/60");
  });
});

describe("scoreChartColor", () => {
  it("returns CSS variable for null", () => {
    expect(scoreChartColor(null)).toBe("var(--muted-foreground)");
  });

  it("returns success variable for healthy", () => {
    expect(scoreChartColor(4.0)).toContain("--color-success");
  });

  it("returns warning variable for attention", () => {
    expect(scoreChartColor(3.0)).toContain("--color-warning");
  });

  it("returns danger variable for critical", () => {
    expect(scoreChartColor(1.0)).toContain("--color-danger");
  });
});

// ---------------------------------------------------------------------------
// Trend color functions
// ---------------------------------------------------------------------------

describe("trendBadgeColor", () => {
  it("returns emerald for positive trend", () => {
    expect(trendBadgeColor(0.5)).toContain("emerald");
  });

  it("returns red for negative trend", () => {
    expect(trendBadgeColor(-0.3)).toContain("red");
  });

  it("returns muted for zero trend", () => {
    expect(trendBadgeColor(0)).toBe("bg-muted text-muted-foreground");
  });
});

describe("trendIconColor", () => {
  it("returns emerald for positive trend", () => {
    expect(trendIconColor(1)).toContain("emerald");
  });

  it("returns red for negative trend", () => {
    expect(trendIconColor(-1)).toContain("red");
  });

  it("returns muted for zero trend", () => {
    expect(trendIconColor(0)).toBe("text-muted-foreground");
  });
});

// ---------------------------------------------------------------------------
// Alert badge colors
// ---------------------------------------------------------------------------

describe("alertBadgeColor", () => {
  it.each(["low_score", "score_drop", "declining", "critical_score"])(
    "returns red classes for %s",
    (type) => {
      expect(alertBadgeColor(type)).toContain("red");
    },
  );

  it.each(["stale_series", "stale", "overdue", "low_action_rate"])(
    "returns amber classes for %s",
    (type) => {
      expect(alertBadgeColor(type)).toContain("amber");
    },
  );

  it("returns blue classes for unknown alert type", () => {
    expect(alertBadgeColor("something_else")).toContain("blue");
  });

  it("returns blue classes for empty string", () => {
    expect(alertBadgeColor("")).toContain("blue");
  });
});

// ---------------------------------------------------------------------------
// Boundary precision tests
// ---------------------------------------------------------------------------

describe("threshold boundaries", () => {
  it("score exactly at 3.5 is healthy (not attention)", () => {
    expect(scoreDotColor(3.5)).toBe("bg-emerald-500");
  });

  it("score exactly at 2.5 is attention (not critical)", () => {
    expect(scoreDotColor(2.5)).toBe("bg-amber-400");
  });

  it("score just below 3.5 is attention", () => {
    expect(scoreDotColor(3.4999)).toBe("bg-amber-400");
  });

  it("score just below 2.5 is critical", () => {
    expect(scoreDotColor(2.4999)).toBe("bg-red-500");
  });
});
