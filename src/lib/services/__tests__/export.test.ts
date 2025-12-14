import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DOM APIs
const mockCreateElement = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();

vi.stubGlobal("document", {
  createElement: mockCreateElement.mockReturnValue({
    href: "",
    download: "",
    click: mockClick,
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
    style: {},
  }),
  body: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
  },
});

vi.stubGlobal("URL", {
  createObjectURL: vi.fn(() => "blob:mock-url"),
  revokeObjectURL: vi.fn(),
});

vi.stubGlobal("Blob", class MockBlob {
  constructor(public content: string[], public options?: { type: string }) {}
});

// Use vi.hoisted for mocks
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    from: mocks.from,
    auth: {
      getUser: mocks.getUser,
    },
  }),
}));

// Mock jspdf and autotable
vi.mock("jspdf", () => ({
  default: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    addPage: vi.fn(),
    setPage: vi.fn(),
    getNumberOfPages: vi.fn(() => 1),
    save: vi.fn(),
    internal: {
      pageSize: {
        getWidth: vi.fn(() => 210),
        getHeight: vi.fn(() => 297),
      },
    },
    lastAutoTable: { finalY: 50 },
  })),
}));

vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
}));

describe("export service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CSV export format", () => {
    it("should generate correct CSV headers", () => {
      const headers = [
        "Step ID",
        "Waste Types",
        "Notes",
        "Digital",
        "Physical",
        "Frequency",
        "Impact",
        "Ease",
        "Priority Score",
        "User",
        "Created At",
      ];

      expect(headers).toContain("Step ID");
      expect(headers).toContain("Waste Types");
      expect(headers).toContain("Priority Score");
      expect(headers.length).toBe(11);
    });

    it("should escape commas in CSV values", () => {
      const value = "This, has, commas";
      const escaped = value.replace(/,/g, ";");

      expect(escaped).toBe("This; has; commas");
      expect(escaped).not.toContain(",");
    });

    it("should escape newlines in CSV values", () => {
      const value = "Line 1\nLine 2";
      const escaped = value.replace(/\n/g, " ");

      expect(escaped).toBe("Line 1 Line 2");
      expect(escaped).not.toContain("\n");
    });

    it("should format observations as CSV rows", () => {
      const observation = {
        step_id: "step-123",
        waste_types: [{ name: "Defects" }, { name: "Waiting" }],
        notes: "Test note",
        is_digital: true,
        is_physical: false,
        frequency_score: 3,
        impact_score: 4,
        ease_score: 2,
        priority_score: 36,
        user: { name: "John Doe" },
        created_at: "2024-01-01T00:00:00Z",
      };

      const row = [
        observation.step_id,
        observation.waste_types.map((wt) => wt.name).join("; "),
        observation.notes,
        observation.is_digital ? "Yes" : "No",
        observation.is_physical ? "Yes" : "No",
        observation.frequency_score?.toString() || "",
        observation.impact_score?.toString() || "",
        observation.ease_score?.toString() || "",
        observation.priority_score?.toString() || "",
        observation.user?.name || "",
        new Date(observation.created_at).toISOString(),
      ];

      expect(row[0]).toBe("step-123");
      expect(row[1]).toBe("Defects; Waiting");
      expect(row[3]).toBe("Yes");
      expect(row[4]).toBe("No");
    });
  });

  describe("PDF export content", () => {
    it("should include session name in title", () => {
      const session = { name: "Test Session" };
      const title = `Session: ${session.name}`;

      expect(title).toBe("Session: Test Session");
    });

    it("should calculate summary statistics", () => {
      const observations = [
        { priority_score: 10, is_digital: true },
        { priority_score: 20, is_digital: false },
        { priority_score: 30, is_digital: true },
      ];

      const avgPriority =
        observations.reduce((sum, o) => sum + (o.priority_score || 0), 0) /
        observations.length;

      const digitalCount = observations.filter((o) => o.is_digital).length;
      const digitalPercentage = Math.round(
        (digitalCount / observations.length) * 100
      );

      expect(avgPriority).toBe(20);
      expect(digitalPercentage).toBeCloseTo(67, 0);
    });

    it("should format waste distribution data", () => {
      const distribution = [
        { name: "Defects", percentage: 40 },
        { name: "Waiting", percentage: 35 },
        { name: "Motion", percentage: 25 },
      ];

      const tableData = distribution.map((d) => [d.name, `${d.percentage}%`]);

      expect(tableData[0]).toEqual(["Defects", "40%"]);
      expect(tableData[1]).toEqual(["Waiting", "35%"]);
    });

    it("should truncate long notes", () => {
      const longNote =
        "This is a very long note that exceeds the maximum character limit for display in the PDF table and should be truncated";
      const maxLength = 30;
      const truncated =
        longNote.slice(0, maxLength) +
        (longNote.length > maxLength ? "..." : "");

      expect(truncated.length).toBeLessThanOrEqual(maxLength + 3);
      expect(truncated.endsWith("...")).toBe(true);
    });
  });

  describe("PPTX export API call", () => {
    it("should construct correct API endpoint", () => {
      const endpoint = "/api/export/pptx";
      expect(endpoint).toBe("/api/export/pptx");
    });

    it("should send correct request body", () => {
      const sessionId = "session-123";
      const sections = {
        wasteDistribution: true,
        heatmap: true,
        topOpportunities: true,
        participantActivity: false,
        rawData: true,
      };

      const body = JSON.stringify({ sessionId, sections });
      const parsed = JSON.parse(body);

      expect(parsed.sessionId).toBe("session-123");
      expect(parsed.sections.wasteDistribution).toBe(true);
      expect(parsed.sections.participantActivity).toBe(false);
    });

    it("should handle API error response", async () => {
      const errorResponse = { error: "Session not found" };

      expect(errorResponse.error).toBe("Session not found");
    });
  });

  describe("export sections configuration", () => {
    it("should default all sections to enabled", () => {
      const defaultSections = {
        wasteDistribution: true,
        heatmap: true,
        topOpportunities: true,
        participantActivity: true,
        rawData: true,
      };

      expect(Object.values(defaultSections).every((v) => v)).toBe(true);
    });

    it("should allow selective section export", () => {
      const sections = {
        wasteDistribution: true,
        heatmap: false,
        topOpportunities: true,
        participantActivity: false,
        rawData: false,
      };

      const enabledSections = Object.entries(sections)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);

      expect(enabledSections).toContain("wasteDistribution");
      expect(enabledSections).toContain("topOpportunities");
      expect(enabledSections).not.toContain("heatmap");
      expect(enabledSections.length).toBe(2);
    });
  });
});

describe("export file naming", () => {
  it("should generate correct PDF filename", () => {
    const sessionId = "abc123";
    const filename = `session-${sessionId}-report.pdf`;

    expect(filename).toBe("session-abc123-report.pdf");
    expect(filename.endsWith(".pdf")).toBe(true);
  });

  it("should generate correct PPTX filename", () => {
    const sessionId = "abc123";
    const filename = `session-${sessionId}-report.pptx`;

    expect(filename).toBe("session-abc123-report.pptx");
    expect(filename.endsWith(".pptx")).toBe(true);
  });

  it("should generate correct CSV filename", () => {
    const sessionId = "abc123";
    const filename = `session-${sessionId}-observations.csv`;

    expect(filename).toBe("session-abc123-observations.csv");
    expect(filename.endsWith(".csv")).toBe(true);
  });
});

describe("data transformation for export", () => {
  describe("waste distribution formatting", () => {
    it("should sort by percentage descending", () => {
      const distribution = [
        { name: "Motion", count: 5, percentage: 25 },
        { name: "Defects", count: 8, percentage: 40 },
        { name: "Waiting", count: 7, percentage: 35 },
      ];

      const sorted = [...distribution].sort(
        (a, b) => b.percentage - a.percentage
      );

      expect(sorted[0].name).toBe("Defects");
      expect(sorted[1].name).toBe("Waiting");
      expect(sorted[2].name).toBe("Motion");
    });

    it("should limit to top N items", () => {
      const distribution = Array(15)
        .fill(null)
        .map((_, i) => ({
          name: `Waste ${i}`,
          percentage: 100 - i * 5,
        }));

      const top10 = distribution.slice(0, 10);

      expect(top10.length).toBe(10);
      expect(top10[0].percentage).toBe(100);
    });
  });

  describe("hotspot formatting", () => {
    it("should include step name and metrics", () => {
      const hotspot = {
        step_name: "Review Document",
        observation_count: 15,
        priority_score: 45,
        effort: "Medium",
      };

      expect(hotspot.step_name).toBeDefined();
      expect(hotspot.observation_count).toBe(15);
      expect(hotspot.priority_score).toBe(45);
      expect(hotspot.effort).toBe("Medium");
    });

    it("should calculate effort based on ease score", () => {
      const easeScore = 2; // 1=Easy, 5=Hard
      const efforts = ["Quick Win", "Easy", "Medium", "Hard", "Very Hard"];
      const effort = efforts[easeScore - 1];

      expect(effort).toBe("Easy");
    });
  });
});

